import mongoose from 'mongoose';

const platformSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, uppercase: true }, // TELEGRAM | INSTAGRAM | WHATSAPP
    name: { type: String, required: true },
    status: { type: String, enum: ['ACTIVE', 'COMING_SOON'], default: 'COMING_SOON' },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Platform', platformSchema);
