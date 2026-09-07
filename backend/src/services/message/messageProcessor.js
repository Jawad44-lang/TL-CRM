import ConnectedAccount from '../../models/ConnectedAccount.js';
import Customer from '../../models/Customer.js';
import Group from '../../models/Group.js';
import Conversation from '../../models/Conversation.js';
import Message from '../../models/Message.js';
import ApiError from '../../utils/ApiError.js';
import { notifyUsers } from '../notification/notificationService.js';
import { getConversationAudience } from '../permission/audienceService.js';
import { emitToUsers, emitToConversation } from '../../sockets/index.js';
import { conversationSummary, messageJSON } from '../../utils/serialize.js';

async function upsertConversationLastMessage(conversation, message) {
  conversation.lastMessageId = message._id;
  conversation.lastMessage = {
    content: message.content,
    direction: message.direction,
    senderType: message.senderType,
    at: message.timestamp,
  };
  conversation.lastMessageAt = message.timestamp;
  await conversation.save();
}

/**
 * COMMON MESSAGE PROCESSING PIPELINE (PRD §41).
 * Every incoming message — demo now, real Telegram webhook later — flows through here:
 *   Identify Account → Identify Customer/Group → Check Assignment → Save Message
 *   → Create Notifications → Emit Socket.IO Events
 */
export async function processIncomingMessage({
  accountId,
  externalId,
  isGroup = false,
  senderName,
  senderUsername = '',
  content,
  media = null,
  externalMessageId = null,
  timestamp = null,
}) {
  // 1) Identify account
  const account = await ConnectedAccount.findById(accountId);
  if (!account) throw new ApiError(404, 'Account not found.');
  if (account.status !== 'CONNECTED') throw new ApiError(400, 'Account is disconnected.');

  const ts = timestamp ? new Date(timestamp) : new Date();
  const extId = externalMessageId || `in-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // 2) Identify customer / group (create on first contact)
  let customer = null;
  let group = null;
  let conversation;
  let isNewConversation = false;

  if (isGroup) {
    group = await Group.findOneAndUpdate(
      { accountId: account._id, externalId },
      {
        $setOnInsert: {
          platform: account.platform,
          platformKey: account.platformKey,
          accountId: account._id,
          externalId,
          name: senderName || `Group ${externalId}`,
          memberEmployeeIds: [],
          status: 'ACTIVE',
        },
      },
      { new: true, upsert: true }
    );
    conversation = await Conversation.findOne({ conversationType: 'GROUP', groupId: group._id });
    if (!conversation) {
      conversation = await Conversation.create({ conversationType: 'GROUP', accountId: account._id, groupId: group._id });
      isNewConversation = true;
    }
  } else {
    customer = await Customer.findOneAndUpdate(
      { accountId: account._id, externalId },
      {
        $setOnInsert: {
          platform: account.platform,
          platformKey: account.platformKey,
          accountId: account._id,
          externalId,
          name: senderName || `Customer ${externalId}`,
          username: senderUsername,
          status: 'ACTIVE',
          assignedEmployeeId: null,
        },
      },
      { new: true, upsert: true }
    );
    conversation = await Conversation.findOne({ conversationType: 'CUSTOMER', customerId: customer._id });
    if (!conversation) {
      conversation = await Conversation.create({ conversationType: 'CUSTOMER', accountId: account._id, customerId: customer._id });
      isNewConversation = true;
    }
  }

  // 3) Save message (INCOMING from the platform-side sender)
  const message = await Message.create({
    conversationId: conversation._id,
    platform: account.platform,
    platformKey: account.platformKey,
    accountId: account._id,
    externalMessageId: extId,
    direction: 'INCOMING',
    senderType: 'CUSTOMER',
    senderId: null,
    customerExternalId: externalId,
    content,
    media,
    timestamp: ts,
  });

  // 4) Update conversation + entity activity
  await upsertConversationLastMessage(conversation, message);
  if (customer) {
    customer.lastMessageAt = ts;
    await customer.save();
  }
  if (group) {
    group.lastMessageAt = ts;
    await group.save();
  }

  // 5) Server-computed audience + notifications (PRD §34)
  const audience = await getConversationAudience(conversation);
  const displayName = isGroup ? group?.name : customer?.name;
  const notifType = isGroup
    ? 'GROUP_MESSAGE'
    : customer?.assignedEmployeeId
      ? 'NEW_MESSAGE'
      : 'NEW_UNASSIGNED';
  const notifTitle =
    notifType === 'NEW_UNASSIGNED' ? 'New customer message (unassigned)' : isGroup ? 'New group message' : 'New customer message';

  await notifyUsers(audience, {
    type: notifType,
    title: notifTitle,
    body: `${displayName}: ${String(content || '[media]').slice(0, 70)}`,
    meta: {
      conversationId: String(conversation._id),
      customerId: customer ? String(customer._id) : null,
      groupId: group ? String(group._id) : null,
      accountId: String(account._id),
    },
  });

  // 6) Real-time events (PRD §57)
  const payload = { conversationId: String(conversation._id), message: messageJSON(message) };
  emitToUsers(audience, 'message:new', {
    ...payload,
    conversation: conversationSummary(conversation, customer, group),
  });
  emitToConversation(conversation._id, 'message:new', payload);
  if (isNewConversation) {
    emitToUsers(audience, 'conversation:new', {
      conversation: conversationSummary(conversation, customer, group),
    });
  }

  return { conversation, message, customer, group, audience };
}
