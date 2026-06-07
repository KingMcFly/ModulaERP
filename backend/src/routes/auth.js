import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { randomBytes } from 'crypto';
import nodemailer from 'nodemailer';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { resetPasswordEmail } from '../utils/emailTemplates.js';
import { audit } from '../utils/audit.js';
import { generateSecret, verifyToken, buildOtpAuthUri } from '../utils/totp.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

// ── A03: Input validation schemas ─────────────────────────────────────────────
const loginSchema = z.object({
  email:     z.string().min(1).max(254).trim(),
  password:  z.string().min(1).max(128),
  totp_code: z.string().max(10).optional(),
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1).max(128),
  new_password:     z.string().min(8).max(128),
});

const forgotPasswordSchema = z.object({
  email: z.string().email().max(254).trim().toLowerCase(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

const router = Router();

// ── Rate limit estricto en login — previene fuerza bruta (A07) ────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Espera 15 minutos.' },
  keyGenerator: (req) => req.body?.email?.toLowerCase?.() || ipKeyGenerator(req.ip),
});

function cleanRutServer(rut) {
  return rut.replace(/[.\-\s]/g, '').toUpperCase();
}
function looksLikeRut(value) {
  return /^\d{7,8}[0-9K]$/i.test(cleanRutServer(value));
}
function formatRutServer(rut) {
  const clean = cleanRutServer(rut);
  if (clean.length < 2) return rut;
  const dv   = clean.slice(-1);
  const body = clean.slice(0, -1);
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}

router.post('/login', loginLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Identificador y contraseña requeridos' });

  // Sanitización básica de longitud (A08)
  if (typeof email !== 'string' || email.length > 254) {
    return res.status(400).json({ error: 'Identificador inválido' });
  }
  if (typeof password !== 'string' || password.length > 128) {
    return res.status(400).json({ error: 'Contraseña inválida' });
  }

  const identifier = email.trim();
  const byRut = looksLikeRut(identifier);

  try {
    const whereClause = byRut ? 'u.rut = ?' : 'u.email = ?';
    const queryValue  = byRut ? formatRutServer(identifier) : identifier.toLowerCase();

    const [rows] = await db.query(
      `SELECT u.*, t.slug AS tenant_slug, t.name AS tenant_name,
              t.primary_color, t.logo_url, t.status AS tenant_status
       FROM users u JOIN tenants t ON t.id = u.tenant_id
       WHERE ${whereClause} AND u.is_active = true`,
      [queryValue]
    );

    const user = rows[0];

    // Siempre comparar hash para evitar timing attacks (A02)
    const dummyHash = '$2a$10$invalidhashfortimingnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn';
    const passwordValid = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, dummyHash).then(() => false);

    if (!user || !passwordValid) {
      // Log de intento fallido (A09)
      await audit.log(req, audit.EVENTS.LOGIN_FAILED, { identifier });
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    if (user.tenant_status === 'suspended') {
      return res.status(403).json({ error: 'Cuenta suspendida. Contacte al administrador.' });
    }

    // ── Doble autenticación (2FA / TOTP) ──────────────────────────────────────
    // Password OK; if the account has 2FA enabled, demand a valid code before
    // issuing a token. The frontend shows a code step when it sees requires_2fa.
    if (user.totp_enabled) {
      const code = req.body.totp_code;
      if (!code) {
        return res.status(200).json({ requires_2fa: true });
      }
      if (!verifyToken(user.totp_secret, code)) {
        await audit.log(req, audit.EVENTS.TWO_FA_FAILED, { user_id: user.id });
        return res.status(401).json({ error: 'Código de verificación incorrecto', requires_2fa: true });
      }
    }

    const sessionId = randomBytes(32).toString('hex');
    await db.query(
      'UPDATE users SET last_login = NOW(), active_session_id = ? WHERE id = ?',
      [sessionId, user.id]
    );

    // ── Registro de sesión por dispositivo ────────────────────────────────────
    const userAgent = (req.headers['user-agent'] || '').slice(0, 500);
    const ip = req.ip || null;
    if (user.role === 'super_admin') {
      // Multi-dispositivo: conserva sesiones existentes, añade esta (máx. 20)
      await db.query(
        'INSERT INTO user_sessions (session_id, user_id, user_agent, ip_address) VALUES (?, ?, ?, ?)',
        [sessionId, user.id, userAgent, ip]
      );
      await db.query(
        `DELETE FROM user_sessions WHERE user_id = ? AND id NOT IN (
           SELECT id FROM user_sessions WHERE user_id = ? ORDER BY last_seen_at DESC LIMIT 20
         )`,
        [user.id, user.id]
      );
    } else {
      // Sesión única: reemplaza cualquier sesión previa
      await db.query('DELETE FROM user_sessions WHERE user_id = ?', [user.id]);
      await db.query(
        'INSERT INTO user_sessions (session_id, user_id, user_agent, ip_address) VALUES (?, ?, ?, ?)',
        [sessionId, user.id, userAgent, ip]
      );
    }

    const FULL_ACCESS = ['super_admin', 'admin', 'manager'];
    let modulesRows;
    if (FULL_ACCESS.includes(user.role)) {
      const [r] = await db.query(
        `SELECT m.code, m.name, m.icon, m.color, m.sort_order,
                1 AS can_view, 1 AS can_write, 1 AS can_delete
         FROM tenant_modules tm JOIN modules m ON m.id = tm.module_id
         WHERE tm.tenant_id = ? AND tm.is_active = true
         ORDER BY m.sort_order`,
        [user.tenant_id]
      );
      modulesRows = r;
    } else {
      const [r] = await db.query(
        `SELECT m.code, m.name, m.icon, m.color, m.sort_order,
                ump.can_view, ump.can_write, ump.can_delete
         FROM user_module_permissions ump
         JOIN modules m ON m.code = ump.module_code
         JOIN tenant_modules tm ON tm.module_id = m.id AND tm.tenant_id = ump.tenant_id AND tm.is_active = true
         WHERE ump.user_id = ? AND ump.tenant_id = ? AND ump.can_view = true
         ORDER BY m.sort_order`,
        [user.id, user.tenant_id]
      );
      modulesRows = r;
    }

    const token = jwt.sign(
      { id: user.id, tenant_id: user.tenant_id, role: user.role, email: user.email, session_id: sessionId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    await audit.log(req, audit.EVENTS.LOGIN_OK, { user_id: user.id, tenant_id: user.tenant_id });

    res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email,
        role: user.role, avatar_url: user.avatar_url,
        tenant: {
          id: user.tenant_id, name: user.tenant_name,
          slug: user.tenant_slug, primary_color: user.primary_color,
          logo_url: user.logo_url,
        },
        modules: modulesRows,
      },
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] LOGIN_ERROR:`, err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── A07: Logout — revoke session immediately (token unusable even before expiry)
router.post('/logout', requireAuth, async (req, res) => {
  try {
    // Clear active_session_id so any existing JWT with this session fails validation
    await db.query(
      'UPDATE users SET active_session_id = NULL WHERE id = ?',
      [req.user.id]
    );
    // Remove just this device's session row (other admin devices stay signed in)
    if (req.user.session_id) {
      await db.query('DELETE FROM user_sessions WHERE session_id = ?', [req.user.session_id]).catch(() => {});
    }
    await audit.log(req, audit.EVENTS.LOGOUT, { user_id: req.user.id });
    res.json({ message: 'Sesión cerrada correctamente' });
  } catch (err) {
    console.error(`[LOGOUT_ERROR] ${err.message}`);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const [rows] = await db.query(
    `SELECT u.id, u.name, u.email, u.role, u.avatar_url,
            t.id AS tid, t.name AS tname, t.slug, t.primary_color, t.logo_url
     FROM users u JOIN tenants t ON t.id = u.tenant_id
     WHERE u.id = ?`,
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

  const u = rows[0];
  const FULL_ACCESS = ['super_admin', 'admin', 'manager'];
  let modules;

  if (FULL_ACCESS.includes(u.role)) {
    // Admins/managers see all tenant modules with full permissions
    const [rows2] = await db.query(
      `SELECT m.code, m.name, m.icon, m.color, m.sort_order,
              1 AS can_view, 1 AS can_write, 1 AS can_delete
       FROM tenant_modules tm JOIN modules m ON m.id = tm.module_id
       WHERE tm.tenant_id = ? AND tm.is_active = true
       ORDER BY m.sort_order`,
      [u.tid]
    );
    modules = rows2;
  } else {
    // Regular users see only modules they have can_view permission for
    const [rows2] = await db.query(
      `SELECT m.code, m.name, m.icon, m.color, m.sort_order,
              ump.can_view, ump.can_write, ump.can_delete
       FROM user_module_permissions ump
       JOIN modules m ON m.code = ump.module_code
       JOIN tenant_modules tm ON tm.module_id = m.id AND tm.tenant_id = ump.tenant_id AND tm.is_active = true
       WHERE ump.user_id = ? AND ump.tenant_id = ? AND ump.can_view = true
       ORDER BY m.sort_order`,
      [u.id, u.tid]
    );
    modules = rows2;
  }

  res.json({
    id: u.id, name: u.name, email: u.email, role: u.role, avatar_url: u.avatar_url,
    tenant: { id: u.tid, name: u.tname, slug: u.slug, primary_color: u.primary_color, logo_url: u.logo_url },
    modules,
  });
});

// ── A07: Validación de fortaleza de contraseña (OWASP ASVS L2) ───────────────
function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') return 'Contraseña requerida';
  if (password.length < 8)   return 'Mínimo 8 caracteres';
  if (password.length > 128) return 'Máximo 128 caracteres';
  if (!/[A-Z]/.test(password)) return 'Debe contener al menos una mayúscula';
  if (!/[a-z]/.test(password)) return 'Debe contener al menos una minúscula';
  if (!/[0-9]/.test(password)) return 'Debe contener al menos un número';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Debe contener al menos un carácter especial (!@#$%^&*…)';
  return null;
}

router.post('/change-password', requireAuth, validate(changePasswordSchema), async (req, res) => {
  const { current_password, new_password } = req.body;

  const strengthError = validatePasswordStrength(new_password);
  if (strengthError) return res.status(400).json({ error: strengthError });

  const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
  if (!rows.length || !(await bcrypt.compare(current_password, rows[0].password))) {
    await audit.log(req, audit.EVENTS.PASSWORD_CHANGED, { user_id: req.user.id, success: false });
    return res.status(400).json({ error: 'Contraseña actual incorrecta' });
  }

  const hash = await bcrypt.hash(new_password, 12);
  // A07: Issue a new session ID — invalidates all other active sessions on password change
  const newSessionId = randomBytes(32).toString('hex');
  await db.query(
    'UPDATE users SET password = ?, active_session_id = ? WHERE id = ?',
    [hash, newSessionId, req.user.id]
  );

  // Issue a fresh token so the current device stays logged in
  const newToken = jwt.sign(
    { id: req.user.id, tenant_id: req.user.tenant_id, role: req.user.role, email: req.user.email, session_id: newSessionId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  await audit.log(req, audit.EVENTS.PASSWORD_CHANGED, { user_id: req.user.id, success: true });
  res.json({ message: 'Contraseña actualizada', token: newToken });
});

// ── Password recovery ─────────────────────────────────────────────────────

const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera 15 minutos.' },
});

function getMailer() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

router.post('/forgot-password', forgotLimiter, validate(forgotPasswordSchema), async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || email.length > 254)
    return res.status(400).json({ error: 'Email inválido' });

  // Always respond generically to avoid user enumeration (A01)
  const GENERIC = { message: 'Si el email existe, recibirás instrucciones en breve.' };

  try {
    const [rows] = await db.query(
      'SELECT id, name, email FROM users WHERE email = ? AND is_active = true',
      [email.trim().toLowerCase()]
    );
    if (!rows.length) return res.json(GENERIC);

    const user = rows[0];
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?) RETURNING id',
      [user.id, token, expiresAt]
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;
    await audit.log(req, audit.EVENTS.PASSWORD_RESET_REQ, { user_id: user.id });

    const mailer = getMailer();
    if (mailer) {
      const { subject, html, text } = resetPasswordEmail({ name: user.name, resetUrl });
      await mailer.sendMail({
        from: process.env.SMTP_FROM || `"FB Core" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject,
        html,
        text,
      });
    } else {
      // Dev fallback: log link so the flow can be tested without SMTP
      console.info(`[DEV] RESET_URL=${resetUrl}`);
    }

    res.json(GENERIC);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] FORGOT_PASSWORD_ERROR:`, err.message);
    res.json(GENERIC);
  }
});

router.post('/reset-password/:token', validate(resetPasswordSchema), async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token))
    return res.status(400).json({ error: 'Token inválido' });

  const strengthError = validatePasswordStrength(password);
  if (strengthError) return res.status(400).json({ error: strengthError });

  try {
    const [prtRows] = await db.query(
      `SELECT prt.id, prt.user_id FROM password_reset_tokens prt
       WHERE prt.token = ? AND prt.used_at IS NULL AND prt.expires_at > NOW()`,
      [token]
    );
    const row = prtRows[0];
    if (!row) return res.status(400).json({ error: 'Token inválido o expirado' });

    const hash = await bcrypt.hash(password, 12);
    // A07: Invalidate all active sessions after reset — force re-login everywhere
    await db.query(
      'UPDATE users SET password = ?, active_session_id = NULL WHERE id = ?',
      [hash, row.user_id]
    );
    await db.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [row.id]);

    await audit.log(req, audit.EVENTS.PASSWORD_RESET_OK, { user_id: row.user_id });
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] RESET_PASSWORD_ERROR:`, err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  DOBLE AUTENTICACIÓN (2FA / TOTP)
// ════════════════════════════════════════════════════════════════════════════

