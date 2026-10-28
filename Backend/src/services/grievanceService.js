import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { unlink } from 'node:fs/promises';
import Grievance from '../models/grievance.js';
import User from '../models/user.js';
import EscalationPolicy from '../models/escalationPolicy.js';
import { logAuditTrail } from './auditService.js';
import { canTransitionGrievance, grievanceStatuses } from '../utils/grievanceWorkflow.js';
import { HttpError } from '../utils/httpError.js';
import { uploadsDirectory } from '../middlewares/upload.js';

const priorities = ['Low', 'Medium', 'High', 'Urgent'];

function assertText(value, field, maxLength) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new HttpError(400, `${field} is required and must be no more than ${maxLength} characters.`);
  }
}

function toPublicGrievance(grievance) {
  const record = grievance.toObject ? grievance.toObject() : grievance;
  return {
    ...record,
    attachments: (record.attachments ?? []).map((attachment) => ({
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      uploadedAt: attachment.uploadedAt,
      downloadUrl: `/api/grievances/${encodeURIComponent(record.ticketId)}/attachments/${encodeURIComponent(attachment.fileUrl)}`
    }))
  };
}

function allowedFilter(actor) {
  if (actor.role === 'student') return { student: actor.id };
  if (actor.role === 'official') return { assignedTo: actor.id };
  if (actor.role === 'administrator') return {};
  throw new HttpError(403, 'Access denied.');
}

async function findAccessibleGrievance(actor, ticketId) {
  const grievance = await Grievance.findOne({ ticketId });
  if (!grievance) throw new HttpError(404, 'Grievance not found.');
  if (actor.role === 'administrator') return grievance;
  const canAccess = actor.role === 'student'
    ? grievance.student.toString() === actor.id
    : actor.role === 'official' && grievance.assignedTo?.toString() === actor.id;
  if (!canAccess) throw new HttpError(404, 'Grievance not found.');
  return grievance;
}

function snapshot(grievance) {
  return {
    ticketId: grievance.ticketId,
    student: grievance.student.toString(),
    title: grievance.title,
    category: grievance.category,
    priority: grievance.priority,
    status: grievance.status,
    assignedTo: grievance.assignedTo?.toString() ?? null,
    deadline: grievance.deadline,
    isPastDue: grievance.isPastDue,
    escalationLevel: grievance.escalationLevel
  };
}

