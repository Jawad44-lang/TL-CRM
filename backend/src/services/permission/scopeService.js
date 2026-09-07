import AccessGrant from '../../models/AccessGrant.js';
import Customer from '../../models/Customer.js';
import Group from '../../models/Group.js';
import ApiError from '../../utils/ApiError.js';
import {
  getGrantedAccountIds,
  getTempCustomerIds,
  getTeamUserIds,
  getCustomerAccess,
  getGroupAccess,
} from './permissionService.js';

/* ----------------------- Visibility queries ---------------------------- */

export async function visibleCustomerQuery(user) {
  if (user.role === 'ADMIN') return {};
  const grants = await AccessGrant.find({ userId: user._id });
  const accountIds = await getGrantedAccountIds(user);
  const tempIds = await getTempCustomerIds(user);
  const grantCustomerIds = grants.filter((g) => g.scopeType === 'CUSTOMER').map((g) => String(g.customerId));
  const extraIds = [...tempIds, ...grantCustomerIds];

  if (user.role === 'EMPLOYEE') {
    return {
      $or: [
        { assignedEmployeeId: user._id },
        ...(extraIds.length ? [{ _id: { $in: extraIds } }] : []),
        ...(accountIds.length ? [{ accountId: { $in: accountIds } }] : []),
      ],
    };
  }
  // MANAGER: team assignments + account scope (covers unassigned/new customers, PRD §13) + explicit grants
  const teamIds = await getTeamUserIds(user);
  return {
    $or: [
      ...(teamIds.length ? [{ assignedEmployeeId: { $in: teamIds } }] : []),
      ...(accountIds.length ? [{ accountId: { $in: accountIds } }] : []),
      ...(extraIds.length ? [{ _id: { $in: extraIds } }] : []),
    ],
  };
}

export async function visibleGroupQuery(user) {
  if (user.role === 'ADMIN') return {};
  const grants = await AccessGrant.find({ userId: user._id });
  const accountIds = await getGrantedAccountIds(user);
  const grantGroupIds = grants.filter((g) => g.scopeType === 'GROUP').map((g) => String(g.groupId));
  const or = [
    ...(grantGroupIds.length ? [{ _id: { $in: grantGroupIds } }] : []),
    ...(accountIds.length ? [{ accountId: { $in: accountIds } }] : []),
  ];
  if (user.role === 'EMPLOYEE') or.push({ memberEmployeeIds: user._id });
  if (user.role === 'MANAGER') {
    const teamIds = await getTeamUserIds(user);
    if (teamIds.length) or.push({ memberEmployeeIds: { $in: teamIds } });
  }
  return { $or: or };
}

export async function getVisibleCustomerIds(user) {
  const list = await Customer.find(await visibleCustomerQuery(user)).select('_id');
  return list.map((c) => String(c._id));
}

export async function getVisibleGroupIds(user) {
  const list = await Group.find(await visibleGroupQuery(user)).select('_id');
  return list.map((g) => String(g._id));
}

export async function visibleConversationFilter(user) {
  if (user.role === 'ADMIN') return {};
  const [custIds, grpIds] = await Promise.all([getVisibleCustomerIds(user), getVisibleGroupIds(user)]);
  return {
    $or: [
      ...(custIds.length ? [{ conversationType: 'CUSTOMER', customerId: { $in: custIds } }] : []),
      ...(grpIds.length ? [{ conversationType: 'GROUP', groupId: { $in: grpIds } }] : []),
    ],
  };
}

/* ------------------- Conversation access check ------------------------- */

export async function getConversationAccess(user, conversation) {
  if (conversation.conversationType === 'CUSTOMER') {
    const customer =
      conversation.customerId && typeof conversation.customerId === 'object'
        ? conversation.customerId
        : await Customer.findById(conversation.customerId);
    if (!customer) throw new ApiError(404, 'Conversation customer not found.');
    return { actions: await getCustomerAccess(user, customer), customer, group: null };
  }
  const group =
    conversation.groupId && typeof conversation.groupId === 'object'
      ? conversation.groupId
      : await Group.findById(conversation.groupId);
  if (!group) throw new ApiError(404, 'Conversation group not found.');
  return { actions: await getGroupAccess(user, group), customer: null, group };
}

export async function assertConversationAccess(user, conversationId, action) {
  const Conversation = (await import('../../models/Conversation.js')).default;
  const conversation = await Conversation.findById(conversationId).populate('customerId').populate('groupId');
  if (!conversation) throw new ApiError(404, 'Conversation not found.');
  const { actions, customer, group } = await getConversationAccess(user, conversation);
  if (!actions.has(action)) {
    throw new ApiError(403, 'You do not have permission to access this conversation.');
  }
  return { conversation, actions, customer, group };
}
