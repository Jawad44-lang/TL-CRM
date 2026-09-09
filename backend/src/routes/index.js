import { Router } from 'express';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import { protect, requireRole } from '../middleware/auth.js';
import * as auth from '../controllers/authController.js';
import * as users from '../controllers/userController.js';
import * as userProfile from '../controllers/userProfileController.js';
import * as customers from '../controllers/customerController.js';
import * as conversations from '../controllers/conversationController.js';
import * as messages from '../controllers/messageController.js';
import * as groups from '../controllers/groupController.js';
import * as tempAccess from '../controllers/tempAccessController.js';
import * as notifications from '../controllers/notificationController.js';
import * as platforms from '../controllers/platformController.js';
import * as access from '../controllers/accessController.js';
import * as dashboard from '../controllers/dashboardController.js';
import * as demo from '../controllers/demoController.js';
import * as activity from '../controllers/activityController.js';
import * as attendance from '../controllers/attendanceController.js';

const r = Router();

/* ------------------------------- Auth ------------------------------- */
r.post('/auth/login', auth.login);
r.post('/auth/logout', protect, auth.logout);
r.get('/auth/me', protect, auth.me);

/* ------------------------------- Users ------------------------------ */
r.get('/users', protect, users.listUsers);
r.post('/users', protect, requireRole('ADMIN', 'MANAGER'), users.createUser);
r.get('/users/:id', protect, users.getUser);
r.patch('/users/:id', protect, requireRole('ADMIN', 'MANAGER'), users.updateUser);
r.delete('/users/:id', protect, requireRole('ADMIN'), users.deleteUser);
r.get('/users/:id/profile', protect, userProfile.getUserProfile);

/* ----------------------------- Customers ---------------------------- */
r.get('/customers', protect, customers.listCustomers);
r.get('/customers/:id', protect, customers.getCustomer);
r.post('/customers/:id/assign', protect, requireRole('ADMIN', 'MANAGER', 'EMPLOYEE'), customers.assignCustomer);
r.post('/customers/:id/reassign', protect, requireRole('ADMIN', 'MANAGER', 'EMPLOYEE'), customers.reassignCustomer);

/* --------------------------- Conversations -------------------------- */
r.get('/conversations', protect, conversations.listConversations);
r.get('/conversations/:id', protect, conversations.getConversation);
r.get('/conversations/:id/files', protect, conversations.getConversationFiles);
r.post('/conversations/:id/read', protect, conversations.markRead);
r.post('/conversations/:id/resolve', protect, conversations.toggleResolve);

/* ------------------------------ Messages ---------------------------- */
r.get('/messages/:conversationId', protect, messages.listConversationMessages);
r.post('/messages/:conversationId', protect, messages.sendMessage);

/* ------------------------------- Groups ----------------------------- */
r.get('/groups', protect, groups.listGroups);
r.post('/groups/:id/assign', protect, groups.assignGroup);
r.delete('/groups/:id/assign/:employeeId', protect, groups.unassignGroup);
r.get('/groups/:id', protect, groups.getGroup);

/* --------------------------- Temporary Access ------------------------ */
r.post('/temporary-access', protect, tempAccess.createTempAccess);
r.get('/temporary-access', protect, tempAccess.listTempAccess);
r.delete('/temporary-access/:id', protect, tempAccess.revokeTempAccess);

/* ---------------------------- Notifications -------------------------- */
r.get('/notifications', protect, notifications.listNotifications);
r.post('/notifications/read-all', protect, notifications.markAllNotificationsRead);
r.post('/notifications/:id/read', protect, notifications.markNotificationRead);

/* -------------------------- Platforms & Accounts --------------------- */
r.get('/platforms', protect, platforms.listPlatforms);
r.get('/accounts', protect, platforms.listAccounts);
r.post('/accounts', protect, requireRole('ADMIN'), platforms.createAccount);
r.patch('/accounts/:id', protect, requireRole('ADMIN'), platforms.updateAccount);
r.delete('/accounts/:id', protect, requireRole('ADMIN'), platforms.deleteAccount);

/* ---------------------------- Permissions ---------------------------- */
r.get('/access/actions', protect, access.listActions);
r.get('/access/options', protect, access.grantOptions);
r.get('/access', protect, access.listGrants);
r.post('/access', protect, requireRole('ADMIN', 'MANAGER'), access.createGrant);
r.delete('/access/:id', protect, requireRole('ADMIN', 'MANAGER'), access.deleteGrant);

/* ------------------------------ Dashboard ---------------------------- */
r.get('/dashboard', protect, dashboard.getDashboard);

/* ----------------------------- Activity Logs -------------------------- */
r.get('/activity', protect, activity.listActivity);

/* ----------------------- Attendance & Performance ---------------------- */
r.get('/attendance', protect, requireRole('ADMIN', 'MANAGER'), attendance.attendanceMonth);
r.get('/performance', protect, requireRole('ADMIN', 'MANAGER'), attendance.performanceMonth);

/* -------------------------------- Demo -------------------------------- */
const demoOnly = (req, res, next) => (env.DEMO_MODE ? next() : next(new ApiError(403, 'Demo tools are disabled (DEMO_MODE=false).')));
r.get('/demo/options', protect, requireRole('ADMIN', 'MANAGER'), demoOnly, demo.getDemoOptions);
r.post('/demo/message', protect, requireRole('ADMIN', 'MANAGER'), demoOnly, demo.simulateMessage);
r.post('/demo/reset', protect, requireRole('ADMIN'), demoOnly, demo.resetDemo);
r.post('/demo/seed', protect, requireRole('ADMIN'), demoOnly, demo.seedDemo);

export default r;
