// ── Tickets ServiceDesk — domain logic ────────────────────────────────────────
import db from '../db.js';

// ── Roles ─────────────────────────────────────────────────────────────────────
export const SUPERVISOR_ROLES = ['super_admin', 'admin', 'manager'];
export const isSupervisor = (role) => SUPERVISOR_ROLES.includes(role);

// ── State machine ─────────────────────────────────────────────────────────────
export const STATUSES = [
  'new', 'open', 'assigned', 'in_progress', 'waiting_user', 'waiting_vendor',
  'escalated', 'resolved', 'closed', 'reopened', 'cancelled',
];
export const PAUSE_STATES   = ['waiting_user', 'waiting_vendor'];
export const OPEN_STATES    = ['new', 'open', 'assigned', 'in_progress', 'waiting_user', 'waiting_vendor', 'escalated', 'reopened'];
export const CLOSED_STATES  = ['resolved', 'closed', 'cancelled'];

export const LEVELS = ['n1', 'n2', 'n3'];
export const RESOLUTION_TYPES = [
  'resolved_permanent', 'resolved_temporary', 'forwarded_vendor',
  'not_applicable', 'duplicate', 'cancelled_by_user',
];

// ── Impact × Urgency → Priority matrix (configurable override allowed) ─────────
const PRIORITY_MATRIX = {
  low:      { low: 'low',    medium: 'low',    high: 'medium',   critical: 'high'     },
  medium:   { low: 'low',    medium: 'medium', high: 'high',     critical: 'high'     },
  high:     { low: 'medium', medium: 'high',   high: 'high',     critical: 'critical' },
  critical: { low: 'high',   medium: 'high',   high: 'critical', critical: 'critical' },
};
export function derivePriority(impact = 'low', urgency = 'low') {
  return PRIORITY_MATRIX[impact]?.[urgency] || 'medium';
}

// ── Default SLA targets (minutes) per priority ────────────────────────────────
export const DEFAULT_SLA = {
  critical: { first_response_mins: 15,  resolution_mins: 240  },  // 4h
  high:     { first_response_mins: 30,  resolution_mins: 480  },  // 8h
  medium:   { first_response_mins: 120, resolution_mins: 1440 },  // 24h
  low:      { first_response_mins: 240, resolution_mins: 4320 },  // 72h
};

// ── Default categories seeded per tenant ──────────────────────────────────────
const DEFAULT_CATEGORIES = [
  'Hardware', 'Software', 'Redes', 'Internet', 'Impresoras', 'Correo',
  'Usuarios y accesos', 'Sistemas internos', 'ERP', 'Seguridad', 'Telefonía',
  'Servidores', 'Base de datos', 'Solicitud de equipos', 'Mantención preventiva', 'Otros',
];

// Seed categories + SLA policies the first time a tenant uses the module.
export async function ensureTicketDefaults(tenantId) {
  const [[{ count: catCount }]] = await db.query(
    'SELECT COUNT(*)::int AS count FROM ticket_categories WHERE tenant_id = ?', [tenantId]
  );
  if (catCount === 0) {
    for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
      await db.query(
        'INSERT INTO ticket_categories (tenant_id, name, type, sort_order) VALUES (?, ?, ?, ?)',
        [tenantId, DEFAULT_CATEGORIES[i], 'both', i]
      );
    }
  }
  const [[{ count: slaCount }]] = await db.query(
    'SELECT COUNT(*)::int AS count FROM ticket_sla_policies WHERE tenant_id = ?', [tenantId]
  );
  if (slaCount === 0) {
    for (const [priority, t] of Object.entries(DEFAULT_SLA)) {
      await db.query(
        `INSERT INTO ticket_sla_policies (tenant_id, name, type, priority, first_response_mins, resolution_mins)
         VALUES (?, ?, 'both', ?, ?, ?)`,
        [tenantId, `SLA ${priority}`, priority, t.first_response_mins, t.resolution_mins]
      );
    }
  }
}

