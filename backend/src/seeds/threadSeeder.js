import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import ReadStatus from '../models/ReadStatus.js';
import AssignmentHistory from '../models/AssignmentHistory.js';
import TemporaryAccess from '../models/TemporaryAccess.js';
import Notification from '../models/Notification.js';
import ActivityLog from '../models/ActivityLog.js';
import { INCOMING_TEMPLATES, OUTGOING_TEMPLATES, GROUP_INCOMING, GROUP_OUTGOING } from './data.js';
import { rand, pick, daysAgo } from './demoSeed.js';

const minsAgo = (m) => new Date(Date.now() - m * 60000);

/**
 * Builds realistic conversations, messages, read states, assignment history,
 * temporary access examples, notifications and audit logs (PRD §38).
 */
export async function seedThreads({ admin, manager1, manager2, employees, customers, groups }) {
  let messageCount = 0;

  for (const cust of customers) {
    const conv = await Conversation.create({ conversationType: 'CUSTOMER', accountId: cust.accountId, customerId: cust._id, status: 'ACTIVE', createdAt: cust.createdAt });
    const manager = cust._manager;
    const assignedEmp = cust._emp;
    const n = 4 + rand(11);
    const startMins = 60 * 24 * (1 + rand(12));
    let t = startMins;
    const msgs = [];

    for (let i = 0; i < n; i++) {
      const isIncoming = i % 2 === 0;
      t -= rand(50) + 6;
      const m = await Message.create({
        conversationId: conv._id,
        platform: cust.platform,
        platformKey: cust.platformKey,
        accountId: cust.accountId,
        externalMessageId: `seed-${cust._id}-${i}`,
        direction: isIncoming ? 'INCOMING' : 'OUTGOING',
        senderType: isIncoming ? 'CUSTOMER' : assignedEmp ? 'EMPLOYEE' : 'MANAGER',
        senderId: isIncoming ? null : assignedEmp ? assignedEmp._id : manager._id,
        customerExternalId: cust.externalId,
        content: isIncoming ? pick(INCOMING_TEMPLATES) : pick(OUTGOING_TEMPLATES),
        timestamp: minsAgo(t),
      });
      msgs.push(m);
      messageCount++;
    }

    // ~30% of threads end with an unread INCOMING message
    let endsUnread = false;
    if (Math.random() < 0.3) {
      const last = msgs[msgs.length - 1];
      last.direction = 'INCOMING';
      last.senderType = 'CUSTOMER';
      last.senderId = null;
      last.content = pick(INCOMING_TEMPLATES);
      await last.save();
      endsUnread = true;
    }
    const lastMsg = msgs[msgs.length - 1];
    conv.lastMessageId = lastMsg._id;
    conv.lastMessage = { content: lastMsg.content, direction: lastMsg.direction, senderType: lastMsg.senderType, at: lastMsg.timestamp };
    conv.lastMessageAt = lastMsg.timestamp;
    if (startMins > 60 * 24 * 6 && Math.random() < 0.25) conv.status = 'RESOLVED'; // older threads resolved
    await conv.save();

    // assignment history (PRD §15) + reassignment samples
    if (assignedEmp) {
      await AssignmentHistory.create({ customerId: cust._id, fromUserId: null, toUserId: assignedEmp._id, type: 'ASSIGNED', byUserId: manager._id, at: cust.assignedAt || cust.createdAt });
      if (Math.random() < 0.15) {
        const team = manager._id.equals(manager2._id) ? employees.slice(3) : employees.slice(0, 3);
        const others = team.filter((e) => !e._id.equals(assignedEmp._id));
        if (others.length) {
          const prev = pick(others);
          await AssignmentHistory.create({ customerId: cust._id, fromUserId: prev._id, toUserId: assignedEmp._id, type: 'REASSIGNED', byUserId: manager._id, at: cust.assignedAt || cust.createdAt });
        }
      }
      await ReadStatus.create({ conversationId: conv._id, userId: assignedEmp._id, lastReadMessageId: endsUnread ? msgs[msgs.length - 2]._id : lastMsg._id, lastReadAt: minsAgo(t - 2) });
    }
    if (Math.random() < 0.65) {
      await ReadStatus.create({ conversationId: conv._id, userId: manager._id, lastReadMessageId: lastMsg._id, lastReadAt: minsAgo(t - 5) });
    }
    if (Math.random() < 0.2) {
      await ReadStatus.create({ conversationId: conv._id, userId: admin._id, lastReadMessageId: lastMsg._id, lastReadAt: minsAgo(t - 8) });
    }
  }

  // group threads
  for (const grp of groups) {
    const conv = await Conversation.create({ conversationType: 'GROUP', accountId: grp.accountId, groupId: grp._id, status: 'ACTIVE', createdAt: grp.createdAt });
    const n = 6 + rand(7);
    let t = 60 * 24 * (1 + rand(10));
    const msgs = [];
    for (let i = 0; i < n; i++) {
      const isIncoming = i % 2 === 0;
      t -= rand(80) + 10;
      const sender = pick(grp._members);
      const m = await Message.create({
        conversationId: conv._id,
        platform: grp.platform,
        platformKey: grp.platformKey,
        accountId: grp.accountId,
        externalMessageId: `seedg-${grp._id}-${i}`,
        direction: isIncoming ? 'INCOMING' : 'OUTGOING',
        senderType: isIncoming ? 'CUSTOMER' : 'EMPLOYEE',
        senderId: isIncoming ? null : sender._id,
        customerExternalId: grp.externalId,
        content: isIncoming ? pick(GROUP_INCOMING) : pick(GROUP_OUTGOING),
        timestamp: minsAgo(t),
      });
      msgs.push(m);
      messageCount++;
    }
    const lastMsg = msgs[msgs.length - 1];
    conv.lastMessageId = lastMsg._id;
    conv.lastMessage = { content: lastMsg.content, direction: lastMsg.direction, senderType: lastMsg.senderType, at: lastMsg.timestamp };
    conv.lastMessageAt = lastMsg.timestamp;
    await conv.save();
    for (const mem of grp._members) {
      const fullyRead = Math.random() < 0.7;
      await ReadStatus.create({ conversationId: conv._id, userId: mem._id, lastReadMessageId: fullyRead ? lastMsg._id : msgs[msgs.length - 2]._id, lastReadAt: minsAgo(t - 3) });
    }
  }

  // temporary access examples (PRD §17)
  const [e1, e2, e3, e4, e6] = employees;
  const e4Custs = customers.filter((c) => c._emp && c._emp._id.equals(e4._id)).slice(0, 2);
  const e2Custs = customers.filter((c) => c._emp && c._emp._id.equals(e2._id)).slice(0, 1);
  await TemporaryAccess.create([
    { employeeId: e1._id, grantedToUserId: e3._id, scope: 'ALL', customerIds: [], status: 'ACTIVE', grantedBy: manager1._id, grantedAt: minsAgo(60 * 26), note: 'Covering while Ahmed Raza is on leave' },
    { employeeId: e4._id, grantedToUserId: e6._id, scope: 'SPECIFIC', customerIds: e4Custs.map((c) => c._id), status: 'ACTIVE', grantedBy: manager2._id, grantedAt: minsAgo(60 * 10), note: 'High-priority customers' },
    { employeeId: e2._id, grantedToUserId: e1._id, scope: 'SPECIFIC', customerIds: e2Custs.map((c) => c._id), status: 'REVOKED', grantedBy: manager1._id, grantedAt: daysAgo(8), revokedAt: daysAgo(3), revokedBy: manager1._id, note: 'Past coverage — revoked' },
  ]);

  // notification samples (PRD §34)
  const unassigned = customers.filter((c) => !c._emp).slice(0, 2);
  const e1Custs = customers.filter((c) => c._emp && c._emp._id.equals(e1._id)).slice(0, 2);
  await Notification.create([
    { userId: manager1._id, type: 'NEW_UNASSIGNED', title: 'New customer message (unassigned)', body: `${unassigned[0]?.name || 'A customer'}: ${pick(INCOMING_TEMPLATES).slice(0, 60)}`, meta: { demo: true }, createdAt: minsAgo(45) },
    { userId: manager2._id, type: 'NEW_UNASSIGNED', title: 'New customer message (unassigned)', body: `${unassigned[1]?.name || 'A customer'}: ${pick(INCOMING_TEMPLATES).slice(0, 60)}`, meta: { demo: true }, createdAt: minsAgo(120) },
    { userId: e1._id, type: 'NEW_MESSAGE', title: 'New customer message', body: `${e1Custs[0]?.name || 'Customer'}: ${pick(INCOMING_TEMPLATES).slice(0, 60)}`, meta: { demo: true }, createdAt: minsAgo(30) },
    { userId: e1._id, type: 'CUSTOMER_ASSIGNED', title: 'New customer assigned', body: `${e1Custs[1]?.name || 'Customer'} has been assigned to you.`, meta: { demo: true }, createdAt: minsAgo(300) },
    { userId: e3._id, type: 'TEMP_ACCESS_GRANTED', title: 'Temporary access granted', body: 'You can now temporarily manage all customers of Ahmed Raza.', meta: { demo: true }, createdAt: minsAgo(60 * 26) },
    { userId: e4._id, type: 'TEMP_ACCESS_GRANTED', title: 'Temporary access', body: 'Hassan Iqbal was granted temporary access to your customers.', meta: { demo: true }, createdAt: minsAgo(60 * 10) },
  ]);

  // audit log samples (PRD §49)
  await ActivityLog.create([
    { actorId: admin._id, actorName: admin.name, actorRole: 'ADMIN', action: 'USER_CREATED', resource: 'User', resourceId: String(manager1._id), metadata: { role: 'MANAGER' }, at: daysAgo(50) },
    { actorId: admin._id, actorName: admin.name, actorRole: 'ADMIN', action: 'PERMISSION_GRANTED', resource: 'AccessGrant', resourceId: 'seed', metadata: { note: 'Account access granted to Bilal Ahmed' }, at: daysAgo(49) },
    { actorId: manager1._id, actorName: manager1.name, actorRole: 'MANAGER', action: 'USER_CREATED', resource: 'User', resourceId: String(e1._id), metadata: { role: 'EMPLOYEE' }, at: daysAgo(40) },
    { actorId: admin._id, actorName: admin.name, actorRole: 'ADMIN', action: 'ACCOUNT_CREATED', resource: 'ConnectedAccount', resourceId: 'acct-main-001', metadata: { name: 'Telegram Business Main' }, at: daysAgo(45) },
  ]);
  return { messageCount };
}
