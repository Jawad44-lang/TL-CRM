import ConnectedAccount from '../models/ConnectedAccount.js';
import Customer from '../models/Customer.js';
import Group from '../models/Group.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { processIncomingMessage } from '../services/message/messageProcessor.js';
import { visibleCustomerQuery, visibleGroupQuery } from '../services/permission/permissionService.js';
import { resetDemoData, seedIfEmpty } from '../seeds/demoSeed.js';
import { logActivity } from '../utils/logActivity.js';

const FIRST_NAMES = ['Zain', 'Fatima', 'Omar', 'Areeba', 'Hamza', 'Maryam', 'Saad', 'Noor', 'Bilal', 'Iqra', 'Kamran', 'Rida'];

// GET /api/demo/options — data for the Message Simulator (PRD §40)
export const getDemoOptions = asyncHandler(async (req, res) => {
  if (req.user.role === 'EMPLOYEE') throw new ApiError(403, 'Only managers and admins can use the message simulator.');
  const [accounts, customers, groups] = await Promise.all([
    ConnectedAccount.find({ status: 'CONNECTED' }).select('name platformKey mode'),
    Customer.find(await visibleCustomerQuery(req.user)).select('name accountId externalId assignedEmployeeId').limit(300),
    Group.find(await visibleGroupQuery(req.user)).select('name accountId externalId').limit(100),
  ]);
  res.json({ success: true, accounts, customers, groups });
});

// POST /api/demo/message { accountId, type, targetId|'NEW', content }
export const simulateMessage = asyncHandler(async (req, res) => {
  if (req.user.role === 'EMPLOYEE') throw new ApiError(403, 'Only managers and admins can use the message simulator.');
  const { accountId, type = 'CUSTOMER', targetId, content } = req.body || {};
  if (!accountId || !targetId || !content) throw new ApiError(400, 'accountId, targetId and content are required.');

  const account = await ConnectedAccount.findById(accountId);
  if (!account) throw new ApiError(404, 'Account not found.');

  let externalId, senderName, isGroup = type === 'GROUP';

  if (targetId === 'NEW' && !isGroup) {
    // Brand-new customer — tests the New/Unassigned flow (PRD §13)
    const name = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    externalId = `demo-new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    senderName = `${name} (Demo)`;
  } else if (isGroup) {
    const group = await Group.findById(targetId);
    if (!group) throw new ApiError(404, 'Group not found.');
    externalId = group.externalId;
    senderName = group.name;
  } else {
    const customer = await Customer.findById(targetId);
    if (!customer) throw new ApiError(404, 'Customer not found.');
    externalId = customer.externalId;
    senderName = customer.name;
  }

  const result = await processIncomingMessage({
    accountId: account._id,
    externalId,
    isGroup,
    senderName,
    senderUsername: '',
    content,
  });
  logActivity(req.user, 'DEMO_MESSAGE_SENT', 'Conversation', String(result.conversation._id), { simulated: true });
  res.json({
    success: true,
    message: 'Demo message injected into the pipeline.',
    conversationId: String(result.conversation._id),
    messageId: String(result.message._id),
    customerId: result.customer ? String(result.customer._id) : null,
    assignedEmployeeId: result.customer?.assignedEmployeeId ? String(result.customer.assignedEmployeeId) : null,
  });
});

// POST /api/demo/reset (admin, dev-only) — wipe + reseed (PRD §39)
export const resetDemo = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') throw new ApiError(403, 'Only admins can reset demo data.');
  await resetDemoData();
  res.json({ success: true, message: 'Demo data has been reset. Please log in again (sessions were reseeded).' });
});

// POST /api/demo/seed (admin, dev-only)
export const seedDemo = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') throw new ApiError(403, 'Only admins can seed demo data.');
  const { User } = await import('../models/User.js');
  const existing = await User.countDocuments();
  if (existing > 0) return res.json({ success: true, message: `Database already has ${existing} users — use Reset instead.` });
  await seedIfEmpty();
  res.json({ success: true, message: 'Demo data seeded.' });
});
