import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Group from '../models/Group.js';
import TemporaryAccess from '../models/TemporaryAccess.js';
import AccessGrant from '../models/AccessGrant.js';
import ReadStatus from '../models/ReadStatus.js';
import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logActivity } from '../utils/logActivity.js';
import { emitToUsers } from '../sockets/index.js';
import { escapeRegex } from '../utils/regex.js';

const PALETTE = ['#5B5BD6', '#7C6CF6', '#E5484D', '#2FBF71', '#F5A524', '#0EA5E9', '#EC4899', '#14B8A6'];

export async function assertCanManageUser(user, targetId) {
  const target = await User.findById(targetId);
  if (!target) throw new ApiError(404, 'User not found.');
  if (user.role === 'ADMIN') return target;
  if (user.role === 'MANAGER') {
    if (String(target._id) === String(user._id)) return target;
    if (String(target.managerId || '') === String(user._id) && target.role === 'EMPLOYEE') return target;
    throw new ApiError(403, 'You can only manage your own employees.');
  }
  if (String(target._id) === String(user._id)) return target;
  throw new ApiError(403, 'You do not have permission to access this user.');
}

// GET /api/users?role=&q=
export const listUsers = asyncHandler(async (req, res) => {
  if (req.user.role === 'EMPLOYEE') throw new ApiError(403, 'You do not have permission to list users.');
  const { role = '', q = '' } = req.query;
  const and = [];
  if (req.user.role === 'MANAGER') {
    and.push({ role: 'EMPLOYEE', managerId: req.user._id });
  } else if (role) {
    and.push({ role });
  }
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    and.push({ $or: [{ name: rx }, { email: rx }] });
  }
  const query = and.length > 1 ? { $and: and } : and[0] || {};
  const items = await User.find(query).sort({ createdAt: 1 }).populate('managerId', 'name role').limit(500);
  res.json({ success: true, items: items.map((u) => u.toSafeJSON()) });
});

// POST /api/users
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone = '', managerId = null } = req.body || {};
  if (!name || !email || !password) throw new ApiError(400, 'Name, email and password are required.');
  if (String(password).length < 6) throw new ApiError(400, 'Password must be at least 6 characters.');

  let finalRole;
  let finalManager = null;
  if (req.user.role === 'ADMIN') {
    finalRole = role === 'MANAGER' ? 'MANAGER' : 'EMPLOYEE';
    if (finalRole === 'EMPLOYEE' && managerId) {
      finalManager = await User.findById(managerId);
      if (!finalManager || finalManager.role !== 'MANAGER') throw new ApiError(400, 'Invalid manager for employee.');
    }
  } else if (req.user.role === 'MANAGER') {
    finalRole = 'EMPLOYEE';
    finalManager = req.user;
  } else {
    throw new ApiError(403, 'You do not have permission to create users.');
  }

  const user = await User.create({
    name,
    email: String(email).toLowerCase().trim(),
    password: await bcrypt.hash(String(password), 10),
    role: finalRole,
    managerId: finalRole === 'MANAGER' ? (req.user.role === 'ADMIN' ? null : req.user._id) : finalManager?._id || null,
    phone,
    avatarColor: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    createdBy: req.user._id,
  });

  logActivity(req.user, 'USER_CREATED', 'User', String(user._id), { role: finalRole, email: user.email });
  res.status(201).json({ success: true, message: `${finalRole.toLowerCase()} created.`, user: user.toSafeJSON() });
});

// GET /api/users/:id
export const getUser = asyncHandler(async (req, res) => {
  const target = await assertCanManageUser(req.user, req.params.id);
  await target.populate('managerId', 'name role');
  res.json({ success: true, user: target.toSafeJSON() });
});

// PATCH /api/users/:id
export const updateUser = asyncHandler(async (req, res) => {
  const target = await assertCanManageUser(req.user, req.params.id);
  const { name, email, password, phone, status } = req.body || {};

  if (name !== undefined) target.name = name;
  if (phone !== undefined) target.phone = phone;
  if (email !== undefined) target.email = String(email).toLowerCase().trim();
  if (password) {
    if (String(password).length < 6) throw new ApiError(400, 'Password must be at least 6 characters.');
    target.password = await bcrypt.hash(String(password), 10);
  }

  let disabledNow = false;
  if (status !== undefined) {
    if (!['ACTIVE', 'DISABLED'].includes(status)) throw new ApiError(400, 'Invalid status.');
    if (String(target._id) === String(req.user._id) && status === 'DISABLED') {
      throw new ApiError(400, 'You cannot disable your own account.');
    }
    if (target.status !== status) {
      target.status = status;
      if (status === 'DISABLED') disabledNow = true;
    }
  }

  await target.save();

  // PRD §16: disabling an employee does NOT auto-reassign customers — assignments stay unchanged.
  if (disabledNow) {
    logActivity(req.user, 'EMPLOYEE_DISABLED', 'User', String(target._id), { note: 'Assignments remain unchanged.' });
    if (target.managerId) {
      const { notifyUser } = await import('../services/notification/notificationService.js');
      await notifyUser(target.managerId, {
        type: 'EMPLOYEE_DISABLED',
        title: 'Employee disabled',
        body: `${target.name} has been disabled. Their customer assignments remain unchanged — use Temporary Access if needed.`,
        meta: { userId: String(target._id) },
      });
    }
    emitToUsers([String(target._id)], 'account:disabled', { message: 'Your account has been disabled.' });
  } else {
    logActivity(req.user, 'USER_UPDATED', 'User', String(target._id), {});
  }
  emitToUsers([String(target._id)], 'employee:updated', { userId: String(target._id) });

  res.json({ success: true, message: 'User updated.', user: target.toSafeJSON() });
});

// DELETE /api/users/:id (admin only — "where appropriate")
export const deleteUser = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') throw new ApiError(403, 'Only admins can delete users.');
  const target = await User.findById(req.params.id);
  if (!target) throw new ApiError(404, 'User not found.');
  if (String(target._id) === String(req.user._id)) throw new ApiError(400, 'You cannot delete your own account.');

  if (target.role === 'MANAGER') {
    const employees = await User.countDocuments({ managerId: target._id });
    if (employees > 0) throw new ApiError(400, `This manager still has ${employees} employee(s). Reassign or delete them first.`);
  }
  if (target.role === 'EMPLOYEE') {
    const assigned = await Customer.countDocuments({ assignedEmployeeId: target._id });
    if (assigned > 0) throw new ApiError(400, `This employee still has ${assigned} assigned customer(s). Reassign them first.`);
  }

  await Group.updateMany({ memberEmployeeIds: target._id }, { $pull: { memberEmployeeIds: target._id } });
  await Promise.all([
    AccessGrant.deleteMany({ userId: target._id }),
    TemporaryAccess.deleteMany({ $or: [{ employeeId: target._id }, { grantedToUserId: target._id }] }),
    Notification.deleteMany({ userId: target._id }),
    ReadStatus.deleteMany({ userId: target._id }),
  ]);
  await target.deleteOne();

  logActivity(req.user, 'USER_DELETED', 'User', String(target._id), { role: target.role, email: target.email });
  res.json({ success: true, message: 'User deleted.' });
});

