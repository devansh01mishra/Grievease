import { getAuditTrail, verifyChain } from '../services/auditService.js';
import * as authService from '../services/authService.js';
import * as grievanceService from '../services/grievanceService.js';
import { sendNotification } from '../services/notifications.js';
import { HttpError } from '../utils/httpError.js';

export async function createGrievance(req, res, next) {
  try {
    const grievance = await grievanceService.createGrievance(req.user, req.body, req.files);
    res.status(201).json({ grievance });
  } catch (error) {
    await grievanceService.removeUploadedFiles(req.files);
    next(error);
  }
}

export async function listGrievances(req, res) {
  res.json({ grievances: await grievanceService.listGrievances(req.user, req.query) });
}

export async function getGrievance(req, res) {
  res.json({ grievance: await grievanceService.getGrievance(req.user, req.params.ticketId) });
}

export async function updateGrievanceStatus(req, res) {
  const { grievance, studentId } = await grievanceService.updateGrievanceStatus(
    req.user,
    req.params.ticketId,
    req.body.status,
    req.body.note
  );
  await sendNotification(studentId, {
    subject: `Grievance ${grievance.ticketId}: ${grievance.status}`,
    message: `The status of your grievance "${grievance.title}" is now ${grievance.status}.${req.body.note ? ` Update: ${req.body.note}` : ''}`
  });
  res.json({ grievance });
}

export async function assignGrievance(req, res) {
  const { grievance, officialId, studentId } = await grievanceService.assignGrievance(
    req.user,
    req.params.ticketId,
    req.body.officialId
  );
  const notifications = [
    sendNotification(officialId, {
      subject: `Grievance ${grievance.ticketId} assigned to you`,
      message: `You have been assigned grievance "${grievance.title}".`
    }),
    sendNotification(studentId, {
      subject: `Grievance ${grievance.ticketId} assigned`,
      message: `Your grievance "${grievance.title}" has been assigned to an official.`
    })
  ];
  await Promise.all(notifications);
  res.json({ grievance });
}

export async function downloadAttachment(req, res) {
  const attachment = await grievanceService.getAttachment(
    req.user,
    req.params.ticketId,
    req.params.filename
  );
  res.download(attachment.filePath, attachment.originalName);
}

export async function verifyAuditLog(req, res) {
  const grievance = await grievanceService.findGrievanceByTicket(req.params.ticketId);
  const [valid, entries] = await Promise.all([
    verifyChain(grievance._id),
    getAuditTrail(grievance._id)
  ]);
  res.json({ ticketId: req.params.ticketId, valid, entries });
}

export async function createOfficial(req, res) {
  const user = await authService.createOfficial(req.body);
  res.status(201).json({ user });
}

export async function getOfficials(_req, res) {
  res.json({ officials: await grievanceService.listOfficials() });
}

export async function getEscalationPolicy(_req, res) {
  res.json({ policy: await grievanceService.getEscalationPolicy() });
}

export async function updateEscalationPolicy(req, res) {
  res.json({ policy: await grievanceService.updateEscalationPolicy(req.body) });
}
