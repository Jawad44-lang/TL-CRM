import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    platform: { type: mongoose.Schema.Types.ObjectId, ref: 'Platform', required: true },
    platformKey: { type: String, required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'ConnectedAccount', required: true },
    externalMessageId: { type: String, default: '' },
    direction: { type: String, enum: ['INCOMING', 'OUTGOING'], required: true },
    // Internal sender tracking (PRD §22) — customer only ever sees "Business Account" (PRD §23)
    senderType: { type: String, enum: ['CUSTOMER', 'EMPLOYEE', 'MANAGER', 'ADMIN', 'SYSTEM'], required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    customerExternalId: { type: String, default: '' },
    content: { type: String, default: '' },
    media: {
      type: { type: String, enum: ['image', 'file', null], default: null },
      url: { type: String, default: '' },
      name: { type: String, default: '' },
    },
    deliveredAt: { type: Date, default: null },
    timestamp: { type: Date, required: true },
  },
  { timestamps: false }
);

messageSchema.index({ conversationId: 1, timestamp: -1 });
messageSchema.index({ externalMessageId: 1 }, { unique: true, sparse: true });

export default mongoose.model('Message', messageSchema);
