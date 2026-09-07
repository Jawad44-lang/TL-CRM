import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Not authenticated. Please log in.');

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new ApiError(401, 'Session expired or invalid token. Please log in again.');
  }

  const user = await User.findById(payload.id);
  if (!user) throw new ApiError(401, 'User account no longer exists.');
  if (user.status === 'DISABLED') throw new ApiError(403, 'Your account has been disabled. Contact your administrator.');

  req.user = user;
  next();
});

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, 'You do not have permission to perform this action.'));
  }
  next();
};
