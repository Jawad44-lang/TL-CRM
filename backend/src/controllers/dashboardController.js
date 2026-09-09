import User from '../models/User.js';
import ConnectedAccount from '../models/ConnectedAccount.js';
import Customer from '../models/Customer.js';
import Group from '../models/Group.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import ReadStatus from '../models/ReadStatus.js';
import ActivityLog from '../models/ActivityLog.js';
import asyncHandler from '../utils/asyncHandler.js';
import { visibleCustomerQuery, visibleGroupQuery, visibleConversationFilter, getTeamUserIds } from '../services/permission/permissionService.js';

async function countUnread(user, conversationFilter) {
  const convs = await Conversation.find(conversationFilter).select('_id lastMessageId');
  if (!convs.length) return 0;
  const reads = await ReadStatus.find({ userId: user._id, conversationId: { $in: convs.map((c) => c._id) } });
  const map = new Map(reads.map((r) => [String(r.conversationId), String(r.lastReadMessageId || '')]));
  return convs.filter((c) => c.lastMessageId && map.get(String(c._id)) !== String(c.lastMessageId)).length;
}

// GET /api/dashboard — role-based overview stats (PRD §28/§29)
export const getDashboard = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role === 'ADMIN') {
    // Month boundaries for real month-over-month trend calculations
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const [totalManagers, totalEmployees, totalAccounts, totalCustomers, totalGroups, activeConversations, unassignedCustomers, totalMessages, resolvedConversations, newUsersThisMonth, newUsersLastMonth, newCustomersThisMonth, newCustomersLastMonth, newConversationsThisMonth, newConversationsLastMonth, recentActivity] =
      await Promise.all([
        User.countDocuments({ role: 'MANAGER' }),
        User.countDocuments({ role: 'EMPLOYEE' }),
        ConnectedAccount.countDocuments({ status: 'CONNECTED' }),
        Customer.countDocuments(),
        Group.countDocuments(),
        Conversation.countDocuments({ status: 'ACTIVE' }),
        Customer.countDocuments({ assignedEmployeeId: null }),
        Message.countDocuments(),
        Conversation.countDocuments({ status: 'RESOLVED' }),
        User.countDocuments({ role: { $in: ['MANAGER', 'EMPLOYEE'] }, createdAt: { $gte: monthStart } }),
        User.countDocuments({ role: { $in: ['MANAGER', 'EMPLOYEE'] }, createdAt: { $gte: lastMonthStart, $lt: monthStart } }),
        Customer.countDocuments({ createdAt: { $gte: monthStart } }),
        Customer.countDocuments({ createdAt: { $gte: lastMonthStart, $lt: monthStart } }),
        Conversation.countDocuments({ createdAt: { $gte: monthStart } }),
        Conversation.countDocuments({ createdAt: { $gte: lastMonthStart, $lt: monthStart } }),
        ActivityLog.find().sort({ at: -1 }).limit(8),
      ]);
    return res.json({
      success: true,
      role: 'ADMIN',
      stats: {
        totalManagers,
        totalEmployees,
        totalAccounts,
        totalCustomers,
        totalGroups,
        activeConversations,
        unassignedCustomers,
        totalMessages,
        resolvedConversations,
        newUsersThisMonth,
        newUsersLastMonth,
        newCustomersThisMonth,
        newCustomersLastMonth,
        newConversationsThisMonth,
        newConversationsLastMonth,
      },
      recentActivity,
    });
  }

  if (user.role === 'MANAGER') {
    const custQuery = await visibleCustomerQuery(user);
    const grpQuery = await visibleGroupQuery(user);
    const convFilter = await visibleConversationFilter(user);
    const teamIds = await getTeamUserIds(user);
    const [visibleCustomers, unassignedCustomers, totalGroups, employees, activeConversations, unreadConversations, recentActivity] = await Promise.all([
      Customer.countDocuments(custQuery),
      Customer.countDocuments({ ...custQuery, assignedEmployeeId: null }),
      Group.countDocuments(grpQuery),
      teamIds.length,
      Conversation.countDocuments({ ...convFilter, status: 'ACTIVE' }),
      countUnread(user, convFilter),
      ActivityLog.find({ actorId: { $in: [...teamIds, String(user._id)] } }).sort({ at: -1 }).limit(8),
    ]);
    return res.json({
      success: true,
      role: 'MANAGER',
      stats: { visibleCustomers, unassignedCustomers, totalGroups, employees, activeConversations, unreadConversations },
      recentActivity,
    });
  }

  // EMPLOYEE
  const custQuery = await visibleCustomerQuery(user);
  const grpQuery = await visibleGroupQuery(user);
  const convFilter = await visibleConversationFilter(user);
  const [assignedCustomers, groups, activeConversations, resolvedConversations, unreadChats] = await Promise.all([
    Customer.countDocuments({ ...custQuery, assignedEmployeeId: user._id }),
    Group.countDocuments(grpQuery),
    Conversation.countDocuments({ ...convFilter, status: 'ACTIVE' }),
    Conversation.countDocuments({ ...convFilter, status: 'RESOLVED' }),
    countUnread(user, convFilter),
  ]);
  res.json({
    success: true,
    role: 'EMPLOYEE',
    stats: { assignedCustomers, groups, activeConversations, resolvedConversations, unreadChats },
  });
});
