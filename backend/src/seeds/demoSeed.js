import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Platform from '../models/Platform.js';
import ConnectedAccount from '../models/ConnectedAccount.js';
import AccessGrant from '../models/AccessGrant.js';
import Customer from '../models/Customer.js';
import Group from '../models/Group.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import ReadStatus from '../models/ReadStatus.js';
import AssignmentHistory from '../models/AssignmentHistory.js';
import TemporaryAccess from '../models/TemporaryAccess.js';
import Notification from '../models/Notification.js';
import ActivityLog from '../models/ActivityLog.js';
import { CUSTOMER_NAMES, GROUP_NAMES } from './data.js';
import { seedThreads } from './threadSeeder.js';

const hash = (p) => bcrypt.hashSync(p, 10);
export const rand = (n) => Math.floor(Math.random() * n);
export const pick = (arr) => arr[rand(arr.length)];
export const daysAgo = (d) => new Date(Date.now() - d * 86400000);

export async function seedDemoData() {
  const models = [User, Platform, ConnectedAccount, AccessGrant, Customer, Group, Conversation, Message, ReadStatus, AssignmentHistory, TemporaryAccess, Notification, ActivityLog];
  for (const m of models) await m.deleteMany({});

  // Platforms — Telegram ACTIVE; Instagram/WhatsApp COMING SOON (PRD §9)
  const [telegram] = await Platform.create([
    { key: 'TELEGRAM', name: 'Telegram', status: 'ACTIVE', description: 'Business messaging via Telegram' },
    { key: 'INSTAGRAM', name: 'Instagram', status: 'COMING_SOON', description: 'Direct messages — coming soon' },
    { key: 'WHATSAPP', name: 'WhatsApp', status: 'COMING_SOON', description: 'Business API — coming soon' },
  ]);

  // Users — 1 admin, 2 managers, 6 employees (PRD §38/§64)
  const admin = await User.create({ name: 'System Admin', email: 'admin@example.com', password: hash('Admin@123'), role: 'ADMIN', avatarColor: '#5B5BD6', createdAt: daysAgo(60) });
  const manager1 = await User.create({ name: 'Bilal Ahmed', email: 'manager1@example.com', password: hash('Manager@123'), role: 'MANAGER', managerId: admin._id, avatarColor: '#7C6CF6', createdAt: daysAgo(50) });
  const manager2 = await User.create({ name: 'Hina Tariq', email: 'manager2@example.com', password: hash('Manager@123'), role: 'MANAGER', managerId: admin._id, avatarColor: '#F5A524', createdAt: daysAgo(48) });
  const empDefs = [
    ['Ahmed Raza', 'employee1@example.com', manager1, '#0EA5E9'],
    ['Sara Khan', 'employee2@example.com', manager1, '#EC4899'],
    ['Usman Ali', 'employee3@example.com', manager1, '#2FBF71'],
    ['Ayesha Malik', 'employee4@example.com', manager2, '#14B8A6'],
    ['Daniel Dsouza', 'employee5@example.com', manager2, '#6366F1'],
    ['Hassan Iqbal', 'employee6@example.com', manager2, '#E5484D'],
  ];
  const employees = [];
  for (const [name, email, mgr, color] of empDefs) {
    employees.push(await User.create({ name, email, password: hash('Employee@123'), role: 'EMPLOYEE', managerId: mgr._id, avatarColor: color, createdAt: daysAgo(40) }));
  }
  const [e1, e2, e3, e4, e5, e6] = employees;

  // Demo Telegram accounts (PRD §10) — no real credentials (PRD §55)
  const [acc1, acc2, acc3] = await ConnectedAccount.create([
    { platform: telegram._id, platformKey: 'TELEGRAM', name: 'Telegram Business Main', username: '@bizmain_demo', externalId: 'acct-main-001', mode: 'DEMO', createdBy: admin._id },
    { platform: telegram._id, platformKey: 'TELEGRAM', name: 'Telegram Sales', username: '@bizsales_demo', externalId: 'acct-sales-002', mode: 'DEMO', createdBy: admin._id },
    { platform: telegram._id, platformKey: 'TELEGRAM', name: 'Telegram Support', username: '@bizsupport_demo', externalId: 'acct-support-003', mode: 'DEMO', createdBy: admin._id },
  ]);

  // Admin → Manager grants (PRD §5)
  await AccessGrant.create([
    { userId: manager1._id, scopeType: 'ACCOUNT', accountId: acc1._id, actions: ['VIEW', 'READ', 'SEND', 'REPLY', 'ASSIGN', 'REASSIGN', 'RESOLVE', 'EDIT'], grantedBy: admin._id, note: 'Main business account' },
    { userId: manager1._id, scopeType: 'ACCOUNT', accountId: acc2._id, actions: ['VIEW', 'READ', 'SEND', 'REPLY', 'ASSIGN', 'REASSIGN', 'RESOLVE'], grantedBy: admin._id, note: 'Sales account' },
    { userId: manager2._id, scopeType: 'ACCOUNT', accountId: acc3._id, actions: ['VIEW', 'READ', 'SEND', 'REPLY', 'ASSIGN', 'REASSIGN', 'RESOLVE'], grantedBy: admin._id, note: 'Support account' },
  ]);

  // Customers — 60 total, ~70% assigned (PRD §11/§38)
  const customers = [];
  let ci = 0;
  for (const acc of [acc1, acc2, acc3]) {
    const count = acc._id.equals(acc1._id) ? 24 : 18;
    const team = acc._id.equals(acc3._id) ? [e4, e5, e6] : [e1, e2, e3];
    const manager = acc._id.equals(acc3._id) ? manager2 : manager1;
    for (let i = 0; i < count; i++) {
      const name = CUSTOMER_NAMES[ci % CUSTOMER_NAMES.length];
      const assigned = Math.random() < 0.7;
      const emp = assigned ? pick(team) : null;
      const doc = await Customer.create({
        platform: telegram._id,
        platformKey: 'TELEGRAM',
        accountId: acc._id,
        externalId: `tg-user-${1000 + ci}`,
        name,
        username: `@${name.toLowerCase().replace(/[^a-z]/g, '')}${100 + ci}`,
        phone: i % 3 === 0 ? `+92 3${rand(4) + 1}-${rand(9000000) + 1000000}` : '',
        assignedEmployeeId: emp ? emp._id : null,
        assignedAt: emp ? daysAgo(1 + rand(12)) : null,
        isOnline: Math.random() < 0.3,
        createdAt: daysAgo(2 + rand(14)),
      });
      customers.push({ ...doc.toObject(), _manager: manager, _emp: emp });
      ci++;
    }
  }

  // Groups — 12 with multiple employees (PRD §18/§38)
  const groups = [];
  for (let i = 0; i < GROUP_NAMES.length; i++) {
    const acc = i < 5 ? acc1 : i < 8 ? acc2 : acc3;
    const team = acc._id.equals(acc3._id) ? [e4, e5, e6] : [e1, e2, e3];
    const manager = acc._id.equals(acc3._id) ? manager2 : manager1;
    const members = [...team].sort(() => Math.random() - 0.5).slice(0, 2 + rand(3));
    const doc = await Group.create({
      platform: telegram._id,
      platformKey: 'TELEGRAM',
      accountId: acc._id,
      externalId: `tg-group-${2000 + i}`,
      name: GROUP_NAMES[i],
      memberEmployeeIds: members.map((m) => m._id),
      createdAt: daysAgo(5 + rand(20)),
    });
    groups.push({ ...doc.toObject(), _members: members, _manager: manager });
  }

  // Manager → Employee sample grants (within the manager's own ceiling)
  const e2Customers = customers.filter((c) => c._emp && c._emp._id.equals(e2._id));
  await AccessGrant.create([
    { userId: e2._id, scopeType: 'ACCOUNT', accountId: acc1._id, actions: ['VIEW', 'READ'], grantedBy: manager1._id, note: 'Read-only visibility of the main account' },
    { userId: e3._id, scopeType: 'CUSTOMER', customerId: e2Customers[0]?._id, actions: ['VIEW', 'READ', 'SEND', 'REPLY'], grantedBy: manager1._id, note: 'Coverage while Sara is away' },
    { userId: e6._id, scopeType: 'GROUP', groupId: groups[10]._id, actions: ['VIEW', 'READ', 'SEND', 'REPLY'], grantedBy: manager2._id, note: 'Corporate accounts support' },
  ]);

  const { messageCount } = await seedThreads({ admin, manager1, manager2, employees, customers, groups });
  console.log(`🌱 Demo data seeded → users: 9 | accounts: 3 | customers: ${customers.length} | groups: ${groups.length} | messages: ${messageCount}`);

}

export async function seedIfEmpty() {
  if ((await User.countDocuments()) === 0) {
    console.log('🌱 Database empty — seeding demo data...');
    await seedDemoData();
  }
}

export async function resetDemoData() {
  await seedDemoData();
}
