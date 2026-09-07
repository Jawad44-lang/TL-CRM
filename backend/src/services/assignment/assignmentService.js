import Customer from '../../models/Customer.js';
import User from '../../models/User.js';
import Conversation from '../../models/Conversation.js';
import AssignmentHistory from '../../models/AssignmentHistory.js';
import ApiError from '../../utils/ApiError.js';
import { assertCustomerAccess, getConversationAudience } from '../permission/permissionService.js';
import { notifyUser } from '../notification/notificationService.js';
import { emitToUsers, emitToConversation } from '../../sockets/index.js';
import { logActivity } from '../../utils/logActivity.js';
import { conversationSummary } from '../../utils/serialize.js';

export async function assertEmployeeTarget(user, employeeId, { mustBeActive = true } = {}) {
  const employee = await User.findById(employeeId);
  if (!employee || employee.role !== 'EMPLOYEE') throw new ApiError(400, 'Target must be an employee.');
  if (mustBeActive && employee.status !== 'ACTIVE') throw new ApiError(400, `${employee.name} is currently disabled.`);
  if (user.role === 'MANAGER' && String(employee.managerId || '') !== String(user._id)) {
    throw new ApiError(403, 'You can only manage your own employees.');
  }
  return employee;
}

export async function conversationForCustomer(customerId) {
  return Conversation.findOne({ conversationType: 'CUSTOMER', customerId });
}

/**
 * Permanent assignment — exactly ONE employee per customer (PRD §12).
 * First assignment vs reassignment history is stored separately (PRD §15).
 */
export async function assignCustomerToEmployee(user, customerId, employeeId) {
  const customer = await assertCustomerAccess(user, customerId, 'ASSIGN');
  const employee = await assertEmployeeTarget(user, employeeId);

  const previousId = customer.assignedEmployeeId ? String(customer.assignedEmployeeId) : null;
  if (previousId === String(employee._id)) throw new ApiError(400, 'Customer is already assigned to this employee.');

  customer.assignedEmployeeId = employee._id;
  customer.assignedAt = new Date();
  await customer.save();

  await AssignmentHistory.create({
    customerId: customer._id,
    fromUserId: previousId || null,
    toUserId: employee._id,
    type: previousId ? 'REASSIGNED' : 'ASSIGNED',
    byUserId: user._id,
    at: new Date(),
  });

  const wasReassign = Boolean(previousId);
  await notifyUser(employee._id, {
    type: 'CUSTOMER_ASSIGNED',
    title: wasReassign ? 'Customer reassigned to you' : 'New customer assigned',
    body: `${customer.name} has been ${wasReassign ? 'reassigned' : 'assigned'} to you.`,
    meta: { customerId: String(customer._id) },
  });
  if (previousId && previousId !== String(employee._id)) {
    await notifyUser(previousId, {
      type: 'CUSTOMER_REASSIGNED',
      title: 'Customer reassigned',
      body: `${customer.name} was reassigned to ${employee.name}.`,
      meta: { customerId: String(customer._id) },
    });
  }

  const conv = await conversationForCustomer(customer._id);
  if (conv) {
    const audience = await getConversationAudience(conv);
    emitToUsers([...audience, String(employee._id)], 'conversation:updated', {
      conversation: conversationSummary(conv, customer, null),
    });
    emitToConversation(conv._id, 'conversation:updated', {
      conversation: conversationSummary(conv, customer, null),
    });
  }
  emitToUsers([String(employee._id), ...(previousId ? [previousId] : [])], wasReassign ? 'customer:reassigned' : 'customer:assigned', {
    customerId: String(customer._id),
    employeeId: String(employee._id),
    previousEmployeeId: previousId,
  });

  logActivity(user, wasReassign ? 'CUSTOMER_REASSIGNED' : 'CUSTOMER_ASSIGNED', 'Customer', String(customer._id), {
    from: previousId,
    to: String(employee._id),
  });
  return customer;
}
