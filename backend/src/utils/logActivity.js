import ActivityLog from '../models/ActivityLog.js';

/**
 * Fire-and-forget audit logger (PRD §49).
 * logActivity(actorUser, 'CUSTOMER_ASSIGNED', 'Customer', id, { ...meta })
 */
export function logActivity(actor, action, resource, resourceId, metadata = {}) {
  return ActivityLog.create({
    actorId: actor?._id || null,
    actorName: actor?.name || 'System',
    actorRole: actor?.role || 'SYSTEM',
    action,
    resource,
    resourceId: resourceId || null,
    metadata,
    at: new Date(),
  }).catch((err) => console.error('[activity-log]', err.message));
}
