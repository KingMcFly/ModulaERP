import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();
router.use(requireAuth);

// ── Manufacturer detection from serial/barcode pattern ───────────────────────

function detectManufacturer(s) {
  const u = s.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Apple: 11–12 alphanumeric, various prefixes
  if (/^[A-Z]{1,3}[0-9]{2}[A-Z0-9]{6,8}$/.test(u) && u.length >= 11 && u.length <= 12) {
    return 'apple';
  }
  // Dell service tag: exactly 7 alphanumeric
  if (/^[A-Z0-9]{7}$/.test(u)) return 'dell';
  // HP serial: 10 chars starting with letters
  if (/^[A-Z]{3}\d{7}$/.test(u)) return 'hp';
  // Lenovo serial: starts with PF, MJ, R9, etc.
  if (/^(PF|MJ|R9|MP|LR|S0)[A-Z0-9]+$/.test(u)) return 'lenovo';
  // EAN-13 / UPC-A / EAN-8 (pure numeric)
  if (/^\d{8}$/.test(u) || /^\d{12}$/.test(u) || /^\d{13}$/.test(u)) return 'barcode';
  // Cisco: starts with FTX, FOC, JAE
  if (/^(FTX|FOC|JAE|FCW)[A-Z0-9]+$/.test(u)) return 'cisco';
  // Network (generic Mikrotik, TP-Link, etc.) — MAC address style
  if (/^[A-F0-9]{12}$/.test(u)) return 'network';

  return 'unknown';
}

// ── Apple model lookup (serial → device name) ────────────────────────────────

const APPLE_MODEL_MAP = {
  // MacBook Pro
  MacBookPro: ['MBP', 'Z0V', 'Z0W', 'MVVJ', 'MVVL', 'MXK', 'MK1', 'MK2', 'MNW', 'MPHE', 'MRW'],
  // MacBook Air
  MacBookAir:  ['MBA', 'MGND', 'MGNE', 'Z124', 'MLXW', 'MLY', 'MQKM', 'MQK'],
  // iMac
  iMac:        ['MGTF', 'MHK', 'MK4', 'Z12Q', 'Z14B'],
  // Mac mini
  MacMini:     ['MMFJ', 'Z12P', 'MGNT', 'MNE'],
  // Mac Pro
  MacPro:      ['Z0YZ', 'Z0W3', 'MА253'],
  // iPhone
  iPhone:      ['ME', 'MF', 'MG', 'MH', 'MJ', 'MK', 'ML', 'MM', 'MN', 'MP'],
  // iPad
  iPad:        ['MPA', 'MPL', 'MQ0', 'MUQW', 'MQ3', 'MXWF'],
};

function guessAppleModel(serial) {
  const upper = serial.toUpperCase();
  for (const [model, prefixes] of Object.entries(APPLE_MODEL_MAP)) {
    if (prefixes.some(p => upper.startsWith(p))) return model;
  }
  // Chars 9-11 in old-format serials encode device type
  const config = upper.slice(8, 11);
  if (['F5L','F5K','F5N','F5F','F1C','F69'].includes(config)) return 'MacBook Pro';
  if (['F4M','F4N','F4P'].includes(config)) return 'MacBook Air';
  return null;
}

// ── Lenovo model lookup (serial prefix → product line) ───────────────────────

const LENOVO_MODEL_MAP = {
  ThinkCentre: ['PF', 'PG', 'PC', 'PB', 'PH'],
  ThinkPad:    ['MJ', 'R9', 'R8', 'R7', 'LEN'],
  ThinkStation: ['MP', 'MZ', 'MW'],
  ThinkBook:   ['PU', 'PV', 'PW'],
  Legion:      ['LR', 'LT', 'LC', 'LG'],
  IdeaPad:     ['S0', 'MP0', 'NX'],
  Yoga:        ['YM', 'YG', 'YB'],
};

function guessLenovoModel(serial) {
  const upper = serial.toUpperCase();
  for (const [model, prefixes] of Object.entries(LENOVO_MODEL_MAP)) {
    if (prefixes.some(p => upper.startsWith(p))) return model;
  }
  return null;
}

// ── UPC/EAN lookup via UPC Item DB ───────────────────────────────────────────

async function lookupBarcode(code) {
  try {
    const r = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const item = data.items?.[0];
    if (!item) return null;
    return {
      brand:       item.brand  || null,
      model:       item.model  || item.title || null,
      description: item.description || null,
      category:    item.category || null,
      image_url:   item.images?.[0] || null,
    };
  } catch { return null; }
}

// ── Main lookup endpoint ─────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 3) return res.status(400).json({ error: 'Ingresa al menos 3 caracteres' });

  // Check existing asset in database first
  const [rows] = await db.query(
    'SELECT brand, model, asset_type, notes FROM assets WHERE tenant_id = ? AND serial_number = ? AND is_active = true LIMIT 1',
    [req.user.tenant_id, q]
  );
  if (rows.length > 0) {
    const a = rows[0];
    return res.json({
      serial: q,
      manufacturer: 'db',
      brand: a.brand || null,
      model: a.model || null,
      asset_type: a.asset_type || null,
      description: a.notes || null,
      confidence: 'high',
    });
  }

  const mfr = detectManufacturer(q);
  let result = { serial: q, manufacturer: mfr, brand: null, model: null, asset_type: null, description: null, confidence: 'low' };

  if (mfr === 'apple') {
    const model = guessAppleModel(q);
    result.brand = 'Apple';
    result.model = model;
    result.confidence = model ? 'high' : 'medium';
    result.asset_type = model?.toLowerCase().includes('iphone') ? 'Smartphone'
      : model?.toLowerCase().includes('ipad') ? 'Tablet'
      : model?.toLowerCase().includes('mac') ? 'Laptop/Desktop'
      : 'Apple Device';
  } else if (mfr === 'dell') {
    result.brand = 'Dell';
    result.description = `Serial/Service Tag Dell: ${q}`;
    result.confidence = 'medium';
    result.asset_type = 'Computador';
  } else if (mfr === 'hp') {
    result.brand = 'HP';
    result.confidence = 'medium';
    result.asset_type = 'Computador';
  } else if (mfr === 'lenovo') {
    const model = guessLenovoModel(q);
    result.brand = 'Lenovo';
    result.model = model;
    result.confidence = 'medium';
    result.asset_type = model === 'Legion' ? 'Laptop' : 'Computador';
  } else if (mfr === 'cisco') {
    result.brand = 'Cisco';
    result.confidence = 'medium';
    result.asset_type = 'Equipo de red';
  } else if (mfr === 'barcode') {
    const barcodeResult = await lookupBarcode(q);
    if (barcodeResult) {
      result = { ...result, ...barcodeResult, confidence: 'high' };
    }
  }

  res.json(result);
});

export default router;
