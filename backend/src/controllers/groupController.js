import Group from '../models/Group.js';
import Conversation from '../models/Conversation.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { assertGroupAccess, visibleGroupQuery } from '../services/permission/permissionService.js';
import { assignGroupMembers, removeGroupMember } from '../services/assignment/groupService.js';
import { escapeRegex } from '../utils/regex.js';

// GET /api/groups
export const listGroups = asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  const base = await visibleGroupQuery(req.user);
  const and = [base];
  if (q) and.push({ name: new RegExp(escapeRegex(q), 'i') });
  const query = and.length > 1 ? { $and: and } : and[0];

  const items = await Group.find(query)
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .limit(200)
    .populate('memberEmployeeIds', 'name avatarColor role')
    .populate('accountId', 'name platformKey');
  res.json({ success: true, items });
});

// GET /api/groups/:id
export const getGroup = asyncHandler(async (req, res) => {
  const group = await assertGroupAccess(req.user, req.params.id, 'VIEW');
  await group.populate([
    { path: 'memberEmployeeIds', select: 'name role avatarColor status' },
    { path: 'accountId', select: 'name platformKey' },
  ]);
  const conv = await Conversation.findOne({ conversationType: 'GROUP', groupId: group._id }).select('_id status');
  res.json({ success: true, group, conversationId: conv?._id ? String(conv._id) : null });
});

// POST /api/groups/:id/assign { employeeIds: [] }
export const assignGroup = asyncHandler(async (req, res) => {
  const { employeeIds = [] } = req.body || {};
  const group = await assignGroupMembers(req.user, req.params.id, employeeIds);
  res.json({ success: true, message: 'Employees added to group.', group });
});

// DELETE /api/groups/:id/assign/:employeeId
export const unassignGroup = asyncHandler(async (req, res) => {
  const group = await removeGroupMember(req.user, req.params.id, req.params.employeeId);
  res.json({ success: true, message: 'Employee removed from group.', group });
});
