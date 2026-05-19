import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireModule } from '../middleware/tenant.js';

const router = Router();
router.use(requireAuth);
const guard = requireModule('purchases');
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', guard, w(async (req, res) => {
  const [rows] = await db.query(
    `SELECT po.*, p.name AS provider_name, cc.name AS cost_center_name, u.name AS created_by_name
     FROM purchase_orders po
     LEFT JOIN providers p ON p.id = po.provider_id
     LEFT JOIN cost_centers cc ON cc.id = po.cost_center_id
     LEFT JOIN users u ON u.id = po.created_by
     WHERE po.tenant_id = ? ORDER BY po.created_at DESC`,
    [req.user.tenant_id]
  );
  res.json(rows);
}));

router.get('/:id', guard, w(async (req, res) => {
  const [[po]] = await db.query(
    `SELECT po.*, p.name AS provider_name, cc.name AS cost_center_name
     FROM purchase_orders po
     LEFT JOIN providers p ON p.id = po.provider_id
     LEFT JOIN cost_centers cc ON cc.id = po.cost_center_id
     WHERE po.id=? AND po.tenant_id=?`,
    [req.params.id, req.user.tenant_id]
  );
  if (!po) return res.status(404).json({ error: 'No encontrado' });
  const [items] = await db.query('SELECT * FROM purchase_items WHERE order_id=?', [req.params.id]);
  res.json({ ...po, items });
}));

router.post('/', guard, w(async (req, res) => {
  const { provider_id, cost_center_id, po_number, ordered_at, expected_at, notes, items = [] } = req.body;
  const conn = await db.getConnection();
  await conn.beginTransaction();
  try {
    let total = 0;
    const safeItems = items.map(i => {
      const t = parseFloat(i.quantity||1) * parseFloat(i.unit_price||0);
      total += t;
      return { ...i, total_price: t };
    });
    const [poRows] = await conn.query(
      `INSERT INTO purchase_orders (tenant_id, provider_id, cost_center_id, po_number, ordered_at, expected_at, notes, total, created_by)
       VALUES (?,?,?,?,?,?,?,?,?) RETURNING id`,
      [req.user.tenant_id, provider_id||null, cost_center_id||null, po_number||null, ordered_at||null, expected_at||null, notes||null, total, req.user.id]
    );
    const orderId = poRows[0].id;
    for (const i of safeItems) {
      await conn.query(
        'INSERT INTO purchase_items (order_id, description, quantity, unit, unit_price, total_price) VALUES (?,?,?,?,?,?)',
        [orderId, i.description, parseFloat(i.quantity)||1, i.unit||null, parseFloat(i.unit_price)||0, i.total_price]
      );
    }
    await conn.commit(); conn.release();
    res.status(201).json({ id: orderId });
  } catch (e) { await conn.rollback(); conn.release(); throw e; }
}));

router.patch('/:id/status', guard, w(async (req, res) => {
  const valid = ['draft','sent','partial','received','cancelled'];
  if (!valid.includes(req.body.status)) return res.status(400).json({ error: 'Estado inválido' });
  await db.query('UPDATE purchase_orders SET status=?, received_at=? WHERE id=? AND tenant_id=?',
    [req.body.status, req.body.status==='received'? new Date():null, req.params.id, req.user.tenant_id]);
  res.json({ message: 'Estado actualizado' });
}));

export default router;
