import { Router } from 'express';
import multer from 'multer';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireModule } from '../middleware/tenant.js';
import {
  isSupervisor, OPEN_STATES, CLOSED_STATES, STATUSES, LEVELS, RESOLUTION_TYPES,
  derivePriority, ensureTicketDefaults, genTicketNumber, computeSla, slaStatus, slaPauseTransition,
  logHistory, getUserLevel,
} from '../utils/tickets.js';
import { notifyTicketEvent } from '../utils/ticketNotify.js';

const router = Router();
router.use(requireAuth);
const guard = requireModule('tickets');
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

// Attachments: in-memory upload, stored in DB (BYTEA). Swap to object storage
// later by writing req.file.buffer to S3/R2 and saving the URL instead.
const ATTACH_MAX = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = /^(image\/(png|jpe?g|gif|webp|heic)|application\/pdf|text\/plain|application\/(msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet))|application\/vnd\.ms-excel)$/i;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: ATTACH_MAX } });

// ── Actor context: role + support level + technician flag ─────────────────────
async function loadActor(req) {
  const [[row]] = await db.query(
    `SELECT u.is_technician, stm.level
       FROM users u
       LEFT JOIN support_team_members stm ON stm.user_id = u.id AND stm.tenant_id = u.tenant_id
      WHERE u.id = ?`,
    [req.user.id]
  );
  const sup = isSupervisor(req.user.role);
  const level = row?.level || null;
  const isAgent = sup || !!row?.is_technician || !!level;
  return { sup, level, isAgent };
}

const ENRICH = (t) => ({ ...t, sla_status: slaStatus(t) });

// ══════════════════════════════════════════════════════════════════════════════
//  LIST  (filters + saved views)
// ══════════════════════════════════════════════════════════════════════════════
router.get('/', guard, w(async (req, res) => {
  await ensureTicketDefaults(req.user.tenant_id);
  const actor = await loadActor(req);
  const { view, type, status, priority, impact, urgency, category_id, level, assigned_to, q } = req.query;

  const where = ['t.tenant_id = ?'];
  const p = [req.user.tenant_id];

  // Visibility: plain requesters only see their own tickets
  if (!actor.isAgent) { where.push('t.reported_by = ?'); p.push(req.user.id); }

  switch (view) {
    case 'mine':       where.push('t.reported_by = ?'); p.push(req.user.id); break;
    case 'assigned':   where.push('t.assigned_to = ?'); p.push(req.user.id); break;
    case 'unassigned': where.push('t.assigned_to IS NULL AND t.status = ANY(?)'); p.push(OPEN_STATES); break;
    case 'overdue':    where.push('t.resolution_due < NOW() AND t.status = ANY(?)'); p.push(OPEN_STATES); break;
    case 'critical':   where.push("t.priority = 'critical' AND t.status = ANY(?)"); p.push(OPEN_STATES); break;
    case 'escalated':  where.push("(t.status = 'escalated' OR t.level <> 'n1')"); break;
    case 'n1': case 'n2': case 'n3': where.push('t.level = ?'); p.push(view); break;
    case 'closed':     where.push('t.status = ANY(?)'); p.push(CLOSED_STATES); break;
    case 'open':       where.push('t.status = ANY(?)'); p.push(OPEN_STATES); break;
    default: break;
  }

  if (type)        { where.push('t.type = ?');        p.push(type); }
  if (status)      { where.push('t.status = ?');      p.push(status); }
  if (priority)    { where.push('t.priority = ?');    p.push(priority); }
  if (impact)      { where.push('t.impact = ?');      p.push(impact); }
  if (urgency)     { where.push('t.urgency = ?');     p.push(urgency); }
  if (level)       { where.push('t.level = ?');       p.push(level); }
  if (category_id) { where.push('t.category_id = ?'); p.push(parseInt(category_id)); }
  if (assigned_to === 'none') where.push('t.assigned_to IS NULL');
  else if (assigned_to)       { where.push('t.assigned_to = ?'); p.push(parseInt(assigned_to)); }
  if (q) {
    where.push('(t.title ILIKE ? OR t.ticket_number ILIKE ? OR t.description ILIKE ? OR u.name ILIKE ?)');
    const like = `%${q}%`; p.push(like, like, like, like);
  }

  const [rows] = await db.query(
    `SELECT t.*, u.name AS reporter_name, a.name AS assignee_name, c.name AS category_name, c.color AS category_color
       FROM tickets t
       LEFT JOIN users u ON u.id = t.reported_by
       LEFT JOIN users a ON a.id = t.assigned_to
       LEFT JOIN ticket_categories c ON c.id = t.category_id
      WHERE ${where.join(' AND ')}
      ORDER BY CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
               t.created_at DESC
      LIMIT 500`,
    p
  );
  res.json(rows.map(ENRICH));
}));

