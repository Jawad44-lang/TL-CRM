import mongoose from 'mongoose';

// A conversation belongs to exactly one connected account and is either CUSTOMER or GROUP (PRD §47)
const conversationSchema = new mongoose.Schema(
  {
    conversationType: { type: String, enum: ['CUSTOMER', 'GROUP'], required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'ConnectedAccount', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    status: { type: String, enum: ['ACTIVE', 'RESOLVED'], default: 'ACTIVE' },
    lastMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    lastMessage: {
      content: { type: String, default: '' },
      direction: { type: String, enum: ['INCOMING', 'OUTGOING'] },
      senderType: { type: String, enum: ['CUSTOMER', 'EMPLOYEE', 'MANAGER', 'ADMIN', 'SYSTEM'] },
      at: { type: Date },
    },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ conversationType: 1, customerId: 1 });
conversationSchema.index({ conversationType: 1, groupId: 1 });

export default mongoose.model('Conversation', conversationSchema);
