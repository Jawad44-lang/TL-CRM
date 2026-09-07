import Conversation from '../../models/Conversation.js';
import ApiError from '../../utils/ApiError.js';
import { assertGroupAccess, getConversationAudience } from '../permission/permissionService.js';
import { notifyUser } from '../notification/notificationService.js';
import { emitToUsers } from '../../sockets/index.js';
import { logActivity } from '../../utils/logActivity.js';
import { assertEmployeeTarget } from './assignmentService.js';

/** Groups can hold MULTIPLE employees simultaneously (PRD §18). */
export async function assignGroupMembers(user, groupId, employeeIds = []) {
  const group = await assertGroupAccess(user, groupId, 'ASSIGN');
  if (!employeeIds.length) throw new ApiError(400, 'Select at least one employee.');
  const existing = new Set(group.memberEmployeeIds.map(String));
  const added = [];
  for (const id of employeeIds) {
    if (existing.has(String(id))) continue;
    const emp = await assertEmployeeTarget(user, id);
    existing.add(String(emp._id));
    added.push(emp);
  }
  if (!added.length) throw new ApiError(400, 'Selected employees are already members.');
  group.memberEmployeeIds = [...existing];
  await group.save();

  for (const emp of added) {
    await notifyUser(emp._id, {
      type: 'GROUP_ASSIGNED',
      title: 'Added to a group',
      body: `You were added to group "${group.name}".`,
      meta: { groupId: String(group._id) },
    });
  }
  const conv = await Conversation.findOne({ conversationType: 'GROUP', groupId: group._id });
  if (conv) {
    const audience = await getConversationAudience(conv);
    emitToUsers([...audience, ...added.map((a) => String(a._id))], 'conversation:updated', {
      conversation: { _id: String(conv._id), groupId: { _id: String(group._id), name: group.name, memberEmployeeIds: group.memberEmployeeIds.map(String) } },
    });
  }
  logActivity(user, 'GROUP_ASSIGNED', 'Group', String(group._id), { added: added.map((a) => String(a._id)) });
  return group;
}

export async function removeGroupMember(user, groupId, employeeId) {
  const group = await assertGroupAccess(user, groupId, 'ASSIGN');
  const before = group.memberEmployeeIds.length;
  group.memberEmployeeIds = group.memberEmployeeIds.filter((id) => String(id) !== String(employeeId));
  if (group.memberEmployeeIds.length === before) throw new ApiError(400, 'Employee is not a member of this group.');
  await group.save();
  await notifyUser(employeeId, {
    type: 'GROUP_REMOVED',
    title: 'Removed from a group',
    body: `You were removed from group "${group.name}".`,
    meta: { groupId: String(group._id) },
  });
  logActivity(user, 'GROUP_REMOVED', 'Group', String(group._id), { removed: String(employeeId) });
  return group;
}
