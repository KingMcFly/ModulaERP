import { Router } from 'express';

const router  = Router();
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

const OS_BASE   = 'https://api.openstatus.dev/v1';
const CACHE_TTL = 5 * 60 * 1000; // 5 min

let _cache   = null;
let _cacheAt = 0;

// Derive current status from today's summary row ({ count, ok })
function statusFromSummary(days) {
  const today = days?.[0];
  if (!today || today.count === 0) return 'unknown';
  if (today.ok === today.count)    return 'operational';
  if (today.ok === 0)              return 'down';
  return 'degraded';
}

// 30-day uptime percentage from summary array
function uptimeFromSummary(days) {
  const total = days.reduce((s, d) => s + d.count, 0);
  const ok    = days.reduce((s, d) => s + d.ok,    0);
  if (total === 0) return null;
  return Math.round((ok / total) * 10000) / 100; // e.g. 99.95
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

  // Fetch monitor list and status reports in parallel
  const [monRes, incRes] = await Promise.all([
    fetch(`${OS_BASE}/monitor`,       { headers }),
    fetch(`${OS_BASE}/status_report`, { headers }),
  ]);

  const monitorList = monRes.ok ? await monRes.json() : [];
  const active      = (Array.isArray(monitorList) ? monitorList : [])
    .filter(m => m.active !== false);

  // Fetch summary for each active monitor (derives real-time status)
  const monitorsWithStatus = await Promise.all(
    active.map(async m => {
      try {
        const r    = await fetch(`${OS_BASE}/monitor/${m.id}/summary`, { headers });
        const body = r.ok ? await r.json() : {};
        const days = body.data ?? [];
        return {
          id:          m.id,
          name:        m.name,
          url:         m.url,
          description: m.description || null,
          status:      statusFromSummary(days),
          uptime:      uptimeFromSummary(days),
        };
      } catch {
        return { id: m.id, name: m.name, url: m.url, description: null, status: 'unknown', uptime: null };
      }
    })
  );

  const incidentList = incRes.ok ? await incRes.json() : [];
  const incidents = (Array.isArray(incidentList) ? incidentList : [])
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
    overall:    deriveOverall(monitorsWithStatus),
    monitors:   monitorsWithStatus,
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
