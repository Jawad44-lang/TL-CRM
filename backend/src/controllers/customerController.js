import Customer from '../models/Customer.js';
import Conversation from '../models/Conversation.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { assertCustomerAccess, visibleCustomerQuery } from '../services/permission/permissionService.js';
import { assignCustomerToEmployee } from '../services/assignment/assignmentService.js';
import { paginate, pageMeta } from '../utils/pagination.js';
import { escapeRegex } from '../utils/regex.js';

// GET /api/customers  (scope-filtered, PRD §58)
export const listCustomers = asyncHandler(async (req, res) => {
  const { filter = 'all', q = '', accountId = '' } = req.query;
  const base = await visibleCustomerQuery(req.user);
  const and = [base];
  if (filter === 'assigned') and.push({ assignedEmployeeId: { $ne: null } });
  if (filter === 'unassigned') and.push({ assignedEmployeeId: null });
  if (accountId) and.push({ accountId });
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    and.push({ $or: [{ name: rx }, { username: rx }, { phone: rx }] });
  }
  const query = and.length > 1 ? { $and: and } : and[0];

  const { skip, limit, page } = paginate(req.query);
  const [items, total] = await Promise.all([
    Customer.find(query)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('assignedEmployeeId', 'name avatarColor role')
      .populate('accountId', 'name platformKey'),
    Customer.countDocuments(query),
  ]);
  res.json({ success: true, items, ...pageMeta(total, { skip, limit, page }) });
});

// GET /api/customers/:id
export const getCustomer = asyncHandler(async (req, res) => {
  const customer = await assertCustomerAccess(req.user, req.params.id, 'VIEW');
  await customer.populate([
    { path: 'assignedEmployeeId', select: 'name role avatarColor' },
    { path: 'accountId', select: 'name platformKey' },
  ]);
  const conv = await Conversation.findOne({ conversationType: 'CUSTOMER', customerId: customer._id }).select('_id status');
  res.json({
    success: true,
    customer,
    conversationId: conv?._id ? String(conv._id) : null,
    conversationStatus: conv?.status || null,
  });
});

// POST /api/customers/:id/assign { employeeId }
export const assignCustomer = asyncHandler(async (req, res) => {
  const { employeeId } = req.body || {};
  if (!employeeId) throw new ApiError(400, 'employeeId is required.');
  const customer = await assignCustomerToEmployee(req.user, req.params.id, employeeId);
  res.json({ success: true, message: 'Customer assigned.', customer });
});

// POST /api/customers/:id/reassign { employeeId }
export const reassignCustomer = asyncHandler(async (req, res) => {
  const { employeeId } = req.body || {};
  if (!employeeId) throw new ApiError(400, 'employeeId is required.');
  const customer = await assignCustomerToEmployee(req.user, req.params.id, employeeId);
  res.json({ success: true, message: 'Customer reassigned.', customer });
});
