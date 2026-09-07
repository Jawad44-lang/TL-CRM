import ReadStatus from '../../models/ReadStatus.js';
import ApiError from '../../utils/ApiError.js';
import { messageJSON } from '../../utils/serialize.js';
import { assertConversationAccess, getConversationAudience } from '../permission/permissionService.js';
import { emitToUsers, emitToConversation } from '../../sockets/index.js';
import { logActivity } from '../../utils/logActivity.js';
import { getAdapterForAccount } from '../integrations/index.js';
import Message from '../../models/Message.js';

/**
 * Send an outgoing message in a conversation (PRD §21/§22/§37).
 * senderType mirrors the internal role; the simulated customer only ever
 * sees "Business Account" as the sender identity (PRD §23).
 */
export async function sendOutgoingMessage(user, conversationId, { content, media = null }) {
  const { conversation, actions, customer, group } = await assertConversationAccess(user, conversationId, 'VIEW');
  // SEND (compose) or REPLY (respond inside an existing conversation) is required.
  if (!(actions.has('SEND') || actions.has('REPLY'))) {
    throw new ApiError(403, 'You do not have permission to send messages in this conversation.');
  }

  const message = await Message.create({
    conversationId: conversation._id,
    platform: customer?.platform || group?.platform,
    platformKey: customer?.platformKey || group?.platformKey,
    accountId: conversation.accountId,
    externalMessageId: `out-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    direction: 'OUTGOING',
    senderType: user.role, // EMPLOYEE | MANAGER | ADMIN
    senderId: user._id,
    customerExternalId: customer ? customer.externalId : group ? group.externalId : '',
    content: content || '',
    media,
    timestamp: new Date(),
  });

  // Update conversation
  conversation.lastMessageId = message._id;
  conversation.lastMessage = {
    content: message.content,
    direction: message.direction,
    senderType: message.senderType,
    at: message.timestamp,
  };
  conversation.lastMessageAt = message.timestamp;
  await conversation.save();

  // Deliver through the platform adapter (demo = simulated, PRD §67)
  const account = await (async () => {
    const ConnectedAccount = (await import('../../models/ConnectedAccount.js')).default;
    return ConnectedAccount.findById(conversation.accountId);
  })();
  const adapter = getAdapterForAccount(account);
  const targetExternalId = customer ? customer.externalId : group.externalId;
  const delivery = await adapter.sendMessage(account, targetExternalId, message);
  if (delivery?.deliveredAt) message.deliveredAt = delivery.deliveredAt;
  await message.save();

  // Sender has obviously read up to their own message (PRD §30)
  await ReadStatus.findOneAndUpdate(
    { conversationId: conversation._id, userId: user._id },
    { lastReadMessageId: message._id, lastReadAt: new Date() },
    { upsert: true }
  );

  const audience = await getConversationAudience(conversation);
  const payload = { conversationId: String(conversation._id), message: messageJSON(message) };
  emitToUsers(audience, 'message:sent', payload);
  emitToConversation(conversation._id, 'message:sent', payload);

  logActivity(user, 'MESSAGE_SENT', 'Conversation', String(conversation._id), {
    messageId: String(message._id),
    type: conversation.conversationType,
  });

  return message;
}

/** Mark a conversation read for the requesting user (per-user read tracking, PRD §30). */
export async function markConversationRead(user, conversationId) {
  const { conversation } = await assertConversationAccess(user, conversationId, 'READ');
  if (!conversation.lastMessageId) return null;
  const status = await ReadStatus.findOneAndUpdate(
    { conversationId: conversation._id, userId: user._id },
    { lastReadMessageId: conversation.lastMessageId, lastReadAt: new Date() },
    { upsert: true, new: true }
  );
  const payload = {
    conversationId: String(conversation._id),
    userId: String(user._id),
    name: user.name,
    role: user.role,
    lastReadMessageId: String(conversation.lastMessageId),
  };
  emitToConversation(conversation._id, 'message:read', payload);
  return status;
}

/** Paginated message fetch — newest page first, older pages on demand (PRD §59). */
export async function listMessages(user, conversationId, { before = null, limit = 30 } = {}) {
  const { conversation } = await assertConversationAccess(user, conversationId, 'READ');
  const lim = Math.min(100, Math.max(1, parseInt(limit) || 30));
  const query = { conversationId: conversation._id };
  if (before) {
    const anchor = await Message.findById(before).select('timestamp');
    if (anchor) query.timestamp = { $lt: anchor.timestamp };
  }
  const docs = await Message.find(query).sort({ timestamp: -1 }).limit(lim + 1);
  const hasMore = docs.length > lim;
  const items = docs.slice(0, lim).reverse();
  return { items: items.map(messageJSON), hasMore };
}
