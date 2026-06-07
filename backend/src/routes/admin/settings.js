import { Router } from 'express';
import db from '../../db.js';
import { requireSuperAdmin } from '../../middleware/auth.js';

const router = Router();
router.use(requireSuperAdmin);
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

const DATE_STYLES = ['short', 'medium', 'long', 'full'];

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
  const [[row]] = await db.query('SELECT locale, timezone, currency, date_style, updated_at FROM system_settings WHERE id = 1');
  res.json(row || { locale: 'es-CL', timezone: 'America/Santiago', currency: 'CLP', date_style: 'medium' });
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

export default router;
