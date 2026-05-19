import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireModule } from '../middleware/tenant.js';

const router = Router();
router.use(requireAuth);
const guard = requireModule('loans');
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

// Specific routes before /:id

router.get('/overdue', guard, w(async (req, res) => {
  const [rows] = await db.query(
    `SELECT l.*, a.serial_number, a.brand, a.model, p.name AS borrower
     FROM loans l JOIN assets a ON a.id = l.asset_id
     LEFT JOIN personnel p ON p.id = l.borrower_id
     WHERE l.tenant_id = ? AND l.status = 'active' AND l.expected_return < CURRENT_DATE
     ORDER BY l.expected_return ASC`,
    [req.user.tenant_id]
  );
  res.json(rows);
}));

// Main CRUD

router.get('/', guard, w(async (req, res) => {
  const { status } = req.query;
  let sql = `SELECT l.*, a.serial_number, a.brand, a.model, a.asset_type,
                    p.name AS borrower_name_rel, u.name AS issued_by_name
             FROM loans l
             JOIN assets a ON a.id = l.asset_id
             LEFT JOIN personnel p ON p.id = l.borrower_id
             LEFT JOIN users u ON u.id = l.issued_by
             WHERE l.tenant_id = ?`;
  const params = [req.user.tenant_id];
  if (status) { sql += ' AND l.status = ?'; params.push(status); }
  sql += ' ORDER BY l.issued_at DESC';
  const [rows] = await db.query(sql, params);
  res.json(rows);
}));

router.get('/:id', guard, w(async (req, res) => {
  const [rows] = await db.query(
    `SELECT l.*, a.serial_number, a.brand, a.model, a.asset_type,
            p.name AS borrower_name_rel, p.national_id AS borrower_national_id,
            u.name AS issued_by_name
     FROM loans l
     JOIN assets a ON a.id = l.asset_id
     LEFT JOIN personnel p ON p.id = l.borrower_id
     LEFT JOIN users u ON u.id = l.issued_by
     WHERE l.id = ? AND l.tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
  res.json(rows[0]);
}));

router.post('/', guard, w(async (req, res) => {
  const { asset_id, borrower_id, borrower_name, expected_return, notes, signature_data } = req.body;
  if (!asset_id) return res.status(400).json({ error: 'Asset requerido' });

  const [[asset]] = await db.query(
    'SELECT id, status FROM assets WHERE id = ? AND tenant_id = ?',
    [asset_id, req.user.tenant_id]
  );
  if (!asset) return res.status(404).json({ error: 'Activo no encontrado' });
  if (asset.status !== 'available') return res.status(409).json({ error: 'El activo no está disponible' });

  const [rows] = await db.query(
    `INSERT INTO loans (tenant_id, asset_id, borrower_id, borrower_name, issued_by, expected_return, notes, signature_data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [
      req.user.tenant_id,
      asset_id,
      borrower_id     || null,
      borrower_name   || null,
      req.user.id,
      expected_return || null,
      notes           || null,
      signature_data  || null,
    ]
  );
  res.status(201).json({ id: rows[0].id });
}));

router.patch('/:id/return', guard, w(async (req, res) => {
  const { notes, signature_data } = req.body;
  const [[loan]] = await db.query(
    'SELECT id, asset_id, status FROM loans WHERE id = ? AND tenant_id = ?',
    [req.params.id, req.user.tenant_id]
  );
  if (!loan) return res.status(404).json({ error: 'No encontrado' });
  if (loan.status !== 'active') return res.status(409).json({ error: 'Préstamo ya cerrado' });

  await db.query(
    `UPDATE loans SET status='returned', actual_return=NOW(), returned_by=?, notes=COALESCE(notes,'') || ?
     WHERE id=?`,
    [req.user.id, notes ? `\n[Devolución] ${notes}` : '', req.params.id]
  );
  res.json({ message: 'Devolución registrada' });
}));

export default router;
