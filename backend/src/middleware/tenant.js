import db from '../db.js';

const FULL_ACCESS_ROLES = ['super_admin', 'admin', 'manager'];

export function requireModule(moduleCode) {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'super_admin') return next();

      const [rows] = await db.query(
        `SELECT tm.is_active, tm.status, tm.expires_at, tm.unlimited, tm.type
         FROM tenant_modules tm
         JOIN modules m ON m.id = tm.module_id
         WHERE tm.tenant_id = ? AND m.code = ?`,
        [req.user.tenant_id, moduleCode]
      );

      if (!rows.length || !rows[0].is_active) {
        return res.status(403).json({ error: `Módulo '${moduleCode}' no habilitado` });
      }

      const mod = rows[0];

      // Check expiry for trial/paid modules (required modules are always unlimited)
      if (!mod.unlimited && mod.expires_at) {
        const expired = new Date(mod.expires_at) < new Date();
        if (expired || mod.status === 'expired') {
          // Mark as expired in DB (async, don't block)
          db.query(
            `UPDATE tenant_modules tm
             SET status = 'expired', is_active = false
             FROM modules m
             WHERE tm.module_id = m.id AND tm.tenant_id = ? AND m.code = ?`,
            [req.user.tenant_id, moduleCode]
          ).catch(() => {});

          return res.status(403).json({
            error: `El módulo '${moduleCode}' ha vencido. Contacta a FBSystems para extender tu prueba.`,
            module_expired: true,
            module_code: moduleCode,
          });
        }
      }

      if (FULL_ACCESS_ROLES.includes(req.user.role)) return next();

      const [perm] = await db.query(
        'SELECT can_view FROM user_module_permissions WHERE user_id=? AND module_code=? AND can_view=true',
        [req.user.id, moduleCode]
      );
      if (!perm.length) {
        return res.status(403).json({ error: 'Sin acceso a este módulo' });
      }
      next();
    } catch (err) { next(err); }
  };
}

export function requireWrite(moduleCode) {
  return async (req, res, next) => {
    try {
      if (FULL_ACCESS_ROLES.includes(req.user.role)) return next();
      const [perm] = await db.query(
        'SELECT can_write FROM user_module_permissions WHERE user_id=? AND module_code=? AND can_write=true',
        [req.user.id, moduleCode]
      );
      if (!perm.length) {
        return res.status(403).json({ error: 'Sin permiso de escritura en este módulo' });
      }
      next();
    } catch (err) { next(err); }
  };
}

export function requireDelete(moduleCode) {
  return async (req, res, next) => {
    try {
      if (FULL_ACCESS_ROLES.includes(req.user.role)) return next();
      const [perm] = await db.query(
        'SELECT can_delete FROM user_module_permissions WHERE user_id=? AND module_code=? AND can_delete=true',
        [req.user.id, moduleCode]
      );
      if (!perm.length) {
        return res.status(403).json({ error: 'Sin permiso de eliminación en este módulo' });
      }
      next();
    } catch (err) { next(err); }
  };
}
