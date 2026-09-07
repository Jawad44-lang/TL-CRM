import mongoose from 'mongoose';

export const ACTIONS = ['VIEW', 'READ', 'SEND', 'REPLY', 'DELETE', 'EDIT', 'ASSIGN', 'REASSIGN', 'RESOLVE', 'MANAGE'];

// Granular permission grant (PRD §7): scope PLATFORM > ACCOUNT > GROUP/CUSTOMER + actions
const accessGrantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    scopeType: { type: String, enum: ['PLATFORM', 'ACCOUNT', 'GROUP', 'CUSTOMER'], required: true },
    platformId: { type: mongoose.Schema.Types.ObjectId, ref: 'Platform', default: null },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'ConnectedAccount', default: null },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    actions: [{ type: String, enum: ACTIONS }],
    note: { type: String, default: '' },
    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

accessGrantSchema.index({ userId: 1, scopeType: 1 });

export default mongoose.model('AccessGrant', accessGrantSchema);
