import { createTransport } from 'nodemailer';
import User from '../models/user.js';

let transporter;

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;
  transporter ??= createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
  return transporter;
}

export async function sendNotification(userId, { subject, message }) {
  const recipient = await User.findById(userId).select('email name');
  if (!recipient) {
    console.error(`Notification recipient ${userId} does not exist.`);
    return { sent: false, reason: 'recipient_not_found' };
  }
  const mailer = getTransporter();
  if (!mailer) {
    console.info(`Notification for ${recipient.email} was not sent: SMTP is not configured.`);
    return { sent: false, reason: 'smtp_not_configured' };
  }
  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipient.email,
      subject,
      text: message
    });
    return { sent: true };
  } catch (error) {
    console.error(`Failed to send notification to ${recipient.email}:`, error.message);
    return { sent: false, reason: 'delivery_failed' };
  }
}