// ── Ticket number: INC-2026-00042 / REQ-2026-00007 (per tenant, per year) ──────
export async function genTicketNumber(tenantId, type) {
  const prefix = type === 'request' ? 'REQ' : 'INC';
  const year = new Date().getFullYear();
  const [[row]] = await db.query(
    `SELECT COUNT(*)::int + 1 AS n FROM tickets
     WHERE tenant_id = ? AND ticket_number LIKE ?`,
    [tenantId, `${prefix}-${year}-%`]
  );
  const seq = String(row?.n || 1).padStart(5, '0');
  return `${prefix}-${year}-${seq}`;
}

// ── SLA: resolve the policy + due dates for a ticket at creation ───────────────
export async function computeSla(tenantId, type, priority) {
  const [rows] = await db.query(
    `SELECT id, first_response_mins, resolution_mins FROM ticket_sla_policies
     WHERE tenant_id = ? AND priority = ? AND is_active = true
       AND (type = ? OR type = 'both')
     ORDER BY (type = ?) DESC LIMIT 1`,
    [tenantId, priority, type, type]
  );
  const p = rows[0] || { id: null, ...(DEFAULT_SLA[priority] || DEFAULT_SLA.medium) };
  const now = Date.now();
  return {
    sla_policy_id: p.id,
    first_response_due: new Date(now + p.first_response_mins * 60000),
    resolution_due:     new Date(now + p.resolution_mins * 60000),
  };
}

// ── Derived SLA status for a ticket row ───────────────────────────────────────
export function slaStatus(t) {
  if (CLOSED_STATES.includes(t.status)) return t.status === 'resolved' || t.status === 'closed' ? 'met' : null;
  if (PAUSE_STATES.includes(t.status)) return 'paused';
  if (!t.resolution_due) return 'on_track';
  const due = new Date(t.resolution_due).getTime();
  const now = Date.now();
  if (now > due) return 'breached';
  // due_soon when < 15% of the window remains (min 30 min)
  const created = new Date(t.created_at).getTime();
  const window = Math.max(due - created, 1);
  const threshold = Math.max(window * 0.15, 30 * 60000);
  if (due - now <= threshold) return 'due_soon';
  return 'on_track';
}

// Compute due-date adjustments when entering/leaving a pause state.
export function slaPauseTransition(ticket, newStatus) {
  const wasPaused = PAUSE_STATES.includes(ticket.status);
  const willPause = PAUSE_STATES.includes(newStatus);
  const out = {};
  if (!wasPaused && willPause) {
    out.sla_paused_at = new Date();
  } else if (wasPaused && !willPause && ticket.sla_paused_at) {
    const pausedMs = Date.now() - new Date(ticket.sla_paused_at).getTime();
    out.sla_paused_at = null;
    out.sla_paused_ms = Number(ticket.sla_paused_ms || 0) + pausedMs;
    // Push due dates forward by the paused duration if not yet met
    if (ticket.resolution_due && !ticket.first_response_at) {
      // no first response yet → push both
      out.first_response_due = ticket.first_response_due ? new Date(new Date(ticket.first_response_due).getTime() + pausedMs) : null;
    }
    if (ticket.resolution_due) {
      out.resolution_due = new Date(new Date(ticket.resolution_due).getTime() + pausedMs);
    }
  }
  return out;
}

// ── History logging ───────────────────────────────────────────────────────────
export async function logHistory(executor, { tenant_id, ticket_id, actor_id, action, field = null, old_value = null, new_value = null, note = null }) {
  const q = executor || db;
  await q.query(
    `INSERT INTO ticket_history (tenant_id, ticket_id, actor_id, action, field, old_value, new_value, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenant_id, ticket_id, actor_id, action, field,
     old_value == null ? null : String(old_value),
     new_value == null ? null : String(new_value), note]
  ).catch(err => console.error('[TICKET_HISTORY_ERROR]', err.message));
}

// ── Support level of a user (n1/n2/n3); supervisors are treated as all-levels ──
export async function getUserLevel(tenantId, userId) {
  const [[row]] = await db.query(
    'SELECT level FROM support_team_members WHERE tenant_id = ? AND user_id = ?',
    [tenantId, userId]
  );
  return row?.level || null;
}
