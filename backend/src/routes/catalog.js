import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

function canWrite(req, res, next) {
  if (!['super_admin', 'admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Sin permisos para modificar catálogos' });
  }
  next();
}

// ── Factory for simple name-only catalog tables ───────────────────────────────
function simpleCatalog(table) {
  const r = Router();

  r.get('/', w(async (req, res) => {
    const [rows] = await db.query(
      `SELECT * FROM ${table} WHERE tenant_id = ? AND is_active = 1 ORDER BY name`,
      [req.user.tenant_id]
    );
    res.json(rows);
  }));

  r.post('/', canWrite, w(async (req, res) => {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
    const [result] = await db.query(
      `INSERT INTO ${table} (tenant_id, name) VALUES (?, ?)`,
      [req.user.tenant_id, name.trim()]
    );
    res.status(201).json({ id: result.insertId, name: name.trim() });
  }));

  r.put('/:id', canWrite, w(async (req, res) => {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
    await db.query(
      `UPDATE ${table} SET name = ? WHERE id = ? AND tenant_id = ?`,
      [name.trim(), req.params.id, req.user.tenant_id]
    );
    res.json({ message: 'Actualizado' });
  }));

  r.delete('/:id', canWrite, w(async (req, res) => {
    await db.query(
      `UPDATE ${table} SET is_active = 0 WHERE id = ? AND tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );
    res.json({ message: 'Eliminado' });
  }));

  return r;
}

router.use('/asset-types',       simpleCatalog('asset_types'));
router.use('/departments',       simpleCatalog('departments'));
router.use('/shifts',            simpleCatalog('shifts'));
router.use('/supply-categories', simpleCatalog('supply_categories'));

// ── Locations (more fields) ───────────────────────────────────────────────────
router.get('/locations', w(async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM locations WHERE tenant_id = ? AND is_active = 1 ORDER BY floor_level, name',
    [req.user.tenant_id]
  );
  res.json(rows);
}));

router.post('/locations', canWrite, w(async (req, res) => {
  const { name, description, floor_level, color, criticality } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
  const [result] = await db.query(
    `INSERT INTO locations (tenant_id, name, description, floor_level, color, criticality)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [req.user.tenant_id, name.trim(), description || null, floor_level || 1, color || '#94A3B8', criticality || 'low']
  );
  res.status(201).json({ id: result.insertId });
}));

router.put('/locations/:id', canWrite, w(async (req, res) => {
  const { name, description, floor_level, color, criticality } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
  await db.query(
    `UPDATE locations SET name=?, description=?, floor_level=?, color=?, criticality=?
     WHERE id=? AND tenant_id=?`,
    [name.trim(), description || null, floor_level || 1, color || '#94A3B8', criticality || 'low', req.params.id, req.user.tenant_id]
  );
  res.json({ message: 'Actualizado' });
}));

router.delete('/locations/:id', canWrite, w(async (req, res) => {
  await db.query('UPDATE locations SET is_active = 0 WHERE id = ? AND tenant_id = ?',
    [req.params.id, req.user.tenant_id]);
  res.json({ message: 'Eliminado' });
}));

export default router;
