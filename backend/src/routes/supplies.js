import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireModule } from '../middleware/tenant.js';

const router = Router();
router.use(requireAuth);
const guard = requireModule('inventory');
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

router.get('/low-stock', guard, w(async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM supplies WHERE tenant_id = ? AND is_active = 1 AND current_stock <= min_stock ORDER BY name',
    [req.user.tenant_id]
  );
  res.json(rows);
}));

router.get('/', guard, w(async (req, res) => {
  const [rows] = await db.query(
    `SELECT s.*, l.name AS location_name FROM supplies s
     LEFT JOIN locations l ON l.id = s.location_id
     WHERE s.tenant_id = ? AND s.is_active = 1 ORDER BY s.name`,
    [req.user.tenant_id]
  );
  res.json(rows);
}));

router.post('/', guard, w(async (req, res) => {
  const { name, category, unit, current_stock, min_stock, location_id, unit_cost, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
  const [result] = await db.query(
    `INSERT INTO supplies (tenant_id, name, category, unit, current_stock, min_stock, location_id, unit_cost, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.tenant_id, name.trim(), category || null, unit || null,
     current_stock || 0, min_stock || 0, location_id || null, unit_cost || null, notes || null]
  );
  res.status(201).json({ id: result.insertId });
}));

router.put('/:id', guard, w(async (req, res) => {
  const { name, category, unit, min_stock, location_id, unit_cost, notes } = req.body;
  await db.query(
    `UPDATE supplies SET name=?, category=?, unit=?, min_stock=?, location_id=?, unit_cost=?, notes=?
     WHERE id=? AND tenant_id=?`,
    [name, category || null, unit || null, min_stock || 0, location_id || null,
     unit_cost || null, notes || null, req.params.id, req.user.tenant_id]
  );
  res.json({ message: 'Insumo actualizado' });
}));

router.post('/:id/movement', guard, w(async (req, res) => {
  const { move_type, quantity, notes } = req.body;

  // Validar move_type contra lista blanca (A08, A03)
  const VALID_MOVE_TYPES = ['in', 'out', 'adjustment'];
  if (!move_type || !VALID_MOVE_TYPES.includes(move_type)) {
    return res.status(400).json({ error: 'Tipo de movimiento inválido' });
  }

  // Validar que quantity sea un entero positivo (A08)
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Cantidad debe ser un entero positivo' });
  }

  const [[supply]] = await db.query(
    'SELECT * FROM supplies WHERE id = ? AND tenant_id = ?',
    [req.params.id, req.user.tenant_id]
  );
  if (!supply) return res.status(404).json({ error: 'No encontrado' });

  let new_stock = supply.current_stock;
  if (move_type === 'in')              new_stock += qty;
  else if (move_type === 'out')        new_stock -= qty;
  else if (move_type === 'adjustment') new_stock = qty;

  if (new_stock < 0) return res.status(400).json({ error: 'Stock no puede ser negativo' });

  await db.query('UPDATE supplies SET current_stock = ?, updated_at = NOW() WHERE id = ?', [new_stock, req.params.id]);
  await db.query(
    'INSERT INTO supply_movements (supply_id, user_id, move_type, quantity, notes) VALUES (?, ?, ?, ?, ?)',
    [req.params.id, req.user.id, move_type, qty, notes || null]
  );
  res.json({ new_stock });
}));

router.delete('/:id', guard, w(async (req, res) => {
  await db.query('UPDATE supplies SET is_active = 0 WHERE id = ? AND tenant_id = ?',
    [req.params.id, req.user.tenant_id]);
  res.json({ message: 'Insumo eliminado' });
}));

export default router;
