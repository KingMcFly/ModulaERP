import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireModule } from '../middleware/tenant.js';

const router = Router();
router.use(requireAuth);
const guard = requireModule('tickets');
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', guard, w(async (req, res) => {
  const { status } = req.query;
  let sql = `SELECT t.*, u.name AS reporter_name, a2.name AS assignee_name,
             ast.asset_type, ast.brand, ast.model,
             EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 3600 AS age_hours
             FROM tickets t
             LEFT JOIN users u ON u.id = t.reported_by
             LEFT JOIN users a2 ON a2.id = t.assigned_to
             LEFT JOIN assets ast ON ast.id = t.asset_id
             WHERE t.tenant_id = ?`;
  const p = [req.user.tenant_id];
  if (status) { sql += ' AND t.status = ?'; p.push(status); }
  sql += ` ORDER BY CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END, t.created_at DESC`;
  const [rows] = await db.query(sql, p);
  res.json(rows);
}));

router.get('/:id', guard, w(async (req, res) => {
  const [[ticket]] = await db.query(
    `SELECT t.*, u.name AS reporter_name, a2.name AS assignee_name
     FROM tickets t
     LEFT JOIN users u ON u.id = t.reported_by
     LEFT JOIN users a2 ON a2.id = t.assigned_to
     WHERE t.id=? AND t.tenant_id=?`,
    [req.params.id, req.user.tenant_id]
  );
  if (!ticket) return res.status(404).json({ error: 'No encontrado' });
  const [comments] = await db.query(
    `SELECT tc.*, u.name AS author FROM ticket_comments tc
     LEFT JOIN users u ON u.id = tc.user_id
     WHERE tc.ticket_id=? ORDER BY tc.created_at ASC`,
    [req.params.id]
  );
  res.json({ ...ticket, comments });
}));

router.post('/', guard, w(async (req, res) => {
  const { title, description, priority, category, asset_id, assigned_to, sla_hours } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Título requerido' });
  const [rows] = await db.query(
    `INSERT INTO tickets (tenant_id, title, description, priority, category, asset_id, assigned_to, sla_hours, reported_by)
     VALUES (?,?,?,?,?,?,?,?,?) RETURNING id`,
    [req.user.tenant_id, title.trim(), description||null, priority||'medium',
     category||null, asset_id||null, assigned_to||null, parseInt(sla_hours)||24, req.user.id]
  );
  res.status(201).json({ id: rows[0].id });
}));

router.patch('/:id/status', guard, w(async (req, res) => {
  const valid = ['open','in_progress','waiting','resolved','closed'];
  if (!valid.includes(req.body.status)) return res.status(400).json({ error: 'Estado inválido' });
  await db.query(
    'UPDATE tickets SET status=?, resolved_at=? WHERE id=? AND tenant_id=?',
    [req.body.status, ['resolved','closed'].includes(req.body.status) ? new Date() : null, req.params.id, req.user.tenant_id]
  );
  res.json({ message: 'Estado actualizado' });
}));

router.post('/:id/comments', guard, w(async (req, res) => {
  const { comment, is_internal } = req.body;
  if (!comment?.trim()) return res.status(400).json({ error: 'Comentario requerido' });
  const [rows] = await db.query(
    'INSERT INTO ticket_comments (ticket_id, user_id, comment, is_internal) VALUES (?,?,?,?) RETURNING id',
    [req.params.id, req.user.id, comment.trim(), is_internal ? true : false]
  );
  res.status(201).json({ id: rows[0].id });
}));

export default router;
