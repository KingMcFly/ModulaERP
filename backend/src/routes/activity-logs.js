import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', w(async (req, res) => {
  const tid = req.user.tenant_id;
  const { module, action, user_id, entity_type, limit = 50, offset = 0 } = req.query;

  const safeLimit  = Math.min(Math.max(Number(limit)  || 50,  1), 200);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  let sql = `SELECT al.id, al.module, al.action, al.entity_type, al.entity_id,
                    al.details, al.ip_address, al.created_at, u.name AS user_name
             FROM activity_logs al
             LEFT JOIN users u ON u.id = al.user_id
             WHERE al.tenant_id = ?`;
  const params = [tid];

  if (module)      { sql += ' AND al.module = ?';      params.push(module); }
  if (action)      { sql += ' AND al.action = ?';      params.push(action); }
  if (user_id)     { sql += ' AND al.user_id = ?';     params.push(Number(user_id)); }
  if (entity_type) { sql += ' AND al.entity_type = ?'; params.push(entity_type); }

  const [countRows] = await db.query(
    sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) AS total FROM'),
    params
  );
  const total = countRows[0]?.total || 0;

  sql += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
  params.push(safeLimit, safeOffset);

  const [rows] = await db.query(sql, params);
  res.json({ total, rows });
}));

export default router;
