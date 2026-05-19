import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

router.get('/overview', w(async (req, res) => {
  const tid = req.user.tenant_id;

  const [[assets]] = await db.query(
    `SELECT COUNT(*) AS total,
       SUM(status='available') AS available,
       SUM(status='loaned') AS loaned,
       SUM(status='maintenance') AS in_maintenance,
       COALESCE(SUM(value), 0) AS value_total
     FROM assets WHERE tenant_id=? AND is_active=1`,
    [tid]
  );

  const [[{ personnel_total }]] = await db.query(
    'SELECT COUNT(*) AS personnel_total FROM personnel WHERE tenant_id=? AND is_active=1',
    [tid]
  );
  const [[{ technicians }]] = await db.query(
    'SELECT COUNT(*) AS technicians FROM technicians WHERE tenant_id=? AND is_active=1',
    [tid]
  );

  const [[loans]] = await db.query(
    `SELECT
       COALESCE(SUM(status='active'), 0) AS active,
       COALESCE(SUM(status='active' AND expected_return < NOW()), 0) AS overdue,
       COALESCE(SUM(status='returned'), 0) AS returned
     FROM loans WHERE tenant_id=?`,
    [tid]
  );

  const [[maintenance]] = await db.query(
    `SELECT
       COALESCE(SUM(status='pending'), 0) AS pending,
       COALESCE(SUM(status='in_progress'), 0) AS in_progress,
       COALESCE(SUM(status='completed' AND MONTH(completed_at)=MONTH(NOW()) AND YEAR(completed_at)=YEAR(NOW())), 0) AS completed_this_month
     FROM maintenance_records WHERE tenant_id=?`,
    [tid]
  );

  const [[supplies]] = await db.query(
    `SELECT COUNT(*) AS total,
       COALESCE(SUM(current_stock <= min_stock), 0) AS low_stock,
       COALESCE(SUM(current_stock * unit_cost), 0) AS value_total
     FROM supplies WHERE tenant_id=? AND is_active=1`,
    [tid]
  );

  const [assets_by_status] = await db.query(
    `SELECT status AS name, COUNT(*) AS value FROM assets WHERE tenant_id=? AND is_active=1 GROUP BY status`,
    [tid]
  );

  const [maintenance_trend] = await db.query(
    `SELECT DATE_FORMAT(created_at, '%b %Y') AS month, COUNT(*) AS ordenes
     FROM maintenance_records WHERE tenant_id=? AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
     GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b %Y')
     ORDER BY MIN(created_at)`,
    [tid]
  );

  const [departments] = await db.query(
    `SELECT department AS name, COUNT(*) AS empleados FROM personnel
     WHERE tenant_id=? AND is_active=1 AND department IS NOT NULL
     GROUP BY department ORDER BY empleados DESC LIMIT 6`,
    [tid]
  );

  const [supplies_trend] = await db.query(
    `SELECT s.name, sm.move_type AS type, SUM(sm.quantity) AS qty
     FROM supply_movements sm JOIN supplies s ON s.id = sm.supply_id
     WHERE s.tenant_id=? AND sm.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY sm.supply_id, sm.move_type ORDER BY qty DESC LIMIT 8`,
    [tid]
  );

  res.json({
    assets,
    personnel: { total: personnel_total, technicians },
    loans,
    maintenance,
    supplies,
    charts: { assets_by_status, maintenance_trend, departments, supplies_trend },
  });
}));

export default router;
