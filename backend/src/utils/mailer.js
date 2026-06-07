// ── Shared SMTP mailer ────────────────────────────────────────────────────────
// Centralizes the transport so auth / cron / register / notifier all use one
// configuration. Free: any SMTP server (Gmail app password, Brevo, Resend SMTP…).
import nodemailer from 'nodemailer';

export function isMailConfigured() {
  return !!process.env.SMTP_HOST;
}

let _transport = null;
export function getMailer() {
  if (!isMailConfigured()) return null;
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return _transport;
}

/**
 * Send an email. Resolves with { sent: boolean, reason? } and never throws on
 * a missing-SMTP config (logs to console in dev instead).
 */
export async function sendMail({ to, subject, html, text }) {
  const mailer = getMailer();
  if (!mailer) {
    console.info(`[MAIL:dev] (sin SMTP) to=${to} subject="${subject}"`);
    return { sent: false, reason: 'no_smtp' };
  }
  await mailer.sendMail({
    from: process.env.SMTP_FROM || `"FB Core" <${process.env.SMTP_USER}>`,
    to, subject, html, text,
  });
  return { sent: true };
}
