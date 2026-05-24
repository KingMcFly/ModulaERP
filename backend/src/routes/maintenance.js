import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireModule } from '../middleware/tenant.js';

const router = Router();
router.use(requireAuth);
const guard = requireModule('maintenance');
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

// Specific routes before /:id

router.get('/upcoming', guard, w(async (req, res) => {
  const [rows] = await db.query(
    `SELECT mr.*, a.serial_number, a.brand, a.model
     FROM maintenance_records mr JOIN assets a ON a.id = mr.asset_id
     WHERE mr.tenant_id = ? AND mr.status = 'pending'
       AND mr.scheduled_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
     ORDER BY mr.scheduled_at ASC LIMIT 20`,
    [req.user.tenant_id]
  );
  res.json(rows);
}));

router.get('/technicians/all', guard, w(async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM technicians WHERE tenant_id = ? AND is_active = true ORDER BY name',
    [req.user.tenant_id]
  );
  res.json(rows);
}));

router.post('/technicians', guard, w(async (req, res) => {
  const { name, specialty, personnel_id } = req.body;
  const [rows] = await db.query(
    'INSERT INTO technicians (tenant_id, name, specialty, personnel_id) VALUES (?, ?, ?, ?) RETURNING id',
    [req.user.tenant_id, name, specialty, personnel_id || null]
  );
  res.status(201).json({ id: rows[0].id });
}));

// Main CRUD

router.get('/', guard, w(async (req, res) => {
  const { status, type } = req.query;
  let sql = `SELECT mr.*, a.serial_number, a.brand, a.model, t.name AS technician_name
             FROM maintenance_records mr
             JOIN assets a ON a.id = mr.asset_id
             LEFT JOIN technicians t ON t.id = mr.technician_id
             WHERE mr.tenant_id = ?`;
  const params = [req.user.tenant_id];
  if (status) { sql += ' AND mr.status = ?'; params.push(status); }
  if (type)   { sql += ' AND mr.maint_type = ?'; params.push(type); }
  sql += ' ORDER BY mr.created_at DESC';
  const [rows] = await db.query(sql, params);
  res.json(rows);
}));

router.get('/:id', guard, w(async (req, res) => {
  const [rows] = await db.query(
    `SELECT mr.*, a.serial_number, a.brand, a.model, t.name AS technician_name
     FROM maintenance_records mr
     JOIN assets a ON a.id = mr.asset_id
     LEFT JOIN technicians t ON t.id = mr.technician_id
     WHERE mr.id = ? AND mr.tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
  const [checklist] = await db.query('SELECT * FROM maintenance_checklist WHERE maintenance_id = ?', [req.params.id]);
  res.json({ ...rows[0], checklist });
}));

router.post('/', guard, w(async (req, res) => {
  const { asset_id, technician_id, maint_type, scheduled_at, description, checklist_items } = req.body;
  if (!asset_id) return res.status(400).json({ error: 'Activo requerido' });
  const [rows] = await db.query(
    `INSERT INTO maintenance_records (tenant_id, asset_id, technician_id, maint_type, scheduled_at, description)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
    [req.user.tenant_id, asset_id, technician_id || null, maint_type || 'preventive', scheduled_at || null, description || null]
  );
  const maintenanceId = rows[0].id;
  if (checklist_items?.length) {
    for (const item of checklist_items) {
      await db.query(
        'INSERT INTO maintenance_checklist (maintenance_id, description) VALUES (?, ?)',
        [maintenanceId, item]
      );
    }
  }
  res.status(201).json({ id: maintenanceId });
}));

router.put('/:id', guard, w(async (req, res) => {
  const { technician_id, maint_type, status, scheduled_at, started_at, completed_at,
          description, findings, actions_taken, next_maintenance } = req.body;

  // A08: Validate cost bounds — reject negative or astronomically large values
  const cost = req.body.cost != null ? parseFloat(req.body.cost) : null;
  if (cost !== null && (!Number.isFinite(cost) || cost < 0 || cost > 999_999_999)) {
    return res.status(400).json({ error: 'Costo inválido' });
  }

  await db.query(
    `UPDATE maintenance_records SET technician_id=?, maint_type=?, status=?, scheduled_at=?,
     started_at=?, completed_at=?, description=?, findings=?, actions_taken=?, cost=?, next_maintenance=?,
     updated_at=NOW()
     WHERE id=? AND tenant_id=?`,
    [
      technician_id   || null,
      maint_type,
      status,
      scheduled_at    || null,
      started_at      || null,
      completed_at    || null,
      description     || null,
      findings        || null,
      actions_taken   || null,
      cost,
      next_maintenance|| null,
      req.params.id,
      req.user.tenant_id,
    ]
  );
  res.json({ message: 'Mantenimiento actualizado' });
}));

router.patch('/:id/checklist/:itemId', guard, w(async (req, res) => {
  // A01: Verify the maintenance record belongs to this tenant before updating checklist
  const [[mr]] = await db.query(
    'SELECT id FROM maintenance_records WHERE id = ? AND tenant_id = ?',
    [req.params.id, req.user.tenant_id]
  );
  if (!mr) return res.status(404).json({ error: 'No encontrado' });

  await db.query(
    'UPDATE maintenance_checklist SET is_completed = ? WHERE id = ? AND maintenance_id = ?',
    [req.body.is_completed, req.params.itemId, req.params.id]
  );
  res.json({ message: 'Actualizado' });
}));

export default router;
