import {
  AlertCircle, ClipboardList, Circle, CircleDot, UserCheck, Loader2,
  PauseCircle, ArrowUpCircle, CheckCircle2, XCircle, RotateCcw, Ban,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export function authFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('token');
  return fetch(`${API}/tickets${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) },
  });
}
export async function api<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const r = await authFetch(path, opts);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Error');
  return d as T;
}
// Absolute API call (other modules, e.g. /assets for linking equipment)
export async function apiAbs<T = any>(path: string): Promise<T> {
  const token = localStorage.getItem('token');
  const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Error');
  return d as T;
}

// ── Attachments (multipart upload + authenticated blob download) ──────────────
export async function uploadAttachment(ticketId: number | string, file: File) {
  const token = localStorage.getItem('token');
  const fd = new FormData();
  fd.append('file', file);
  const r = await fetch(`${API}/tickets/${ticketId}/attachments`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Error al subir el archivo');
  return d;
}
export async function openAttachment(ticketId: number | string, attId: number) {
  const token = localStorage.getItem('token');
  const r = await fetch(`${API}/tickets/${ticketId}/attachments/${attId}/download`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error('No se pudo abrir el archivo');
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export function fmtBytes(n?: number) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

export const cardStyle = { background: 'var(--ds-card)', border: '1px solid var(--ds-border)' };

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Ticket {
  id: number; ticket_number: string; type: 'incident' | 'request';
  title: string; description: string;
  status: string; priority: string; impact: string; urgency: string; level: string;
  category_id: number | null; category_name?: string; category_color?: string;
  subcategory_id: number | null; subcategory_name?: string;
  channel: string;
  asset_id?: number | null; asset_type?: string; brand?: string; model?: string; serial_number?: string;
  reported_by: number; reporter_name?: string; reporter_email?: string;
  assigned_to: number | null; assignee_name?: string;
  created_at: string; updated_at: string;
  first_response_due: string | null; resolution_due: string | null;
  first_response_at: string | null; resolved_at: string | null; closed_at: string | null;
  resolution_type: string | null; resolution_note: string | null;
  reopened_count: number;
  sla_status: 'on_track' | 'due_soon' | 'breached' | 'paused' | 'met' | null;
}
export interface Comment { id: number; user_id: number; author: string; comment: string; is_internal: boolean; created_at: string; }
export interface HistoryItem { id: number; actor_name: string; action: string; field: string | null; old_value: string | null; new_value: string | null; note: string | null; created_at: string; }
export interface Escalation { id: number; from_level: string; to_level: string; from_name: string; to_name: string; reason: string; created_at: string; }
export interface Rating { score: number; comment: string | null; created_at: string; }
export interface TicketDetail extends Ticket { comments: Comment[]; history: HistoryItem[]; escalations: Escalation[]; attachments: any[]; rating: Rating | null; }

// ── Config maps ───────────────────────────────────────────────────────────────
export const STATUS_CFG: Record<string, { label: string; bg: string; color: string; icon: any }> = {
  new:            { label: 'Nuevo',            bg: 'rgba(99,102,241,0.12)', color: '#6366F1', icon: Circle },
  open:           { label: 'Abierto',          bg: 'rgba(59,130,246,0.12)', color: '#3B82F6', icon: CircleDot },
  assigned:       { label: 'Asignado',         bg: 'rgba(14,165,233,0.12)', color: '#0EA5E9', icon: UserCheck },
  in_progress:    { label: 'En progreso',      bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', icon: Loader2 },
  waiting_user:   { label: 'Espera usuario',   bg: 'rgba(168,85,247,0.12)', color: '#A855F7', icon: PauseCircle },
  waiting_vendor: { label: 'Espera proveedor', bg: 'rgba(217,119,6,0.12)',  color: '#D97706', icon: PauseCircle },
  escalated:      { label: 'Escalado',         bg: 'rgba(139,92,246,0.12)', color: '#8B5CF6', icon: ArrowUpCircle },
  resolved:       { label: 'Resuelto',         bg: 'rgba(16,185,129,0.12)', color: '#10B981', icon: CheckCircle2 },
  closed:         { label: 'Cerrado',          bg: 'var(--ds-card-alt)',    color: 'var(--ds-text-subtle)', icon: XCircle },
  reopened:       { label: 'Reabierto',        bg: 'rgba(249,115,22,0.12)', color: '#F97316', icon: RotateCcw },
  cancelled:      { label: 'Cancelado',        bg: 'var(--ds-card-alt)',    color: 'var(--ds-text-subtle)', icon: Ban },
};

export const PRIORITY_CFG: Record<string, { label: string; color: string; bg: string }> = {
  low:      { label: 'Baja',    color: 'var(--ds-text-muted)', bg: 'var(--ds-card-alt)' },
  medium:   { label: 'Media',   color: '#3B82F6', bg: 'rgba(59,130,246,0.10)' },
  high:     { label: 'Alta',    color: '#F97316', bg: 'rgba(249,115,22,0.10)' },
  critical: { label: 'Crítica', color: '#EF4444', bg: 'rgba(239,68,68,0.10)' },
};

export const LEVEL_CFG: Record<string, { label: string; color: string; bg: string }> = {
  n1: { label: 'N1', color: '#0EA5E9', bg: 'rgba(14,165,233,0.12)' },
  n2: { label: 'N2', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  n3: { label: 'N3', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
};

export const TYPE_CFG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  incident: { label: 'Incidencia', color: '#EF4444', bg: 'rgba(239,68,68,0.10)', icon: AlertCircle },
  request:  { label: 'Solicitud',  color: '#3B82F6', bg: 'rgba(59,130,246,0.10)', icon: ClipboardList },
};

export const SLA_CFG: Record<string, { label: string; color: string; bg: string }> = {
  on_track: { label: 'En plazo',       color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  due_soon: { label: 'Por vencer',     color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  breached: { label: 'Vencido',        color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  paused:   { label: 'SLA en pausa',   color: 'var(--ds-text-muted)', bg: 'var(--ds-card-alt)' },
  met:      { label: 'SLA cumplido',   color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
};

export const IMPACT_OPTS  = [['low','Bajo'],['medium','Medio'],['high','Alto'],['critical','Crítico']] as const;
export const URGENCY_OPTS = [['low','Baja'],['medium','Media'],['high','Alta'],['critical','Crítica']] as const;
export const CHANNEL_OPTS = [['web','Web'],['email','Correo'],['whatsapp','WhatsApp'],['phone','Teléfono'],['manual','Manual']] as const;

export const RESOLUTION_TYPES: Record<string, string> = {
  resolved_permanent: 'Resuelto definitivamente',
  resolved_temporary: 'Resuelto temporalmente',
  forwarded_vendor:   'Derivado a proveedor',
  not_applicable:     'No corresponde',
  duplicate:          'Duplicado',
  cancelled_by_user:  'Cancelado por usuario',
};

// ── Small badge components ────────────────────────────────────────────────────
function Pill({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap" style={{ background: bg, color }}>
      {children}
    </span>
  );
}
export function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || STATUS_CFG.new; const Icon = c.icon;
  return <Pill bg={c.bg} color={c.color}><Icon size={11} className={status === 'in_progress' ? 'animate-spin' : ''} /> {c.label}</Pill>;
}
export function PriorityBadge({ priority }: { priority: string }) {
  const c = PRIORITY_CFG[priority] || PRIORITY_CFG.medium;
  return <Pill bg={c.bg} color={c.color}>{c.label}</Pill>;
}
export function LevelBadge({ level }: { level: string }) {
  const c = LEVEL_CFG[level] || LEVEL_CFG.n1;
  return <Pill bg={c.bg} color={c.color}>{c.label}</Pill>;
}
export function TypeBadge({ type }: { type: string }) {
  const c = TYPE_CFG[type] || TYPE_CFG.incident; const Icon = c.icon;
  return <Pill bg={c.bg} color={c.color}><Icon size={11} /> {c.label}</Pill>;
}
export function SlaBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const c = SLA_CFG[status]; if (!c) return null;
  return <Pill bg={c.bg} color={c.color}>{c.label}</Pill>;
}

// ── Time helpers ──────────────────────────────────────────────────────────────
export function fmtDateTime(d?: string | null) {
  return d ? new Date(d).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
}
export function fmtDate(d?: string | null) {
  return d ? new Date(d).toLocaleDateString('es-CL') : '—';
}
export function timeAgo(d?: string | null) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'recién';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}
export function dueLabel(due?: string | null) {
  if (!due) return null;
  const diff = new Date(due).getTime() - Date.now();
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 3600000), m = Math.floor((abs % 3600000) / 60000);
  const txt = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return diff < 0 ? `vencido hace ${txt}` : `vence en ${txt}`;
}
