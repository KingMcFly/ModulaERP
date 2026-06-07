import jwt from 'jsonwebtoken';
import db from '../db.js';

// Import audit lazily to avoid circular deps at module init time
let _audit;
async function getAudit() {
  if (!_audit) _audit = (await import('../utils/audit.js')).audit;
  return _audit;
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  let decoded;
  try {
    decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch {
    // A07: Log invalid token attempts for monitoring (A09)
    const audit = await getAudit();
    await audit.log(req, audit.EVENTS.INVALID_TOKEN, {}).catch(() => {});
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  // A07: Concurrent session check — revokes old tokens when user logs in elsewhere
  if (decoded.session_id && decoded.role !== 'super_admin') {
    // Regular users: single active session enforced via users.active_session_id
    try {
      const [rows] = await db.query(
        'SELECT active_session_id FROM users WHERE id = ? AND is_active = true',
        [decoded.id]
      );
      if (!rows.length) {
        return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
      }
      // NULL session means logged out — reject all tokens
      if (!rows[0].active_session_id) {
        return res.status(401).json({ error: 'Sesión cerrada. Inicia sesión nuevamente.' });
      }
      if (rows[0].active_session_id !== decoded.session_id) {
        return res.status(401).json({
          error: 'Tu sesión fue cerrada porque se inició sesión en otro dispositivo.',
          reason: 'session_replaced',
        });
      }
    } catch (err) {
      console.error(`[SESSION_CHECK_ERROR][${req.id}] ${err.message}`);
      // Fail open only on DB error — availability over security for this check
    }
  } else if (decoded.session_id && decoded.role === 'super_admin') {
    // Super admins: multi-device sessions tracked in user_sessions, each
    // individually revocable from the Security panel.
    try {
      const [rows] = await db.query(
        'SELECT id FROM user_sessions WHERE session_id = ? AND user_id = ?',
        [decoded.session_id, decoded.id]
      );
      if (!rows.length) {
        return res.status(401).json({
          error: 'Tu sesión fue cerrada o revocada. Inicia sesión nuevamente.',
          reason: 'session_revoked',
        });
      }
      // Best-effort "last seen" touch (non-blocking)
      db.query('UPDATE user_sessions SET last_seen_at = NOW() WHERE session_id = ?', [decoded.session_id])
        .catch(() => {});
    } catch (err) {
      console.error(`[SESSION_CHECK_ERROR][${req.id}] ${err.message}`);
      // Fail open only on DB error — availability over security for this check
    }
  }

  req.user = decoded;
  next();
}

export function requireSuperAdmin(req, res, next) {
  requireAuth(req, res, async (err) => {
    if (err) return;
    if (req.user.role !== 'super_admin') {
      const audit = await getAudit();
      await audit.log(req, audit.EVENTS.ACCESS_DENIED, { required: 'super_admin', actual: req.user.role }).catch(() => {});
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  });
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, async (err) => {
    if (err) return;
    if (!['super_admin', 'admin', 'manager'].includes(req.user.role)) {
      const audit = await getAudit();
      await audit.log(req, audit.EVENTS.ACCESS_DENIED, { required: 'admin', actual: req.user.role }).catch(() => {});
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  });
}
