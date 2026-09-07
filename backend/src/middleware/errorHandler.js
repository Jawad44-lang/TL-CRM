import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors || {}).map((e) => e.message).join(', ') || 'Validation failed';
  }
  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier format.';
  }
  if (err.code === 11000) {
    status = 409;
    message = `Duplicate value for: ${Object.keys(err.keyValue || {}).join(', ')}`;
  }

  if (status >= 500) console.error('[error]', err);
  // Never expose internal stack traces to users (PRD §60)
  res.status(status).json({ success: false, message });
}
