import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../../db.js';
import { requireSuperAdmin } from '../../middleware/auth.js';

const router = Router();
router.use(requireSuperAdmin);
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', w(async (_req, res) => {
  const [rows] = await db.query(
    `SELECT id, name, email, role, is_active, last_login, created_at
     FROM users WHERE tenant_id = 1 ORDER BY created_at DESC`
  );
  res.json(rows);
}));

router.post('/', w(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'Nombre y email requeridos' });
  }
  // Requerir contraseña explícita — no usar default débil (A07)
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Contraseña requerida, mínimo 8 caracteres' });
  }
  if (password.length > 128) {
    return res.status(400).json({ error: 'Contraseña demasiado larga' });
  }

  const [exists] = await db.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  if (exists.length) return res.status(409).json({ error: 'El email ya está en uso' });

  const hash = await bcrypt.hash(password, 12);
  const validRoles = ['super_admin', 'admin'];
  const [result] = await db.query(
    'INSERT INTO users (tenant_id, email, password, name, role) VALUES (1, ?, ?, ?, ?)',
    [email.trim().toLowerCase(), hash, name.trim(), validRoles.includes(role) ? role : 'admin']
  );
  console.info(`[${new Date().toISOString()}] ADMIN_USER_CREATED id=${result.insertId} by=${req.user.id}`);
  res.status(201).json({ id: result.insertId, message: 'Usuario creado' });
}));

router.put('/:id', w(async (req, res) => {
  const { name, email, role } = req.body;
  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'Nombre y email requeridos' });
  }
  const validRoles = ['super_admin', 'admin'];
  await db.query(
    'UPDATE users SET name=?, email=?, role=? WHERE id=? AND tenant_id=1',
    [name.trim(), email.trim().toLowerCase(), validRoles.includes(role) ? role : 'admin', req.params.id]
  );
  res.json({ message: 'Usuario actualizado' });
}));

router.patch('/:id/status', w(async (req, res) => {
  const { is_active } = req.body;
  // Usar === para comparación estricta de IDs (A01)
  if (req.user.id === Number(req.params.id)) {
    return res.status(400).json({ error: 'No puedes desactivarte a ti mismo' });
  }
  await db.query(
    'UPDATE users SET is_active=? WHERE id=? AND tenant_id=1',
    [is_active ? 1 : 0, req.params.id]
  );
  console.info(`[${new Date().toISOString()}] USER_STATUS_CHANGE id=${req.params.id} active=${is_active} by=${req.user.id}`);
  res.json({ message: is_active ? 'Usuario activado' : 'Usuario desactivado' });
}));

router.patch('/:id/password', w(async (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Contraseña mínimo 8 caracteres' });
  }
  if (password.length > 128) {
    return res.status(400).json({ error: 'Contraseña demasiado larga' });
  }
  const hash = await bcrypt.hash(password, 12);
  await db.query('UPDATE users SET password=? WHERE id=? AND tenant_id=1', [hash, req.params.id]);
  console.info(`[${new Date().toISOString()}] ADMIN_PASSWORD_RESET id=${req.params.id} by=${req.user.id}`);
  res.json({ message: 'Contraseña actualizada' });
}));

export default router;
