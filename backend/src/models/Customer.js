import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    platform: { type: mongoose.Schema.Types.ObjectId, ref: 'Platform', required: true },
    platformKey: { type: String, required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'ConnectedAccount', required: true },
    externalId: { type: String, required: true }, // platform-side id (demo)
    name: { type: String, required: true },
    username: { type: String, default: '' },
    profileImage: { type: String, default: '' },
    phone: { type: String, default: '' },
    status: { type: String, enum: ['ACTIVE', 'BLOCKED'], default: 'ACTIVE' },
    // Exactly ONE permanent assigned employee (PRD §12)
    assignedEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedAt: { type: Date, default: null },
    isOnline: { type: Boolean, default: false },
    lastMessageAt: { type: Date, default: null },
  },
  { timestamps: true }
);

customerSchema.index({ accountId: 1, externalId: 1 }, { unique: true });
customerSchema.index({ assignedEmployeeId: 1 });
customerSchema.index({ lastMessageAt: -1 });

export default mongoose.model('Customer', customerSchema);
