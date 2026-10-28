import { Schema, model } from 'mongoose';

const grievanceSchema = new Schema({
  ticketId: { type: String, required: true, unique: true, index: true },
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  category: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, required: true, trim: true, maxlength: 10000 },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  status: { 
    type: String, 
    enum: ['Submitted', 'Under Review', 'In Progress', 'Resolved', 'Rejected', 'Escalated'], 
    default: 'Submitted' 
  },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  attachments: [{
    fileUrl: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  deadline: { type: Date, required: true },
  isPastDue: { type: Boolean, default: false },
  escalationLevel: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

const Grievance = model('Grievance', grievanceSchema);

export default Grievance;