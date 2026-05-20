import { Router } from 'express';
import nodemailer from 'nodemailer';
import db from '../db.js';

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
    from: process.env.SMTP_FROM || `"ModulaERP" <${process.env.SMTP_USER}>`,
    to,
    subject: `[ModulaERP] ${subject}`,
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

    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <div style="background:#6366f1;padding:20px 24px;border-radius:12px 12px 0 0">
          <h2 style="color:#fff;margin:0;font-size:18px">Resumen diario — ${tenant.name}</h2>
          <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:13px">${new Date().toLocaleDateString('es-CL',{dateStyle:'full'})}</p>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
          <p style="margin:0 0 12px;color:#334155;font-size:14px">Se detectaron los siguientes elementos que requieren atención:</p>
          <ul style="color:#475569;font-size:14px;line-height:1.8;padding-left:20px">${alerts.join('')}</ul>
          <p style="margin:20px 0 0;font-size:12px;color:#94a3b8">Este reporte se genera automáticamente cada día. Ingresa a ModulaERP para gestionar estos elementos.</p>
        </div>
      </div>`;

    await sendAlert(mailer, tenant.contact_email, tenant.name, `Resumen diario — ${alerts.length} alerta${alerts.length > 1 ? 's' : ''}`, html);
    summary.push({ tenant: tenant.name, alerts: alerts.length });
  }

  res.json({ ok: true, tenants_checked: tenants.length, alerts_sent: summary, ms: Date.now() - started });
});

export default router;
