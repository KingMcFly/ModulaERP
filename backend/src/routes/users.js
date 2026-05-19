import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAdmin);
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

// List users in tenant
router.get('/', w(async (req, res) => {
  const tid = req.user.tenant_id;
  const [rows] = await db.query(
    `SELECT id, name, email, rut, role, is_active, last_login, created_at
     FROM users WHERE tenant_id = ? ORDER BY name ASC`,
    [tid]
  );
  res.json(rows);
}));

// Create user in tenant
router.post('/', w(async (req, res) => {
  const tid = req.user.tenant_id;
  const { name, email, password, role = 'user', module_permissions = [], rut } = req.body;

  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'Nombre y email requeridos' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Contraseña requerida, mínimo 8 caracteres' });
  }
  if (password.length > 128) {
    return res.status(400).json({ error: 'Contraseña demasiado larga' });
  }

  const validRoles = ['user', 'manager', 'admin'];
  const safeRole = validRoles.includes(role) ? role : 'user';

  const [exists] = await db.query(
    'SELECT id FROM users WHERE email = ? AND tenant_id = ?',
    [email.trim().toLowerCase(), tid]
  );
  if (exists.length) return res.status(409).json({ error: 'El email ya está en uso en este tenant' });

  const hash = await bcrypt.hash(password, 12);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const cleanRut = rut ? rut.replace(/[.\-\s]/g, '').toUpperCase() : null;
    const fmtRut   = cleanRut && cleanRut.length >= 2
      ? `${cleanRut.slice(0,-1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${cleanRut.slice(-1)}`
      : null;

    const [userRows] = await conn.query(
      'INSERT INTO users (tenant_id, email, password, name, role, rut) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
      [tid, email.trim().toLowerCase(), hash, name.trim(), safeRole, fmtRut]
    );
    const userId = userRows[0].id;

    // If role=user and no permissions given, default to requests (view + write)
    const perms = module_permissions.length > 0
      ? module_permissions
      : [{ module_code: 'requests', can_view: 1, can_write: 1, can_delete: 0 }];

    if (safeRole === 'user' && perms.length > 0) {
      for (const p of perms) {
        await conn.query(
          `INSERT INTO user_module_permissions (user_id, tenant_id, module_code, can_view, can_write, can_delete)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (user_id, tenant_id, module_code) DO UPDATE
             SET can_view=EXCLUDED.can_view, can_write=EXCLUDED.can_write, can_delete=EXCLUDED.can_delete`,
          [userId, tid, p.module_code, p.can_view ? 1 : 0, p.can_write ? 1 : 0, p.can_delete ? 1 : 0]
        );
      }
    }

    await conn.commit();
    console.info(`[${new Date().toISOString()}] USER_CREATED id=${userId} by=${req.user.id}`);
    res.status(201).json({ id: userId, message: 'Usuario creado' });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}));

// Update user info
router.put('/:id', w(async (req, res) => {
  const tid = req.user.tenant_id;
  const { name, email, role, rut } = req.body;
  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'Nombre y email requeridos' });
  }
  const validRoles = ['user', 'manager', 'admin'];
  const safeRole = validRoles.includes(role) ? role : 'user';
  const cleanRut = rut ? rut.replace(/[.\-\s]/g, '').toUpperCase() : null;
  const fmtRut   = cleanRut && cleanRut.length >= 2
    ? `${cleanRut.slice(0,-1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${cleanRut.slice(-1)}`
    : null;
  await db.query(
    'UPDATE users SET name=?, email=?, role=?, rut=? WHERE id=? AND tenant_id=?',
    [name.trim(), email.trim().toLowerCase(), safeRole, fmtRut, req.params.id, tid]
  );
  res.json({ message: 'Usuario actualizado' });
}));

// Toggle active
router.patch('/:id/status', w(async (req, res) => {
  const tid = req.user.tenant_id;
  if (req.user.id === Number(req.params.id)) {
    return res.status(400).json({ error: 'No puedes desactivarte a ti mismo' });
  }
  const { is_active } = req.body;
  await db.query(
    'UPDATE users SET is_active=? WHERE id=? AND tenant_id=?',
    [is_active ? 1 : 0, req.params.id, tid]
  );
  res.json({ message: is_active ? 'Usuario activado' : 'Usuario desactivado' });
}));

// Reset password
router.patch('/:id/password', w(async (req, res) => {
  const tid = req.user.tenant_id;
  const { password } = req.body;
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Contraseña mínimo 8 caracteres' });
  }
  if (password.length > 128) {
    return res.status(400).json({ error: 'Contraseña demasiado larga' });
  }
  const hash = await bcrypt.hash(password, 12);
  await db.query(
    'UPDATE users SET password=? WHERE id=? AND tenant_id=?',
    [hash, req.params.id, tid]
  );
  res.json({ message: 'Contraseña actualizada' });
}));

// Get user module permissions
router.get('/:id/permissions', w(async (req, res) => {
  const tid = req.user.tenant_id;

  // Verify user belongs to this tenant
  const [[user]] = await db.query('SELECT id, role FROM users WHERE id=? AND tenant_id=?', [req.params.id, tid]);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  // Get all tenant modules
  const [modules] = await db.query(
    `SELECT m.code, m.name, m.icon, m.color, m.sort_order
     FROM tenant_modules tm JOIN modules m ON m.id = tm.module_id
     WHERE tm.tenant_id = ? AND tm.is_active = true
     ORDER BY m.sort_order`,
    [tid]
  );

  // Get existing permissions for this user
  const [perms] = await db.query(
    'SELECT module_code, can_view, can_write, can_delete FROM user_module_permissions WHERE user_id=? AND tenant_id=?',
    [req.params.id, tid]
  );
  const permMap = Object.fromEntries(perms.map(p => [p.module_code, p]));

  const result = modules.map(m => ({
    ...m,
    can_view:   permMap[m.code]?.can_view   ?? 0,
    can_write:  permMap[m.code]?.can_write  ?? 0,
    can_delete: permMap[m.code]?.can_delete ?? 0,
  }));

  res.json({ role: user.role, modules: result });
}));

// Save user module permissions
router.put('/:id/permissions', w(async (req, res) => {
  const tid = req.user.tenant_id;
  const { permissions } = req.body; // [{ module_code, can_view, can_write, can_delete }]

  const [[user]] = await db.query('SELECT id FROM users WHERE id=? AND tenant_id=?', [req.params.id, tid]);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  // Delete existing and re-insert
  await db.query('DELETE FROM user_module_permissions WHERE user_id=? AND tenant_id=?', [req.params.id, tid]);

  if (Array.isArray(permissions) && permissions.length > 0) {
    const filtered = permissions.filter(p => p.can_view || p.can_write || p.can_delete);
    for (const p of filtered) {
      await db.query(
        `INSERT INTO user_module_permissions (user_id, tenant_id, module_code, can_view, can_write, can_delete)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.params.id, tid, p.module_code, p.can_view ? 1 : 0, p.can_write ? 1 : 0, p.can_delete ? 1 : 0]
      );
    }
  }

  res.json({ message: 'Permisos actualizados' });
}));

export default router;
