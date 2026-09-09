import Conversation from '../../models/Conversation.js';
import ApiError from '../../utils/ApiError.js';
import { assertGroupAccess, getConversationAudience } from '../permission/permissionService.js';
import { notifyUser } from '../notification/notificationService.js';
import { emitToUsers } from '../../sockets/index.js';
import { logActivity } from '../../utils/logActivity.js';
import { assertEmployeeTarget } from './assignmentService.js';

/**
 * Groups can hold MULTIPLE employees simultaneously (PRD §18).
 *
 * `setGroupMembers` SYNCS the member list to the exact requested list:
 *   - employees not in the group yet are added (with notifications),
 *   - employees who were deselected are REMOVED — this is what makes
 *     "remove member" actually persist and lets them be re-added later.
 */
export async function setGroupMembers(user, groupId, employeeIds = []) {
  const group = await assertGroupAccess(user, groupId, 'ASSIGN');

  const current = new Set((group.memberEmployeeIds || []).map(String));
  const desired = [...new Set((employeeIds || []).map(String))];

  // Only newly-added employees need validation (active + within caller's scope).
  // Removed members need none — even a disabled employee can be removed.
  for (const id of desired) {
    if (!current.has(id)) await assertEmployeeTarget(user, id);
  }

  const added = desired.filter((id) => !current.has(id));
  const removed = [...current].filter((id) => !desired.includes(id));

  if (!added.length && !removed.length) {
    return { group, added: [], removed: [] }; // nothing changed — not an error
  }

  group.memberEmployeeIds = desired;
  await group.save();

  for (const empId of added) {
    await notifyUser(empId, {
      type: 'GROUP_ASSIGNED',
      title: 'Added to a group',
      body: `You were added to group "${group.name}".`,
      meta: { groupId: String(group._id) },
    });
  }
  for (const empId of removed) {
    await notifyUser(empId, {
      type: 'GROUP_REMOVED',
      title: 'Removed from a group',
      body: `You were removed from group "${group.name}".`,
      meta: { groupId: String(group._id) },
    });
  }

  const conv = await Conversation.findOne({ conversationType: 'GROUP', groupId: group._id });
  if (conv) {
    const audience = await getConversationAudience(conv);
    // Include removed users so their open chat updates immediately.
    emitToUsers([...audience, ...added, ...removed], 'conversation:updated', {
      conversation: { _id: String(conv._id), groupId: { _id: String(group._id), name: group.name, memberEmployeeIds: group.memberEmployeeIds.map(String) } },
    });
  }
  logActivity(user, 'GROUP_MEMBERS_UPDATED', 'Group', String(group._id), {
    added,
    removed,
    memberCount: group.memberEmployeeIds.length,
  });
  return { group, added, removed };
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
