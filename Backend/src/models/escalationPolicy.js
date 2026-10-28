import { Schema, model } from 'mongoose';

const escalationPolicySchema = new Schema({
  key: { type: String, default: 'default', unique: true, immutable: true },
  deadlineHours: { type: Number, default: 48, min: 1, max: 8760, required: true },
  escalateAfterHours: { type: Number, default: 24, min: 1, max: 8760, required: true },
  enabled: { type: Boolean, default: true, required: true }
}, { timestamps: true });

const EscalationPolicy = model('EscalationPolicy', escalationPolicySchema);

export default EscalationPolicy;
