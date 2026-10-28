import { Schema, model } from 'mongoose';

const auditLogSchema = new Schema({
  grievanceId: { type: Schema.Types.ObjectId, ref: 'Grievance', required: true, index: true },
  action: { type: String, required: true }, 
  performedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  actorLabel: { type: String, default: 'user' },
  previousState: { type: Object },
  currentState: { type: Object },
  timestamp: { type: Date, default: Date.now, required: true },
  sequence: { type: Number, required: true },
  actorLabel: { type: String, default: 'user' },
  previousHash: { type: String, required: true },
  hash: { type: String, required: true, unique: true }
}, { versionKey: false, timestamps: false });

auditLogSchema.index({ grievanceId:  1, sequence: 1 }, { unique: true });

const AuditLog = model('AuditLog', auditLogSchema);

export default AuditLog;