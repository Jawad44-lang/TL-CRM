import TemporaryAccess from '../models/TemporaryAccess.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { grantTemporaryAccess, revokeTemporaryAccess } from '../services/assignment/tempAccessService.js';
import { getTeamUserIds } from '../services/permission/permissionService.js';
import { paginate, pageMeta } from '../utils/pagination.js';

// POST /api/temporary-access { employeeId, grantedToUserId, scope, customerIds?, note? }
export const createTempAccess = asyncHandler(async (req, res) => {
  const { employeeId, grantedToUserId, scope, customerIds = [], note = '' } = req.body || {};
  if (!employeeId || !grantedToUserId || !scope) throw new ApiError(400, 'employeeId, grantedToUserId and scope are required.');
  if (!['SPECIFIC', 'ALL'].includes(scope)) throw new ApiError(400, 'Invalid scope.');
  const doc = await grantTemporaryAccess(req.user, { employeeId, grantedToUserId, scope, customerIds, note });
  res.status(201).json({ success: true, message: 'Temporary access granted.', tempAccess: doc });
});

// GET /api/temporary-access?status=
export const listTempAccess = asyncHandler(async (req, res) => {
  const { status = '' } = req.query;
  const and = [];
  if (req.user.role === 'EMPLOYEE') {
    and.push({ $or: [{ grantedToUserId: req.user._id }, { employeeId: req.user._id }] });
  } else if (req.user.role === 'MANAGER') {
    const teamIds = await getTeamUserIds(req.user);
    and.push({
      $or: [{ grantedBy: req.user._id }, { employeeId: { $in: [...teamIds, req.user._id] } }, { grantedToUserId: { $in: [...teamIds, req.user._id] } }],
    });
  } // admin: all
  if (status && ['ACTIVE', 'REVOKED'].includes(status)) and.push({ status });
  const query = and.length > 1 ? { $and: and } : and[0] || {};

  const { skip, limit, page } = paginate(req.query, { limit: 50 });
  const [items, total] = await Promise.all([
    TemporaryAccess.find(query)
      .sort({ grantedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('employeeId', 'name avatarColor')
      .populate('grantedToUserId', 'name avatarColor')
      .populate('grantedBy', 'name')
      .populate('revokedBy', 'name')
      .populate({ path: 'customerIds', select: 'name', options: { limit: 10 } }),
    TemporaryAccess.countDocuments(query),
  ]);
  res.json({
    success: true,
    items: items.map((t) => ({
      ...t.toJSON(),
      customerCount: t.scope === 'ALL' ? null : t.customerIds.length,
      customerNames: (t.customerIds || []).map((c) => c.name),
    })),
    ...pageMeta(total, { skip, limit, page }),
  });
});

// DELETE /api/temporary-access/:id
export const revokeTempAccess = asyncHandler(async (req, res) => {
  const doc = await revokeTemporaryAccess(req.user, req.params.id);
  res.json({ success: true, message: 'Temporary access revoked.', tempAccess: doc });
});

