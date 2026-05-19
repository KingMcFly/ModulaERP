import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireModule } from '../middleware/tenant.js';

const router = Router();
router.use(requireAuth);
const guard = requireModule('personnel');
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRut(rut) {
  if (!rut) return null;
  const clean = rut.replace(/[.\-\s]/g, '').toUpperCase();
  if (clean.length < 2) return null;
  const body = clean.slice(0, -1);
  const dv   = clean.slice(-1);
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}

async function upsertTechnician(conn, tenantId, personnelId, name, isTechnician, specialty) {
  const [[existing]] = await conn.query(
    'SELECT id FROM technicians WHERE personnel_id = ? AND tenant_id = ?',
    [personnelId, tenantId]
  );
  if (isTechnician) {
    if (existing) {
      await conn.query('UPDATE technicians SET name=?, specialty=?, is_active=true WHERE id=?',
        [name, specialty || null, existing.id]);
    } else {
      await conn.query(
        'INSERT INTO technicians (tenant_id, personnel_id, name, specialty) VALUES (?, ?, ?, ?)',
        [tenantId, personnelId, name, specialty || null]
      );
    }
  } else if (existing) {
    await conn.query('UPDATE technicians SET is_active=false WHERE id=?', [existing.id]);
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────

router.get('/stats', guard, w(async (req, res) => {
  const tid = req.user.tenant_id;
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM personnel WHERE tenant_id=? AND is_active=true', [tid]
  );
  const [[{ technicians }]] = await db.query(
    'SELECT COUNT(*) AS technicians FROM technicians WHERE tenant_id=? AND is_active=true', [tid]
  );
  const [departments] = await db.query(
    `SELECT department, COUNT(*) AS count FROM personnel
     WHERE tenant_id=? AND is_active=true AND department IS NOT NULL GROUP BY department`, [tid]
  );
  res.json({ total, technicians, departments });
}));

// ── List ──────────────────────────────────────────────────────────────────────

router.get('/', guard, w(async (req, res) => {
  const { search, department } = req.query;
  const tid = req.user.tenant_id;

  // Personnel records (with or without linked user account)
  let sql = `
    SELECT p.id AS id, p.name, p.national_id, p.department, p.position, p.phone, p.email,
           p.hired_at, p.is_active,
           COALESCE(p.user_id, u.id) AS user_id,
           CASE WHEN tech.id IS NOT NULL AND tech.is_active=true THEN 1 ELSE 0 END AS is_technician,
           COALESCE(tech.specialty, '') AS specialty,
           u.role, u.rut AS user_rut, u.last_login, u.is_active AS user_is_active
    FROM personnel p
    LEFT JOIN technicians tech ON tech.personnel_id = p.id AND tech.is_active = true
    LEFT JOIN users u ON u.id = COALESCE(p.user_id,
      (SELECT id FROM users u2 WHERE u2.email = p.email AND u2.tenant_id = p.tenant_id LIMIT 1))
    WHERE p.tenant_id = ?`;
  const params = [tid];
  if (search) {
    sql += ' AND (p.name LIKE ? OR p.national_id LIKE ? OR p.email LIKE ?)';
    const s = `%${search}%`; params.push(s, s, s);
  }
  if (department) { sql += ' AND p.department = ?'; params.push(department); }
  sql += ' AND p.is_active = true';

  // Users with no personnel record (created via old system or directly)
  let orphanSql = `
    SELECT NULL AS id, u.name, u.rut AS national_id, NULL AS department, NULL AS position,
           NULL AS phone, u.email, NULL AS hired_at, u.is_active,
           u.id AS user_id, 0 AS is_technician, '' AS specialty,
           u.role, u.rut AS user_rut, u.last_login, u.is_active AS user_is_active
    FROM users u
    WHERE u.tenant_id = ? AND u.role != 'super_admin' AND u.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM personnel p
        WHERE p.tenant_id = ? AND (p.user_id = u.id OR (u.email IS NOT NULL AND p.email = u.email))
      )`;
  const orphanParams = [tid, tid];
  if (search) {
    orphanSql += ' AND (u.name LIKE ? OR u.email LIKE ?)';
    const s = `%${search}%`; orphanParams.push(s, s);
  }

  const [rows] = await db.query(sql, params);
  const [orphans] = await db.query(orphanSql, orphanParams);

  const all = [...rows, ...orphans].sort((a, b) => a.name.localeCompare(b.name));
  res.json(all);
}));

router.get('/:id', guard, w(async (req, res) => {
  const [rows] = await db.query(
    `SELECT p.*, COALESCE(p.user_id, u.id) AS user_id,
            CASE WHEN tech.id IS NOT NULL AND tech.is_active=true THEN 1 ELSE 0 END AS is_technician,
            COALESCE(tech.specialty,'') AS specialty,
            u.role, u.rut AS user_rut, u.last_login
     FROM personnel p
     LEFT JOIN technicians tech ON tech.personnel_id = p.id AND tech.is_active = true
     LEFT JOIN users u ON u.id = COALESCE(p.user_id,
       (SELECT id FROM users u2 WHERE u2.email = p.email AND u2.tenant_id = p.tenant_id LIMIT 1))
     WHERE p.id = ? AND p.tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
  res.json(rows[0]);
}));

// ── Create — also creates system account ──────────────────────────────────────

router.post('/', guard, w(async (req, res) => {
  const {
    name, national_id, department, position, phone, email, hired_at,
    is_technician, specialty,
    password, role = 'user',
  } = req.body;

  if (!name?.trim())  return res.status(400).json({ error: 'Nombre requerido' });
  if (!email?.trim()) return res.status(400).json({ error: 'Email requerido' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'Contraseña mínimo 8 caracteres' });
  if (!/[A-Z]/.test(password)) return res.status(400).json({ error: 'La contraseña debe tener al menos una mayúscula' });
  if (!/[0-9]/.test(password)) return res.status(400).json({ error: 'La contraseña debe tener al menos un número' });

  const tid = req.user.tenant_id;
  const safeRole = ['user', 'manager', 'admin'].includes(role) ? role : 'user';
  const fmtRut   = formatRut(national_id);

  // Check email not already used
  const [[existingUser]] = await db.query(
    'SELECT id FROM users WHERE email=? AND tenant_id=?',
    [email.trim().toLowerCase(), tid]
  );
  if (existingUser) return res.status(409).json({ error: 'Ese email ya tiene una cuenta en este tenant' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Create user account
    const hash = await bcrypt.hash(password, 12);
    const [userRows] = await conn.query(
      'INSERT INTO users (tenant_id, email, password, name, role, rut) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
      [tid, email.trim().toLowerCase(), hash, name.trim(), safeRole, fmtRut]
    );
    const userId = userRows[0].id;

    // 2. Create personnel record linked to the user
    const [pRows] = await conn.query(
      `INSERT INTO personnel (tenant_id, name, national_id, department, position, phone, email, hired_at, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [tid, name.trim(), national_id || null, department || null,
       position || null, phone || null, email.trim().toLowerCase(), hired_at || null, userId]
    );
    const personnelId = pRows[0].id;

    await upsertTechnician(conn, tid, personnelId, name.trim(), !!is_technician, specialty);

    // 3. Default module permissions for 'user' role
    if (safeRole === 'user') {
      await conn.query(
        `INSERT INTO user_module_permissions (user_id, tenant_id, module_code, can_view, can_write, can_delete)
         VALUES (?, ?, 'requests', true, true, false)
         ON CONFLICT (user_id, tenant_id, module_code) DO UPDATE SET can_view=true`,
        [userId, tid]
      );
    }

    await conn.commit();
    console.info(`[${new Date().toISOString()}] PERSONA_CREATED personnel=${personnelId} user=${userId} by=${req.user.id}`);
    res.status(201).json({ id: personnelId, user_id: userId });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}));

// ── Update ────────────────────────────────────────────────────────────────────

router.put('/:id', guard, w(async (req, res) => {
  const {
    name, national_id, department, position, phone, email, hired_at,
    is_active, is_technician, specialty, role,
  } = req.body;
  const tid = req.user.tenant_id;
  const fmtRut = formatRut(national_id);
  const safeRole = role && ['user', 'manager', 'admin'].includes(role) ? role : undefined;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `UPDATE personnel SET name=?, national_id=?, department=?, position=?,
       phone=?, email=?, hired_at=?, is_active=?, updated_at=NOW()
       WHERE id=? AND tenant_id=?`,
      [name, fmtRut || national_id || null, department || null, position || null,
       phone || null, email || null, hired_at || null,
       is_active !== false, req.params.id, tid]
    );

    // Also update the linked user account
    const [[p]] = await conn.query('SELECT user_id FROM personnel WHERE id=? AND tenant_id=?', [req.params.id, tid]);
    if (p?.user_id) {
      const roleClause = safeRole ? ', role=?' : '';
      const roleParam  = safeRole ? [safeRole] : [];
      await conn.query(
        `UPDATE users SET name=?, email=?, rut=?${roleClause}, is_active=? WHERE id=? AND tenant_id=?`,
        [name, email?.trim().toLowerCase() || null, fmtRut, ...roleParam,
         is_active !== false, p.user_id, tid]
      );
    }

    await upsertTechnician(conn, tid, req.params.id, name, !!is_technician, specialty);
    await conn.commit();
    res.json({ message: 'Persona actualizada' });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}));

// ── Deactivate ────────────────────────────────────────────────────────────────

router.delete('/:id', guard, w(async (req, res) => {
  const tid = req.user.tenant_id;
  const [[p]] = await db.query('SELECT user_id FROM personnel WHERE id=? AND tenant_id=?', [req.params.id, tid]);

  await db.query('UPDATE personnel SET is_active=false WHERE id=? AND tenant_id=?', [req.params.id, tid]);
  await db.query('UPDATE technicians SET is_active=false WHERE personnel_id=? AND tenant_id=?', [req.params.id, tid]);
  if (p?.user_id) {
    await db.query('UPDATE users SET is_active=false WHERE id=? AND tenant_id=?', [p.user_id, tid]);
  }
  res.json({ message: 'Persona desactivada' });
}));

export default router;
