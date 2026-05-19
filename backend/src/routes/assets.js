import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireModule } from '../middleware/tenant.js';
import { checkPlanLimit } from '../middleware/planLimits.js';

const router = Router();
router.use(requireAuth);

const guardInventory = requireModule('inventory');

// Wrap async handlers so errors propagate to Express error middleware
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

// ── Locations (must be before /:id) ────────────────────────────────────────

router.get('/locations/all', guardInventory, w(async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM locations WHERE tenant_id = ? AND is_active = 1 ORDER BY floor_level, name',
    [req.user.tenant_id]
  );
  res.json(rows);
}));

router.post('/locations', guardInventory, w(async (req, res) => {
  const { name, description, pos_x, pos_y, width, height, floor_level, color, criticality, shape } = req.body;
  const [result] = await db.query(
    `INSERT INTO locations (tenant_id, name, description, pos_x, pos_y, width, height, floor_level, color, criticality, shape)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.tenant_id, name, description, pos_x, pos_y, width, height, floor_level, color, criticality, shape]
  );
  res.status(201).json({ id: result.insertId });
}));

router.put('/locations/:id', guardInventory, w(async (req, res) => {
  const { name, description, pos_x, pos_y, width, height, floor_level, color, criticality, shape } = req.body;
  await db.query(
    `UPDATE locations SET name=?, description=?, pos_x=?, pos_y=?, width=?, height=?, floor_level=?, color=?, criticality=?, shape=?
     WHERE id=? AND tenant_id=?`,
    [name, description, pos_x, pos_y, width, height, floor_level, color, criticality, shape, req.params.id, req.user.tenant_id]
  );
  res.json({ message: 'Ubicación actualizada' });
}));

router.delete('/locations/:id', guardInventory, w(async (req, res) => {
  await db.query('UPDATE locations SET is_active = 0 WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
  res.json({ message: 'Ubicación eliminada' });
}));

// ── Stats (must be before /:id) ─────────────────────────────────────────────

router.get('/stats', guardInventory, w(async (req, res) => {
  const tid = req.user.tenant_id;
  const [[{ total }]]       = await db.query('SELECT COUNT(*) AS total FROM assets WHERE tenant_id = ? AND is_active = 1', [tid]);
  const [[{ available }]]   = await db.query("SELECT COUNT(*) AS available FROM assets WHERE tenant_id = ? AND status = 'available' AND is_active = 1", [tid]);
  const [[{ loaned }]]      = await db.query("SELECT COUNT(*) AS loaned FROM assets WHERE tenant_id = ? AND status = 'loaned' AND is_active = 1", [tid]);
  const [[{ maintenance }]] = await db.query("SELECT COUNT(*) AS maintenance FROM assets WHERE tenant_id = ? AND status = 'maintenance' AND is_active = 1", [tid]);
  const [[{ total_value }]] = await db.query('SELECT SUM(value) AS total_value FROM assets WHERE tenant_id = ? AND is_active = 1', [tid]);
  res.json({ total, available, loaned, maintenance, total_value: total_value || 0 });
}));

// ── Assets CRUD ──────────────────────────────────────────────────────────────

router.get('/', guardInventory, w(async (req, res) => {
  const { search, status, location_id, type } = req.query;
  let sql = `SELECT a.*, l.name AS location_name
             FROM assets a LEFT JOIN locations l ON l.id = a.location_id
             WHERE a.tenant_id = ? AND a.is_active = 1`;
  const params = [req.user.tenant_id];
  if (search)      { sql += ' AND (a.serial_number LIKE ? OR a.brand LIKE ? OR a.model LIKE ?)'; const s = `%${search}%`; params.push(s, s, s); }
  if (status)      { sql += ' AND a.status = ?';      params.push(status); }
  if (location_id) { sql += ' AND a.location_id = ?'; params.push(location_id); }
  if (type)        { sql += ' AND a.asset_type = ?';  params.push(type); }
  sql += ' ORDER BY a.created_at DESC';
  const [rows] = await db.query(sql, params);
  res.json(rows);
}));

router.get('/:id/detail', guardInventory, w(async (req, res) => {
  const tid = req.user.tenant_id;
  const assetId = req.params.id;

  const [rows] = await db.query(
    `SELECT a.*, l.name AS location_name FROM assets a
     LEFT JOIN locations l ON l.id = a.location_id
     WHERE a.id = ? AND a.tenant_id = ?`,
    [assetId, tid]
  );
  if (!rows.length) return res.status(404).json({ error: 'No encontrado' });

  const [loans] = await db.query(
    `SELECT l.id, l.issued_at, l.expected_return, l.actual_return, l.status, l.notes,
            COALESCE(p.name, l.borrower_name) AS borrower, u.name AS issued_by_name
     FROM loans l
     LEFT JOIN personnel p ON p.id = l.borrower_id
     LEFT JOIN users u ON u.id = l.issued_by
     WHERE l.asset_id = ? AND l.tenant_id = ?
     ORDER BY l.issued_at DESC LIMIT 20`,
    [assetId, tid]
  );

  const [maintenance] = await db.query(
    `SELECT mr.id, mr.maint_type, mr.status, mr.scheduled_at, mr.completed_at,
            mr.description, mr.cost, t.name AS technician_name
     FROM maintenance_records mr
     LEFT JOIN technicians t ON t.id = mr.technician_id
     WHERE mr.asset_id = ? AND mr.tenant_id = ?
     ORDER BY mr.scheduled_at DESC LIMIT 20`,
    [assetId, tid]
  );

  const [activity] = await db.query(
    `SELECT al.id, al.action, al.details, al.created_at, u.name AS user_name
     FROM activity_logs al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE al.entity_type = 'asset' AND al.entity_id = ? AND al.tenant_id = ?
     ORDER BY al.created_at DESC LIMIT 20`,
    [assetId, tid]
  );

  res.json({ ...rows[0], loans, maintenance, activity });
}));

router.get('/:id', guardInventory, w(async (req, res) => {
  const [rows] = await db.query(
    `SELECT a.*, l.name AS location_name FROM assets a
     LEFT JOIN locations l ON l.id = a.location_id
     WHERE a.id = ? AND a.tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
  res.json(rows[0]);
}));

router.post('/', guardInventory, checkPlanLimit('assets', 'SELECT COUNT(*) AS c FROM assets WHERE tenant_id=? AND is_active=1'), w(async (req, res) => {
  const { serial_number, barcode, asset_type, brand, model, value, location_id, purchase_date, notes } = req.body;
  if (!asset_type) return res.status(400).json({ error: 'Tipo de activo requerido' });
  const [result] = await db.query(
    `INSERT INTO assets (tenant_id, serial_number, barcode, asset_type, brand, model, value, location_id, purchase_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.tenant_id,
      serial_number || null,
      barcode       || null,
      asset_type,
      brand         || null,
      model         || null,
      value         || null,
      location_id   || null,
      purchase_date || null,
      notes         || null,
    ]
  );
  await logActivity(req, 'create', 'asset', result.insertId, { serial_number, asset_type });
  res.status(201).json({ id: result.insertId });
}));

router.put('/:id', guardInventory, w(async (req, res) => {
  const { serial_number, barcode, asset_type, brand, model, value, location_id, purchase_date, notes, status } = req.body;
  await db.query(
    `UPDATE assets SET serial_number=?, barcode=?, asset_type=?, brand=?, model=?,
     value=?, location_id=?, purchase_date=?, notes=?, status=?, updated_at=NOW()
     WHERE id=? AND tenant_id=?`,
    [
      serial_number || null,
      barcode       || null,
      asset_type,
      brand         || null,
      model         || null,
      value         || null,
      location_id   || null,
      purchase_date || null,
      notes         || null,
      status,
      req.params.id,
      req.user.tenant_id,
    ]
  );
  await logActivity(req, 'update', 'asset', req.params.id, { status });
  res.json({ message: 'Activo actualizado' });
}));

router.delete('/:id', guardInventory, w(async (req, res) => {
  await db.query('UPDATE assets SET is_active = 0 WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
  await logActivity(req, 'delete', 'asset', req.params.id, {});
  res.json({ message: 'Activo eliminado' });
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

async function logActivity(req, action, entity_type, entity_id, details) {
  await db.query(
    'INSERT INTO activity_logs (tenant_id, user_id, module, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.user.tenant_id, req.user.id, 'inventory', action, entity_type, entity_id, JSON.stringify(details)]
  );
}

export default router;
