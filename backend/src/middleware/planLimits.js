import db from '../db.js';

// Returns middleware that checks if tenant has reached plan limit for `resource`
// tableQuery: SQL to count current usage, e.g. 'SELECT COUNT(*) AS c FROM assets WHERE tenant_id=? AND is_active=1'
export function checkPlanLimit(resource, tableQuery) {
  return async (req, res, next) => {
    try {
      const tid = req.user.tenant_id;

      const [[tenant]] = await db.query('SELECT plan FROM tenants WHERE id=?', [tid]);
      const plan = tenant?.plan || 'starter';

      const [[limitRow]] = await db.query(
        'SELECT max_value FROM plan_limits WHERE plan=? AND resource=?',
        [plan, resource]
      );

      if (!limitRow || limitRow.max_value === -1) return next();

      const [[{ c }]] = await db.query(tableQuery, [tid]);
      if (c >= limitRow.max_value) {
        return res.status(403).json({
          error: `Límite del plan ${plan} alcanzado (${limitRow.max_value} ${resource}). Actualiza tu plan para continuar.`,
          plan_limit: true,
          limit: limitRow.max_value,
          current: c,
          resource,
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
