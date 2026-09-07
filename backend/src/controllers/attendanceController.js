import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Customer from '../models/Customer.js';

const STATUSES = ['PRESENT', 'ABSENT', 'LEAVE', 'LATE'];
const WEIGHTS = [0.82, 0.05, 0.07, 0.06]; // present, absent, leave, late (demo distribution)

function pickStatus() {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < STATUSES.length; i++) {
    acc += WEIGHTS[i];
    if (r < acc) return STATUSES[i];
  }
  return 'PRESENT';
}

function daysOfMonth(month) { // month = 'YYYY-MM'
  const [y, m] = month.split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) throw new ApiError(400, 'Invalid month. Use YYYY-MM.');
  const total = new Date(y, m, 0).getDate();
  const today = new Date();
  const days = [];
  for (let d = 1; d <= total; d++) {
    const dt = new Date(y, m - 1, d, 23, 59, 59);
    if (dt > today) break; // future days skip
    days.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return days;
}

// Who attendance is shown for — ADMIN: employees + managers, MANAGER: their own team
async function audienceUsers(req) {
  if (req.user.role === 'ADMIN') {
    return User.find({ role: { $in: ['EMPLOYEE', 'MANAGER'] } }).select('name role avatarColor');
  }
  if (req.user.role === 'MANAGER') {
    return User.find({ role: 'EMPLOYEE', managerId: req.user._id }).select('name role avatarColor');
  }
  throw new ApiError(403, 'You do not have access to attendance.');
}

// Demo data — records are auto-generated on the first request for a month
async function ensureMonth(month, users) {
  const days = daysOfMonth(month);
  if (!days.length || !users.length) return;
  const userIds = users.map((u) => u._id);
  const existing = await Attendance.countDocuments({
    user: { $in: userIds },
    date: { $gte: days[0], $lte: days[days.length - 1] },
  });
  if (existing >= userIds.length * days.length * 0.5) return; // already generated
  const docs = [];
  for (const u of users) {
    for (const day of days) {
      docs.push({ user: u._id, date: day, status: pickStatus() });
    }
  }
  await Attendance.insertMany(docs, { ordered: false }).catch(() => {});
}

const summarize = (days, byDate) => {
  const summary = { PRESENT: 0, ABSENT: 0, LEAVE: 0, LATE: 0 };
  days.forEach((d) => { const s = byDate[d]; if (s) summary[s] += 1; });
  const tracked = days.length;
  const percent = tracked ? Math.round(((summary.PRESENT + summary.LATE) / tracked) * 100) : 0;
  return { ...summary, tracked, percent };
};

/* GET /api/attendance?month=YYYY-MM — per-user day-by-day attendance */
export const attendanceMonth = asyncHandler(async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const users = await audienceUsers(req);
  await ensureMonth(month, users);
  const userIds = users.map((u) => u._id);
  const records = await Attendance.find({ user: { $in: userIds }, date: new RegExp(`^${month}-`) }).lean();
  const days = daysOfMonth(month);
  const items = users.map((u) => {
    const byDate = {};
    records.filter((r) => String(r.user) === String(u._id)).forEach((r) => { byDate[r.date] = r.status; });
    return {
      user: { _id: u._id, name: u.name, role: u.role, avatarColor: u.avatarColor },
      days: byDate,
      summary: summarize(days, byDate),
    };
  });
  res.json({ success: true, month, days, items });
});

/* GET /api/performance?month=YYYY-MM — attendance % + messages + customers + score */
export const performanceMonth = asyncHandler(async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const users = await audienceUsers(req);
  await ensureMonth(month, users);
  const [y, m] = month.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  const userIds = users.map((u) => u._id);
  const records = await Attendance.find({ user: { $in: userIds }, date: new RegExp(`^${month}-`) }).lean();
  const days = daysOfMonth(month);
  const items = [];
  for (const u of users) {
    const byDate = {};
    records.filter((r) => String(r.user) === String(u._id)).forEach((r) => { byDate[r.date] = r.status; });
    const summary = summarize(days, byDate);
    const [messagesSent, customersAssigned] = await Promise.all([
      Message.countDocuments({ senderId: u._id, direction: 'OUTGOING', timestamp: { $gte: start, $lt: end } }),
      Customer.countDocuments({ assignedEmployeeId: u._id }),
    ]);
    const activityScore = Math.min(100, Math.round((messagesSent / 50) * 100));
    const score = Math.round(summary.percent * 0.5 + activityScore * 0.3 + (Math.min(customersAssigned, 10) / 10) * 100 * 0.2);
    items.push({
      user: { _id: u._id, name: u.name, role: u.role, avatarColor: u.avatarColor },
      summary,
      messagesSent,
      customersAssigned,
      score,
    });
  }
  items.sort((a, b) => b.score - a.score);
  res.json({ success: true, month, items });
});