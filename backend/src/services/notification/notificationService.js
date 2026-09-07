import Notification from '../../models/Notification.js';
import { emitToUsers } from '../../sockets/index.js';

/**
 * Create + push notifications to a set of users in real time (PRD §34).
 */
export async function notifyUsers(userIds, { type, title, body = '', meta = {} }) {
  const unique = [...new Set((userIds || []).filter(Boolean).map(String))];
  if (!unique.length) return [];
  const docs = await Notification.insertMany(
    unique.map((userId) => ({ userId, type, title, body, meta }))
  );
  for (const d of docs) {
    emitToUsers([String(d.userId)], 'notification:new', d.toJSON ? d.toJSON() : d);
  }
  return docs;
}

export async function notifyUser(userId, payload) {
  return notifyUsers([userId], payload);
}
