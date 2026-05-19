import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireModule } from '../middleware/tenant.js';

const router = Router();
router.use(requireAuth);
const guard = requireModule('cost_centers');
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', guard, w(async (req, res) => {
  const [rows] = await db.query(
    `SELECT cc.*,
       (SELECT COALESCE(SUM(po.total),0) FROM purchase_orders po WHERE po.cost_center_id=cc.id AND po.tenant_id=cc.tenant_id) AS spent
     FROM cost_centers cc WHERE cc.tenant_id=? AND cc.is_active=1 ORDER BY cc.name`,
    [req.user.tenant_id]
  );
  res.json(rows);
}));

router.post('/', guard, w(async (req, res) => {
  const { name, code, description, manager, budget } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
  const [r] = await db.query(
    'INSERT INTO cost_centers (tenant_id, name, code, description, manager, budget) VALUES (?,?,?,?,?,?)',
    [req.user.tenant_id, name.trim(), code||null, description||null, manager||null, parseFloat(budget)||null]
  );
  res.status(201).json({ id: r.insertId });
}));

router.put('/:id', guard, w(async (req, res) => {
  const { name, code, description, manager, budget } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
  await db.query(
    'UPDATE cost_centers SET name=?,code=?,description=?,manager=?,budget=? WHERE id=? AND tenant_id=?',
    [name.trim(), code||null, description||null, manager||null, parseFloat(budget)||null, req.params.id, req.user.tenant_id]
  );
  res.json({ message: 'Centro de costo actualizado' });
}));

router.delete('/:id', guard, w(async (req, res) => {
  await db.query('UPDATE cost_centers SET is_active=0 WHERE id=? AND tenant_id=?', [req.params.id, req.user.tenant_id]);
  res.json({ message: 'Centro de costo eliminado' });
}));

export default router;
