import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

const UPLOAD_DIR = process.env.VERCEL === '1' ? '/tmp/uploads' : (process.env.UPLOAD_DIR || './uploads');
const ATTACH_DIR = path.join(UPLOAD_DIR, 'attachments');
if (!fs.existsSync(ATTACH_DIR)) fs.mkdirSync(ATTACH_DIR, { recursive: true });

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
]);

// A08: Extension blacklist — reject executables/scripts regardless of MIME spoofing
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.dll', '.bat', '.cmd', '.sh', '.ps1', '.psm1', '.psd1',
  '.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh', '.msi', '.msp',
  '.com', '.scr', '.pif', '.hta', '.cpl', '.jar', '.py', '.rb',
  '.php', '.asp', '.aspx', '.jsp', '.cfm', '.cgi', '.pl', '.sql',
  '.svg', // SVG can contain embedded scripts
]);

// Sanitize filename: strip path traversal, keep only safe characters
function sanitizeFilename(name) {
  return path.basename(name).replace(/[^a-zA-Z0-9._\-\s]/g, '_').slice(0, 200);
}

const VALID_ENTITIES = new Set(['asset', 'loan', 'maintenance', 'personnel', 'supply']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ATTACH_DIR),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // A08: Check extension blacklist first (prevents MIME spoofing attacks)
    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) {
      return cb(new Error('Extensión de archivo no permitida'));
    }
    // Then validate MIME type whitelist
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Tipo de archivo no permitido'));
    }
    cb(null, true);
  },
});

// GET /api/attachments/:entity/:entityId
router.get('/:entity/:entityId', w(async (req, res) => {
  const { entity, entityId } = req.params;
  if (!VALID_ENTITIES.has(entity)) return res.status(400).json({ error: 'Entidad inválida' });

  const [rows] = await db.query(
    `SELECT id, file_name, file_size, mime_type, created_at, uploaded_by,
            u.name AS uploader_name
     FROM attachments a
     LEFT JOIN users u ON u.id = a.uploaded_by
     WHERE a.tenant_id = ? AND a.entity_type = ? AND a.entity_id = ?
     ORDER BY a.created_at DESC`,
    [req.user.tenant_id, entity, entityId]
  );
  res.json(rows);
}));

// POST /api/attachments/:entity/:entityId
router.post('/:entity/:entityId', (req, res, next) => {
  const { entity } = req.params;
  if (!VALID_ENTITIES.has(entity)) return res.status(400).json({ error: 'Entidad inválida' });
  upload.single('file')(req, res, next);
}, w(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });

  const { entity, entityId } = req.params;
  const relPath = path.join('attachments', req.file.filename);

  // A03/A08: Sanitize original filename before storing to prevent XSS via filename display
  const safeFilename = sanitizeFilename(req.file.originalname);

  const [rows] = await db.query(
    `INSERT INTO attachments (tenant_id, entity_type, entity_id, file_path, file_name, file_size, mime_type, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [
      req.user.tenant_id, entity, entityId,
      relPath, safeFilename,
      req.file.size, req.file.mimetype,
      req.user.id,
    ]
  );
  res.status(201).json({ id: rows[0].id, file_name: req.file.originalname });
}));

// DELETE /api/attachments/:id
router.delete('/:id', w(async (req, res) => {
  const [[row]] = await db.query(
    'SELECT file_path FROM attachments WHERE id = ? AND tenant_id = ?',
    [req.params.id, req.user.tenant_id]
  );
  if (!row) return res.status(404).json({ error: 'No encontrado' });

  const fullPath = path.join(UPLOAD_DIR, row.file_path);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

  await db.query('DELETE FROM attachments WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
  res.json({ message: 'Archivo eliminado' });
}));

export default router;
