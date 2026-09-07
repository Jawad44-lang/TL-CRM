import Customer from '../models/Customer.js';
import Group from '../models/Group.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import AssignmentHistory from '../models/AssignmentHistory.js';
import TemporaryAccess from '../models/TemporaryAccess.js';
import ActivityLog from '../models/ActivityLog.js';
import asyncHandler from '../utils/asyncHandler.js';
import { assertCanManageUser } from './userController.js';

// GET /api/users/:id/profile — full employee profile + history (PRD §25/§26)
export const getUserProfile = asyncHandler(async (req, res) => {
  const target = await assertCanManageUser(req.user, req.params.id);
  if (target.role !== 'EMPLOYEE') throw new ApiError(400, 'Profile view is available for employees.');

  const assignedCustomerDocs = await Customer.find({ assignedEmployeeId: target._id }).select('_id');
  const assignedIds = assignedCustomerDocs.map((c) => c._id);

  const [activeConversations, resolvedConversations] = await Promise.all([
    Conversation.countDocuments({ conversationType: 'CUSTOMER', status: 'ACTIVE', customerId: { $in: assignedIds } }),
    Conversation.countDocuments({ conversationType: 'CUSTOMER', status: 'RESOLVED', customerId: { $in: assignedIds } }),
  ]);

  const [assignedCustomers, groups, messagesSent, currentCustomers, currentGroups, history, activity, tempAccess] =
    await Promise.all([
      assignedIds.length,
      Group.countDocuments({ memberEmployeeIds: target._id }),
      Message.countDocuments({ direction: 'OUTGOING', senderId: target._id }),
      Customer.find({ assignedEmployeeId: target._id })
        .select('name username status lastMessageAt platformKey')
        .sort({ lastMessageAt: -1 })
        .limit(50),
      Group.find({ memberEmployeeIds: target._id }).select('name lastMessageAt platformKey').limit(50),
      AssignmentHistory.find({ $or: [{ toUserId: target._id }, { fromUserId: target._id }] })
        .sort({ at: -1 })
        .limit(50)
        .populate('customerId', 'name')
        .populate('fromUserId', 'name')
        .populate('toUserId', 'name')
        .populate('byUserId', 'name'),
      ActivityLog.find({ actorId: target._id }).sort({ at: -1 }).limit(20),
      TemporaryAccess.find({ $or: [{ employeeId: target._id }, { grantedToUserId: target._id }] })
        .sort({ grantedAt: -1 })
        .limit(20)
        .populate('employeeId', 'name')
        .populate('grantedToUserId', 'name')
        .populate('grantedBy', 'name'),
    ]);

  res.json({
    success: true,
    user: target.toSafeJSON(),
    stats: { assignedCustomers, groups, activeConversations, resolvedConversations, messagesSent },
    currentCustomers,
    currentGroups,
    assignmentHistory: history,
    activity,
    tempAccess,
  });
});
