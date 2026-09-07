import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
    password: { type: String, required: [true, 'Password is required'], select: false },
    role: { type: String, enum: ['ADMIN', 'MANAGER', 'EMPLOYEE'], required: true },
    status: { type: String, enum: ['ACTIVE', 'DISABLED'], default: 'ACTIVE' },
    // Manager of an employee / admin of a manager (hierarchy)
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    phone: { type: String, default: '' },
    avatarColor: { type: String, default: '#5B5BD6' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, managerId: 1 });
userSchema.index({ status: 1 });

userSchema.methods.toSafeJSON = function () {
  return {
    _id: String(this._id),
    name: this.name,
    email: this.email,
    role: this.role,
    status: this.status,
    managerId: this.managerId ? String(this.managerId) : null,
    phone: this.phone,
    avatarColor: this.avatarColor,
    createdAt: this.createdAt,
  };
};

export default mongoose.model('User', userSchema);
