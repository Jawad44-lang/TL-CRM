import AccessGrant from '../../models/AccessGrant.js';
import ConnectedAccount from '../../models/ConnectedAccount.js';
import Group from '../../models/Group.js';
import Customer from '../../models/Customer.js';
import User from '../../models/User.js';
import ApiError from '../../utils/ApiError.js';
import { getGrantedAccountIds, getCustomerAccess, getGroupAccess, addGrantActions } from './permissionService.js';

const ALL_ACTIONS = ['VIEW', 'READ', 'SEND', 'REPLY', 'DELETE', 'EDIT', 'ASSIGN', 'REASSIGN', 'RESOLVE', 'MANAGE'];

/**
 * MANDATORY permission ceiling (PRD §8):
 * a manager can only grant actions/resources that exist inside the manager's own scope.
 */
export async function validateGrantCreation(granter, payload = {}) {
  const { userId, scopeType, accountId, groupId, customerId, actions = [] } = payload;

  if (granter.role === 'EMPLOYEE') throw new ApiError(403, 'Employees cannot grant permissions.');
  if (!actions.length) throw new ApiError(400, 'Select at least one action.');
  const unknown = actions.filter((a) => !ALL_ACTIONS.includes(a));
  if (unknown.length) throw new ApiError(400, `Unknown actions: ${unknown.join(', ')}`);

  const grantee = await User.findById(userId);
  if (!grantee) throw new ApiError(404, 'Target user not found.');
  if (grantee.role === 'ADMIN') throw new ApiError(400, 'Admins already have full access.');

  if (granter.role === 'ADMIN') {
    if (!['PLATFORM', 'ACCOUNT', 'GROUP', 'CUSTOMER'].includes(scopeType)) throw new ApiError(400, 'Invalid scope type.');
    return; // Admin has no permission ceiling.
  }

  if (scopeType === 'PLATFORM') {
    throw new ApiError(403, 'Permission ceiling: managers can only grant account, group or customer level access.');
  }
  if (String(grantee.managerId || '') !== String(granter._id) || grantee.role !== 'EMPLOYEE') {
    throw new ApiError(403, 'You can only grant permissions to your own employees.');
  }

  const grants = await AccessGrant.find({ userId: granter._id });
  const checkMissing = (granterActions) => actions.filter((a) => !granterActions.has(a));
  const ceilingError = (miss) =>
    new ApiError(403, `Permission ceiling: you cannot grant actions you do not have yourself (${miss.join(', ')}).`);

  if (scopeType === 'ACCOUNT') {
    const visible = new Set(await getGrantedAccountIds(granter));
    if (!visible.has(String(accountId))) {
      throw new ApiError(403, 'Permission ceiling: you cannot grant access to an account outside your own access.');
    }
    const granterActions = new Set();
    const acc = await ConnectedAccount.findById(accountId);
    addGrantActions(granterActions, grants, { accountId, platformId: acc?.platform });
    const miss = checkMissing(granterActions);
    if (miss.length) throw ceilingError(miss);
  } else if (scopeType === 'GROUP') {
    const group = await Group.findById(groupId);
    if (!group) throw new ApiError(404, 'Group not found.');
    const miss = checkMissing(await getGroupAccess(granter, group));
    if (miss.length) throw ceilingError(miss);
  } else if (scopeType === 'CUSTOMER') {
    const customer = await Customer.findById(customerId);
    if (!customer) throw new ApiError(404, 'Customer not found.');
    const miss = checkMissing(await getCustomerAccess(granter, customer));
    if (miss.length) throw ceilingError(miss);
  } else {
    throw new ApiError(400, 'Invalid scope type.');
  }
}