export async function createGrievance(actor, input, files = []) {
  assertText(input.title, 'Title', 160);
  assertText(input.category, 'Category', 80);
  assertText(input.description, 'Description', 10000);
  if (input.priority && !priorities.includes(input.priority)) {
    throw new HttpError(400, 'Priority must be Low, Medium, High, or Urgent.');
  }

  const policy = await EscalationPolicy.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: { key: 'default' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const deadline = new Date(Date.now() + policy.deadlineHours * 60 * 60 * 1000);
  const attachments = files.map((file) => ({
    fileUrl: file.filename,
    originalName: path.basename(file.originalname),
    mimeType: file.mimetype
  }));
  let grievance;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const ticketId = `GRV-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
    try {
      grievance = await Grievance.create({
        ticketId,
        student: actor.id,
        title: input.title.trim(),
        category: input.category.trim(),
        description: input.description.trim(),
        priority: input.priority || 'Medium',
        attachments,
        deadline
      });
      break;
    } catch (error) {
      if (error.code !== 11000 || attempt === 4) throw error;
    }
  }

  try {
    await logAuditTrail(grievance._id, 'CREATED', actor.id, null, snapshot(grievance));
  } catch (error) {
    await Grievance.deleteOne({ _id: grievance._id });
    throw error;
  }
  return toPublicGrievance(grievance);
}

export async function listGrievances(actor, { status, ticketId, limit = 50, page = 1 } = {}) {
  const filter = allowedFilter(actor);
  if (status) {
    if (!grievanceStatuses.includes(status)) throw new HttpError(400, 'Unknown grievance status.');
    filter.status = status;
  }
  if (ticketId !== undefined) {
    if (typeof ticketId !== 'string' || ticketId.length > 32) {
      throw new HttpError(400, 'Ticket ID must be a valid string.');
    }
    filter.ticketId = ticketId;
  }
  const parsedLimit = Number(limit);
  const parsedPage = Number(page);
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100 ||
      !Number.isInteger(parsedPage) || parsedPage < 1) {
    throw new HttpError(400, 'Page must be positive and limit must be between 1 and 100.');
  }
  const grievances = await Grievance.find(filter)
    .sort({ createdAt: -1 })
    .skip((parsedPage - 1) * parsedLimit)
    .limit(parsedLimit)
    .populate('student assignedTo', 'name email role department');
  return grievances.map(toPublicGrievance);
}

export async function getGrievance(actor, ticketId) {
  const grievance = await findAccessibleGrievance(actor, ticketId);
  await grievance.populate('student assignedTo', 'name email role department');
  return toPublicGrievance(grievance);
}

export async function updateGrievanceStatus(actor, ticketId, nextStatus, note) {
  if (!grievanceStatuses.includes(nextStatus)) throw new HttpError(400, 'Unknown grievance status.');
  const grievance = await findAccessibleGrievance(actor, ticketId);
  if (actor.role === 'student') throw new HttpError(403, 'Students cannot change grievance status.');
  if (!canTransitionGrievance(grievance.status, nextStatus)) {
    throw new HttpError(409, `Status cannot transition from ${grievance.status} to ${nextStatus}.`);
  }
  if (actor.role === 'official' && !grievance.assignedTo?.equals(actor.id)) {
    throw new HttpError(403, 'Officials may update only grievances assigned to them.');
  }
  if (note !== undefined && (typeof note !== 'string' || note.trim().length > 1000)) {
    throw new HttpError(400, 'Status note must be no more than 1000 characters.');
  }

  const previous = snapshot(grievance);
  grievance.status = nextStatus;
  await grievance.save();
  await logAuditTrail(grievance._id, 'STATUS_CHANGED', actor.id, previous, {
    ...snapshot(grievance),
    note: note?.trim() || null
  });
  return { grievance: toPublicGrievance(grievance), studentId: grievance.student.toString() };
}

export async function assignGrievance(actor, ticketId, officialId) {
  const grievance = await findAccessibleGrievance(actor, ticketId);
  if (actor.role !== 'administrator') throw new HttpError(403, 'Only administrators may assign grievances.');
  if (typeof officialId !== 'string' || !officialId) throw new HttpError(400, 'An officialId is required.');
  const official = await User.findOne({ _id: officialId, role: 'official', active: true });
  if (!official) throw new HttpError(400, 'The selected account is not an active official.');

  const previous = snapshot(grievance);
  grievance.assignedTo = official._id;
  await grievance.save();
  await logAuditTrail(grievance._id, 'ASSIGNED', actor.id, previous, snapshot(grievance));
  return {
    grievance: toPublicGrievance(await grievance.populate('student assignedTo', 'name email role department')),
    officialId: official.id,
    studentId: grievance.student.toString()
  };
}

export async function getAttachment(actor, ticketId, filename) {
  const grievance = await findAccessibleGrievance(actor, ticketId);
  const attachment = grievance.attachments.find((entry) => entry.fileUrl === filename);
  if (!attachment) throw new HttpError(404, 'Attachment not found.');
  const filePath = path.resolve(uploadsDirectory, attachment.fileUrl);
  if (path.dirname(filePath) !== uploadsDirectory) throw new HttpError(400, 'Invalid attachment path.');
  return { filePath, originalName: attachment.originalName };
}

export async function listOfficials() {
  return User.find({ role: 'official', active: true })
    .select('name email department')
    .sort({ department: 1, name: 1 })
    .lean();
}

export async function getEscalationPolicy() {
  return EscalationPolicy.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: { key: 'default' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).select('-_id -key -__v').lean();
}

export async function updateEscalationPolicy(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpError(400, 'Policy settings must be provided as an object.');
  }
  const updates = {};
  if (input.deadlineHours !== undefined) updates.deadlineHours = input.deadlineHours;
  if (input.escalateAfterHours !== undefined) updates.escalateAfterHours = input.escalateAfterHours;
  if (input.enabled !== undefined) updates.enabled = input.enabled;
  if (!Object.keys(updates).length) throw new HttpError(400, 'Provide at least one policy setting to update.');
  for (const key of ['deadlineHours', 'escalateAfterHours']) {
    if (updates[key] !== undefined &&
        (!Number.isInteger(updates[key]) || updates[key] < 1 || updates[key] > 8760)) {
      throw new HttpError(400, `${key} must be an integer between 1 and 8760.`);
    }
  }
  if (updates.enabled !== undefined && typeof updates.enabled !== 'boolean') {
    throw new HttpError(400, 'enabled must be a boolean.');
  }
  return EscalationPolicy.findOneAndUpdate(
    { key: 'default' },
    { $set: updates, $setOnInsert: { key: 'default' } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).select('-_id -key -__v').lean();
}

export async function findGrievanceByTicket(ticketId) {
  const grievance = await Grievance.findOne({ ticketId }).select('_id');
  if (!grievance) throw new HttpError(404, 'Grievance not found.');
  return grievance;
}

export async function markPastDue(grievance) {
  const previous = snapshot(grievance);
  const updated = await Grievance.findOneAndUpdate(
    { _id: grievance._id, isPastDue: false },
    { $set: { isPastDue: true }, $inc: { escalationLevel: 1 } },
    { new: true }
  );
  if (!updated) return null;
  try {
    await logAuditTrail(updated._id, 'DEADLINE_MISSED', null, previous, snapshot(updated), 'system');
  } catch (error) {
    await Grievance.updateOne({ _id: updated._id, isPastDue: true }, { $set: { isPastDue: false }, $inc: { escalationLevel: -1 } });
    throw error;
  }
  return updated;
}

export async function findDueGrievances(now) {
  return Grievance.find({
    status: { $nin: ['Resolved', 'Rejected'] },
    deadline: { $lte: now },
    isPastDue: false
  });
}

export async function findEscalationCandidates(cutoff) {
  return Grievance.find({
    status: { $nin: ['Resolved', 'Rejected', 'Escalated'] },
    deadline: { $lte: cutoff },
    isPastDue: true
  });
}

export async function escalateGrievance(grievance) {
  const previous = snapshot(grievance);
  const updated = await Grievance.findOneAndUpdate(
    { _id: grievance._id, status: grievance.status, isPastDue: true },
    { $set: { status: 'Escalated' }, $inc: { escalationLevel: 1 } },
    { new: true }
  );
  if (!updated) return null;
  try {
    await logAuditTrail(updated._id, 'ESCALATED', null, previous, snapshot(updated), 'system');
  } catch (error) {
    await Grievance.updateOne(
      { _id: updated._id, status: 'Escalated' },
      { $set: { status: grievance.status }, $inc: { escalationLevel: -1 } }
    );
    throw error;
  }
  return updated;
}

export async function removeUploadedFiles(files = []) {
  await Promise.all(files.map(async (file) => {
    try {
      await unlink(file.path);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }));
}
