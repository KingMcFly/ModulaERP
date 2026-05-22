import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { rateLimit } from 'express-rate-limit';
import nodemailer from 'nodemailer';
import db from '../db.js';
import { resetPasswordEmail } from '../utils/emailTemplates.js';

const router = Router();

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados registros desde esta IP. Intenta más tarde.' },
});

const MANDATORY_MODULES = ['inventory', 'personnel'];

function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') return 'Contraseña requerida';
  if (password.length < 8)   return 'Mínimo 8 caracteres';
  if (password.length > 128) return 'Máximo 128 caracteres';
  if (!/[A-Z]/.test(password)) return 'Debe contener al menos una mayúscula';
  if (!/[0-9]/.test(password)) return 'Debe contener al menos un número';
  return null;
}

function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
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

// GET /api/register/modules — public list of available modules
router.get('/modules', async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT code, name, description, icon, color, sort_order
       FROM modules WHERE is_active = true ORDER BY sort_order`
    );
    res.json(rows);
  } catch (err) {
    console.error('REGISTER_MODULES_ERROR:', err.message);
    res.status(500).json({ error: 'Error al obtener módulos' });
  }
});

// POST /api/register — self-service tenant registration
router.post('/', registerLimiter, async (req, res) => {
  const {
    user_name,
    email,
    password,
    company_name,
    trial_modules = [],
  } = req.body;

  // Basic validation
  if (!user_name?.trim() || !email?.trim() || !password || !company_name?.trim()) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  const strengthErr = validatePasswordStrength(password);
  if (strengthErr) return res.status(400).json({ error: strengthErr });

  if (!Array.isArray(trial_modules) || trial_modules.length > 2) {
    return res.status(400).json({ error: 'Selecciona máximo 2 módulos adicionales' });
  }

  const badModules = trial_modules.filter(m => MANDATORY_MODULES.includes(m));
  if (badModules.length) {
    return res.status(400).json({ error: 'Los módulos base no pueden seleccionarse como módulos de prueba' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanSlug  = slugify(company_name.trim());

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Check email uniqueness
    const [emailExists] = await conn.query(
      'SELECT id FROM users WHERE email = ?', [cleanEmail]
    );
    if (emailExists.length) {
      await conn.rollback();
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });
    }

    // Resolve unique slug
    let slug = cleanSlug;
    const [slugExists] = await conn.query('SELECT id FROM tenants WHERE slug = ?', [slug]);
    if (slugExists.length) slug = `${slug}-${Date.now()}`;

    // Create tenant — Starter Free
    const [[tenant]] = await conn.query(
      `INSERT INTO tenants
         (name, slug, status, plan, contact_email, primary_color,
          max_users, max_technicians, max_assets, trial_ends_at, created_at)
       VALUES (?, ?, 'active', 'starter_free', ?, '#F2B045', 5, 2, 30,
               NOW() + INTERVAL '30 days', NOW())
       RETURNING id, name, slug, primary_color, plan`,
      [company_name.trim(), slug, cleanEmail]
    );

    // Create admin user
    const hash = await bcrypt.hash(password, 12);
    const [[user]] = await conn.query(
      `INSERT INTO users (tenant_id, name, email, password, role, is_active, created_at)
       VALUES (?, ?, ?, ?, 'admin', true, NOW())
       RETURNING id, name, email, role`,
      [tenant.id, user_name.trim(), cleanEmail, hash]
    );

    // Set owner
    await conn.query('UPDATE tenants SET owner_user_id = ? WHERE id = ?', [user.id, tenant.id]);

    // Enable mandatory modules
    const [mandatoryMods] = await conn.query(
      `SELECT id, code, name FROM modules WHERE code = ANY(?) AND is_active = true`,
      [MANDATORY_MODULES]
    );
    for (const mod of mandatoryMods) {
      await conn.query(
        `INSERT INTO tenant_modules
           (tenant_id, module_id, is_active, type, status, unlimited, starts_at)
         VALUES (?, ?, true, 'required', 'active', true, NOW())
         ON CONFLICT (tenant_id, module_id) DO UPDATE
           SET is_active = true, type = 'required', status = 'active', unlimited = true`,
        [tenant.id, mod.id]
      );
    }

    // Enable trial modules (max 2)
    let trialModuleDetails = [];
    if (trial_modules.length > 0) {
      const [trialMods] = await conn.query(
        `SELECT id, code, name FROM modules WHERE code = ANY(?) AND is_active = true`,
        [trial_modules]
      );
      trialModuleDetails = trialMods;
      for (const mod of trialMods) {
        await conn.query(
          `INSERT INTO tenant_modules
             (tenant_id, module_id, is_active, type, status, unlimited, starts_at, expires_at)
           VALUES (?, ?, true, 'trial', 'active', false, NOW(), NOW() + INTERVAL '30 days')
           ON CONFLICT (tenant_id, module_id) DO UPDATE
             SET is_active = true, type = 'trial', status = 'active',
                 unlimited = false, starts_at = NOW(),
                 expires_at = NOW() + INTERVAL '30 days'`,
          [tenant.id, mod.id]
        );
      }
    }

    await conn.commit();

    // Session management
    const sessionId = randomBytes(32).toString('hex');
    await db.query('UPDATE users SET active_session_id = ? WHERE id = ?', [sessionId, user.id]);

    const token = jwt.sign(
      { id: user.id, tenant_id: tenant.id, role: user.role, email: user.email, session_id: sessionId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    // Welcome email (async — don't block response)
    const mailer = getMailer();
    if (mailer) {
      const appUrl = process.env.FRONTEND_URL || 'https://fbcore.cloud';
      const whatsappNumber = process.env.COMPANY_WHATSAPP_NUMBER || '56920023072';
      const trialList = trialModuleDetails.map(m => `• ${m.name}`).join('\n');

      const html = `<!DOCTYPE html><html lang="es"><body style="font-family:'Plus Jakarta Sans',sans-serif;background:#131316;margin:0;padding:40px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:0 auto;">
<tr><td style="background:linear-gradient(135deg,#F2B045,#EDA135);border-radius:16px 16px 0 0;padding:28px 40px;">
  <span style="font-size:20px;font-weight:700;color:#131316;">FB <span style="opacity:0.7;">Core</span></span>
  <span style="float:right;font-size:11px;color:#131316;opacity:0.6;margin-top:4px;">by FBSystems</span>
</td></tr>
<tr><td style="background:#1B1B1D;border:1px solid #2C2C30;border-top:none;padding:40px 48px;">
  <h1 style="margin:0 0 8px;color:#F5F5F5;font-size:22px;">¡Bienvenido a FB Core!</h1>
  <p style="color:#919197;font-size:14px;line-height:1.6;">Hola <strong style="color:#F5F5F5;">${user_name}</strong>, tu empresa <strong style="color:#F2B045;">${company_name}</strong> ha sido creada exitosamente con el plan <strong style="color:#F2B045;">Starter Free</strong>.</p>
  <div style="background:#161618;border:1px solid #2C2C30;border-left:3px solid #F2B045;border-radius:8px;padding:16px 20px;margin:24px 0;">
    <p style="margin:0 0 8px;color:#F5F5F5;font-size:14px;font-weight:600;">Tu plan Starter Free incluye:</p>
    <ul style="color:#919197;font-size:13px;line-height:2;margin:0;padding-left:20px;">
      <li>Módulos base activos: Inventario y Personal</li>
      <li>Hasta 5 usuarios</li>
      <li>Hasta 30 activos</li>
      <li>${trialModuleDetails.length > 0 ? `Módulos de prueba (30 días):\n${trialList}` : 'Sin módulos adicionales de prueba'}</li>
    </ul>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr><td align="center">
      <a href="${appUrl}" style="display:inline-block;background:#F2B045;color:#131316;font-size:15px;font-weight:700;text-decoration:none;padding:14px 44px;border-radius:10px;">
        Ir a FB Core
      </a>
    </td></tr>
  </table>
  <p style="color:#919197;font-size:12px;line-height:1.6;border-top:1px solid #2C2C30;padding-top:16px;margin:0;">
    ¿Quieres extender tu prueba o mejorar tu plan? <a href="https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola, soy administrador de la empresa ${company_name} en FB Core ERP. Quiero solicitar información sobre planes.`)}" style="color:#F2B045;text-decoration:none;">Contáctanos por WhatsApp</a>.
  </p>
</td></tr>
<tr><td style="background:#161618;border:1px solid #2C2C30;border-top:none;border-radius:0 0 16px 16px;padding:20px 48px;text-align:center;">
  <p style="margin:0;font-size:11px;color:#555559;">© ${new Date().getFullYear()} <a href="https://fbsystems.cl" style="color:#919197;text-decoration:none;">FBSystems</a> · fbcore.cloud</p>
</td></tr>
</table></body></html>`;

      mailer.sendMail({
        from: process.env.SMTP_FROM || '"FB Core" <noreply@fbcore.cloud>',
        to: cleanEmail,
        subject: `¡Bienvenido a FB Core! Tu empresa ${company_name} está lista`,
        html,
      }).catch(e => console.error('[REGISTER] Welcome email error:', e.message));
    }

    console.info(`[${new Date().toISOString()}] REGISTER_OK tenant=${tenant.id} user=${user.id} email=${cleanEmail}`);

    const allActiveModules = [
      ...mandatoryMods.map(m => ({ code: m.code, name: m.name, type: 'required', expires_at: null })),
      ...trialModuleDetails.map(m => ({
        code: m.code, name: m.name, type: 'trial',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })),
    ];

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          primary_color: tenant.primary_color,
          plan: tenant.plan,
        },
        modules: allActiveModules.map(m => ({
          code: m.code,
          name: m.name,
          can_view: true, can_write: true, can_delete: true,
        })),
        plan_info: {
          plan: 'starter_free',
          plan_name: 'Starter Free',
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          max_users: 5,
          max_technicians: 2,
          max_assets: 30,
          modules: allActiveModules,
        },
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error(`[${new Date().toISOString()}] REGISTER_ERROR:`, err.message);
    res.status(500).json({ error: 'Error al crear la empresa. Intenta nuevamente.' });
  } finally {
    conn.release();
  }
});

export default router;