// ══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD  (before /:id)
// ══════════════════════════════════════════════════════════════════════════════
router.get('/dashboard', guard, w(async (req, res) => {
  const tid = req.user.tenant_id;
  const [rows] = await db.query(
    `SELECT status, priority, level, type, assigned_to, category_id,
            resolution_due, first_response_at, created_at, resolved_at, reopened_count
       FROM tickets WHERE tenant_id = ?`, [tid]
  );
  const open = rows.filter(t => OPEN_STATES.includes(t.status));
  const breached = open.filter(t => t.resolution_due && new Date(t.resolution_due) < new Date());
  const resolvedRows = rows.filter(t => t.resolved_at);

  const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const frMins = resolvedRows.filter(t => t.first_response_at)
    .map(t => (new Date(t.first_response_at) - new Date(t.created_at)) / 60000);
  const resMins = resolvedRows.map(t => (new Date(t.resolved_at) - new Date(t.created_at)) / 60000);

  const weekAgo = Date.now() - 7 * 864e5;
  const slaMet = resolvedRows.filter(t => !t.resolution_due || new Date(t.resolved_at) <= new Date(t.resolution_due)).length;

  const [[rating]] = await db.query('SELECT ROUND(AVG(score)::numeric,2) AS avg, COUNT(*)::int AS n FROM ticket_ratings WHERE tenant_id=?', [tid]);
  const [byCat] = await db.query(
    `SELECT c.name, COUNT(t.id)::int AS count FROM tickets t
       JOIN ticket_categories c ON c.id = t.category_id
      WHERE t.tenant_id=? GROUP BY c.name ORDER BY count DESC LIMIT 8`, [tid]
  );

  res.json({
    total: rows.length,
    open: open.length,
    new: rows.filter(t => t.status === 'new').length,
    in_progress: rows.filter(t => t.status === 'in_progress').length,
    unassigned: open.filter(t => !t.assigned_to).length,
    breached: breached.length,
    critical: open.filter(t => t.priority === 'critical').length,
    by_level: { n1: rows.filter(t => t.level === 'n1').length, n2: rows.filter(t => t.level === 'n2').length, n3: rows.filter(t => t.level === 'n3').length },
    resolved_week: resolvedRows.filter(t => new Date(t.resolved_at).getTime() >= weekAgo).length,
    reopened: rows.filter(t => (t.reopened_count || 0) > 0).length,
    avg_first_response_mins: avg(frMins),
    avg_resolution_mins: avg(resMins),
    sla_compliance: resolvedRows.length ? Math.round((slaMet / resolvedRows.length) * 100) : 100,
    satisfaction: rating?.avg ? Number(rating.avg) : null,
    by_category: byCat,
  });
}));

// ══════════════════════════════════════════════════════════════════════════════
//  REPORTS  (supervisors)
// ══════════════════════════════════════════════════════════════════════════════
router.get('/reports', guard, w(async (req, res) => {
  const actor = await loadActor(req);
  if (!actor.sup) return res.status(403).json({ error: 'Solo supervisores' });
  const tid = req.user.tenant_id;
  const { from, to } = req.query;
  const range = [tid];
  let dw = '';
  if (from) { dw += ' AND t.created_at >= ?'; range.push(from); }
  if (to)   { dw += ' AND t.created_at <= ?'; range.push(to); }
  const q = (sql) => db.query(sql, range).then(r => r[0]);

  res.json({
    by_priority:  await q(`SELECT priority, COUNT(*)::int AS count FROM tickets t WHERE tenant_id=?${dw} GROUP BY priority`),
    by_category:  await q(`SELECT c.name, COUNT(t.id)::int AS count FROM tickets t LEFT JOIN ticket_categories c ON c.id=t.category_id WHERE t.tenant_id=?${dw} GROUP BY c.name ORDER BY count DESC`),
    by_level:     await q(`SELECT level, COUNT(*)::int AS count FROM tickets t WHERE tenant_id=?${dw} GROUP BY level`),
    by_agent:     await q(`SELECT a.name, COUNT(t.id)::int AS count FROM tickets t JOIN users a ON a.id=t.assigned_to WHERE t.tenant_id=?${dw} GROUP BY a.name ORDER BY count DESC`),
    by_requester: await q(`SELECT u.name, COUNT(t.id)::int AS count FROM tickets t JOIN users u ON u.id=t.reported_by WHERE t.tenant_id=?${dw} GROUP BY u.name ORDER BY count DESC LIMIT 10`),
    reopened:     await q(`SELECT COUNT(*)::int AS count FROM tickets t WHERE tenant_id=? AND reopened_count>0${dw}`).then(r => r[0]?.count || 0),
  });
}));

