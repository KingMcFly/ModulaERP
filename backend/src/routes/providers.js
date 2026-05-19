import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireModule } from '../middleware/tenant.js';

const router = Router();
router.use(requireAuth);
const guard = requireModule('providers');
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', guard, w(async (req, res) => {
  const { search } = req.query;
  let sql = 'SELECT * FROM providers WHERE tenant_id = ? AND is_active = 1';
  const p = [req.user.tenant_id];
  if (search) { sql += ' AND (name LIKE ? OR rut LIKE ? OR contact_name LIKE ?)'; const s = `%${search}%`; p.push(s, s, s); }
  sql += ' ORDER BY name';
  const [rows] = await db.query(sql, p);
  res.json(rows);
}));

router.post('/', guard, w(async (req, res) => {
  const { name, rut, contact_name, email, phone, address, category, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
  const [r] = await db.query(
    'INSERT INTO providers (tenant_id, name, rut, contact_name, email, phone, address, category, notes) VALUES (?,?,?,?,?,?,?,?,?)',
    [req.user.tenant_id, name.trim(), rut||null, contact_name||null, email||null, phone||null, address||null, category||null, notes||null]
  );
  res.status(201).json({ id: r.insertId });
}));

router.put('/:id', guard, w(async (req, res) => {
  const { name, rut, contact_name, email, phone, address, category, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
  await db.query(
    'UPDATE providers SET name=?,rut=?,contact_name=?,email=?,phone=?,address=?,category=?,notes=? WHERE id=? AND tenant_id=?',
    [name.trim(), rut||null, contact_name||null, email||null, phone||null, address||null, category||null, notes||null, req.params.id, req.user.tenant_id]
  );
  res.json({ message: 'Proveedor actualizado' });
}));

router.delete('/:id', guard, w(async (req, res) => {
  await db.query('UPDATE providers SET is_active=0 WHERE id=? AND tenant_id=?', [req.params.id, req.user.tenant_id]);
  res.json({ message: 'Proveedor eliminado' });
}));

export default router;
