import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, default: 'System' },
    actorRole: { type: String, default: 'SYSTEM' },
    action: { type: String, required: true },
    resource: { type: String, default: '' },
    resourceId: { type: String, default: '' },
    metadata: { type: Object, default: {} },
    at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

activityLogSchema.index({ at: -1 });
activityLogSchema.index({ action: 1 });
activityLogSchema.index({ actorId: 1, at: -1 });

export default mongoose.model('ActivityLog', activityLogSchema);