// ══════════════════════════════════════════════════════════════════════════════
//  CONFIG  (categories / sla / teams / agents) — before /:id
// ══════════════════════════════════════════════════════════════════════════════
router.get('/config', guard, w(async (req, res) => {
  await ensureTicketDefaults(req.user.tenant_id);
  const tid = req.user.tenant_id;
  const [categories]    = await db.query('SELECT * FROM ticket_categories WHERE tenant_id=? ORDER BY sort_order, name', [tid]);
  const [subcategories] = await db.query('SELECT * FROM ticket_subcategories WHERE tenant_id=? ORDER BY name', [tid]);
  const [sla]           = await db.query("SELECT * FROM ticket_sla_policies WHERE tenant_id=? ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END", [tid]);
  const [teams]         = await db.query('SELECT * FROM support_teams WHERE tenant_id=? ORDER BY name', [tid]);
  const [agents]        = await db.query(
    `SELECT u.id, u.name, u.email, u.role, u.is_technician, stm.level, stm.team_id
       FROM users u
       LEFT JOIN support_team_members stm ON stm.user_id=u.id AND stm.tenant_id=u.tenant_id
      WHERE u.tenant_id=? AND u.is_active=true
        AND (u.is_technician=true OR u.role IN ('admin','manager') OR stm.id IS NOT NULL)
      ORDER BY u.name`, [tid]
  );
  const [templates]   = await db.query('SELECT * FROM ticket_templates WHERE tenant_id=? AND is_active=true ORDER BY title', [tid]);
  const [rules]       = await db.query(
    `SELECT r.*, c.name AS category_name, u.name AS assignee_name
       FROM ticket_assignment_rules r
       LEFT JOIN ticket_categories c ON c.id=r.category_id
       LEFT JOIN users u ON u.id=r.assign_to
      WHERE r.tenant_id=? ORDER BY r.sort_order, r.id`, [tid]);
  const [recurrences] = await db.query(
    `SELECT rec.*, c.name AS category_name, u.name AS assignee_name
       FROM ticket_recurrences rec
       LEFT JOIN ticket_categories c ON c.id=rec.category_id
       LEFT JOIN users u ON u.id=rec.assign_to
      WHERE rec.tenant_id=? ORDER BY rec.next_run_at`, [tid]);
  res.json({ categories, subcategories, sla, teams, agents, templates, rules, recurrences });
}));

async function requireSup(req, res) {
  const actor = await loadActor(req);
  if (!actor.sup) { res.status(403).json({ error: 'Solo supervisores/administradores' }); return null; }
  return actor;
}

