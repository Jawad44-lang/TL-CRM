import User from '../../models/User.js';
import TemporaryAccess from '../../models/TemporaryAccess.js';
import ApiError from '../../utils/ApiError.js';
import { assertCustomerAccess } from '../permission/permissionService.js';
import { notifyUser } from '../notification/notificationService.js';
import { emitToUsers } from '../../sockets/index.js';
import { logActivity } from '../../utils/logActivity.js';
import { assertEmployeeTarget } from './assignmentService.js';

/**
 * Temporary customer management (PRD §17) — never changes permanent assignment.
 * scope SPECIFIC = selected customers; ALL = every customer of the source employee.
 */
export async function grantTemporaryAccess(user, { employeeId, grantedToUserId, scope, customerIds = [], note = '' }) {
  if (user.role === 'EMPLOYEE') throw new ApiError(403, 'Only managers and admins can grant temporary access.');
  const source = await assertEmployeeTarget(user, employeeId);
  const target = await assertEmployeeTarget(user, grantedToUserId);
  if (String(source._id) === String(target._id)) throw new ApiError(400, 'Target employee already owns these customers.');

  let ids = [];
  if (scope === 'SPECIFIC') {
    if (!customerIds?.length) throw new ApiError(400, 'Select at least one customer.');
    for (const id of customerIds) {
      const c = await assertCustomerAccess(user, id, 'ASSIGN');
      if (String(c.assignedEmployeeId || '') !== String(source._id)) {
        throw new ApiError(400, `${c.name} is not assigned to ${source.name}.`);
      }
      ids.push(c._id);
    }
  }

  const doc = await TemporaryAccess.create({
    employeeId: source._id,
    grantedToUserId: target._id,
    scope,
    customerIds: ids,
    status: 'ACTIVE',
    grantedBy: user._id,
    grantedAt: new Date(),
    note,
  });

  await notifyUser(target._id, {
    type: 'TEMP_ACCESS_GRANTED',
    title: 'Temporary access granted',
    body:
      scope === 'ALL'
        ? `You can now temporarily manage all customers of ${source.name}.`
        : `You can now temporarily manage ${ids.length} customer(s) of ${source.name}.`,
    meta: { temporaryAccessId: String(doc._id) },
  });
  await notifyUser(source._id, {
    type: 'TEMP_ACCESS_GRANTED',
    title: 'Temporary access',
    body: `${target.name} was granted temporary access to your customers.`,
    meta: { temporaryAccessId: String(doc._id) },
  });
  emitToUsers([String(target._id), String(source._id)], 'tempaccess:changed', { temporaryAccessId: String(doc._id) });
  logActivity(user, 'TEMP_ACCESS_GRANTED', 'TemporaryAccess', String(doc._id), {
    employeeId: String(source._id),
    grantedToUserId: String(target._id),
    scope,
    count: ids.length,
  });
  return doc;
}

export async function revokeTemporaryAccess(user, id) {
  if (user.role === 'EMPLOYEE') throw new ApiError(403, 'Only managers and admins can revoke temporary access.');
  const doc = await TemporaryAccess.findById(id);
  if (!doc) throw new ApiError(404, 'Temporary access not found.');
  if (user.role === 'MANAGER' && String(doc.grantedBy || '') !== String(user._id)) {
    throw new ApiError(403, 'You can only revoke access you granted.');
  }
  if (doc.status !== 'ACTIVE') throw new ApiError(400, 'Temporary access is already revoked.');

  doc.status = 'REVOKED';
  doc.revokedAt = new Date();
  doc.revokedBy = user._id;
  await doc.save();

  const [source, target] = await Promise.all([User.findById(doc.employeeId), User.findById(doc.grantedToUserId)]);
  await notifyUser(doc.grantedToUserId, {
    type: 'TEMP_ACCESS_REMOVED',
    title: 'Temporary access removed',
    body: `Your temporary access to ${source?.name || 'the'} customers was removed.`,
    meta: { temporaryAccessId: String(doc._id) },
  });
  await notifyUser(doc.employeeId, {
    type: 'TEMP_ACCESS_REMOVED',
    title: 'Temporary access removed',
    body: `${target?.name || 'A user'}'s temporary access to your customers was removed.`,
    meta: { temporaryAccessId: String(doc._id) },
  });
  emitToUsers([String(doc.grantedToUserId), String(doc.employeeId)], 'tempaccess:changed', { temporaryAccessId: String(doc._id) });
  logActivity(user, 'TEMP_ACCESS_REMOVED', 'TemporaryAccess', String(doc._id), {});
  return doc;
}
