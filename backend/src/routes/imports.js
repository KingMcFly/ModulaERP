import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireModule } from '../middleware/tenant.js';

const router = Router();
router.use(requireAuth);
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

// ── Assets bulk import ─────────────────────────────────────────────────────

router.post('/assets', requireModule('inventory'), w(async (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0)
    return res.status(400).json({ error: 'Se requiere un array de filas' });
  if (rows.length > 500)
    return res.status(400).json({ error: 'Máximo 500 filas por importación' });

  const tid = req.user.tenant_id;
  let success = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.asset_type?.trim()) {
      errors.push({ row: i + 2, message: 'Tipo de activo requerido' });
      continue;
    }
    try {
      const [locRows] = r.location_name
        ? await db.query('SELECT id FROM locations WHERE tenant_id=? AND name=? AND is_active=true LIMIT 1', [tid, r.location_name.trim()])
        : [[]];
      const locationId = locRows[0]?.id || null;

      await db.query(
        `INSERT INTO assets (tenant_id, asset_type, serial_number, barcode, brand, model, value, purchase_date, location_id, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')`,
        [
          tid,
          r.asset_type.trim(),
          r.serial_number?.toString().trim() || null,
          r.barcode?.toString().trim() || null,
          r.brand?.trim() || null,
          r.model?.trim() || null,
          parseFloat(r.value) || null,
          r.purchase_date || null,
          locationId,
          r.notes?.trim() || null,
        ]
      );
      success++;
    } catch (e) {
      errors.push({ row: i + 2, message: e.message });
    }
  }

  res.json({ success, failed: errors.length, errors: errors.slice(0, 20) });
}));

// ── Supplies bulk import ───────────────────────────────────────────────────

router.post('/supplies', requireModule('inventory'), w(async (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0)
    return res.status(400).json({ error: 'Se requiere un array de filas' });
  if (rows.length > 500)
    return res.status(400).json({ error: 'Máximo 500 filas por importación' });

  const tid = req.user.tenant_id;
  let success = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.name?.trim()) { errors.push({ row: i + 2, message: 'Nombre requerido' }); continue; }
    try {
      const [locRows] = r.location_name
        ? await db.query('SELECT id FROM locations WHERE tenant_id=? AND name=? AND is_active=true LIMIT 1', [tid, r.location_name.trim()])
        : [[]];
      await db.query(
        `INSERT INTO supplies (tenant_id, name, category, unit, current_stock, min_stock, unit_cost, location_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tid,
          r.name.trim(),
          r.category?.trim() || null,
          r.unit?.trim() || null,
          parseInt(r.current_stock) || 0,
          parseInt(r.min_stock) || 0,
          parseFloat(r.unit_cost) || null,
          locRows[0]?.id || null,
          r.notes?.trim() || null,
        ]
      );
      success++;
    } catch (e) {
      errors.push({ row: i + 2, message: e.message });
    }
  }

  res.json({ success, failed: errors.length, errors: errors.slice(0, 20) });
}));

// ── Personnel bulk import ──────────────────────────────────────────────────

router.post('/personnel', requireModule('personnel'), w(async (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0)
    return res.status(400).json({ error: 'Se requiere un array de filas' });
  if (rows.length > 500)
    return res.status(400).json({ error: 'Máximo 500 filas por importación' });

  const tid = req.user.tenant_id;
  let success = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.name?.trim()) { errors.push({ row: i + 2, message: 'Nombre requerido' }); continue; }
    try {
      await db.query(
        `INSERT INTO personnel (tenant_id, name, national_id, department, position, shift, phone, email, hired_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tid,
          r.name.trim(),
          r.national_id?.toString().trim() || null,
          r.department?.trim() || null,
          r.position?.trim() || null,
          r.shift?.trim() || null,
          r.phone?.toString().trim() || null,
          r.email?.trim().toLowerCase() || null,
          r.hired_at || null,
        ]
      );
      success++;
    } catch (e) {
      errors.push({ row: i + 2, message: e.message });
    }
  }

  res.json({ success, failed: errors.length, errors: errors.slice(0, 20) });
}));

export default router;