router.post('/config/categories', guard, w(async (req, res) => {
  if (!await requireSup(req, res)) return;
  const { name, type, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
  const [r] = await db.query(
    'INSERT INTO ticket_categories (tenant_id, name, type, color) VALUES (?,?,?,?) RETURNING id',
    [req.user.tenant_id, name.trim(), type || 'both', color || '#6B7280']
  );
  res.status(201).json({ id: r[0].id });
}));
router.delete('/config/categories/:id', guard, w(async (req, res) => {
  if (!await requireSup(req, res)) return;
  await db.query('DELETE FROM ticket_categories WHERE id=? AND tenant_id=?', [req.params.id, req.user.tenant_id]);
  res.json({ message: 'Eliminada' });
}));

router.put('/config/sla/:id', guard, w(async (req, res) => {
  if (!await requireSup(req, res)) return;
  const { first_response_mins, resolution_mins, is_active } = req.body;
  await db.query(
    'UPDATE ticket_sla_policies SET first_response_mins=?, resolution_mins=?, is_active=? WHERE id=? AND tenant_id=?',
    [parseInt(first_response_mins), parseInt(resolution_mins), is_active !== false, req.params.id, req.user.tenant_id]
  );
  res.json({ message: 'SLA actualizado' });
}));

router.post('/config/agents/:userId/level', guard, w(async (req, res) => {
  if (!await requireSup(req, res)) return;
  const { level, team_id } = req.body;
  if (!LEVELS.includes(level)) return res.status(400).json({ error: 'Nivel inválido' });
  await db.query(
    `INSERT INTO support_team_members (tenant_id, user_id, level, team_id) VALUES (?,?,?,?)
     ON CONFLICT (tenant_id, user_id) DO UPDATE SET level=EXCLUDED.level, team_id=EXCLUDED.team_id`,
    [req.user.tenant_id, req.params.userId, level, team_id || null]
  );
  res.json({ message: 'Nivel asignado' });
}));

// Subcategorías
router.post('/config/subcategories', guard, w(async (req, res) => {
  if (!await requireSup(req, res)) return;
  const { category_id, name, default_level } = req.body;
  if (!category_id || !name?.trim()) return res.status(400).json({ error: 'Categoría y nombre requeridos' });
  const [r] = await db.query(
    'INSERT INTO ticket_subcategories (tenant_id, category_id, name, default_level) VALUES (?,?,?,?) RETURNING id',
    [req.user.tenant_id, category_id, name.trim(), LEVELS.includes(default_level) ? default_level : 'n1']
  );
  res.status(201).json({ id: r[0].id });
}));
router.delete('/config/subcategories/:id', guard, w(async (req, res) => {
  if (!await requireSup(req, res)) return;
  await db.query('DELETE FROM ticket_subcategories WHERE id=? AND tenant_id=?', [req.params.id, req.user.tenant_id]);
  res.json({ message: 'Eliminada' });
}));

// Plantillas de respuesta
router.post('/config/templates', guard, w(async (req, res) => {
  if (!await requireSup(req, res)) return;
  const { title, body } = req.body;
  if (!title?.trim() || !body?.trim()) return res.status(400).json({ error: 'Título y contenido requeridos' });
  const [r] = await db.query('INSERT INTO ticket_templates (tenant_id, title, body) VALUES (?,?,?) RETURNING id',
    [req.user.tenant_id, title.trim(), body.trim()]);
  res.status(201).json({ id: r[0].id });
}));
router.delete('/config/templates/:id', guard, w(async (req, res) => {
  if (!await requireSup(req, res)) return;
  await db.query('DELETE FROM ticket_templates WHERE id=? AND tenant_id=?', [req.params.id, req.user.tenant_id]);
  res.json({ message: 'Eliminada' });
}));

// Reglas de auto-asignación
router.post('/config/rules', guard, w(async (req, res) => {
  if (!await requireSup(req, res)) return;
  const { category_id, type, level, assign_to } = req.body;
  if (!assign_to) return res.status(400).json({ error: 'Técnico destino requerido' });
  const [r] = await db.query(
    'INSERT INTO ticket_assignment_rules (tenant_id, category_id, type, level, assign_to) VALUES (?,?,?,?,?) RETURNING id',
    [req.user.tenant_id, category_id || null, type || null, level || null, assign_to]
  );
  res.status(201).json({ id: r[0].id });
}));
router.delete('/config/rules/:id', guard, w(async (req, res) => {
  if (!await requireSup(req, res)) return;
  await db.query('DELETE FROM ticket_assignment_rules WHERE id=? AND tenant_id=?', [req.params.id, req.user.tenant_id]);
  res.json({ message: 'Eliminada' });
}));

// Tickets recurrentes
router.post('/config/recurrences', guard, w(async (req, res) => {
  if (!await requireSup(req, res)) return;
  const { title, description, type, category_id, impact, urgency, assign_to, every_days, next_run_at } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Título requerido' });
  const [r] = await db.query(
    `INSERT INTO ticket_recurrences (tenant_id, title, description, type, category_id, impact, urgency, assign_to, every_days, next_run_at)
     VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id`,
    [req.user.tenant_id, title.trim(), description || null, type === 'incident' ? 'incident' : 'request',
     category_id || null, impact || 'low', urgency || 'low', assign_to || null,
     Math.max(1, parseInt(every_days) || 30), next_run_at || new Date().toISOString().slice(0, 10)]
  );
  res.status(201).json({ id: r[0].id });
}));
router.delete('/config/recurrences/:id', guard, w(async (req, res) => {
  if (!await requireSup(req, res)) return;
  await db.query('DELETE FROM ticket_recurrences WHERE id=? AND tenant_id=?', [req.params.id, req.user.tenant_id]);
  res.json({ message: 'Eliminada' });
}));

// ══════════════════════════════════════════════════════════════════════════════
//  BASE DE CONOCIMIENTO  (before /:id)
// ══════════════════════════════════════════════════════════════════════════════
router.get('/kb', guard, w(async (req, res) => {
  const { q, category_id } = req.query;
  const where = ['a.tenant_id = ?', 'a.is_published = true'];
  const p = [req.user.tenant_id];
  if (q) { where.push('(a.title ILIKE ? OR a.body ILIKE ?)'); p.push(`%${q}%`, `%${q}%`); }
  if (category_id) { where.push('a.category_id = ?'); p.push(parseInt(category_id)); }
  const [rows] = await db.query(
    `SELECT a.id, a.title, a.category_id, a.views, a.updated_at, c.name AS category_name
       FROM kb_articles a LEFT JOIN ticket_categories c ON c.id=a.category_id
      WHERE ${where.join(' AND ')} ORDER BY a.views DESC, a.updated_at DESC LIMIT 100`, p
  );
  res.json(rows);
}));

router.get('/kb/:id', guard, w(async (req, res) => {
  const [[a]] = await db.query(
    `SELECT a.*, c.name AS category_name, u.name AS author FROM kb_articles a
       LEFT JOIN ticket_categories c ON c.id=a.category_id
       LEFT JOIN users u ON u.id=a.created_by
      WHERE a.id=? AND a.tenant_id=?`, [req.params.id, req.user.tenant_id]);
  if (!a) return res.status(404).json({ error: 'Artículo no encontrado' });
  db.query('UPDATE kb_articles SET views=views+1 WHERE id=?', [req.params.id]).catch(() => {});
  res.json(a);
}));

router.post('/kb', guard, w(async (req, res) => {
  if (!await requireSup(req, res)) return;
  const { title, body, category_id } = req.body;
  if (!title?.trim() || !body?.trim()) return res.status(400).json({ error: 'Título y contenido requeridos' });
  const [r] = await db.query(
    'INSERT INTO kb_articles (tenant_id, title, body, category_id, created_by) VALUES (?,?,?,?,?) RETURNING id',
    [req.user.tenant_id, title.trim(), body.trim(), category_id || null, req.user.id]
  );
  res.status(201).json({ id: r[0].id });
}));

router.put('/kb/:id', guard, w(async (req, res) => {
  if (!await requireSup(req, res)) return;
  const { title, body, category_id, is_published } = req.body;
  await db.query(
    'UPDATE kb_articles SET title=?, body=?, category_id=?, is_published=?, updated_at=NOW() WHERE id=? AND tenant_id=?',
    [title, body, category_id || null, is_published !== false, req.params.id, req.user.tenant_id]
  );
  res.json({ message: 'Artículo actualizado' });
}));

router.delete('/kb/:id', guard, w(async (req, res) => {
  if (!await requireSup(req, res)) return;
  await db.query('DELETE FROM kb_articles WHERE id=? AND tenant_id=?', [req.params.id, req.user.tenant_id]);
  res.json({ message: 'Eliminado' });
}));

// ── helpers shared by mutating routes ─────────────────────────────────────────
async function getTicket(req) {
  const [[t]] = await db.query('SELECT * FROM tickets WHERE id=? AND tenant_id=?', [req.params.id, req.user.tenant_id]);
  return t;
}
async function requireAgent(req, res) {
  const actor = await loadActor(req);
  if (!actor.isAgent) { res.status(403).json({ error: 'Acción solo para técnicos/supervisores' }); return null; }
  return actor;
}

// ══════════════════════════════════════════════════════════════════════════════
//  DETAIL
// ══════════════════════════════════════════════════════════════════════════════
router.get('/:id', guard, w(async (req, res) => {
  const tid = req.user.tenant_id;
  const actor = await loadActor(req);
  const [[t]] = await db.query(
    `SELECT t.*, u.name AS reporter_name, u.email AS reporter_email,
            a.name AS assignee_name, c.name AS category_name, c.color AS category_color,
            sc.name AS subcategory_name,
            ast.asset_type, ast.brand, ast.model, ast.serial_number
       FROM tickets t
       LEFT JOIN users u ON u.id = t.reported_by
       LEFT JOIN users a ON a.id = t.assigned_to
       LEFT JOIN ticket_categories c ON c.id = t.category_id
       LEFT JOIN ticket_subcategories sc ON sc.id = t.subcategory_id
       LEFT JOIN assets ast ON ast.id = t.asset_id
      WHERE t.id=? AND t.tenant_id=?`,
    [req.params.id, tid]
  );
  if (!t) return res.status(404).json({ error: 'Ticket no encontrado' });
  if (!actor.isAgent && t.reported_by !== req.user.id) return res.status(403).json({ error: 'Sin acceso a este ticket' });

  const [comments] = await db.query(
    `SELECT tc.*, u.name AS author FROM ticket_comments tc
       LEFT JOIN users u ON u.id = tc.user_id
      WHERE tc.ticket_id=? ${actor.isAgent ? '' : 'AND tc.is_internal = false'}
      ORDER BY tc.created_at ASC`, [req.params.id]
  );
  let history = [];
  if (actor.isAgent) {
    const [h] = await db.query(
      `SELECT h.*, u.name AS actor_name FROM ticket_history h
         LEFT JOIN users u ON u.id=h.actor_id WHERE h.ticket_id=? ORDER BY h.created_at DESC`, [req.params.id]
    );
    history = h;
  }
  const [escalations] = await db.query(
    `SELECT e.*, f.name AS from_name, tu.name AS to_name FROM ticket_escalations e
       LEFT JOIN users f ON f.id=e.from_user LEFT JOIN users tu ON tu.id=e.to_user
      WHERE e.ticket_id=? ORDER BY e.created_at DESC`, [req.params.id]
  );
  const [attachments] = await db.query(
    `SELECT at.id, at.file_name, at.mime, at.size_bytes, at.created_at, u.name AS uploaded_by_name
       FROM ticket_attachments at LEFT JOIN users u ON u.id = at.uploaded_by
      WHERE at.ticket_id=? ORDER BY at.created_at`, [req.params.id]);
  const [[rating]] = await db.query('SELECT * FROM ticket_ratings WHERE ticket_id=?', [req.params.id]);

  res.json({ ...ENRICH(t), comments, history, escalations, attachments, rating: rating || null });
}));

// ══════════════════════════════════════════════════════════════════════════════
//  CREATE
// ══════════════════════════════════════════════════════════════════════════════
router.post('/', guard, w(async (req, res) => {
  const tid = req.user.tenant_id;
  await ensureTicketDefaults(tid);
  const actor = await loadActor(req);
  const {
    type = 'incident', title, description, category_id, subcategory_id,
    impact = 'low', urgency = 'low', priority: prioOverride, channel = 'web', asset_id,
  } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Título requerido' });

  const ttype = type === 'request' ? 'request' : 'incident';
  const priority = (actor.sup && prioOverride) ? prioOverride : derivePriority(impact, urgency);
  const number = await genTicketNumber(tid, ttype);
  const sla = await computeSla(tid, ttype, priority);

  const [r] = await db.query(
    `INSERT INTO tickets
       (tenant_id, ticket_number, type, title, description, category_id, subcategory_id,
        impact, urgency, priority, status, level, channel, asset_id, reported_by,
        sla_policy_id, first_response_due, resolution_due)
     VALUES (?,?,?,?,?,?,?,?,?,?, 'new', 'n1', ?,?,?, ?,?,?) RETURNING id, ticket_number`,
    [tid, number, ttype, title.trim(), description || null, category_id || null, subcategory_id || null,
     impact, urgency, priority, channel, asset_id || null, req.user.id,
     sla.sla_policy_id, sla.first_response_due, sla.resolution_due]
  );
  await logHistory(null, { tenant_id: tid, ticket_id: r[0].id, actor_id: req.user.id, action: 'created', new_value: number });

  // Auto-assignment: first matching rule (most specific wins)
  const [[rule]] = await db.query(
    `SELECT assign_to FROM ticket_assignment_rules
      WHERE tenant_id=? AND is_active=true AND assign_to IS NOT NULL
        AND (category_id IS NULL OR category_id=?)
        AND (type IS NULL OR type=?)
        AND (level IS NULL OR level='n1')
      ORDER BY (category_id IS NOT NULL) DESC, (type IS NOT NULL) DESC, sort_order LIMIT 1`,
    [tid, category_id || null, ttype]
  );
  if (rule?.assign_to) {
    const lvl = await getUserLevel(tid, rule.assign_to);
    await db.query("UPDATE tickets SET assigned_to=?, level=COALESCE(?, 'n1'), status='assigned', updated_at=NOW() WHERE id=?", [rule.assign_to, lvl, r[0].id]);
    await logHistory(null, { tenant_id: tid, ticket_id: r[0].id, actor_id: req.user.id, action: 'assigned', field: 'assigned_to', new_value: rule.assign_to, note: 'Auto-asignado por regla' });
    await notifyTicketEvent(r[0].id, 'assigned');
  }

  await notifyTicketEvent(r[0].id, 'created');
  res.status(201).json({ id: r[0].id, ticket_number: r[0].ticket_number });
}));

// ══════════════════════════════════════════════════════════════════════════════
//  UPDATE editable fields
// ══════════════════════════════════════════════════════════════════════════════
router.put('/:id', guard, w(async (req, res) => {
  const actor = await requireAgent(req, res); if (!actor) return;
  const t = await getTicket(req); if (!t) return res.status(404).json({ error: 'No encontrado' });
  if (CLOSED_STATES.includes(t.status) && t.status !== 'resolved')
    return res.status(400).json({ error: 'Un ticket cerrado no se edita; reábrelo primero' });

  const { title, description, category_id, subcategory_id, impact, urgency, priority, type, asset_id } = req.body;
  const newImpact = impact || t.impact, newUrgency = urgency || t.urgency;
  const newPriority = actor.sup && priority ? priority : derivePriority(newImpact, newUrgency);
  const newAsset = 'asset_id' in req.body ? (asset_id || null) : t.asset_id;

  if (newPriority !== t.priority)
    await logHistory(null, { tenant_id: t.tenant_id, ticket_id: t.id, actor_id: req.user.id, action: 'priority', field: 'priority', old_value: t.priority, new_value: newPriority });

  await db.query(
    `UPDATE tickets SET title=?, description=?, category_id=?, subcategory_id=?, impact=?, urgency=?, priority=?, type=?, asset_id=?, updated_at=NOW()
      WHERE id=? AND tenant_id=?`,
    [title ?? t.title, description ?? t.description, category_id ?? t.category_id, subcategory_id ?? t.subcategory_id,
     newImpact, newUrgency, newPriority, type || t.type, newAsset, t.id, t.tenant_id]
  );
  res.json({ message: 'Ticket actualizado' });
}));

// ══════════════════════════════════════════════════════════════════════════════
//  STATUS  (SLA pause/resume + first-response tracking)
// ══════════════════════════════════════════════════════════════════════════════
router.patch('/:id/status', guard, w(async (req, res) => {
  const actor = await requireAgent(req, res); if (!actor) return;
  const t = await getTicket(req); if (!t) return res.status(404).json({ error: 'No encontrado' });
  const { status } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Estado inválido' });

  const upd = { status };
  Object.assign(upd, slaPauseTransition(t, status));
  if (upd.resolution_due) { upd.sla_due_notified = false; upd.sla_breach_notified = false; } // SLA pushed → re-arm alerts
  if (status === 'resolved' && !t.resolved_at) upd.resolved_at = new Date();
  if (status === 'closed') upd.closed_at = new Date();
  if (OPEN_STATES.includes(status) && !t.first_response_at && status !== 'new') upd.first_response_at = new Date();

  const cols = Object.keys(upd);
  await db.query(
    `UPDATE tickets SET ${cols.map(c => `${c}=?`).join(', ')}, updated_at=NOW() WHERE id=? AND tenant_id=?`,
    [...cols.map(c => upd[c]), t.id, t.tenant_id]
  );
  await logHistory(null, { tenant_id: t.tenant_id, ticket_id: t.id, actor_id: req.user.id, action: 'status', field: 'status', old_value: t.status, new_value: status, note: req.body.note || null });
  if (status === 'waiting_user') await notifyTicketEvent(t.id, 'waiting_user');
  res.json({ message: 'Estado actualizado' });
}));

// ══════════════════════════════════════════════════════════════════════════════
//  ASSIGN
// ══════════════════════════════════════════════════════════════════════════════
router.patch('/:id/assign', guard, w(async (req, res) => {
  const actor = await requireAgent(req, res); if (!actor) return;
  const t = await getTicket(req); if (!t) return res.status(404).json({ error: 'No encontrado' });
  const assignee = req.body.assigned_to ? parseInt(req.body.assigned_to) : req.user.id;

  const level = await getUserLevel(t.tenant_id, assignee);
  const newStatus = ['new', 'open'].includes(t.status) ? 'assigned' : t.status;
  await db.query(
    'UPDATE tickets SET assigned_to=?, level=COALESCE(?, level), status=?, updated_at=NOW() WHERE id=? AND tenant_id=?',
    [assignee, level, newStatus, t.id, t.tenant_id]
  );
  await logHistory(null, { tenant_id: t.tenant_id, ticket_id: t.id, actor_id: req.user.id, action: 'assigned', field: 'assigned_to', old_value: t.assigned_to, new_value: assignee });
  if (assignee !== req.user.id) await notifyTicketEvent(t.id, 'assigned');
  res.json({ message: 'Ticket asignado' });
}));

// ══════════════════════════════════════════════════════════════════════════════
//  ESCALATE
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:id/escalate', guard, w(async (req, res) => {
  const actor = await requireAgent(req, res); if (!actor) return;
  const t = await getTicket(req); if (!t) return res.status(404).json({ error: 'No encontrado' });
  const { to_level, reason, to_user } = req.body;
  if (!LEVELS.includes(to_level)) return res.status(400).json({ error: 'Nivel destino inválido' });
  if (!reason?.trim()) return res.status(400).json({ error: 'El motivo de escalamiento es obligatorio' });

  if (!actor.sup) {
    const ok = (t.level === 'n1' && to_level === 'n2') ||
               (t.level === 'n2' && (to_level === 'n3' || to_level === 'n1')) ||
               (t.level === 'n3' && (to_level === 'n2' || to_level === 'n1'));
    if (!ok) return res.status(400).json({ error: `No puedes mover de ${t.level.toUpperCase()} a ${to_level.toUpperCase()}` });
  }

  const conn = await db.getConnection();
  await conn.beginTransaction();
  try {
    await conn.query(
      'UPDATE tickets SET level=?, status=?, assigned_to=?, updated_at=NOW() WHERE id=? AND tenant_id=?',
      [to_level, 'escalated', to_user ? parseInt(to_user) : null, t.id, t.tenant_id]
    );
    await conn.query(
      `INSERT INTO ticket_escalations (tenant_id, ticket_id, from_level, to_level, from_user, to_user, reason)
       VALUES (?,?,?,?,?,?,?)`,
      [t.tenant_id, t.id, t.level, to_level, req.user.id, to_user ? parseInt(to_user) : null, reason.trim()]
    );
    await logHistory(conn, { tenant_id: t.tenant_id, ticket_id: t.id, actor_id: req.user.id, action: 'escalated', field: 'level', old_value: t.level, new_value: to_level, note: reason.trim() });
    await conn.commit(); conn.release();
    await notifyTicketEvent(t.id, 'escalated', { reason: reason.trim() });
    res.json({ message: `Escalado a ${to_level.toUpperCase()}` });
  } catch (e) { await conn.rollback(); conn.release(); throw e; }
}));

