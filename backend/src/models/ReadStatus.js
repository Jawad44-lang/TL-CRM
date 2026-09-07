import mongoose from 'mongoose';

// Per-user independent read tracking (PRD §30)
const readStatusSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastReadMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    lastReadAt: { type: Date, default: null },
  },
  { timestamps: true }
);

readStatusSchema.index({ conversationId: 1, userId: 1 }, { unique: true });
readStatusSchema.index({ userId: 1 });

export default mongoose.model('ReadStatus', readStatusSchema);
