import mongoose from 'mongoose';

// Groups can have MULTIPLE assigned employees (PRD §18)
const groupSchema = new mongoose.Schema(
  {
    platform: { type: mongoose.Schema.Types.ObjectId, ref: 'Platform', required: true },
    platformKey: { type: String, required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'ConnectedAccount', required: true },
    externalId: { type: String, required: true },
    name: { type: String, required: true },
    memberEmployeeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
    lastMessageAt: { type: Date, default: null },
  },
  { timestamps: true }
);

groupSchema.index({ accountId: 1, externalId: 1 }, { unique: true });
groupSchema.index({ memberEmployeeIds: 1 });

export default mongoose.model('Group', groupSchema);