// ══════════════════════════════════════════════════════════════════════════════
//  COMMENTS  (public = reporter+agents, internal = agents only)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:id/comments', guard, w(async (req, res) => {
  const tid = req.user.tenant_id;
  const actor = await loadActor(req);
  const t = await getTicket(req); if (!t) return res.status(404).json({ error: 'No encontrado' });
  if (!actor.isAgent && t.reported_by !== req.user.id) return res.status(403).json({ error: 'Sin acceso' });

  const { comment, is_internal } = req.body;
  if (!comment?.trim()) return res.status(400).json({ error: 'Comentario requerido' });
  const internal = !!is_internal && actor.isAgent;

  const [r] = await db.query(
    'INSERT INTO ticket_comments (ticket_id, tenant_id, user_id, comment, is_internal) VALUES (?,?,?,?,?) RETURNING id',
    [t.id, tid, req.user.id, comment.trim(), internal]
  );

  if (actor.isAgent && !internal && !t.first_response_at) {
    await db.query('UPDATE tickets SET first_response_at=NOW(), updated_at=NOW() WHERE id=?', [t.id]);
  }
  if (!actor.isAgent && t.reported_by === req.user.id && t.status === 'resolved') {
    await db.query('UPDATE tickets SET status=?, reopened_count=reopened_count+1, resolved_at=NULL, updated_at=NOW() WHERE id=?', ['reopened', t.id]);
    await logHistory(null, { tenant_id: tid, ticket_id: t.id, actor_id: req.user.id, action: 'reopened', note: 'Reabierto por respuesta del usuario' });
  }
  await logHistory(null, { tenant_id: tid, ticket_id: t.id, actor_id: req.user.id, action: 'comment', new_value: internal ? 'nota interna' : 'comentario' });
  if (!internal) await notifyTicketEvent(t.id, 'comment_public', { fromAgent: actor.isAgent, preview: comment.trim().slice(0, 140) });
  res.status(201).json({ id: r[0].id });
}));

