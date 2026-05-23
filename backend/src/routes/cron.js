import { Router } from 'express';
import nodemailer from 'nodemailer';
import db from '../db.js';
import { dailyAlertsEmail, trialExpiryEmail } from '../utils/emailTemplates.js';

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

export default router;
