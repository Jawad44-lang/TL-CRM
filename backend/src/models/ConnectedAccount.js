import mongoose from 'mongoose';

const connectedAccountSchema = new mongoose.Schema(
  {
    platform: { type: mongoose.Schema.Types.ObjectId, ref: 'Platform', required: true },
    platformKey: { type: String, required: true, uppercase: true },
    name: { type: String, required: true },
    username: { type: String, default: '' },
    status: { type: String, enum: ['CONNECTED', 'DISCONNECTED'], default: 'CONNECTED' },
    externalId: { type: String, required: true }, // fake external id (demo) — no real credentials (PRD §55)
    // adapter mode: DEMO adapter is active in Phase 1; LIVE reserved for future Telegram integration (PRD §67)
    mode: { type: String, enum: ['DEMO', 'LIVE'], default: 'DEMO' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

connectedAccountSchema.index({ platformKey: 1 });

export default mongoose.model('ConnectedAccount', connectedAccountSchema);
