import mongoose from 'mongoose';

// Complete assignment history (PRD §15)
const assignmentHistorySchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    type: { type: String, enum: ['ASSIGNED', 'REASSIGNED'], required: true },
    byUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

assignmentHistorySchema.index({ customerId: 1, at: -1 });
assignmentHistorySchema.index({ toUserId: 1, at: -1 });
assignmentHistorySchema.index({ fromUserId: 1, at: -1 });

export default mongoose.model('AssignmentHistory', assignmentHistorySchema);
