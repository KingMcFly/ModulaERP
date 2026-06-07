import { Router } from 'express';
import db from '../../db.js';
import { requireSuperAdmin } from '../../middleware/auth.js';
import { sendMail, isMailConfigured } from '../../utils/mailer.js';
import { NOTIFY_EVENTS } from '../../utils/notifier.js';

const router = Router();
router.use(requireSuperAdmin);
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

const DATE_STYLES = ['short', 'medium', 'long', 'full'];
const EVENT_KEYS = Object.keys(NOTIFY_EVENTS);

// Lazily-built validation sets from the Node ICU data (Node 18+)
const VALID_TIMEZONES = (() => {
  try { return new Set(Intl.supportedValuesOf('timeZone')); }
  catch { return null; }
})();

function isValidLocale(locale) {
  if (typeof locale !== 'string' || !/^[a-z]{2}(-[A-Z]{2})?$/.test(locale)) return false;
  try { new Intl.DateTimeFormat(locale); return true; }
  catch { return false; }
}
function isValidTimezone(tz) {
  if (typeof tz !== 'string' || tz.length > 64) return false;
  if (VALID_TIMEZONES) return VALID_TIMEZONES.has(tz);
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; }
  catch { return false; }
}
function isValidCurrency(cur) {
  return typeof cur === 'string' && /^[A-Z]{3}$/.test(cur);
}

router.get('/', w(async (_req, res) => {
  const [[row]] = await db.query(
    `SELECT locale, timezone, currency, date_style,
            notify_enabled, notify_email, notify_events,
            brand_name, accent_color, logo_url, updated_at
     FROM system_settings WHERE id = 1`
  );
  const data = row || { locale: 'es-CL', timezone: 'America/Santiago', currency: 'CLP', date_style: 'medium' };
  // Normalize notify_events (Postgres jsonb comes back as an object already)
  if (typeof data.notify_events === 'string') {
    try { data.notify_events = JSON.parse(data.notify_events); } catch { data.notify_events = {}; }
  }
  data.notify_events = data.notify_events || {};
  data.mail_configured = isMailConfigured();
  data.available_events = NOTIFY_EVENTS;
  res.json(data);
}));

router.put('/', w(async (req, res) => {
  const { locale, timezone, currency, date_style } = req.body;

  if (!isValidLocale(locale))     return res.status(400).json({ error: 'Idioma (locale) inválido' });
  if (!isValidTimezone(timezone)) return res.status(400).json({ error: 'Zona horaria inválida' });
  if (!isValidCurrency(currency)) return res.status(400).json({ error: 'Moneda inválida (código ISO de 3 letras)' });
  if (!DATE_STYLES.includes(date_style)) return res.status(400).json({ error: 'Formato de fecha inválido' });

  await db.query(
    `UPDATE system_settings
       SET locale = ?, timezone = ?, currency = ?, date_style = ?, updated_at = NOW()
     WHERE id = 1`,
    [locale, timezone, currency, date_style]
  );
  console.info(`[${new Date().toISOString()}] SYSTEM_SETTINGS_UPDATED locale=${locale} tz=${timezone} by=${req.user.id}`);
  res.json({ message: 'Configuración regional actualizada' });
}));

// ── Notificaciones ────────────────────────────────────────────────────────────
function isValidEmail(email) {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.put('/notifications', w(async (req, res) => {
  const { notify_enabled, notify_email, notify_events } = req.body;

  const enabled = !!notify_enabled;
  if (enabled && !isValidEmail(notify_email)) {
    return res.status(400).json({ error: 'Email de destino inválido' });
  }
  // Whitelist event keys — ignore anything unknown
  const cleanEvents = {};
  if (notify_events && typeof notify_events === 'object') {
    for (const key of EVENT_KEYS) cleanEvents[key] = !!notify_events[key];
  }

  await db.query(
    `UPDATE system_settings
       SET notify_enabled = ?, notify_email = ?, notify_events = ?, updated_at = NOW()
     WHERE id = 1`,
    [enabled, notify_email || null, JSON.stringify(cleanEvents)]
  );
  console.info(`[${new Date().toISOString()}] NOTIFY_SETTINGS_UPDATED enabled=${enabled} by=${req.user.id}`);
  res.json({ message: 'Notificaciones actualizadas' });
}));

router.post('/notifications/test', w(async (req, res) => {
  const [[row]] = await db.query('SELECT notify_email FROM system_settings WHERE id = 1');
  const to = row?.notify_email;
  if (!isValidEmail(to)) return res.status(400).json({ error: 'Configura primero un email de destino válido' });
  if (!isMailConfigured()) {
    return res.status(400).json({ error: 'No hay servidor SMTP configurado en el servidor (variables SMTP_*)' });
  }

  await sendMail({
    to,
    subject: 'FB Core · Correo de prueba',
    html: `<div style="font-family:Arial,sans-serif;padding:24px;color:#0f172a;">
      <h2 style="margin:0 0 8px;">✅ Notificaciones funcionando</h2>
      <p style="color:#475569;">Si recibes este correo, las alertas del panel FB Core están configuradas correctamente.</p>
    </div>`,
    text: 'Notificaciones funcionando. Las alertas del panel FB Core están configuradas correctamente.',
  });
  console.info(`[${new Date().toISOString()}] NOTIFY_TEST_SENT to=${to} by=${req.user.id}`);
  res.json({ message: `Correo de prueba enviado a ${to}` });
}));

// ── Apariencia (marca, color de acento, logotipo) ─────────────────────────────
router.put('/appearance', w(async (req, res) => {
  const { brand_name, accent_color, logo_url } = req.body;

  const name = typeof brand_name === 'string' ? brand_name.trim() : '';
  if (!name || name.length > 60) return res.status(400).json({ error: 'Nombre de marca inválido (1–60 caracteres)' });
  if (typeof accent_color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(accent_color)) {
    return res.status(400).json({ error: 'Color de acento inválido (formato #RRGGBB)' });
  }
  let logo = null;
  if (logo_url != null && logo_url !== '') {
    if (typeof logo_url !== 'string' || logo_url.length > 500 || !/^https?:\/\//i.test(logo_url)) {
      return res.status(400).json({ error: 'URL del logotipo inválida (debe empezar con http:// o https://)' });
    }
    logo = logo_url;
  }

  await db.query(
    `UPDATE system_settings SET brand_name = ?, accent_color = ?, logo_url = ?, updated_at = NOW() WHERE id = 1`,
    [name, accent_color, logo]
  );
  console.info(`[${new Date().toISOString()}] APPEARANCE_UPDATED brand="${name}" color=${accent_color} by=${req.user.id}`);
  res.json({ message: 'Apariencia actualizada' });
}));

export default router;
