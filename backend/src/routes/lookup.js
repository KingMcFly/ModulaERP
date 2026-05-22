import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();
router.use(requireAuth);

// ── Manufacturer detection ────────────────────────────────────────────────────
// Order matters: specific prefixes first, broad patterns last.

function detectManufacturer(raw) {
  const u = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Pure numeric first (barcode / IMEI) — no letter ambiguity
  if (/^\d{15}$/.test(u)) return 'imei';
  if (/^\d{8}$/.test(u) || /^\d{12}$/.test(u) || /^\d{13}$/.test(u)) return 'barcode';

  // Cisco — specific 3-letter prefixes (must be before Apple broad check)
  if (/^(FTX|FOC|JAE|FCW|FHK|FDO|TTM)[A-Z0-9]+$/.test(u)) return 'cisco';

  // Juniper
  if (/^(JN|QF|SRX)[A-Z0-9]{6,}$/.test(u)) return 'juniper';

  // Samsung — specific prefixes
  if (/^(SER|SERE|R3T|SNE)[A-Z0-9]+$/.test(u)) return 'samsung';

  // Lenovo — prefix list (must be before HP CND/MX overlap)
  if (/^(PF|PG|PC|PB|PH|PU|PV|PW|MJ|R9|R8|R7|MP|MZ|MW|LR|LT|LC|LG|YM|YG|YB|LEN)[A-Z0-9]+$/.test(u)) return 'lenovo';

  // HP — many formats
  if (/^[A-Z]{3}\d{7}$/.test(u)) return 'hp';                              // CNU1234567
  if (/^(SGH|SGP|CNB|5CD|6CG|8CG)[A-Z0-9]+$/.test(u)) return 'hp';        // ProLiant/EliteBook
  if (/^(MY|MXL|CND|CNU)[A-Z0-9]{4,}$/.test(u)) return 'hp';              // Workstation/others

  // Toshiba / Dynabook
  if (/^(PT|PST|PAT)[A-Z0-9]{5,}$/.test(u)) return 'toshiba';

  // Fujitsu
  if (/^(YTL|YTO|YTN|GRP|GRH)[A-Z0-9]+$/.test(u)) return 'fujitsu';

  // MSI — gaming/professional prefixes + 2-digit model number
  if (/^(GF|GL|GS|GT|GE|GP|WS|PS)[0-9]{2}[A-Z0-9]+$/.test(u)) return 'msi';

  // ASUS
  if (/^[GKNXZBEF]\d[A-Z0-9]{7,}$/.test(u)) return 'asus';

  // Acer — starts with NX. (raw before stripping)
  if (/^NX[A-Z0-9]{4,}$/.test(u)) return 'acer';

  // Dell service tag: exactly 7 alphanumeric (after all prefix checks above)
  if (/^[A-Z0-9]{7}$/.test(u)) return 'dell';

  // Apple: known prefixes (C0x, F5x, W8x, G8x) + 11-12 total chars
  if (/^(C0[0-9]|F[45][A-Z0-9]|W[89][A-Z0-9]|G8[A-Z0-9]|Z0[A-Z0-9])[A-Z0-9]{7,9}$/.test(u) && u.length >= 11 && u.length <= 12) return 'apple';
  // Apple model-number prefixes (used for Part IDs like MVVJ, MK1, etc.)
  if (/^(MVVJ|MGND|MLXW|MQKM|MBP|MBA|MGTF|MGNT|MMFJ|MJMV)[A-Z0-9]+$/.test(u)) return 'apple';

  // MAC address (12 hex, must be after all alpha checks)
  if (/^[A-F0-9]{12}$/.test(u)) return 'network';

  // Generic: any alphanumeric 5-30 chars — try external lookup
  if (u.length >= 5 && u.length <= 30 && /^[A-Z0-9]+$/.test(u)) return 'generic';

  return 'unknown';
}

// ── Apple model map ───────────────────────────────────────────────────────────

