import ActivityLog from '../models/ActivityLog.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getTeamUserIds } from '../services/permission/permissionService.js';
import { paginate, pageMeta } from '../utils/pagination.js';

// GET /api/activity?action=&page=
export const listActivity = asyncHandler(async (req, res) => {
  const { action = '' } = req.query;
  const and = [];
  if (req.user.role === 'EMPLOYEE') {
    and.push({ actorId: req.user._id });
  } else if (req.user.role === 'MANAGER') {
    const teamIds = await getTeamUserIds(req.user);
    and.push({ actorId: { $in: [...teamIds, String(req.user._id)] } });
  } // admin: all
  if (action) and.push({ action });
  const query = and.length > 1 ? { $and: and } : and[0] || {};

  const { skip, limit, page } = paginate(req.query, { limit: 30 });
  const [items, total] = await Promise.all([
    ActivityLog.find(query).sort({ at: -1 }).skip(skip).limit(limit),
    ActivityLog.countDocuments(query),
  ]);
  res.json({ success: true, items, ...pageMeta(total, { skip, limit, page }) });
});
