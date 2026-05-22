import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

router.get('/stats', w(async (req, res) => {
  const tid = req.user.tenant_id;

  const [[assets]] = await db.query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'available'   THEN 1 ELSE 0 END) AS available,
       SUM(CASE WHEN status = 'loaned'      THEN 1 ELSE 0 END) AS loaned,
       SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) AS maintenance,
       SUM(CASE WHEN status = 'retired'     THEN 1 ELSE 0 END) AS retired,
       COALESCE(SUM(value), 0) AS total_value
     FROM assets WHERE tenant_id = ? AND is_active = true`,
    [tid]
  );

  const [[personnel]] = await db.query(
    'SELECT COUNT(*) AS total FROM personnel WHERE tenant_id = ? AND is_active = true',
    [tid]
  );

  const [[monitoring]] = await db.query(
    `SELECT COUNT(*) AS total,
       SUM(CASE WHEN agent_status = 'online'  THEN 1 ELSE 0 END) AS online,
       SUM(CASE WHEN agent_status = 'offline' THEN 1 ELSE 0 END) AS offline,
       SUM(CASE WHEN agent_status = 'warning' THEN 1 ELSE 0 END) AS warning
     FROM monitoring_agents WHERE tenant_id = ?`,
    [tid]
  );

  const [[{ overdue_loans }]] = await db.query(
    `SELECT COUNT(*) AS overdue_loans FROM loans
     WHERE tenant_id = ? AND status = 'active' AND expected_return < CURRENT_DATE`,
    [tid]
  );

  const [[{ low_stock }]] = await db.query(
    `SELECT COUNT(*) AS low_stock FROM supplies
     WHERE tenant_id = ? AND is_active = true AND current_stock <= min_stock`,
    [tid]
  );

  const [[{ overdue_maintenance }]] = await db.query(
    `SELECT COUNT(*) AS overdue_maintenance FROM maintenance_records
     WHERE tenant_id = ? AND status IN ('pending','in_progress') AND scheduled_at < CURRENT_DATE`,
    [tid]
  );

  const [recent_activity] = await db.query(
    `SELECT al.id, al.module, al.action, al.entity_type, al.entity_id,
            al.details, al.created_at, u.name AS user_name
     FROM activity_logs al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE al.tenant_id = ?
     ORDER BY al.created_at DESC
     LIMIT 15`,
    [tid]
  );

  const [overdue_loans_list] = await db.query(
    `SELECT l.id, l.expected_return, l.borrower_name,
            COALESCE(p.name, l.borrower_name) AS borrower,
            a.brand, a.model, a.asset_type
     FROM loans l
     JOIN assets a ON a.id = l.asset_id
     LEFT JOIN personnel p ON p.id = l.borrower_id
     WHERE l.tenant_id = ? AND l.status = 'active' AND l.expected_return < CURRENT_DATE
     ORDER BY l.expected_return ASC
     LIMIT 5`,
    [tid]
  );

  const [low_stock_list] = await db.query(
    `SELECT id, name, current_stock, min_stock, unit
     FROM supplies
     WHERE tenant_id = ? AND is_active = true AND current_stock <= min_stock
     ORDER BY (current_stock - min_stock) ASC
     LIMIT 5`,
    [tid]
  );

  res.json({
    assets,
    personnel,
    monitoring,
    alerts: {
      overdue_loans,
      low_stock,
      overdue_maintenance,
      total: Number(overdue_loans) + Number(low_stock) + Number(overdue_maintenance),
    },
    recent_activity,
    overdue_loans_list,
    low_stock_list,
  });
}));

router.get('/plan', w(async (req, res) => {
  const tid = req.user.tenant_id;

  const [[tenant]] = await db.query(
    `SELECT plan, trial_ends_at, max_users, max_technicians, max_assets, status
     FROM tenants WHERE id = ?`,
    [tid]
  );
  const plan = tenant?.plan || 'starter';

  const [limits] = await db.query(
    'SELECT resource, max_value FROM plan_limits WHERE plan = ?', [plan]
  );

  const limitMap = {};
  for (const l of limits) limitMap[l.resource] = l.max_value;

  // Tenant-level overrides take precedence over plan defaults
  if (tenant?.max_assets      != null) limitMap.assets      = tenant.max_assets;
  if (tenant?.max_users       != null) limitMap.users       = tenant.max_users;
  if (tenant?.max_technicians != null) limitMap.technicians = tenant.max_technicians;

  const [[{ assets }]] = await db.query(
    'SELECT COUNT(*) AS assets FROM assets WHERE tenant_id = ? AND is_active = true', [tid]
  );
  const [[{ users }]] = await db.query(
    'SELECT COUNT(*) AS users FROM users WHERE tenant_id = ? AND is_active = true', [tid]
  );
  const [[{ technicians }]] = await db.query(
    'SELECT COUNT(*) AS technicians FROM users WHERE tenant_id = ? AND is_active = true AND is_technician = true', [tid]
  ).catch(() => [[{ technicians: 0 }]]);
  const [[{ locations }]] = await db.query(
    'SELECT COUNT(*) AS locations FROM locations WHERE tenant_id = ? AND is_active = true', [tid]
  ).catch(() => [[{ locations: 0 }]]);

  // Trial modules with expiry info
  const [trialModules] = await db.query(
    `SELECT m.code, m.name, m.icon, m.color,
            tm.type, tm.status, tm.expires_at, tm.unlimited
     FROM tenant_modules tm
     JOIN modules m ON m.id = tm.module_id
     WHERE tm.tenant_id = ? AND tm.is_active = true
     ORDER BY m.sort_order`,
    [tid]
  );

  const trialMods = trialModules
    .filter(m => m.type === 'trial')
    .map(m => ({
      code: m.code,
      name: m.name,
      icon: m.icon,
      color: m.color,
      expires_at: m.expires_at,
      days_left: m.expires_at
        ? Math.max(0, Math.ceil((new Date(m.expires_at) - Date.now()) / 86400000))
        : null,
    }));

  const trialEndsAt = tenant?.trial_ends_at || null;
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt) - Date.now()) / 86400000))
    : null;

  res.json({
    plan,
    plan_status: tenant?.status || 'active',
    trial_ends_at: trialEndsAt,
    trial_days_left: trialDaysLeft,
    usage: {
      assets: Number(assets),
      users: Number(users),
      technicians: Number(technicians),
      locations: Number(locations),
    },
    limits: limitMap,
    trial_modules: trialMods,
  });
}));

export default router;