// ══════════════════════════════════════════════════════════════════════════════
//  RESOLVE / CLOSE / REOPEN / RATE
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:id/resolve', guard, w(async (req, res) => {
  const actor = await requireAgent(req, res); if (!actor) return;
  const t = await getTicket(req); if (!t) return res.status(404).json({ error: 'No encontrado' });
  const { resolution_type, resolution_note } = req.body;
  if (!RESOLUTION_TYPES.includes(resolution_type)) return res.status(400).json({ error: 'Tipo de solución inválido' });
  if (!resolution_note?.trim()) return res.status(400).json({ error: 'El resumen de solución es obligatorio' });

  await db.query(
    'UPDATE tickets SET status=?, resolution_type=?, resolution_note=?, resolved_at=NOW(), updated_at=NOW() WHERE id=? AND tenant_id=?',
    ['resolved', resolution_type, resolution_note.trim(), t.id, t.tenant_id]
  );
  await logHistory(null, { tenant_id: t.tenant_id, ticket_id: t.id, actor_id: req.user.id, action: 'resolved', field: 'resolution_type', new_value: resolution_type, note: resolution_note.trim() });
  await notifyTicketEvent(t.id, 'resolved');
  res.json({ message: 'Ticket resuelto' });
}));

router.post('/:id/close', guard, w(async (req, res) => {
  const actor = await loadActor(req);
  const t = await getTicket(req); if (!t) return res.status(404).json({ error: 'No encontrado' });
  if (!actor.isAgent && t.reported_by !== req.user.id) return res.status(403).json({ error: 'Sin acceso' });
  await db.query('UPDATE tickets SET status=?, closed_at=NOW(), updated_at=NOW() WHERE id=? AND tenant_id=?', ['closed', t.id, t.tenant_id]);
  await logHistory(null, { tenant_id: t.tenant_id, ticket_id: t.id, actor_id: req.user.id, action: 'closed' });
  await notifyTicketEvent(t.id, 'closed');
  res.json({ message: 'Ticket cerrado' });
}));

