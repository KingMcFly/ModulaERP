// ── System event notifier ─────────────────────────────────────────────────────
// Sends an email to the admin-configured recipient when a critical platform
// event fires — but only if notifications are enabled and that event is toggled
// on (see Configuración → Notificaciones). Fire-and-forget; never breaks a request.
import db from '../db.js';
import { sendMail, isMailConfigured } from './mailer.js';

export const NOTIFY_EVENTS = Object.freeze({
  new_tenant:       'Nueva empresa registrada',
  tenant_suspended: 'Cambio de estado de empresa',
  admin_created:    'Nuevo administrador creado',
  twofa_disabled:   'Doble autenticación desactivada',
});

function renderEmail(title, lines) {
  const rows = lines.map(l => `<tr><td style="padding:4px 0;color:#334155;font-size:14px;">${l}</td></tr>`).join('');
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;padding:24px;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
      <tr><td style="background:#0A0A12;padding:20px 24px;">
        <span style="color:#F2B045;font-weight:800;font-size:16px;letter-spacing:-0.02em;">FB Core</span>
        <span style="color:rgba(255,255,255,0.4);font-size:12px;"> · Alerta del sistema</span>
      </td></tr>
      <tr><td style="padding:24px;">
        <h1 style="margin:0 0 12px;font-size:18px;color:#0f172a;">${title}</h1>
        <table role="presentation" width="100%">${rows}</table>
      </td></tr>
      <tr><td style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:11px;">
        Recibes este correo porque las notificaciones del panel FB Core están activadas.
      </td></tr>
    </table>
  </body></html>`;
}

/**
 * @param {keyof typeof NOTIFY_EVENTS} eventKey
 * @param {{ subject?: string, lines?: string[] }} payload
 */
export async function notifyEvent(eventKey, { subject, lines = [] } = {}) {
  try {
    const [[s]] = await db.query(
      'SELECT notify_enabled, notify_email, notify_events FROM system_settings WHERE id = 1'
    );
    if (!s || !s.notify_enabled || !s.notify_email) return;

    const events = typeof s.notify_events === 'string'
      ? JSON.parse(s.notify_events || '{}')
      : (s.notify_events || {});
    if (!events[eventKey]) return;

    const title = NOTIFY_EVENTS[eventKey] || 'Evento del sistema';
    if (!isMailConfigured()) {
      console.info(`[NOTIFY:dev] ${eventKey} → ${s.notify_email} (sin SMTP) :: ${lines.join(' | ')}`);
      return;
    }
    await sendMail({
      to: s.notify_email,
      subject: subject || `FB Core · ${title}`,
      html: renderEmail(title, lines),
      text: `${title}\n\n${lines.join('\n')}`,
    });
  } catch (err) {
    console.error(`[NOTIFY_ERROR] ${eventKey}: ${err.message}`);
  }
}
