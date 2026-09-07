import Notification from '../models/Notification.js';
import asyncHandler from '../utils/asyncHandler.js';
import { paginate, pageMeta } from '../utils/pagination.js';

// GET /api/notifications?unreadOnly=
export const listNotifications = asyncHandler(async (req, res) => {
  const { unreadOnly = '' } = req.query;
  const query = { userId: req.user._id };
  if (unreadOnly === 'true' || unreadOnly === '1') query.read = false;

  const { skip, limit, page } = paginate(req.query, { limit: 30 });
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId: req.user._id, read: false }),
  ]);
  res.json({ success: true, items, unreadCount, ...pageMeta(total, { skip, limit, page }) });
});

// POST /api/notifications/:id/read
export const markNotificationRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOne({ _id: req.params.id, userId: req.user._id });
  if (n && !n.read) {
    n.read = true;
    n.readAt = new Date();
    await n.save();
  }
  res.json({ success: true, message: 'Notification marked as read.' });
});

// POST /api/notifications/read-all
export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true, readAt: new Date() });
  res.json({ success: true, message: 'All notifications marked as read.' });
});
