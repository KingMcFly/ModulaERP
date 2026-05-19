import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireModule } from '../middleware/tenant.js';

const router = Router();
router.use(requireAuth);
const guard = requireModule('requests');
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', guard, w(async (req, res) => {
  const { status } = req.query;
  let sql = `SELECT r.*, u.name AS requester_name, a.name AS approver_name,
             ast.asset_type, ast.brand, ast.model, s.name AS supply_name
             FROM requests r
             LEFT JOIN users u ON u.id = r.requested_by
             LEFT JOIN users a ON a.id = r.approved_by
             LEFT JOIN assets ast ON ast.id = r.asset_id
             LEFT JOIN supplies s ON s.id = r.supply_id
             WHERE r.tenant_id = ?`;
  const p = [req.user.tenant_id];
  if (status) { sql += ' AND r.status = ?'; p.push(status); }
  sql += ' ORDER BY r.requested_at DESC';
  const [rows] = await db.query(sql, p);
  res.json(rows);
}));

router.post('/', guard, w(async (req, res) => {
  const { request_type, title, description, priority, asset_id, supply_id, quantity, notes } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Título requerido' });
  const validTypes = ['loan','supply','maintenance','purchase','other'];
  if (!validTypes.includes(request_type)) return res.status(400).json({ error: 'Tipo inválido' });
  const [rows] = await db.query(
    `INSERT INTO requests (tenant_id, request_type, title, description, priority, asset_id, supply_id, quantity, notes, requested_by)
     VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id`,
    [req.user.tenant_id, request_type, title.trim(), description||null,
     priority||'medium', asset_id||null, supply_id||null, quantity||null, notes||null, req.user.id]
  );
  res.status(201).json({ id: rows[0].id });
}));

router.patch('/:id/approve', guard, w(async (req, res) => {
  const { notes } = req.body;
  const [[req_] ] = await db.query('SELECT id, status FROM requests WHERE id=? AND tenant_id=?', [req.params.id, req.user.tenant_id]);
  if (!req_) return res.status(404).json({ error: 'No encontrado' });
  if (req_.status !== 'pending') return res.status(409).json({ error: 'Solo se pueden aprobar solicitudes pendientes' });
  await db.query('UPDATE requests SET status=?,approved_by=?,resolved_at=NOW(),notes=COALESCE(notes,\'\') || ? WHERE id=?',
    ['approved', req.user.id, notes ? `\n[Aprobado] ${notes}` : '', req.params.id]);
  res.json({ message: 'Solicitud aprobada' });
}));

router.patch('/:id/reject', guard, w(async (req, res) => {
  const { rejection_reason } = req.body;
  if (!rejection_reason?.trim()) return res.status(400).json({ error: 'Motivo de rechazo requerido' });
  const [[req_]] = await db.query('SELECT id, status FROM requests WHERE id=? AND tenant_id=?', [req.params.id, req.user.tenant_id]);
  if (!req_) return res.status(404).json({ error: 'No encontrado' });
  if (req_.status !== 'pending') return res.status(409).json({ error: 'Solo se pueden rechazar solicitudes pendientes' });
  await db.query('UPDATE requests SET status=?,approved_by=?,resolved_at=NOW(),rejection_reason=? WHERE id=?',
    ['rejected', req.user.id, rejection_reason.trim(), req.params.id]);
  res.json({ message: 'Solicitud rechazada' });
}));

router.patch('/:id/status', guard, w(async (req, res) => {
  const valid = ['pending','approved','rejected','completed','cancelled'];
  if (!valid.includes(req.body.status)) return res.status(400).json({ error: 'Estado inválido' });
  await db.query('UPDATE requests SET status=? WHERE id=? AND tenant_id=?',
    [req.body.status, req.params.id, req.user.tenant_id]);
  res.json({ message: 'Estado actualizado' });
}));

export default router;
