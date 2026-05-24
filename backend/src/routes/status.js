import { Router } from 'express';

const router  = Router();
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

const OS_BASE   = 'https://api.openstatus.dev/v1';
const CACHE_TTL = 5 * 60 * 1000; // 5 min

let _cache   = null;
let _cacheAt = 0;

function toArray(val) {
  return Array.isArray(val) ? val : val?.data ?? [];
}

const STATUS_MAP = {
  operational: 'operational',
  active:      'operational',
  up:          'operational',
  degraded:    'degraded',
  warning:     'degraded',
  down:        'down',
  error:       'down',
  inactive:    'down',
  critical:    'down',
};

function normalizeStatus(raw) {
  return STATUS_MAP[String(raw).toLowerCase()] ?? 'unknown';
}

function deriveOverall(monitors) {
  const statuses = monitors.map(m => m.status);
  if (statuses.includes('down'))     return 'down';
  if (statuses.includes('degraded')) return 'degraded';
  if (statuses.includes('unknown'))  return 'unknown';
  return 'operational';
}

async function fetchStatus(apiKey) {
  const headers = { 'x-openstatus-key': apiKey };

  const [monRes, incRes] = await Promise.all([
    fetch(`${OS_BASE}/monitor`,       { headers }),
    fetch(`${OS_BASE}/status_report`, { headers }),
  ]);

  const monitors = toArray(monRes.ok ? await monRes.json() : [])
    .filter(m => m.active !== false)
    .map(m => ({
      id:          m.id,
      name:        m.name,
      url:         m.url,
      status:      normalizeStatus(m.status),
      uptime:      m.uptime ?? m.uptimeDay ?? null,
      description: m.description ?? null,
    }));

  const incidents = toArray(incRes.ok ? await incRes.json() : [])
    .filter(i => i.status !== 'resolved')
    .slice(0, 5)
    .map(i => ({
      id:         i.id,
      title:      i.title,
      status:     i.status,
      created_at: i.created_at,
      updated_at: i.updated_at,
      updates:    i.updates ?? [],
    }));

  return {
    overall:    deriveOverall(monitors),
    monitors,
    incidents,
    updated_at: new Date().toISOString(),
  };
}

// ── Public — no auth required ─────────────────────────────────────────────────
router.get('/', w(async (_req, res) => {
  const apiKey = process.env.OPENSTATUS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Status page no configurado' });
  }

  if (_cache && Date.now() - _cacheAt < CACHE_TTL) {
    return res.set('X-Cache', 'HIT').json(_cache);
  }

  try {
    _cache   = await fetchStatus(apiKey);
    _cacheAt = Date.now();
    res.set('X-Cache', 'MISS').json(_cache);
  } catch (err) {
    if (_cache) return res.set('X-Cache', 'STALE').json(_cache);
    throw err;
  }
}));

export default router;
