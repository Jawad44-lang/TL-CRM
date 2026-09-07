import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendOutgoingMessage, listMessages } from '../services/message/messageService.js';

// GET /api/messages/:conversationId?before=&limit=
export const listConversationMessages = asyncHandler(async (req, res) => {
  const { before = '', limit = 30 } = req.query;
  const result = await listMessages(req.user, req.params.conversationId, { before: before || null, limit });
  res.json({ success: true, ...result });
});

// POST /api/messages/:conversationId { content, media }
export const sendMessage = asyncHandler(async (req, res) => {
  const { content = '', media = null } = req.body || {};
  if (!content && !media) throw new ApiError(400, 'Message content is required.');
  const message = await sendOutgoingMessage(req.user, req.params.conversationId, { content, media });
  res.status(201).json({ success: true, message: 'Message sent.', data: messageJSONSafe(message) });
});

function messageJSONSafe(m) {
  return {
    _id: String(m._id),
    conversationId: String(m.conversationId),
    direction: m.direction,
    senderType: m.senderType,
    content: m.content,
    media: m.media || null,
    timestamp: m.timestamp,
  };
}


