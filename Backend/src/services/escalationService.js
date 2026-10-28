import EscalationPolicy from '../models/escalationPolicy.js';
import {
  escalateGrievance,
  findDueGrievances,
  findEscalationCandidates,
  markPastDue
} from './grievanceService.js';
import { sendNotification } from './notifications.js';

let timer;
let checkInProgress = false;

async function notifyAffectedUsers(grievance, subject, message) {
  const recipients = [grievance.student];
  if (grievance.assignedTo) recipients.push(grievance.assignedTo);
  await Promise.all(recipients.map((userId) => sendNotification(userId, { subject, message })));
}

export async function runEscalationCheck(now = new Date()) {
  if (checkInProgress) return;
  checkInProgress = true;
  try {
    const policy = await EscalationPolicy.findOne({ key: 'default' });
    if (!policy?.enabled) return;

    const overdue = await findDueGrievances(now);
    for (const grievance of overdue) {
      const updated = await markPastDue(grievance);
      if (updated) {
        await notifyAffectedUsers(
          updated,
          `Grievance ${updated.ticketId} is past due`,
          `Grievance "${updated.title}" has passed its resolution deadline.`
        );
      }
    }

    const escalationCutoff = new Date(now.getTime() - policy.escalateAfterHours * 60 * 60 * 1000);
    const escalationCandidates = await findEscalationCandidates(escalationCutoff);
    for (const grievance of escalationCandidates) {
      const updated = await escalateGrievance(grievance);
      if (updated) {
        await notifyAffectedUsers(
          updated,
          `Grievance ${updated.ticketId} escalated`,
          `Grievance "${updated.title}" has been escalated because it remains unresolved.`
        );
      }
    }
  } finally {
    checkInProgress = false;
  }
}

export function startEscalationWorker(intervalMs = 60 * 60 * 1000) {
  if (timer) return timer;
  timer = setInterval(() => {
    runEscalationCheck().catch((error) => {
      console.error('Deadline and escalation check failed:', error);
    });
  }, intervalMs);
  timer.unref();
  runEscalationCheck().catch((error) => {
    console.error('Initial deadline and escalation check failed:', error);
  });
  return timer;
}

export function stopEscalationWorker() {
  if (timer) clearInterval(timer);
  timer = undefined;
}
