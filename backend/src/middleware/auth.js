import jwt from 'jsonwebtoken';
import db from '../db.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  let decoded;
  try {
    decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  // Concurrent session check — skip for super_admin to avoid extra DB hit
  if (decoded.session_id && decoded.role !== 'super_admin') {
    try {
      const [rows] = await db.query(
        'SELECT active_session_id FROM users WHERE id = ? AND is_active = true',
        [decoded.id]
      );
      if (!rows.length) {
        return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
      }
      if (rows[0].active_session_id && rows[0].active_session_id !== decoded.session_id) {
        return res.status(401).json({
          error: 'Tu sesión fue cerrada porque se inició sesión en otro dispositivo.',
          reason: 'session_replaced',
        });
      }
    } catch (err) {
      console.error('SESSION_CHECK_ERROR:', err.message);
      // Don't block request on DB error — fail open for availability
    }
  }

  req.user = decoded;
  next();
}

export function requireSuperAdmin(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return;
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  });
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return;
    if (!['super_admin', 'admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  });
}
