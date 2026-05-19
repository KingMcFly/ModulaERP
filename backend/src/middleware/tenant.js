import db from '../db.js';

const FULL_ACCESS_ROLES = ['super_admin', 'admin', 'manager'];

export function requireModule(moduleCode) {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'super_admin') return next();

      // Check tenant has the module enabled
      const [rows] = await db.query(
        `SELECT tm.is_active FROM tenant_modules tm
         JOIN modules m ON m.id = tm.module_id
         WHERE tm.tenant_id = ? AND m.code = ? AND tm.is_active = 1`,
        [req.user.tenant_id, moduleCode]
      );
      if (!rows.length) {
        return res.status(403).json({ error: `Módulo '${moduleCode}' no habilitado` });
      }

      // Admin/manager have full access — skip user-level check
      if (FULL_ACCESS_ROLES.includes(req.user.role)) return next();

      // Regular user: must have explicit can_view permission
      const [perm] = await db.query(
        'SELECT can_view FROM user_module_permissions WHERE user_id=? AND module_code=? AND can_view=1',
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
        'SELECT can_write FROM user_module_permissions WHERE user_id=? AND module_code=? AND can_write=1',
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
        'SELECT can_delete FROM user_module_permissions WHERE user_id=? AND module_code=? AND can_delete=1',
        [req.user.id, moduleCode]
      );
      if (!perm.length) {
        return res.status(403).json({ error: 'Sin permiso de eliminación en este módulo' });
      }
      next();
    } catch (err) { next(err); }
  };
}
