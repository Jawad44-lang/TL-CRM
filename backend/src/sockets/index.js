import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import { assertConversationAccess } from '../services/permission/permissionService.js';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, { cors: { origin: true, credentials: false } });

  // Handshake authentication (PRD §58)
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));
      const payload = jwt.verify(token, env.JWT_SECRET);
      const user = await User.findById(payload.id);
      if (!user || user.status !== 'ACTIVE') return next(new Error('Unauthorized'));
      socket.data.userId = String(user._id);
      socket.data.user = user;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    socket.join(`user:${socket.data.userId}`);

    // Rooms are permission-aware: users can only join conversations they can read (PRD §57)
    socket.on('conversation:join', async (conversationId) => {
      try {
        await assertConversationAccess(user, conversationId, 'READ');
        socket.join(`conversation:${String(conversationId)}`);
      } catch (e) {
        socket.emit('socket:error', { message: e.message });
      }
    });

    socket.on('conversation:leave', (conversationId) => {
      if (conversationId) socket.leave(`conversation:${String(conversationId)}`);
    });

    // Internal typing indicator (PRD §33)
    socket.on('typing:start', async ({ conversationId } = {}) => {
      if (!conversationId) return;
      try {
        await assertConversationAccess(user, conversationId, 'READ');
        socket.to(`conversation:${String(conversationId)}`).emit('typing:start', {
          conversationId: String(conversationId),
          userId: socket.data.userId,
          name: user.name,
          role: user.role,
        });
      } catch {
        /* unauthorized — ignore silently */
      }
    });

    socket.on('typing:stop', ({ conversationId } = {}) => {
      if (!conversationId) return;
      socket.to(`conversation:${String(conversationId)}`).emit('typing:stop', {
        conversationId: String(conversationId),
        userId: socket.data.userId,
      });
    });
  });

  console.log('✅ Socket.IO initialized (permission-aware rooms)');
  return io;
}

export function getIO() {
  return io;
}

/** Emit an event to specific users' personal rooms only (server-computed recipients). */
export function emitToUsers(userIds, event, payload) {
  if (!io || !userIds?.length) return;
  [...new Set(userIds.map(String))].forEach((uid) => io.to(`user:${uid}`).emit(event, payload));
}

/** Emit to everyone currently viewing a conversation. */
export function emitToConversation(conversationId, event, payload) {
  if (!io || !conversationId) return;
  io.to(`conversation:${String(conversationId)}`).emit(event, payload);
}
