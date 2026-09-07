import Platform from '../models/Platform.js';
import ConnectedAccount from '../models/ConnectedAccount.js';
import Customer from '../models/Customer.js';
import Group from '../models/Group.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getGrantedAccountIds } from '../services/permission/permissionService.js';
import { logActivity } from '../utils/logActivity.js';

// GET /api/platforms
export const listPlatforms = asyncHandler(async (req, res) => {
  const items = await Platform.find().sort({ name: 1 });
  res.json({ success: true, items });
});

// GET /api/accounts (scope-filtered)
export const listAccounts = asyncHandler(async (req, res) => {
  let query = {};
  if (req.user.role !== 'ADMIN') {
    const ids = await getGrantedAccountIds(req.user);
    query = { _id: { $in: ids } };
  }
  const items = await ConnectedAccount.find(query).sort({ createdAt: 1 }).populate('platform', 'name status');
  res.json({ success: true, items });
});

// POST /api/accounts (admin) — demo accounts only, no real credentials (PRD §10/§55)
export const createAccount = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') throw new ApiError(403, 'Only admins can create accounts.');
  const { platformKey, name, username = '' } = req.body || {};
  if (!platformKey || !name) throw new ApiError(400, 'platformKey and name are required.');
  const platform = await Platform.findOne({ key: String(platformKey).toUpperCase() });
  if (!platform) throw new ApiError(404, 'Platform not found.');
  if (platform.status !== 'ACTIVE') throw new ApiError(400, `${platform.name} is marked COMING SOON — only active platforms can be connected.`);

  const account = await ConnectedAccount.create({
    platform: platform._id,
    platformKey: platform.key,
    name,
    username,
    externalId: `acct-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    mode: 'DEMO',
    createdBy: req.user._id,
  });
  logActivity(req.user, 'ACCOUNT_CREATED', 'ConnectedAccount', String(account._id), { name, platformKey: platform.key });
  res.status(201).json({ success: true, message: 'Demo account created.', account });
});

// PATCH /api/accounts/:id (admin)
export const updateAccount = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') throw new ApiError(403, 'Only admins can update accounts.');
  const account = await ConnectedAccount.findById(req.params.id);
  if (!account) throw new ApiError(404, 'Account not found.');
  const { name, username, status, mode } = req.body || {};
  if (name !== undefined) account.name = name;
  if (username !== undefined) account.username = username;
  if (status !== undefined && ['CONNECTED', 'DISCONNECTED'].includes(status)) account.status = status;
  if (mode !== undefined && ['DEMO', 'LIVE'].includes(mode)) {
    if (mode === 'LIVE') throw new ApiError(400, 'LIVE mode is reserved for future Telegram integration (Phase 2).');
    account.mode = mode;
  }
  await account.save();
  logActivity(req.user, 'ACCOUNT_UPDATED', 'ConnectedAccount', String(account._id), {});
  res.json({ success: true, message: 'Account updated.', account });
});

// DELETE /api/accounts/:id (admin)
export const deleteAccount = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') throw new ApiError(403, 'Only admins can delete accounts.');
  const account = await ConnectedAccount.findById(req.params.id);
  if (!account) throw new ApiError(404, 'Account not found.');
  const [customers, groups] = await Promise.all([
    Customer.countDocuments({ accountId: account._id }),
    Group.countDocuments({ accountId: account._id }),
  ]);
  if (customers > 0 || groups > 0) {
    throw new ApiError(400, `Cannot delete — this account has ${customers} customer(s) and ${groups} group(s).`);
  }
  await account.deleteOne();
  logActivity(req.user, 'ACCOUNT_DELETED', 'ConnectedAccount', String(req.params.id), {});
  res.json({ success: true, message: 'Account deleted.' });
});
