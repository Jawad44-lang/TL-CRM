import Conversation from '../models/Conversation.js';
import ReadStatus from '../models/ReadStatus.js';
import User from '../models/User.js';
import ConnectedAccount from '../models/ConnectedAccount.js';
import asyncHandler from '../utils/asyncHandler.js';
import { visibleConversationFilter } from '../services/permission/permissionService.js';
import { markConversationRead } from '../services/message/messageService.js';
import { logActivity } from '../utils/logActivity.js';
import { emitToConversation } from '../sockets/index.js';
import { getConversationAudience } from '../services/permission/audienceService.js';
import { paginate, pageMeta } from '../utils/pagination.js';

// GET /api/conversations?type=&filter=&page=
export const listConversations = asyncHandler(async (req, res) => {
  const { type = 'ALL', filter = 'all' } = req.query;
  const base = await visibleConversationFilter(req.user);
  const and = [base];
  if (type === 'CUSTOMER' || type === 'GROUP') and.push({ conversationType: type });
  if (filter === 'resolved') and.push({ status: 'RESOLVED' });
  if (filter === 'active') and.push({ status: 'ACTIVE' });
  const query = and.length > 1 ? { $and: and } : and[0];

  const { skip, limit, page } = paginate(req.query);
  const [convos, total] = await Promise.all([
    Conversation.find(query)
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customerId', 'name username profileImage isOnline assignedEmployeeId platformKey')
      .populate('groupId', 'name memberEmployeeIds platformKey'),
    Conversation.countDocuments(query),
  ]);

  const [myReads, accounts] = await Promise.all([
    ReadStatus.find({ userId: req.user._id, conversationId: { $in: convos.map((c) => c._id) } }),
    ConnectedAccount.find({ _id: { $in: convos.map((c) => c.accountId) } }).select('name platformKey'),
  ]);
  const readMap = new Map(myReads.map((r) => [String(r.conversationId), String(r.lastReadMessageId || '')]));
  const accMap = new Map(accounts.map((a) => [String(a._id), a]));

  const assignedIds = [...new Set(convos.map((c) => c.customerId?.assignedEmployeeId).filter(Boolean).map(String))];
  const employees = assignedIds.length ? await User.find({ _id: { $in: assignedIds } }).select('name avatarColor') : [];
  const empMap = new Map(employees.map((e) => [String(e._id), e]));

  const items = convos.map((c) => {
    const last = c.lastMessageId ? String(c.lastMessageId) : '';
    const unread = Boolean(last) && readMap.get(String(c._id)) !== last;
    const emp = c.customerId?.assignedEmployeeId ? empMap.get(String(c.customerId.assignedEmployeeId)) : null;
    const acc = accMap.get(String(c.accountId));
    return {
      _id: String(c._id),
      conversationType: c.conversationType,
      status: c.status,
      customer: c.customerId
        ? {
            _id: String(c.customerId._id),
            name: c.customerId.name,
            username: c.customerId.username,
            profileImage: c.customerId.profileImage,
            isOnline: c.customerId.isOnline,
            platformKey: c.customerId.platformKey,
          }
        : null,
      group: c.groupId
        ? {
            _id: String(c.groupId._id),
            name: c.groupId.name,
            memberEmployeeIds: c.groupId.memberEmployeeIds.map(String),
            platformKey: c.groupId.platformKey,
          }
        : null,
      assignedEmployee: emp ? { _id: String(emp._id), name: emp.name, avatarColor: emp.avatarColor } : null,
      account: acc ? { _id: String(acc._id), name: acc.name, platformKey: acc.platformKey } : null,
      lastMessage: c.lastMessage,
      lastMessageAt: c.lastMessageAt,
      unread,
    };
  });

  res.json({ success: true, items, ...pageMeta(total, { skip, limit, page }) });
});

// POST /api/conversations/:id/read
export const markRead = asyncHandler(async (req, res) => {
  await markConversationRead(req.user, req.params.id);
  res.json({ success: true, message: 'Conversation marked as read.' });
});

// POST /api/conversations/:id/resolve
export const toggleResolve = asyncHandler(async (req, res) => {
  const { assertConversationAccess } = await import('../services/permission/permissionService.js');
  const { conversation, actions } = await assertConversationAccess(req.user, req.params.id, 'VIEW');
  if (!actions.has('RESOLVE')) throw new ApiError(403, 'You do not have permission to resolve this conversation.');
  conversation.status = conversation.status === 'RESOLVED' ? 'ACTIVE' : 'RESOLVED';
  await conversation.save();

  const audience = await getConversationAudience(conversation);
  const { emitToUsers } = await import('../sockets/index.js');
  emitToUsers(audience, 'conversation:updated', { conversation: { _id: String(conversation._id), status: conversation.status } });
  emitToConversation(conversation._id, 'conversation:updated', { conversation: { _id: String(conversation._id), status: conversation.status } });
  logActivity(req.user, conversation.status === 'RESOLVED' ? 'CONVERSATION_RESOLVED' : 'CONVERSATION_REOPENED', 'Conversation', String(conversation._id), {});
  res.json({ success: true, message: `Conversation ${conversation.status === 'RESOLVED' ? 'resolved' : 'reopened'}.`, status: conversation.status });
});

// GET /api/conversations/:id — detail + per-user read status of participants (PRD §30/§31)
export const getConversation = asyncHandler(async (req, res) => {
  const { assertConversationAccess } = await import('../services/permission/permissionService.js');
  const { conversation, actions, customer, group } = await assertConversationAccess(req.user, req.params.id, 'VIEW');

  // participant read info (strictly internal — the customer never sees it, PRD §31)
  let participantIds = [String(req.user._id)];
  if (conversation.conversationType === 'CUSTOMER' && customer?.assignedEmployeeId) {
    participantIds.push(String(customer.assignedEmployeeId));
    const emp = await User.findById(customer.assignedEmployeeId).select('managerId');
    if (emp?.managerId) participantIds.push(String(emp.managerId));
  }
  if (conversation.conversationType === 'GROUP' && group) {
    participantIds = [...new Set([...participantIds, ...(group.memberEmployeeIds || []).map(String)])];
  }
  const users = await User.find({ _id: { $in: participantIds } }).select('name role avatarColor');
  const reads = await ReadStatus.find({ conversationId: conversation._id, userId: { $in: participantIds } });
  const readMap = new Map(reads.map((r) => [String(r.userId), String(r.lastReadMessageId || '')]));

  const account = await ConnectedAccount.findById(conversation.accountId).select('name platformKey');

  res.json({
    success: true,
    conversation: {
      _id: String(conversation._id),
      conversationType: conversation.conversationType,
      status: conversation.status,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
      account: account ? { _id: String(account._id), name: account.name, platformKey: account.platformKey } : null,
      customer: customer
        ? {
            _id: String(customer._id),
            name: customer.name,
            username: customer.username,
            phone: customer.phone,
            isOnline: customer.isOnline,
            platformKey: customer.platformKey,
            assignedEmployeeId: customer.assignedEmployeeId ? String(customer.assignedEmployeeId) : null,
          }
        : null,
      group: group
        ? { _id: String(group._id), name: group.name, memberEmployeeIds: (group.memberEmployeeIds || []).map(String) }
        : null,
    },
    myActions: [...actions],
    participants: users.map((u) => ({
      userId: String(u._id),
      name: u.name,
      role: u.role,
      avatarColor: u.avatarColor,
      lastReadMessageId: readMap.get(String(u._id)) || null,
      isMe: String(u._id) === String(req.user._id),
    })),
  });
});

