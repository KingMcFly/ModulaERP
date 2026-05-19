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
       SUM(CASE WHEN status='available'   THEN 1 ELSE 0 END) AS available,
       SUM(CASE WHEN status='loaned'      THEN 1 ELSE 0 END) AS loaned,
       SUM(CASE WHEN status='maintenance' THEN 1 ELSE 0 END) AS in_maintenance,
       COALESCE(SUM(value), 0) AS value_total
     FROM assets WHERE tenant_id=? AND is_active=true`,
    [tid]
  );

  const [[{ personnel_total }]] = await db.query(
    'SELECT COUNT(*) AS personnel_total FROM personnel WHERE tenant_id=? AND is_active=true',
    [tid]
  );
  const [[{ technicians }]] = await db.query(
    'SELECT COUNT(*) AS technicians FROM technicians WHERE tenant_id=? AND is_active=true',
    [tid]
  );

  const [[loans]] = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN status='active' THEN 1 ELSE 0 END), 0) AS active,
       COALESCE(SUM(CASE WHEN status='active' AND expected_return < NOW() THEN 1 ELSE 0 END), 0) AS overdue,
       COALESCE(SUM(CASE WHEN status='returned' THEN 1 ELSE 0 END), 0) AS returned
     FROM loans WHERE tenant_id=?`,
    [tid]
  );

  const [[maintenance]] = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END), 0) AS pending,
       COALESCE(SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END), 0) AS in_progress,
       COALESCE(SUM(CASE WHEN status='completed'
         AND EXTRACT(MONTH FROM completed_at)=EXTRACT(MONTH FROM NOW())
         AND EXTRACT(YEAR FROM completed_at)=EXTRACT(YEAR FROM NOW()) THEN 1 ELSE 0 END), 0) AS completed_this_month
     FROM maintenance_records WHERE tenant_id=?`,
    [tid]
  );

  const [[supplies]] = await db.query(
    `SELECT COUNT(*) AS total,
       COALESCE(SUM(CASE WHEN current_stock <= min_stock THEN 1 ELSE 0 END), 0) AS low_stock,
       COALESCE(SUM(current_stock * unit_cost), 0) AS value_total
     FROM supplies WHERE tenant_id=? AND is_active=true`,
    [tid]
  );

  const [assets_by_status] = await db.query(
    `SELECT status AS name, COUNT(*) AS value FROM assets WHERE tenant_id=? AND is_active=true GROUP BY status`,
    [tid]
  );

  const [maintenance_trend] = await db.query(
    `SELECT TO_CHAR(created_at, 'Mon YYYY') AS month, COUNT(*) AS ordenes
     FROM maintenance_records WHERE tenant_id=? AND created_at >= NOW() - INTERVAL '6 months'
     GROUP BY TO_CHAR(created_at, 'YYYY-MM'), TO_CHAR(created_at, 'Mon YYYY')
     ORDER BY MIN(created_at)`,
    [tid]
  );

  const [departments] = await db.query(
    `SELECT department AS name, COUNT(*) AS empleados FROM personnel
     WHERE tenant_id=? AND is_active=true AND department IS NOT NULL
     GROUP BY department ORDER BY empleados DESC LIMIT 6`,
    [tid]
  );

  const [supplies_trend] = await db.query(
    `SELECT s.name, sm.move_type AS type, SUM(sm.quantity) AS qty
     FROM supply_movements sm JOIN supplies s ON s.id = sm.supply_id
     WHERE s.tenant_id=? AND sm.created_at >= NOW() - INTERVAL '30 days'
     GROUP BY sm.supply_id, s.name, sm.move_type ORDER BY qty DESC LIMIT 8`,
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
