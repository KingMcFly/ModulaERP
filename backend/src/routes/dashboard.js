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
       SUM(status = 'available')   AS available,
       SUM(status = 'loaned')      AS loaned,
       SUM(status = 'maintenance') AS maintenance,
       SUM(status = 'retired')     AS retired,
       COALESCE(SUM(value), 0)     AS total_value
     FROM assets WHERE tenant_id = ? AND is_active = 1`,
    [tid]
  );

  const [[personnel]] = await db.query(
    'SELECT COUNT(*) AS total FROM personnel WHERE tenant_id = ? AND is_active = 1',
    [tid]
  );

  const [[monitoring]] = await db.query(
    `SELECT COUNT(*) AS total,
       SUM(agent_status = 'online')  AS online,
       SUM(agent_status = 'offline') AS offline,
       SUM(agent_status = 'warning') AS warning
     FROM monitoring_agents WHERE tenant_id = ?`,
    [tid]
  );

  const [[{ overdue_loans }]] = await db.query(
    `SELECT COUNT(*) AS overdue_loans FROM loans
     WHERE tenant_id = ? AND status = 'active' AND expected_return < CURDATE()`,
    [tid]
  );

  const [[{ low_stock }]] = await db.query(
    `SELECT COUNT(*) AS low_stock FROM supplies
     WHERE tenant_id = ? AND is_active = 1 AND current_stock <= min_stock`,
    [tid]
  );

  const [[{ overdue_maintenance }]] = await db.query(
    `SELECT COUNT(*) AS overdue_maintenance FROM maintenance_records
     WHERE tenant_id = ? AND status IN ('pending','in_progress') AND scheduled_at < CURDATE()`,
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
     WHERE l.tenant_id = ? AND l.status = 'active' AND l.expected_return < CURDATE()
     ORDER BY l.expected_return ASC
     LIMIT 5`,
    [tid]
  );

  const [low_stock_list] = await db.query(
    `SELECT id, name, current_stock, min_stock, unit
     FROM supplies
     WHERE tenant_id = ? AND is_active = 1 AND current_stock <= min_stock
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
    'SELECT plan FROM tenants WHERE id = ?', [tid]
  );
  const plan = tenant?.plan || 'starter';

  const [limits] = await db.query(
    'SELECT resource, max_value FROM plan_limits WHERE plan = ?', [plan]
  );

  const limitMap = {};
  for (const l of limits) limitMap[l.resource] = l.max_value;

  const [[{ assets }]] = await db.query(
    'SELECT COUNT(*) AS assets FROM assets WHERE tenant_id = ? AND is_active = 1', [tid]
  );
  const [[{ users }]] = await db.query(
    'SELECT COUNT(*) AS users FROM users WHERE tenant_id = ? AND is_active = 1', [tid]
  );
  const [[{ locations }]] = await db.query(
    'SELECT COUNT(*) AS locations FROM locations WHERE tenant_id = ? AND is_active = 1', [tid]
  ).catch(() => [[{ locations: 0 }]]);

  res.json({
    plan,
    usage: { assets: Number(assets), users: Number(users), locations: Number(locations) },
    limits: limitMap,
  });
}));

export default router;