const twoFaCodeSchema = z.object({ code: z.string().min(6).max(10) });
const twoFaDisableSchema = z.object({
  password: z.string().min(1).max(128),
  code:     z.string().min(6).max(10),
});

// Estado actual del 2FA del usuario autenticado
router.get('/2fa/status', requireAuth, async (req, res) => {
  const [rows] = await db.query('SELECT totp_enabled FROM users WHERE id = ?', [req.user.id]);
  res.json({ enabled: !!rows[0]?.totp_enabled });
});

// Paso 1: generar secreto + URI para el QR (aún no activa el 2FA)
router.post('/2fa/setup', requireAuth, async (req, res) => {
  const [rows] = await db.query('SELECT email, totp_enabled FROM users WHERE id = ?', [req.user.id]);
  const u = rows[0];
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (u.totp_enabled) return res.status(400).json({ error: 'El 2FA ya está activado' });

  const secret = generateSecret();
  await db.query('UPDATE users SET totp_secret = ? WHERE id = ?', [secret, req.user.id]);

  const otpauth_uri = buildOtpAuthUri({ secret, account: u.email });
  res.json({ secret, otpauth_uri });
});

// Paso 2: verificar un código del autenticador y activar el 2FA
router.post('/2fa/enable', requireAuth, validate(twoFaCodeSchema), async (req, res) => {
  const [rows] = await db.query('SELECT totp_secret, totp_enabled FROM users WHERE id = ?', [req.user.id]);
  const u = rows[0];
  if (!u || !u.totp_secret) return res.status(400).json({ error: 'Primero genera el código QR' });
  if (u.totp_enabled) return res.status(400).json({ error: 'El 2FA ya está activado' });

  if (!verifyToken(u.totp_secret, req.body.code)) {
    await audit.log(req, audit.EVENTS.TWO_FA_FAILED, { user_id: req.user.id, stage: 'enable' });
    return res.status(400).json({ error: 'Código incorrecto. Verifica la hora de tu dispositivo.' });
  }

  await db.query('UPDATE users SET totp_enabled = true WHERE id = ?', [req.user.id]);
  await audit.log(req, audit.EVENTS.TWO_FA_ENABLED, { user_id: req.user.id });
  res.json({ message: 'Doble autenticación activada' });
});

