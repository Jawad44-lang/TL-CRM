import mongoose from 'mongoose';

/**
 * Build a light JSON summary of a conversation for socket payloads / lists.
 */
export function conversationSummary(conv, customer, group, extra = {}) {
  return {
    _id: String(conv._id),
    conversationType: conv.conversationType,
    accountId: String(conv.accountId),
    status: conv.status,
    customerId: customer
      ? {
          _id: String(customer._id),
          name: customer.name,
          username: customer.username || '',
          profileImage: customer.profileImage || '',
          isOnline: !!customer.isOnline,
          assignedEmployeeId: customer.assignedEmployeeId ? String(customer.assignedEmployeeId) : null,
          platformKey: customer.platformKey,
        }
      : null,
    groupId: group
      ? {
          _id: String(group._id),
          name: group.name,
          memberEmployeeIds: (group.memberEmployeeIds || []).map(String),
          platformKey: group.platformKey,
        }
      : null,
    lastMessage: conv.lastMessage || null,
    lastMessageId: conv.lastMessageId ? String(conv.lastMessageId) : null,
    lastMessageAt: conv.lastMessageAt,
    ...extra,
  };
}

export function messageJSON(doc) {
  const m = doc.toJSON ? doc.toJSON() : doc;
  return {
    ...m,
    _id: String(m._id),
    conversationId: String(m.conversationId),
    senderId: m.senderId ? String(m.senderId) : null,
  };
}
