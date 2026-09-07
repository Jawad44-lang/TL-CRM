import AccessGrant from '../../models/AccessGrant.js';
import ConnectedAccount from '../../models/ConnectedAccount.js';
import Customer from '../../models/Customer.js';
import Group from '../../models/Group.js';
import User from '../../models/User.js';

/**
 * Users who should receive real-time events / notifications for a conversation.
 * Computed server-side so unauthorized users never receive socket events (PRD §57).
 */
export async function getConversationAudience(conversation, { includeAdmins = true } = {}) {
  const ids = new Set();
  const addIfActive = async (userId) => {
    if (!userId) return;
    const u = await User.findById(userId).select('status');
    if (u && u.status === 'ACTIVE') ids.add(String(u._id));
  };

  const resolveRef = async (ref, Model) =>
    ref && typeof ref === 'object' ? ref : await Model.findById(ref);

  if (conversation.conversationType === 'CUSTOMER') {
    const customer = await resolveRef(conversation.customerId, Customer);
    if (customer?.assignedEmployeeId) {
      await addIfActive(customer.assignedEmployeeId);
      const emp = await User.findById(customer.assignedEmployeeId).select('managerId');
      if (emp?.managerId) await addIfActive(emp.managerId); // manager monitoring (PRD §14)
    }
  } else {
    const group = await resolveRef(conversation.groupId, Group);
    for (const memberId of group?.memberEmployeeIds || []) await addIfActive(memberId);
    const emps = await User.find({ _id: { $in: group?.memberEmployeeIds || [] } }).select('managerId');
    for (const e of emps) if (e.managerId) await addIfActive(e.managerId); // managers per access (PRD §19)
  }

  const account = await resolveRef(conversation.accountId, ConnectedAccount);
  if (account) {
    const grantUsers = await AccessGrant.find({
      $or: [
        { scopeType: 'ACCOUNT', accountId: account._id },
        { scopeType: 'PLATFORM', platformId: account.platform },
      ],
    }).distinct('userId');
    for (const uid of grantUsers) await addIfActive(uid);
  }

  if (includeAdmins) {
    const admins = await User.find({ role: 'ADMIN', status: 'ACTIVE' }).select('_id');
    admins.forEach((a) => ids.add(String(a._id)));
  }
  return [...ids];
}
