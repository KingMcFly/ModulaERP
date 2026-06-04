import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../../db.js';
import { requireSuperAdmin } from '../../middleware/auth.js';

const router = Router();
router.use(requireSuperAdmin);
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

const MANDATORY_MODULES = ['inventory', 'personnel'];

router.get('/', w(async (req, res) => {
  const [rows] = await db.query(
    `SELECT t.*,
       (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id AND u.is_active = true) AS user_count,
       (SELECT COUNT(*) FROM tenant_modules tm WHERE tm.tenant_id = t.id AND tm.is_active = true) AS module_count
     FROM tenants t
     WHERE t.id != 1
     ORDER BY t.created_at DESC`
  );
  res.json(rows);
}));

router.post('/', w(async (req, res) => {
  const { name, slug, contact_email, contact_phone, country, plan, primary_color, module_codes } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'Nombre y slug requeridos' });

  const [existing] = await db.query('SELECT id FROM tenants WHERE slug = ?', [slug]);
  if (existing.length) return res.status(409).json({ error: 'El slug ya existe' });

  const conn = await db.getConnection();
  await conn.beginTransaction();
  try {
    const [tenantRows] = await conn.query(
      `INSERT INTO tenants (name, slug, contact_email, contact_phone, country, plan, primary_color)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [name, slug, contact_email || null, contact_phone || null, country || null,
       plan || 'starter', primary_color || '#6366F1']
    );
    const tenantId = tenantRows[0].id;

    // Always include mandatory modules + selected ones
    const allCodes = [...new Set([...MANDATORY_MODULES, ...(module_codes || [])])];
    if (allCodes.length) {
      const [mods] = await conn.query('SELECT id FROM modules WHERE code = ANY(?)', [allCodes]);
      for (const m of mods) {
        await conn.query('INSERT INTO tenant_modules (tenant_id, module_id) VALUES (?, ?)', [tenantId, m.id]);
      }
    }

    await conn.commit();
    conn.release();
    res.status(201).json({ id: tenantId, message: 'Tenant creado' });
  } catch (e) {
    await conn.rollback(); conn.release();
    throw e;
  }
}));

router.get('/:id', w(async (req, res) => {
  const [rows] = await db.query('SELECT * FROM tenants WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'No encontrado' });

  const [mods] = await db.query(
    `SELECT m.*, COALESCE(tm.is_active, false) AS enabled, tm.config,
       tm.type AS trial_type, tm.status AS trial_status,
       tm.expires_at, tm.unlimited,
       CASE WHEN m.code = ANY(?) THEN true ELSE false END AS is_mandatory
     FROM modules m
     LEFT JOIN tenant_modules tm ON tm.module_id = m.id AND tm.tenant_id = ?
     ORDER BY m.sort_order`,
    [MANDATORY_MODULES, req.params.id]
  );

  const [users] = await db.query(
    'SELECT id, name, email, role, is_active, last_login, created_at FROM users WHERE tenant_id = ? ORDER BY created_at',
    [req.params.id]
  );

  res.json({ ...rows[0], modules: mods, users });
}));

router.put('/:id', w(async (req, res) => {
  const { name, contact_email, contact_phone, country, plan, primary_color, status, logo_url } = req.body;
  await db.query(
    `UPDATE tenants SET name=?, contact_email=?, contact_phone=?, country=?,
     plan=?, primary_color=?, status=?, logo_url=? WHERE id=?`,
    [name, contact_email || null, contact_phone || null, country || null,
     plan, primary_color, status, logo_url || null, req.params.id]
  );
  res.json({ message: 'Tenant actualizado' });
}));

router.patch('/:id/status', w(async (req, res) => {
  const { status } = req.body;
  const valid = ['trial', 'active', 'suspended', 'cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Estado inválido' });
  await db.query('UPDATE tenants SET status=? WHERE id=?', [status, req.params.id]);
  res.json({ message: 'Estado actualizado' });
}));

router.patch('/:id/modules', w(async (req, res) => {
  const { module_id, is_active } = req.body;

  // Block disabling mandatory modules
  if (!is_active) {
    const [[mod]] = await db.query('SELECT code FROM modules WHERE id=?', [module_id]);
    if (mod && MANDATORY_MODULES.includes(mod.code)) {
      return res.status(400).json({ error: `El módulo "${mod.code}" es obligatorio y no puede deshabilitarse` });
    }
  }

  const [exists] = await db.query(
    'SELECT id FROM tenant_modules WHERE tenant_id=? AND module_id=?',
    [req.params.id, module_id]
  );
  if (exists.length) {
    await db.query(
      'UPDATE tenant_modules SET is_active=?, disabled_at=? WHERE tenant_id=? AND module_id=?',
      [is_active, is_active ? null : new Date(), req.params.id, module_id]
    );
  } else {
    await db.query(
      'INSERT INTO tenant_modules (tenant_id, module_id, is_active) VALUES (?, ?, ?)',
      [req.params.id, module_id, is_active]
    );
  }
  res.json({ message: 'Módulo actualizado' });
}));

router.post('/:id/users', w(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name?.trim() || !email?.trim()) return res.status(400).json({ error: 'Nombre y email requeridos' });

  // Requerir contraseña explícita — no usar default débil (A07)
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Contraseña requerida, mínimo 8 caracteres' });
  }
  if (password.length > 128) return res.status(400).json({ error: 'Contraseña demasiado larga' });

  const [exists] = await db.query('SELECT id FROM users WHERE email=?', [email.trim().toLowerCase()]);
  if (exists.length) return res.status(409).json({ error: 'El email ya está en uso' });

  const hash = await bcrypt.hash(password, 12);
  const validRoles = ['admin', 'manager', 'operator', 'viewer'];
  const [uRows] = await db.query(
    'INSERT INTO users (tenant_id, email, password, name, role) VALUES (?, ?, ?, ?, ?) RETURNING id',
    [req.params.id, email.trim().toLowerCase(), hash, name.trim(), validRoles.includes(role) ? role : 'operator']
  );
  console.info(`[${new Date().toISOString()}] TENANT_USER_CREATED id=${uRows[0].id} tenant=${req.params.id} by=${req.user.id}`);
  res.status(201).json({ id: uRows[0].id, message: 'Usuario creado' });
}));

router.patch('/:id/users/:userId/status', w(async (req, res) => {
  const { is_active } = req.body;
  await db.query('UPDATE users SET is_active=? WHERE id=? AND tenant_id=?',
    [!!is_active, req.params.userId, req.params.id]);
  res.json({ message: 'Estado actualizado' });
}));

router.delete('/:id', w(async (req, res) => {
  const id = Number(req.params.id);
  if (id === 1) return res.status(403).json({ error: 'No se puede eliminar la empresa principal' });

  const [[tenant]] = await db.query('SELECT id FROM tenants WHERE id = ?', [id]);
  if (!tenant) return res.status(404).json({ error: 'Empresa no encontrada' });

  const conn = await db.getConnection();
  await conn.beginTransaction();
  try {
    await conn.query('DELETE FROM user_module_permissions WHERE tenant_id = ?', [id]);
    await conn.query('DELETE FROM tenant_modules WHERE tenant_id = ?', [id]);
    await conn.query('DELETE FROM users WHERE tenant_id = ?', [id]);
    await conn.query('DELETE FROM tenants WHERE id = ?', [id]);
    await conn.commit();
    conn.release();
    console.info(`[${new Date().toISOString()}] TENANT_DELETED id=${id} by=${req.user.id}`);
    res.json({ message: 'Empresa eliminada' });
  } catch (e) {
    await conn.rollback();
    conn.release();
    throw e;
  }
}));

// PATCH /api/admin/tenants/:id/module-trial — extend or set unlimited for a module
router.patch('/:id/module-trial', w(async (req, res) => {
  const { module_id, action, days = 30 } = req.body;
  if (!module_id || !action) return res.status(400).json({ error: 'module_id y action requeridos' });

  const validActions = ['extend', 'set_unlimited', 'set_required', 'expire'];
  if (!validActions.includes(action)) return res.status(400).json({ error: 'Acción inválida' });

  const [[mod]] = await db.query('SELECT id, code FROM modules WHERE id=?', [module_id]);
  if (!mod) return res.status(404).json({ error: 'Módulo no encontrado' });

  const [exists] = await db.query(
    'SELECT id FROM tenant_modules WHERE tenant_id=? AND module_id=?',
    [req.params.id, module_id]
  );

  if (action === 'extend') {
    const extendDays = Math.max(1, Math.min(365, parseInt(days) || 30));
    if (exists.length) {
      await db.query(
        `UPDATE tenant_modules
         SET is_active = true, status = 'active', type = 'trial', unlimited = false,
             expires_at = GREATEST(COALESCE(expires_at, NOW()), NOW()) + ($1 * INTERVAL '1 day')
         WHERE tenant_id = $2 AND module_id = $3`,
        [extendDays, req.params.id, module_id]
      );
    } else {
      await db.query(
        `INSERT INTO tenant_modules (tenant_id, module_id, is_active, type, status, unlimited, starts_at, expires_at)
         VALUES ($1, $2, true, 'trial', 'active', false, NOW(), NOW() + ($3 * INTERVAL '1 day'))`,
        [req.params.id, module_id, extendDays]
      );
    }
    console.info(`[${new Date().toISOString()}] MODULE_TRIAL_EXTENDED tenant=${req.params.id} module=${mod.code} days=${extendDays} by=${req.user.id}`);
    return res.json({ message: `Prueba extendida ${extendDays} días` });
  }

  if (action === 'set_unlimited') {
    if (exists.length) {
      await db.query(
        `UPDATE tenant_modules SET is_active=true, unlimited=true, status='active', expires_at=NULL, type='paid'
         WHERE tenant_id=? AND module_id=?`,
        [req.params.id, module_id]
      );
    } else {
      await db.query(
        `INSERT INTO tenant_modules (tenant_id, module_id, is_active, type, status, unlimited, starts_at)
         VALUES (?, ?, true, 'paid', 'active', true, NOW())`,
        [req.params.id, module_id]
      );
    }
    console.info(`[${new Date().toISOString()}] MODULE_SET_UNLIMITED tenant=${req.params.id} module=${mod.code} by=${req.user.id}`);
    return res.json({ message: 'Módulo activado como ilimitado' });
  }

  if (action === 'set_required') {
    if (exists.length) {
      await db.query(
        `UPDATE tenant_modules SET is_active=true, unlimited=true, status='active', expires_at=NULL, type='required'
         WHERE tenant_id=? AND module_id=?`,
        [req.params.id, module_id]
      );
    } else {
      await db.query(
        `INSERT INTO tenant_modules (tenant_id, module_id, is_active, type, status, unlimited, starts_at)
         VALUES (?, ?, true, 'required', 'active', true, NOW())`,
        [req.params.id, module_id]
      );
    }
    return res.json({ message: 'Módulo marcado como obligatorio' });
  }

  if (action === 'expire') {
    await db.query(
      `UPDATE tenant_modules SET is_active=false, status='expired', expires_at=NOW()
       WHERE tenant_id=? AND module_id=?`,
      [req.params.id, module_id]
    );
    return res.json({ message: 'Módulo expirado' });
  }
}));

export default router;