const APPLE_MODELS = {
  MacBookPro: ['MBP', 'MVVJ', 'MVVL', 'MXK', 'MK1', 'MK2', 'MNW', 'MPHE', 'MRW', 'Z0V', 'Z0W', 'Z14Y', 'MX2'],
  MacBookAir: ['MBA', 'MGND', 'MGNE', 'Z124', 'MLXW', 'MLY', 'MQKM', 'MQK', 'MC5', 'MVM', 'MVH'],
  iMac:       ['MGTF', 'MHK', 'MK4', 'Z12Q', 'Z14B', 'MQR', 'MQRC'],
  MacMini:    ['MMFJ', 'Z12P', 'MGNT', 'MNE', 'MMFG', 'MYD', 'Z0ZR'],
  MacPro:     ['Z0YZ', 'Z0W3', 'MА253', 'Z15G'],
  MacStudio:  ['MJMV', 'MJMW', 'MQH7'],
  iPhone:     ['ME', 'MF', 'MG', 'MH', 'MJ', 'MKT', 'MLLP', 'MPQR', 'MQ3', 'MQAK', 'MU9'],
  iPad:       ['MPA', 'MPL', 'MQ0', 'MUQW', 'MQ3F', 'MXWF', 'MPVJ', 'MK2'],
  AppleWatch: ['MJ3', 'MKT', 'MLL', 'MNP', 'MTF'],
};

function guessAppleModel(serial) {
  const u = serial.toUpperCase();
  for (const [model, prefixes] of Object.entries(APPLE_MODELS)) {
    if (prefixes.some(p => u.startsWith(p))) return model;
  }
  const config = u.slice(8, 11);
  if (['F5L','F5K','F5N','F5F','F1C','F69'].includes(config)) return 'MacBook Pro';
  if (['F4M','F4N','F4P'].includes(config)) return 'MacBook Air';
  return null;
}

// ── Lenovo model map ──────────────────────────────────────────────────────────

const LENOVO_MODELS = {
  ThinkCentre:  ['PF', 'PG', 'PC', 'PB', 'PH'],
  ThinkPad:     ['MJ', 'R9', 'R8', 'R7', 'LEN', 'SB0', 'SB1'],
  ThinkStation: ['MP', 'MZ', 'MW'],
  ThinkBook:    ['PU', 'PV', 'PW'],
  Legion:       ['LR', 'LT', 'LC', 'LG'],
  IdeaPad:      ['S0', 'MP0', 'NX'],
  Yoga:         ['YM', 'YG', 'YB'],
};

function guessLenovoModel(serial) {
  const u = serial.toUpperCase();
  for (const [model, prefixes] of Object.entries(LENOVO_MODELS)) {
    if (prefixes.some(p => u.startsWith(p))) return model;
  }
  return null;
}

// ── HP product line from serial ───────────────────────────────────────────────

function guessHPModel(serial) {
  const u = serial.toUpperCase();
  if (u.startsWith('SGH') || u.startsWith('SGP')) return 'ProLiant Server';
  if (u.startsWith('CNB') || u.startsWith('5CD') || u.startsWith('6CG') || u.startsWith('8CG')) return 'EliteBook / ProBook';
  if (u.startsWith('MY') || u.startsWith('MX')) return 'Workstation';
  return null;
}

// ── Samsung product type from serial prefix ───────────────────────────────────

function guessSamsungType(serial) {
  const u = serial.toUpperCase();
  if (u.startsWith('SER') || u.startsWith('SERE')) return 'Monitor / Pantalla';
  if (u.startsWith('R3T')) return 'Smartphone / Tablet';
  return 'Dispositivo Samsung';
}

// ── UPC/EAN barcode lookup via UPC Item DB ────────────────────────────────────

async function lookupBarcode(code) {
  try {
    const r = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const item = data.items?.[0];
    if (!item) return null;
    return {
      brand:       item.brand        || null,
      model:       item.model        || item.title || null,
      description: item.description  || null,
      category:    item.category     || null,
    };
  } catch { return null; }
}

