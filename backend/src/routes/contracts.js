import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireModule } from '../middleware/tenant.js';

const router = Router();
router.use(requireAuth);
const guard = requireModule('contracts');
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', guard, w(async (req, res) => {
  const [rows] = await db.query(
    `SELECT c.*, p.name AS provider_name, cc.name AS cost_center_name,
       (c.end_date - CURRENT_DATE) AS days_remaining
     FROM contracts c
     LEFT JOIN providers p ON p.id = c.provider_id
     LEFT JOIN cost_centers cc ON cc.id = c.cost_center_id
     WHERE c.tenant_id = ? ORDER BY c.end_date ASC`,
    [req.user.tenant_id]
  );
  res.json(rows);
}));

router.post('/', guard, w(async (req, res) => {
  const { title, contract_number, provider_id, cost_center_id, contract_type, start_date, end_date, value, description, alert_days } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Título requerido' });
  const [rows] = await db.query(
    `INSERT INTO contracts (tenant_id, title, contract_number, provider_id, cost_center_id, contract_type,
       start_date, end_date, value, description, alert_days, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`,
    [req.user.tenant_id, title.trim(), contract_number||null, provider_id||null, cost_center_id||null,
     contract_type||null, start_date||null, end_date||null, value||null, description||null,
     Math.min(Math.max(parseInt(alert_days) || 30, 1), 365), req.user.id]
  );
  res.status(201).json({ id: rows[0].id });
}));

router.put('/:id', guard, w(async (req, res) => {
  const { title, contract_number, provider_id, cost_center_id, contract_type, start_date, end_date, value, description, alert_days, status } = req.body;
  await db.query(
    `UPDATE contracts SET title=?,contract_number=?,provider_id=?,cost_center_id=?,contract_type=?,
       start_date=?,end_date=?,value=?,description=?,alert_days=?,status=?
     WHERE id=? AND tenant_id=?`,
    [title, contract_number||null, provider_id||null, cost_center_id||null, contract_type||null,
     start_date||null, end_date||null, value||null, description||null,
     Math.min(Math.max(parseInt(alert_days) || 30, 1), 365),
     status||'active', req.params.id, req.user.tenant_id]
  );
  res.json({ message: 'Contrato actualizado' });
}));

router.delete('/:id', guard, w(async (req, res) => {
  await db.query('UPDATE contracts SET status=? WHERE id=? AND tenant_id=?', ['cancelled', req.params.id, req.user.tenant_id]);
  res.json({ message: 'Contrato cancelado' });
}));

// Contracts expiring within alert_days
router.get('/expiring', guard, w(async (req, res) => {
  const [rows] = await db.query(
    `SELECT c.*, p.name AS provider_name, (c.end_date - CURRENT_DATE) AS days_remaining
     FROM contracts c
     LEFT JOIN providers p ON p.id = c.provider_id
     WHERE c.tenant_id = ? AND c.status = 'active'
       AND c.end_date IS NOT NULL
       AND (c.end_date - CURRENT_DATE) BETWEEN 0 AND c.alert_days
     ORDER BY c.end_date ASC`,
    [req.user.tenant_id]
  );
  res.json(rows);
}));

export default router;
