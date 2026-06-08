import { Router } from 'express';
import nodemailer from 'nodemailer';
import db from '../db.js';
import { dailyAlertsEmail, trialExpiryEmail } from '../utils/emailTemplates.js';
import { notifyTicketEvent } from '../utils/ticketNotify.js';
import { genTicketNumber, derivePriority, computeSla, getUserLevel, logHistory } from '../utils/tickets.js';

const router = Router();

// Vercel calls cron endpoints with Authorization: Bearer <CRON_SECRET>
function verifyCron(req, res, next) {
  const auth = req.headers.authorization;
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function getMailer() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendAlert(mailer, to, tenantName, subject, html) {
  if (!mailer || !to) {
    console.info(`[CRON] ${subject} → ${tenantName} (no SMTP)`);
    return;
  }
  await mailer.sendMail({
    from: process.env.SMTP_FROM || `"FB Core" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

// GET /api/cron/daily-alerts — runs every day at 08:00 UTC via Vercel Cron
router.get('/daily-alerts', verifyCron, async (req, res) => {
  const started = Date.now();
  const mailer = getMailer();
  const summary = [];

  const [tenants] = await db.query(
    `SELECT id, name, contact_email FROM tenants WHERE status = 'active' AND id != 1`
  );

  for (const tenant of tenants) {
    const tid = tenant.id;
    const alerts = [];

    // Overdue loans
    const [[{ overdue_loans }]] = await db.query(
      `SELECT COUNT(*) AS overdue_loans FROM loans
       WHERE tenant_id=? AND status='active' AND expected_return < NOW()`,
      [tid]
    );
    if (overdue_loans > 0) alerts.push(`<li><strong>${overdue_loans}</strong> préstamo${overdue_loans > 1 ? 's' : ''} vencido${overdue_loans > 1 ? 's' : ''}</li>`);

    // Low stock
    const [[{ low_stock }]] = await db.query(
      `SELECT COUNT(*) AS low_stock FROM supplies
       WHERE tenant_id=? AND is_active=true AND current_stock <= min_stock`,
      [tid]
    );
    if (low_stock > 0) alerts.push(`<li><strong>${low_stock}</strong> insumo${low_stock > 1 ? 's' : ''} con stock bajo o agotado</li>`);

    // Overdue maintenance
    const [[{ overdue_maint }]] = await db.query(
      `SELECT COUNT(*) AS overdue_maint FROM maintenance_records
       WHERE tenant_id=? AND status IN ('pending','in_progress') AND scheduled_at < CURRENT_DATE`,
      [tid]
    ).catch(() => [[{ overdue_maint: 0 }]]);
    if (overdue_maint > 0) alerts.push(`<li><strong>${overdue_maint}</strong> mantenimiento${overdue_maint > 1 ? 's' : ''} vencido${overdue_maint > 1 ? 's' : ''}</li>`);

    // Expiring contracts (next 30 days)
    const [[{ expiring }]] = await db.query(
      `SELECT COUNT(*) AS expiring FROM contracts
       WHERE tenant_id=? AND status='active' AND end_date IS NOT NULL
         AND (end_date - CURRENT_DATE) BETWEEN 0 AND 30`,
      [tid]
    ).catch(() => [[{ expiring: 0 }]]);
    if (expiring > 0) alerts.push(`<li><strong>${expiring}</strong> contrato${expiring > 1 ? 's' : ''} vence${expiring > 1 ? 'n' : ''} en los próximos 30 días</li>`);

    if (alerts.length === 0) continue;

    const alertItems = [];
    if (overdue_loans > 0)  alertItems.push({ icon: '📦', label: `Préstamo${overdue_loans > 1 ? 's' : ''} vencido${overdue_loans > 1 ? 's' : ''}`, count: overdue_loans });
    if (low_stock > 0)      alertItems.push({ icon: '🔻', label: `Insumo${low_stock > 1 ? 's' : ''} con stock bajo o agotado`, count: low_stock });
    if (overdue_maint > 0)  alertItems.push({ icon: '🔧', label: `Mantenimiento${overdue_maint > 1 ? 's' : ''} vencido${overdue_maint > 1 ? 's' : ''}`, count: overdue_maint });
    if (expiring > 0)       alertItems.push({ icon: '📄', label: `Contrato${expiring > 1 ? 's' : ''} próximo${expiring > 1 ? 's' : ''} a vencer`, detail: 'Dentro de los próximos 30 días', count: expiring });

    const date = new Date().toLocaleDateString('es-CL', { dateStyle: 'full' });
    const { subject, html } = dailyAlertsEmail({ tenantName: tenant.name, date, alertItems });

    await sendAlert(mailer, tenant.contact_email, tenant.name, subject, html);
    summary.push({ tenant: tenant.name, alerts: alerts.length });
  }

  res.json({ ok: true, tenants_checked: tenants.length, alerts_sent: summary, ms: Date.now() - started });
});

// GET /api/cron/trial-alerts — runs daily, warns tenants whose trial modules expire in ≤15 or ≤7 days
router.get('/trial-alerts', verifyCron, async (req, res) => {
  const started = Date.now();
  const mailer = getMailer();
  const whatsappNumber = process.env.COMPANY_WHATSAPP_NUMBER || '56920023072';
  const summary = [];

  // Modules expiring in exactly 15 or 7 days (or if already within those windows and unsent)
  const [expiringRows] = await db.query(
    `SELECT tm.tenant_id, tm.expires_at,
            t.name AS tenant_name, t.contact_email,
            m.name AS module_name
     FROM tenant_modules tm
     JOIN tenants t ON t.id = tm.tenant_id
     JOIN modules m ON m.id = tm.module_id
     WHERE tm.type = 'trial'
       AND tm.is_active = true
       AND tm.unlimited = false
       AND tm.expires_at IS NOT NULL
       AND (
         (tm.expires_at - NOW()) BETWEEN INTERVAL '6 days' AND INTERVAL '8 days'
         OR (tm.expires_at - NOW()) BETWEEN INTERVAL '13 days' AND INTERVAL '16 days'
       )
       AND t.status = 'active'
     ORDER BY tm.tenant_id`
  );

  // Group by tenant
  const byTenant = {};
  for (const row of expiringRows) {
    if (!byTenant[row.tenant_id]) {
      byTenant[row.tenant_id] = {
        name: row.tenant_name,
        email: row.contact_email,
        modules: [],
      };
    }
    const daysLeft = Math.ceil((new Date(row.expires_at) - Date.now()) / 86400000);
    byTenant[row.tenant_id].modules.push({ name: row.module_name, daysLeft });
  }

  for (const [, info] of Object.entries(byTenant)) {
    const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola, soy administrador de ${info.name} en FB Core. Quiero extender mi prueba de módulos: ${info.modules.map(m => m.name).join(', ')}.`)}`;
    const urgent = info.modules.some(m => m.daysLeft <= 7);

    const { subject, html } = trialExpiryEmail({
      tenantName: info.name,
      modules: info.modules,
      waUrl,
    });

    await sendAlert(mailer, info.email, info.name, subject, html);
    summary.push({ tenant: info.name, modules: info.modules.length, urgent });
  }

  res.json({ ok: true, alerts_sent: summary, ms: Date.now() - started });
});

// GET /api/cron/ticket-sla — alerts assignees of tickets about to breach / breached
// Schedule every ~10-15 min via Vercel Cron. Flags prevent repeat emails.
router.get('/ticket-sla', verifyCron, async (req, res) => {
  const started = Date.now();
  try {
    // Breached and not yet alerted
    const [breached] = await db.query(
      `SELECT id FROM tickets
        WHERE status NOT IN ('resolved','closed','cancelled','waiting_user','waiting_vendor')
          AND resolution_due IS NOT NULL AND resolution_due < NOW()
          AND sla_breach_notified = false AND assigned_to IS NOT NULL`
    );
    for (const t of breached) await notifyTicketEvent(t.id, 'sla_breach');
    if (breached.length)
      await db.query('UPDATE tickets SET sla_breach_notified = true WHERE id = ANY(?)', [breached.map(t => t.id)]);

    // Due within the next 30 minutes and not yet alerted
    const [due] = await db.query(
      `SELECT id FROM tickets
        WHERE status NOT IN ('resolved','closed','cancelled','waiting_user','waiting_vendor')
          AND resolution_due IS NOT NULL
          AND resolution_due BETWEEN NOW() AND NOW() + INTERVAL '30 minutes'
          AND sla_due_notified = false AND assigned_to IS NOT NULL`
    );
    for (const t of due) await notifyTicketEvent(t.id, 'sla_due');
    if (due.length)
      await db.query('UPDATE tickets SET sla_due_notified = true WHERE id = ANY(?)', [due.map(t => t.id)]);

    res.json({ ok: true, breached: breached.length, due_soon: due.length, ms: Date.now() - started });
  } catch (err) {
    console.error('[CRON_TICKET_SLA_ERROR]', err.message);
    res.status(500).json({ error: 'cron error' });
  }
});

// GET /api/cron/ticket-recurring — creates tickets from due recurrences (daily)
router.get('/ticket-recurring', verifyCron, async (req, res) => {
  const started = Date.now();
  try {
    const [recs] = await db.query('SELECT * FROM ticket_recurrences WHERE is_active = true AND next_run_at <= CURRENT_DATE');
    let created = 0;
    for (const rec of recs) {
      const ttype = rec.type === 'incident' ? 'incident' : 'request';
      const priority = derivePriority(rec.impact, rec.urgency);
      const number = await genTicketNumber(rec.tenant_id, ttype);
      const sla = await computeSla(rec.tenant_id, ttype, priority);
      const lvl = rec.assign_to ? await getUserLevel(rec.tenant_id, rec.assign_to) : null;
      const [r] = await db.query(
        `INSERT INTO tickets
           (tenant_id, ticket_number, type, title, description, category_id, impact, urgency, priority,
            status, level, channel, assigned_to, sla_policy_id, first_response_due, resolution_due)
         VALUES (?,?,?,?,?,?,?,?,?,?,?, 'manual', ?,?,?,?) RETURNING id`,
        [rec.tenant_id, number, ttype, rec.title, rec.description, rec.category_id, rec.impact, rec.urgency, priority,
         rec.assign_to ? 'assigned' : 'new', lvl || 'n1', rec.assign_to, sla.sla_policy_id, sla.first_response_due, sla.resolution_due]
      );
      await logHistory(null, { tenant_id: rec.tenant_id, ticket_id: r[0].id, actor_id: null, action: 'created', new_value: `${number} (recurrente)` });
      if (rec.assign_to) await notifyTicketEvent(r[0].id, 'assigned');
      await db.query('UPDATE ticket_recurrences SET next_run_at = next_run_at + every_days WHERE id = ?', [rec.id]);
      created++;
    }
    res.json({ ok: true, created, ms: Date.now() - started });
  } catch (err) {
    console.error('[CRON_RECURRING_ERROR]', err.message);
    res.status(500).json({ error: 'cron error' });
  }
});

export default router;
