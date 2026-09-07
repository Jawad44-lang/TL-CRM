import AccessGrant from '../../models/AccessGrant.js';
import ConnectedAccount from '../../models/ConnectedAccount.js';
import Customer from '../../models/Customer.js';
import Group from '../../models/Group.js';
import TemporaryAccess from '../../models/TemporaryAccess.js';
import User from '../../models/User.js';
import ApiError from '../../utils/ApiError.js';

export const ACTIONS = ['VIEW', 'READ', 'SEND', 'REPLY', 'DELETE', 'EDIT', 'ASSIGN', 'REASSIGN', 'RESOLVE', 'MANAGE'];
export const BASE_ACTIONS = ['VIEW', 'READ', 'SEND', 'REPLY'];
export const MANAGER_TEAM_ACTIONS = ['VIEW', 'READ', 'SEND', 'REPLY', 'ASSIGN', 'REASSIGN', 'RESOLVE'];

/* ---------------------------- Scope helpers ---------------------------- */

/** Employees under a manager (team). */
export async function getTeamUserIds(user) {
  if (user.role !== 'MANAGER') return [];
  const users = await User.find({ managerId: user._id, role: 'EMPLOYEE' }).select('_id');
  return users.map((u) => String(u._id));
}

/** Account ids reachable via PLATFORM/ACCOUNT grants. */
export async function getGrantedAccountIds(user) {
  const grants = await AccessGrant.find({ userId: user._id });
  const accountIds = new Set();
  const platformIds = grants.filter((g) => g.scopeType === 'PLATFORM').map((g) => g.platformId);
  if (platformIds.length) {
    const accs = await ConnectedAccount.find({ platform: { $in: platformIds } }).select('_id');
    accs.forEach((a) => accountIds.add(String(a._id)));
  }
  grants.filter((g) => g.scopeType === 'ACCOUNT').forEach((g) => accountIds.add(String(g.accountId)));
  return [...accountIds];
}

export async function getAllAccountIds() {
  const accs = await ConnectedAccount.find().select('_id');
  return accs.map((a) => String(a._id));
}

/** ACTIVE temporary accesses granted to this user (PRD §17). */
export async function getActiveTempAccess(user) {
  return TemporaryAccess.find({ grantedToUserId: user._id, status: 'ACTIVE' });
}

/** Resolve customer ids covered by the user's ACTIVE temporary accesses. */
export async function getTempCustomerIds(user) {
  const temps = await getActiveTempAccess(user);
  const ids = new Set();
  for (const t of temps) {
    if (t.scope === 'SPECIFIC') t.customerIds.forEach((c) => ids.add(String(c)));
    else {
      const cs = await Customer.find({ assignedEmployeeId: t.employeeId }).select('_id');
      cs.forEach((c) => ids.add(String(c._id)));
    }
  }
  return [...ids];
}


export function addGrantActions(set, grants, refs = {}) {
  for (const g of grants) {
    if (g.scopeType === 'CUSTOMER' && refs.customerId && String(g.customerId) === String(refs.customerId)) g.actions.forEach((a) => set.add(a));
    if (g.scopeType === 'GROUP' && refs.groupId && String(g.groupId) === String(refs.groupId)) g.actions.forEach((a) => set.add(a));
    if (g.scopeType === 'ACCOUNT' && refs.accountId && String(g.accountId) === String(refs.accountId)) g.actions.forEach((a) => set.add(a));
    if (g.scopeType === 'PLATFORM' && refs.platformId && String(g.platformId) === String(refs.platformId)) g.actions.forEach((a) => set.add(a));
  }
}

/* --------------------- Effective access computation --------------------- */

/**
 * Effective action set of `user` on a Customer resource.
 * Layers: role → assignment → temporary access → explicit grants (PRD §7/§8).
 */
export async function getCustomerAccess(user, customer) {
  if (user.role === 'ADMIN') return new Set(ACTIONS);
  const actions = new Set();

  const assignedId = customer.assignedEmployeeId ? String(customer.assignedEmployeeId) : null;
  if (user.role === 'EMPLOYEE' && assignedId === String(user._id)) BASE_ACTIONS.forEach((a) => actions.add(a));
  if (user.role === 'MANAGER' && assignedId && (await getTeamUserIds(user)).includes(assignedId)) {
    MANAGER_TEAM_ACTIONS.forEach((a) => actions.add(a));
  }

  const tempIds = await getTempCustomerIds(user);
  if (tempIds.includes(String(customer._id))) BASE_ACTIONS.forEach((a) => actions.add(a));

  const grants = await AccessGrant.find({ userId: user._id });
  addGrantActions(actions, grants, {
    customerId: customer._id,
    accountId: customer.accountId,
    platformId: customer.platform,
  });
  return actions;
}

/** Effective action set of `user` on a Group resource. */
export async function getGroupAccess(user, group) {
  if (user.role === 'ADMIN') return new Set(ACTIONS);
  const actions = new Set();

  const isMember = (group.memberEmployeeIds || []).some((id) => String(id) === String(user._id));
  if (isMember) BASE_ACTIONS.forEach((a) => actions.add(a));
  if (user.role === 'MANAGER') {
    const teamIds = await getTeamUserIds(user);
    const memberStr = (group.memberEmployeeIds || []).map(String);
    if (memberStr.some((id) => teamIds.includes(id))) BASE_ACTIONS.forEach((a) => actions.add(a));
  }

  const grants = await AccessGrant.find({ userId: user._id });
  addGrantActions(actions, grants, { groupId: group._id, accountId: group.accountId, platformId: group.platform });
  return actions;
}

/* --------------------------- Assertions -------------------------------- */

export async function assertCustomerAccess(user, customerId, action) {
  const customer = await Customer.findById(customerId);
  if (!customer) throw new ApiError(404, 'Customer not found.');
  const actions = await getCustomerAccess(user, customer);
  if (!actions.has(action)) {
    throw new ApiError(403, `You do not have permission to ${String(action).toLowerCase()} this customer.`);
  }
  return customer;
}

export async function assertGroupAccess(user, groupId, action) {
  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, 'Group not found.');
  const actions = await getGroupAccess(user, group);
  if (!actions.has(action)) {
    throw new ApiError(403, `You do not have permission to ${String(action).toLowerCase()} this group.`);
  }
  return group;
}

export * from './scopeService.js';
export * from './audienceService.js';
export * from './ceilingService.js';

