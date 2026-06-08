// ── Ticket email notifications ────────────────────────────────────────────────
// Sends transactional emails to the right party (requester or assignee) on the
// key ticket events. Uses the shared SMTP mailer; if no SMTP is configured it
// logs and returns. Never throws — a mail failure must not break the request.
import db from '../db.js';
import { sendMail } from './mailer.js';

const APP_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const TYPE_LABEL = { incident: 'incidencia', request: 'solicitud' };

function shell(title, lines, link) {
  const rows = lines.map(l => `<tr><td style="padding:4px 0;color:#334155;font-size:14px;">${l}</td></tr>`).join('');
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;padding:24px;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
      <tr><td style="background:#0A0A12;padding:18px 24px;">
        <span style="color:#C6922B;font-weight:800;font-size:16px;">FB Core</span>
        <span style="color:rgba(255,255,255,0.4);font-size:12px;"> · Mesa de Ayuda</span>
      </td></tr>
      <tr><td style="padding:24px;">
        <h1 style="margin:0 0 12px;font-size:17px;color:#0f172a;">${title}</h1>
        <table role="presentation" width="100%">${rows}</table>
        <a href="${link}" style="display:inline-block;margin-top:18px;background:#C6922B;color:#17120A;text-decoration:none;font-weight:700;font-size:14px;padding:10px 18px;border-radius:10px;">Ver ticket</a>
      </td></tr>
      <tr><td style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:11px;">
        Recibes este correo porque participas en este ticket de soporte.
      </td></tr>
    </table>
  </body></html>`;
}

function plan(event, t, opts = {}) {
  const link = `${APP_URL}/tickets/${t.id}`;
  const tag = `[${t.ticket_number}]`;
  const tl = TYPE_LABEL[t.type] || 'ticket';
  switch (event) {
    case 'created':
      return { to: t.reporter_email, subject: `${tag} Recibimos tu ${tl}: ${t.title}`,
        title: 'Tu ticket fue registrado',
        lines: [`<strong>${t.ticket_number}</strong> · ${t.title}`, `Tipo: ${tl}`, 'Te avisaremos cuando haya novedades.'] };
    case 'assigned':
      return { to: t.assignee_email, subject: `${tag} Ticket asignado a ti`,
        title: 'Se te asignó un ticket', lines: [`<strong>${t.ticket_number}</strong> · ${t.title}`, `Prioridad: ${t.priority} · Nivel: ${(t.level || '').toUpperCase()}`] };
    case 'comment_public':
      return { to: opts.fromAgent ? t.reporter_email : t.assignee_email, subject: `${tag} Nuevo comentario`,
        title: 'Nuevo comentario en tu ticket', lines: [`<strong>${t.ticket_number}</strong> · ${t.title}`, opts.preview ? `"${opts.preview}"` : ''] .filter(Boolean) };
    case 'waiting_user':
      return { to: t.reporter_email, subject: `${tag} Necesitamos información`,
        title: 'El equipo necesita más información', lines: [`<strong>${t.ticket_number}</strong> · ${t.title}`, 'Responde el ticket para continuar la atención.'] };
    case 'escalated':
      return { to: t.assignee_email, subject: `${tag} Ticket escalado a ${(t.level || '').toUpperCase()}`,
        title: `Ticket escalado a ${(t.level || '').toUpperCase()}`, lines: [`<strong>${t.ticket_number}</strong> · ${t.title}`, opts.reason ? `Motivo: ${opts.reason}` : ''].filter(Boolean) };
    case 'resolved':
      return { to: t.reporter_email, subject: `${tag} Ticket resuelto`,
        title: 'Tu ticket fue resuelto', lines: [`<strong>${t.ticket_number}</strong> · ${t.title}`, t.resolution_note ? `Solución: ${t.resolution_note}` : '', 'Si no quedó resuelto, puedes reabrirlo.'].filter(Boolean) };
    case 'closed':
      return { to: t.reporter_email, subject: `${tag} Ticket cerrado`,
        title: 'Tu ticket fue cerrado', lines: [`<strong>${t.ticket_number}</strong> · ${t.title}`, 'Puedes calificar la atención recibida.'] };
    case 'reopened':
      return { to: t.assignee_email, subject: `${tag} Ticket reabierto`,
        title: 'Un ticket fue reabierto', lines: [`<strong>${t.ticket_number}</strong> · ${t.title}`] };
    case 'sla_due':
      return { to: t.assignee_email, subject: `${tag} SLA por vencer`,
        title: 'Un ticket está por vencer su SLA', lines: [`<strong>${t.ticket_number}</strong> · ${t.title}`, `Prioridad: ${t.priority}`, 'Atiéndelo antes de que venza el plazo.'] };
    case 'sla_breach':
      return { to: t.assignee_email, subject: `${tag} SLA vencido`,
        title: 'SLA vencido', lines: [`<strong>${t.ticket_number}</strong> · ${t.title}`, 'El plazo de resolución se ha superado.'] };
    default:
      return null;
  }
}

/**
 * @param {number} ticketId
 * @param {string} event
 * @param {{ fromAgent?: boolean, preview?: string, reason?: string }} [opts]
 */
export async function notifyTicketEvent(ticketId, event, opts = {}) {
  try {
    const [[t]] = await db.query(
      `SELECT t.id, t.ticket_number, t.title, t.type, t.status, t.priority, t.level, t.resolution_note,
              r.email AS reporter_email, a.email AS assignee_email
         FROM tickets t
         LEFT JOIN users r ON r.id = t.reported_by
         LEFT JOIN users a ON a.id = t.assigned_to
        WHERE t.id = ?`, [ticketId]
    );
    if (!t) return;
    const m = plan(event, t, opts);
    if (!m || !m.to) return;   // no recipient → nothing to send

    await sendMail({ to: m.to, subject: m.subject, html: shell(m.title, m.lines, `${APP_URL}/tickets/${t.id}`), text: `${m.title}\n${m.lines.join('\n')}\n${APP_URL}/tickets/${t.id}` });
  } catch (err) {
    console.error(`[TICKET_NOTIFY_ERROR] ${event}#${ticketId}: ${err.message}`);
  }
}