router.post('/:id/reopen', guard, w(async (req, res) => {
  const actor = await loadActor(req);
  const t = await getTicket(req); if (!t) return res.status(404).json({ error: 'No encontrado' });
  if (!actor.isAgent && t.reported_by !== req.user.id) return res.status(403).json({ error: 'Sin acceso' });
  if (!['resolved', 'closed'].includes(t.status)) return res.status(400).json({ error: 'Solo se reabre un ticket resuelto o cerrado' });
  await db.query('UPDATE tickets SET status=?, reopened_count=reopened_count+1, resolved_at=NULL, closed_at=NULL, sla_breach_notified=false, sla_due_notified=false, updated_at=NOW() WHERE id=? AND tenant_id=?', ['reopened', t.id, t.tenant_id]);
  await logHistory(null, { tenant_id: t.tenant_id, ticket_id: t.id, actor_id: req.user.id, action: 'reopened', note: req.body.reason || null });
  await notifyTicketEvent(t.id, 'reopened');
  res.json({ message: 'Ticket reabierto' });
}));

router.post('/:id/rate', guard, w(async (req, res) => {
  const t = await getTicket(req); if (!t) return res.status(404).json({ error: 'No encontrado' });
  if (t.reported_by !== req.user.id) return res.status(403).json({ error: 'Solo el solicitante puede calificar' });
  const score = parseInt(req.body.score);
  if (!(score >= 1 && score <= 5)) return res.status(400).json({ error: 'Puntaje 1-5' });
  await db.query(
    `INSERT INTO ticket_ratings (tenant_id, ticket_id, score, comment, rated_by) VALUES (?,?,?,?,?)
     ON CONFLICT (ticket_id) DO UPDATE SET score=EXCLUDED.score, comment=EXCLUDED.comment`,
    [t.tenant_id, t.id, score, req.body.comment || null, req.user.id]
  );
  res.json({ message: 'Gracias por tu evaluación' });
}));

