import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['student', 'official', 'administrator'], required: true },
  department: { type: String, trim: true, maxlength: 120 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const User = model('User', userSchema);

export default User;