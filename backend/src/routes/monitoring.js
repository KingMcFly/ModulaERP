import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireModule } from '../middleware/tenant.js';

const router = Router();
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

// Public heartbeat endpoint (agent uses token auth)
router.post('/heartbeat', w(async (req, res) => {
  const token = req.headers['x-agent-token'] || req.body.token;
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  const [tRows] = await db.query(
    'SELECT tenant_id FROM monitoring_tokens WHERE token = ? AND is_active = 1',
    [token]
  );
  if (!tRows.length) return res.status(401).json({ error: 'Token inválido' });
  const tenant_id = tRows[0].tenant_id;

  const { agent_key, hostname, ip_address, os_info, processor,
          cpu_usage, ram_usage, disk_usage, uptime_seconds, serial_number } = req.body;
  if (!agent_key) return res.status(400).json({ error: 'agent_key requerido' });

  let asset_id = null;
  if (serial_number) {
    const [[asset]] = await db.query(
      'SELECT id FROM assets WHERE tenant_id = ? AND serial_number = ?',
      [tenant_id, serial_number]
    );
    asset_id = asset?.id || null;
  }

  const status = cpu_usage > 90 || ram_usage > 90 ? 'warning' : 'online';

  await db.query(
    `INSERT INTO monitoring_agents
       (tenant_id, agent_key, hostname, ip_address, os_info, processor,
        cpu_usage, ram_usage, disk_usage, uptime_seconds, last_heartbeat, agent_status, asset_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)
     ON DUPLICATE KEY UPDATE
       hostname=VALUES(hostname), ip_address=VALUES(ip_address), os_info=VALUES(os_info),
       processor=VALUES(processor), cpu_usage=VALUES(cpu_usage), ram_usage=VALUES(ram_usage),
       disk_usage=VALUES(disk_usage), uptime_seconds=VALUES(uptime_seconds),
       last_heartbeat=NOW(), agent_status=VALUES(agent_status), asset_id=VALUES(asset_id)`,
    [tenant_id, agent_key, hostname, ip_address, os_info, processor,
     cpu_usage, ram_usage, disk_usage, uptime_seconds, status, asset_id]
  );

  const [[agent]] = await db.query('SELECT id FROM monitoring_agents WHERE agent_key = ?', [agent_key]);
  if (agent) {
    await db.query(
      'INSERT INTO monitoring_heartbeats (agent_id, cpu_usage, ram_usage, disk_usage) VALUES (?, ?, ?, ?)',
      [agent.id, cpu_usage, ram_usage, disk_usage]
    );
  }

  res.json({ ok: true, status });
}));

// Protected routes
router.use(requireAuth);
const guard = requireModule('monitoring');

router.get('/agents', guard, w(async (req, res) => {
  await db.query(
    "UPDATE monitoring_agents SET agent_status='offline' WHERE tenant_id=? AND last_heartbeat < DATE_SUB(NOW(), INTERVAL 5 MINUTE)",
    [req.user.tenant_id]
  );
  const [rows] = await db.query(
    `SELECT ma.*, a.serial_number, a.brand, a.model
     FROM monitoring_agents ma LEFT JOIN assets a ON a.id = ma.asset_id
     WHERE ma.tenant_id = ? ORDER BY ma.agent_status DESC, ma.last_heartbeat DESC`,
    [req.user.tenant_id]
  );
  res.json(rows);
}));

router.get('/agents/:id/history', guard, w(async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM monitoring_heartbeats WHERE agent_id = ? ORDER BY recorded_at DESC LIMIT 288',
    [req.params.id]
  );
  res.json(rows);
}));

router.get('/stats', guard, w(async (req, res) => {
  const tid = req.user.tenant_id;
  await db.query(
    "UPDATE monitoring_agents SET agent_status='offline' WHERE tenant_id=? AND last_heartbeat < DATE_SUB(NOW(), INTERVAL 5 MINUTE)",
    [tid]
  );
  const [[{ total }]]   = await db.query('SELECT COUNT(*) AS total   FROM monitoring_agents WHERE tenant_id=?', [tid]);
  const [[{ online }]]  = await db.query("SELECT COUNT(*) AS online  FROM monitoring_agents WHERE tenant_id=? AND agent_status='online'",  [tid]);
  const [[{ warning }]] = await db.query("SELECT COUNT(*) AS warning FROM monitoring_agents WHERE tenant_id=? AND agent_status='warning'", [tid]);
  const [[{ offline }]] = await db.query("SELECT COUNT(*) AS offline FROM monitoring_agents WHERE tenant_id=? AND agent_status='offline'", [tid]);
  res.json({ total, online, warning, offline });
}));

router.get('/tokens', guard, w(async (req, res) => {
  const [rows] = await db.query(
    'SELECT id, label, token, is_active, created_at FROM monitoring_tokens WHERE tenant_id = ? ORDER BY created_at DESC',
    [req.user.tenant_id]
  );
  res.json(rows);
}));

router.post('/tokens', guard, w(async (req, res) => {
  const { label } = req.body;
  const token = `MERP-${req.user.tenant_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const [result] = await db.query(
    'INSERT INTO monitoring_tokens (tenant_id, token, label) VALUES (?, ?, ?)',
    [req.user.tenant_id, token, label || null]
  );
  res.status(201).json({ id: result.insertId, token });
}));

router.delete('/tokens/:id', guard, w(async (req, res) => {
  await db.query('UPDATE monitoring_tokens SET is_active = 0 WHERE id = ? AND tenant_id = ?',
    [req.params.id, req.user.tenant_id]);
  res.json({ message: 'Token desactivado' });
}));

export default router;