// ══════════════════════════════════════════════════════════════════════════════
//  ATTACHMENTS  (stored in DB)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:id/attachments', guard, upload.single('file'), w(async (req, res) => {
  const actor = await loadActor(req);
  const t = await getTicket(req); if (!t) return res.status(404).json({ error: 'No encontrado' });
  if (!actor.isAgent && t.reported_by !== req.user.id) return res.status(403).json({ error: 'Sin acceso' });
  if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
  if (!ALLOWED_MIME.test(req.file.mimetype)) return res.status(400).json({ error: 'Tipo de archivo no permitido' });

  const [r] = await db.query(
    `INSERT INTO ticket_attachments (tenant_id, ticket_id, file_name, mime, size_bytes, data, uploaded_by)
     VALUES (?,?,?,?,?,?,?) RETURNING id`,
    [t.tenant_id, t.id, req.file.originalname.slice(0, 255), req.file.mimetype, req.file.size, req.file.buffer, req.user.id]
  );
  await logHistory(null, { tenant_id: t.tenant_id, ticket_id: t.id, actor_id: req.user.id, action: 'attachment', new_value: req.file.originalname });
  res.status(201).json({ id: r[0].id });
}));

router.get('/:id/attachments/:attId/download', guard, w(async (req, res) => {
  const actor = await loadActor(req);
  const t = await getTicket(req); if (!t) return res.status(404).json({ error: 'No encontrado' });
  if (!actor.isAgent && t.reported_by !== req.user.id) return res.status(403).json({ error: 'Sin acceso' });
  const [[a]] = await db.query('SELECT file_name, mime, data FROM ticket_attachments WHERE id=? AND ticket_id=? AND tenant_id=?', [req.params.attId, t.id, t.tenant_id]);
  if (!a || !a.data) return res.status(404).json({ error: 'Archivo no encontrado' });
  res.setHeader('Content-Type', a.mime || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(a.file_name)}"`);
  res.send(Buffer.isBuffer(a.data) ? a.data : Buffer.from(a.data));
}));

router.delete('/:id/attachments/:attId', guard, w(async (req, res) => {
  const actor = await loadActor(req);
  const t = await getTicket(req); if (!t) return res.status(404).json({ error: 'No encontrado' });
  const [[a]] = await db.query('SELECT uploaded_by FROM ticket_attachments WHERE id=? AND ticket_id=? AND tenant_id=?', [req.params.attId, t.id, t.tenant_id]);
  if (!a) return res.status(404).json({ error: 'No encontrado' });
  if (!actor.isAgent && a.uploaded_by !== req.user.id) return res.status(403).json({ error: 'Sin permiso' });
  await db.query('DELETE FROM ticket_attachments WHERE id=? AND tenant_id=?', [req.params.attId, t.tenant_id]);
  res.json({ message: 'Adjunto eliminado' });
}));

export default router;