// ── Main GET / ────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 3) return res.status(400).json({ error: 'Ingresa al menos 3 caracteres' });

  try {
    // 1. Check existing asset in DB first (exact match)
    const [rows] = await db.query(
      `SELECT brand, model, asset_type, notes
         FROM assets
        WHERE tenant_id = ?
          AND LOWER(serial_number) = LOWER(?)
          AND is_active = true
        LIMIT 1`,
      [req.user.tenant_id, q]
    );

    if (rows.length > 0) {
      const a = rows[0];
      return res.json({
        serial:       q,
        manufacturer: 'db',
        brand:        a.brand      || null,
        model:        a.model      || null,
        asset_type:   a.asset_type || null,
        description:  a.notes      || null,
        confidence:   'high',
        source:       'base_de_datos',
      });
    }

    // 2. Pattern detection
    const mfr = detectManufacturer(q);
    const result = {
      serial:       q,
      manufacturer: mfr,
      brand:        null,
      model:        null,
      asset_type:   null,
      description:  null,
      confidence:   'low',
      source:       'patron',
    };

    switch (mfr) {
      case 'apple': {
        const appleModel = guessAppleModel(q);
        result.brand       = 'Apple';
        result.model       = appleModel;
        result.confidence  = appleModel ? 'high' : 'medium';
        result.asset_type  = !appleModel                                      ? 'Dispositivo Apple'
          : appleModel.toLowerCase().includes('iphone')                       ? 'Smartphone'
          : appleModel.toLowerCase().includes('ipad')                         ? 'Tablet'
          : appleModel.toLowerCase().includes('watch')                        ? 'Smartwatch'
          : appleModel.toLowerCase().includes('macbook')                      ? 'Laptop'
          : (appleModel.includes('iMac') || appleModel.includes('Mac Pro') || appleModel.includes('MacMini') || appleModel.includes('MacStudio')) ? 'Desktop'
          : 'Dispositivo Apple';
        result.support_url = `https://checkcoverage.apple.com/?sn=${q}`;
        break;
      }
      case 'dell':
        result.brand       = 'Dell';
        result.asset_type  = 'Computador';
        result.description = 'Marca detectada: Dell. Verifica el modelo exacto en el soporte de Dell.';
        result.confidence  = 'medium';
        result.support_url = `https://www.dell.com/support/home/es-mx/product-support/servicetag/${q}`;
        break;

      case 'hp': {
        const hpModel = guessHPModel(q);
        result.brand       = 'HP';
        result.model       = hpModel;
        result.asset_type  = hpModel?.includes('Server') ? 'Servidor' : 'Computador';
        result.description = 'Marca detectada: HP. Verifica el modelo exacto en el soporte de HP.';
        result.confidence  = 'medium';
        result.support_url = `https://support.hp.com/us-en/checkwarranty?serialnumber=${q}`;
        break;
      }
      case 'lenovo': {
        const lenovoSeries = guessLenovoModel(q);
        result.brand       = 'Lenovo';
        result.asset_type  = !lenovoSeries ? 'Computador'
          : lenovoSeries === 'Legion'        ? 'Laptop'
          : 'Computador';
        result.description = lenovoSeries
          ? `Serie ${lenovoSeries} detectada. Verifica el modelo exacto (ej. V14 G4, E14, T14) en soporte Lenovo.`
          : 'Marca Lenovo detectada. Ingresa el modelo manualmente o verifica en soporte Lenovo.';
        result.confidence  = lenovoSeries ? 'medium' : 'low';
        result.support_url = `https://pcsupport.lenovo.com/products/${q}`;
        break;
      }
      case 'samsung': {
        result.brand      = 'Samsung';
        result.asset_type = guessSamsungType(q);
        result.confidence  = 'medium';
        break;
      }
      case 'asus':
        result.brand      = 'ASUS';
        result.asset_type = 'Computador / Laptop';
        result.confidence  = 'medium';
        break;

      case 'acer':
        result.brand      = 'Acer';
        result.asset_type = 'Computador / Laptop';
        result.confidence  = 'medium';
        break;

      case 'msi':
        result.brand      = 'MSI';
        result.asset_type = 'Laptop / Desktop';
        result.confidence  = 'medium';
        break;

      case 'toshiba':
        result.brand      = 'Toshiba';
        result.asset_type = 'Laptop';
        result.confidence  = 'medium';
        break;

      case 'fujitsu':
        result.brand      = 'Fujitsu';
        result.asset_type = 'Computador';
        result.confidence  = 'medium';
        break;

      case 'cisco':
        result.brand      = 'Cisco';
        result.asset_type = 'Equipo de red';
        result.confidence  = 'medium';
        break;

      case 'juniper':
        result.brand      = 'Juniper';
        result.asset_type = 'Equipo de red';
        result.confidence  = 'medium';
        break;

      case 'network':
        result.asset_type = 'Equipo de red';
        result.description = `Dirección MAC: ${q}`;
        result.confidence  = 'low';
        break;

      case 'imei':
        result.asset_type = 'Smartphone / Tablet';
        result.description = `IMEI: ${q}`;
        result.confidence  = 'low';
        break;

      case 'barcode':
      case 'generic': {
        // Try external barcode DB for both EAN codes and generic serials
        const barcodeResult = await lookupBarcode(q);
        if (barcodeResult) {
          result.brand      = barcodeResult.brand       || null;
          result.model      = barcodeResult.model       || null;
          result.asset_type = barcodeResult.category    || null;
          result.description = barcodeResult.description || null;
          result.confidence  = 'high';
          result.source      = 'upcitemdb';
        }
        break;
      }
    }

    return res.json(result);
  } catch (err) {
    console.error('[lookup] error:', err);
    return res.status(500).json({ error: 'Error al consultar' });
  }
});

export default router;
