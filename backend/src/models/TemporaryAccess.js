import mongoose from 'mongoose';

// Temporary customer management (PRD §17) — never changes permanent assignment
const temporaryAccessSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // original owner
    grantedToUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // temporary manager
    scope: { type: String, enum: ['SPECIFIC', 'ALL'], required: true },
    customerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }], // used when scope = SPECIFIC
    status: { type: String, enum: ['ACTIVE', 'REVOKED'], default: 'ACTIVE' },
    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    grantedAt: { type: Date, default: Date.now },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    revokedAt: { type: Date, default: null },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

temporaryAccessSchema.index({ grantedToUserId: 1, status: 1 });
temporaryAccessSchema.index({ employeeId: 1 });

export default mongoose.model('TemporaryAccess', temporaryAccessSchema);