// Desactivar 2FA — requiere contraseña actual + un código válido (defensa en profundidad)
router.post('/2fa/disable', requireAuth, validate(twoFaDisableSchema), async (req, res) => {
  const { password, code } = req.body;
  const [rows] = await db.query('SELECT password, totp_secret, totp_enabled FROM users WHERE id = ?', [req.user.id]);
  const u = rows[0];
  if (!u || !u.totp_enabled) return res.status(400).json({ error: 'El 2FA no está activado' });

  if (!(await bcrypt.compare(password, u.password))) {
    return res.status(400).json({ error: 'Contraseña incorrecta' });
  }
  if (!verifyToken(u.totp_secret, code)) {
    return res.status(400).json({ error: 'Código incorrecto' });
  }

  await db.query('UPDATE users SET totp_enabled = false, totp_secret = NULL WHERE id = ?', [req.user.id]);
  await audit.log(req, audit.EVENTS.TWO_FA_DISABLED, { user_id: req.user.id });
  res.json({ message: 'Doble autenticación desactivada' });
});

// ════════════════════════════════════════════════════════════════════════════
//  GESTIÓN DE SESIONES (dispositivos activos)
// ════════════════════════════════════════════════════════════════════════════

// Listar las sesiones activas del usuario autenticado
router.get('/sessions', requireAuth, async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, session_id, user_agent, ip_address, created_at, last_seen_at
     FROM user_sessions WHERE user_id = ? ORDER BY last_seen_at DESC`,
    [req.user.id]
  );
  const sessions = rows.map(s => ({
    id: s.id,
    user_agent: s.user_agent,
    ip_address: s.ip_address,
    created_at: s.created_at,
    last_seen_at: s.last_seen_at,
    current: s.session_id === req.user.session_id,
  }));
  res.json(sessions);
});

// Cerrar todas las demás sesiones (mantiene la actual)
router.delete('/sessions/others', requireAuth, async (req, res) => {
  await db.query(
    'DELETE FROM user_sessions WHERE user_id = ? AND session_id <> ?',
    [req.user.id, req.user.session_id || '']
  );
  await audit.log(req, audit.EVENTS.SESSION_REVOKED, { user_id: req.user.id, scope: 'others' });
  res.json({ message: 'Otras sesiones cerradas' });
});

// Revocar una sesión específica
router.delete('/sessions/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });
  await db.query('DELETE FROM user_sessions WHERE id = ? AND user_id = ?', [id, req.user.id]);
  await audit.log(req, audit.EVENTS.SESSION_REVOKED, { user_id: req.user.id, session_row: id });
  res.json({ message: 'Sesión cerrada' });
});

export default router;
