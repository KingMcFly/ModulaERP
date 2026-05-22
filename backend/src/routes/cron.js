import { Router } from 'express';
import nodemailer from 'nodemailer';
import db from '../db.js';
import { dailyAlertsEmail } from '../utils/emailTemplates.js';

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
    const modList = info.modules.map(m => `${m.name} (${m.daysLeft} días)`).join(', ');
    const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola, soy administrador de ${info.name} en FB Core. Quiero extender mi prueba de módulos: ${info.modules.map(m => m.name).join(', ')}.`)}`;

    const urgent = info.modules.some(m => m.daysLeft <= 7);
    const subject = urgent
      ? `⚠️ Tu prueba de módulos vence pronto — FB Core`
      : `Recordatorio: módulos de prueba por vencer — FB Core`;

    const html = `<!DOCTYPE html><html lang="es"><body style="font-family:'Plus Jakarta Sans',sans-serif;background:#131316;margin:0;padding:40px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
<tr><td style="background:linear-gradient(135deg,#F2B045,#EDA135);border-radius:16px 16px 0 0;padding:24px 40px;">
  <span style="font-size:18px;font-weight:700;color:#131316;">FB Core</span>
  <span style="float:right;font-size:11px;color:#131316;opacity:0.6;margin-top:4px;">by FBSystems</span>
</td></tr>
<tr><td style="background:#1B1B1D;border:1px solid #2C2C30;border-top:none;padding:36px 48px;">
  <h1 style="margin:0 0 12px;color:#F5F5F5;font-size:20px;">
    ${urgent ? '⚠️ Tus módulos de prueba vencen pronto' : 'Tus módulos de prueba están por vencer'}
  </h1>
  <p style="color:#919197;font-size:14px;line-height:1.6;">Hola <strong style="color:#F5F5F5;">${info.name}</strong>, los siguientes módulos de prueba están próximos a expirar:</p>
  <div style="background:#161618;border:1px solid #2C2C30;border-left:3px solid ${urgent ? '#ef4444' : '#F2B045'};border-radius:8px;padding:16px 20px;margin:20px 0;">
    <p style="margin:0 0 8px;color:#F5F5F5;font-size:14px;font-weight:600;">Módulos por vencer:</p>
    <p style="color:#919197;font-size:13px;margin:0;">${modList}</p>
  </div>
  <p style="color:#919197;font-size:13px;line-height:1.6;">Cuando expiren, perderás acceso a esos módulos pero tus datos se mantendrán seguros.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td align="center">
      <a href="${waUrl}" style="display:inline-block;background:#F2B045;color:#131316;font-size:14px;font-weight:700;text-decoration:none;padding:13px 36px;border-radius:10px;">
        Extender prueba por WhatsApp
      </a>
    </td></tr>
  </table>
</td></tr>
<tr><td style="background:#161618;border:1px solid #2C2C30;border-top:none;border-radius:0 0 16px 16px;padding:16px 48px;text-align:center;">
  <p style="margin:0;font-size:11px;color:#555559;">© ${new Date().getFullYear()} <a href="https://fbsystems.cl" style="color:#919197;text-decoration:none;">FBSystems</a> · fbcore.cloud</p>
</td></tr>
</table></body></html>`;

    await sendAlert(mailer, info.email, info.name, subject, html);
    summary.push({ tenant: info.name, modules: info.modules.length, urgent });
  }

  res.json({ ok: true, alerts_sent: summary, ms: Date.now() - started });
});

export default router;
