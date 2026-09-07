import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logActivity } from '../utils/logActivity.js';

const signToken = (user) => jwt.sign({ id: String(user._id) }, env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw new ApiError(400, 'Email and password are required.');

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(401, 'Invalid email or password.');
  }
  if (user.status === 'DISABLED') throw new ApiError(403, 'Your account has been disabled. Contact your administrator.');

  logActivity(user, 'USER_LOGIN', 'User', String(user._id), {});
  res.json({ success: true, token: signToken(user), user: user.toSafeJSON() });
});

// POST /api/auth/logout (token is dropped client-side)
export const logout = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Logged out.' });
});

// GET /api/auth/me
export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toSafeJSON() });
});
