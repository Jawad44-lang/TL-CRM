import AccessGrant, { ACTIONS } from '../models/AccessGrant.js';
import ConnectedAccount from '../models/ConnectedAccount.js';
import Platform from '../models/Platform.js';
import Group from '../models/Group.js';
import Customer from '../models/Customer.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { validateGrantCreation } from '../services/permission/ceilingService.js';
import { getGrantedAccountIds, getVisibleGroupIds, getVisibleCustomerIds } from '../services/permission/permissionService.js';
import { assertCanManageUser } from './userController.js';
import { notifyUser } from '../services/notification/notificationService.js';
import { emitToUsers } from '../sockets/index.js';
import { logActivity } from '../utils/logActivity.js';


// GET /api/access/actions
export const listActions = asyncHandler(async (req, res) => {
  res.json({ success: true, actions: ACTIONS });
});

// GET /api/access?userId=
export const listGrants = asyncHandler(async (req, res) => {
  const userId = req.query.userId || String(req.user._id);
  await assertCanManageUser(req.user, userId);
  const items = await AccessGrant.find({ userId })
    .sort({ createdAt: -1 })
    .populate('platformId', 'name key')
    .populate('accountId', 'name platformKey')
    .populate('groupId', 'name')
    .populate('customerId', 'name')
    .populate('grantedBy', 'name role');
  res.json({ success: true, items });
});

// GET /api/access/options — resources the REQUESTER (granter) can offer
export const grantOptions = asyncHandler(async (req, res) => {
  const [platforms, accounts, groups, customers] = await Promise.all([
    Platform.find().select('key name status'),
    req.user.role === 'ADMIN'
      ? ConnectedAccount.find().select('name platformKey status')
      : ConnectedAccount.find({ _id: { $in: await grantedAccountIds(req.user) } }).select('name platformKey status'),
    Group.find(await (async () => {
      if (req.user.role === 'ADMIN') return {};
      const ids = await getVisibleGroupIds(req.user);
      return { _id: { $in: ids } };
    })()).select('name accountId').limit(200),
    Customer.find(await (async () => {
      if (req.user.role === 'ADMIN') return {};
      const ids = await getVisibleCustomerIds(req.user);
      return { _id: { $in: ids } };
    })()).select('name accountId assignedEmployeeId').limit(200),
  ]);
  res.json({ success: true, platforms, accounts, groups, customers, actions: ACTIONS });
});

// POST /api/access { userId, scopeType, platformId|accountId|groupId|customerId, actions[], note? }
export const createGrant = asyncHandler(async (req, res) => {
  const { userId, scopeType, platformId = null, accountId = null, groupId = null, customerId = null, actions = [], note = '' } = req.body || {};
  if (!userId || !scopeType) throw new ApiError(400, 'userId and scopeType are required.');

  // MANDATORY ceiling validation (PRD §8)
  await validateGrantCreation(req.user, { userId, scopeType, platformId, accountId, groupId, customerId, actions });

  const grant = await AccessGrant.create({ userId, scopeType, platformId, accountId, groupId, customerId, actions, note, grantedBy: req.user._id });
  const grantee = await (await import('../models/User.js')).default.findById(userId).select('name');
  await notifyUser(userId, {
    type: 'PERMISSION_GRANTED',
    title: 'New access granted',
    body: `${req.user.name} granted you ${scopeType.toLowerCase()}-level access (${actions.join(', ')}).`,
    meta: { grantId: String(grant._id) },
  });
  emitToUsers([userId], 'permission:updated', { userId });
  logActivity(req.user, 'PERMISSION_GRANTED', 'AccessGrant', String(grant._id), { userId, scopeType, actions, grantee: grantee?.name });
  res.status(201).json({ success: true, message: 'Permission granted.', grant });
});

// DELETE /api/access/:id
export const deleteGrant = asyncHandler(async (req, res) => {
  const grant = await AccessGrant.findById(req.params.id);
  if (!grant) throw new ApiError(404, 'Grant not found.');
  if (req.user.role === 'MANAGER' && String(grant.grantedBy || '') !== String(req.user._id)) {
    throw new ApiError(403, 'You can only revoke permissions you granted.');
  }
  if (req.user.role === 'EMPLOYEE') throw new ApiError(403, 'You do not have permission to revoke permissions.');
  await grant.deleteOne();
  await notifyUser(grant.userId, {
    type: 'PERMISSION_REVOKED',
    title: 'Access revoked',
    body: `${req.user.name} revoked a ${grant.scopeType.toLowerCase()}-level access.`,
    meta: {},
  });
  emitToUsers([String(grant.userId)], 'permission:updated', { userId: String(grant.userId) });
  logActivity(req.user, 'PERMISSION_REVOKED', 'AccessGrant', String(req.params.id), { userId: String(grant.userId) });
  res.json({ success: true, message: 'Permission revoked.' });
});
