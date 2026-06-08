import React, { useEffect, useState, useCallback } from 'react';
import { Plus, CheckCircle, XCircle, Clock, ClipboardList, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
function authFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('token');
  return fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers||{}) } });
}
const isDark = () => document.documentElement.classList.contains('dark');
const cardStyle = { background: 'var(--ds-card)', border: '1px solid var(--ds-border)' };

interface Request { id: number; request_type: string; title: string; description: string; status: string; priority: string; requester_name: string; requested_at: string; rejection_reason?: string; }

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: 'Pendiente',  bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B' },
  approved:  { label: 'Aprobada',   bg: 'rgba(16,185,129,0.12)',  color: '#10B981' },
  rejected:  { label: 'Rechazada',  bg: 'rgba(239,68,68,0.12)',   color: '#EF4444' },
  completed: { label: 'Completada', bg: 'rgba(59,130,246,0.12)',  color: '#3B82F6' },
  cancelled: { label: 'Cancelada',  bg: 'var(--ds-card-alt)',     color: 'var(--ds-text-subtle)' },
};

const PRIORITY_CFG: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente' };
const PRIORITY_COLORS: Record<string, string> = { low: 'var(--ds-text-subtle)', medium: 'var(--ds-text-muted)', high: '#F97316', urgent: '#EF4444' };
const TYPE_LABELS: Record<string, string> = { loan: 'Préstamo', supply: 'Insumo', maintenance: 'Mantención', purchase: 'Compra', other: 'Otro' };

function NewRequestModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [f, setF] = useState({ request_type: 'loan', title: '', description: '', priority: 'medium', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const r = await authFetch('/requests', { method: 'POST', body: JSON.stringify(f) });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      toast.success('Solicitud creada'); onCreated(); onClose();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xl flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="rounded-t-3xl sm:rounded-3xl shadow-soft-xl w-full sm:max-w-md p-5 sm:p-6 max-h-[92dvh] overflow-y-auto scroll-touch" style={{ ...cardStyle, paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <div className="sheet-handle" />
        <h2 className="text-lg font-semibold mb-5" style={{ color: 'var(--ds-text)' }}>Nueva Solicitud</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label htmlFor="req-type" className="label">Tipo</label>
              <select id="req-type" className="input" value={f.request_type} onChange={e => set('request_type', e.target.value)}>
                {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
            <div><label htmlFor="req-priority" className="label">Prioridad</label>
              <select id="req-priority" className="input" value={f.priority} onChange={e => set('priority', e.target.value)}>
                {Object.entries(PRIORITY_CFG).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
          </div>
          <div><label htmlFor="req-title" className="label">Título *</label><input id="req-title" className="input" value={f.title} onChange={e => set('title', e.target.value)} required /></div>
          <div><label htmlFor="req-desc" className="label">Descripción</label><textarea id="req-desc" className="input resize-none" rows={3} value={f.description} onChange={e => set('description', e.target.value)} /></div>
          <div><label htmlFor="req-notes" className="label">Notas adicionales</label><input id="req-notes" className="input" value={f.notes} onChange={e => set('notes', e.target.value)} /></div>
          <div className="flex gap-3 pt-1"><button type="button" onClick={onClose} className="flex-1 btn btn-ghost">Cancelar</button><button type="submit" disabled={saving} className="flex-1 btn btn-primary">{saving ? 'Enviando…' : 'Enviar Solicitud'}</button></div>
        </form>
      </div>
    </div>
  );
}

export default function RequestsModule() {
  const { user, canWrite } = useAuth();
  const [items, setItems] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const canApprove = ['admin','manager','super_admin'].includes(user?.role || '');

  const load = useCallback(() => {
    const p = statusFilter ? `?status=${statusFilter}` : '';
    authFetch(`/requests${p}`).then(r => r.json()).then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); });
  }, [statusFilter]);
  useEffect(() => { load(); }, [load]);

  async function approve(id: number) {
    await authFetch(`/requests/${id}/approve`, { method: 'PATCH', body: JSON.stringify({}) });
    toast.success('Solicitud aprobada'); load();
  }
  async function reject(id: number) {
    const reason = prompt('Motivo del rechazo (requerido):');
    if (!reason?.trim()) return;
    await authFetch(`/requests/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ rejection_reason: reason }) });
    toast.success('Solicitud rechazada'); load();
  }

  const pending = items.filter(i => i.status === 'pending').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ds-text)' }}>Solicitudes</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>Solicitudes internas y flujos de aprobación</p>
        </div>
        {canWrite('requests') && <button type="button" onClick={() => setShowModal(true)} className="btn btn-primary"><Plus size={16} /> Nueva Solicitud</button>}
      </div>

      {canApprove && pending > 0 && (
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <Clock size={18} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm font-medium" style={{ color: '#F59E0B' }}>{pending} solicitud{pending > 1 ? 'es' : ''} pendiente{pending > 1 ? 's' : ''} de aprobación</p>
        </div>
      )}

      <div className="rounded-2xl p-4 shadow-soft flex gap-3 items-center" style={cardStyle}>
        <Filter size={15} style={{ color: 'var(--ds-text-subtle)' }} />
        <select className="input flex-1 max-w-xs" value={statusFilter} onChange={e => setStatus(e.target.value)}>
          <option value="">Todas</option>
          {Object.entries(STATUS_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* ── MOBILE / TABLET: cards ─────────────────────────────────────── */}
      <div className="lg:hidden space-y-2.5">
        {loading ? (
          <div className="rounded-2xl p-8 text-center text-sm shadow-soft" style={{ ...cardStyle, color: 'var(--ds-text-muted)' }}>Cargando…</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl p-10 text-center shadow-soft" style={{ ...cardStyle, color: 'var(--ds-text-muted)' }}>
            <ClipboardList size={30} className="mx-auto mb-2" style={{ color: 'var(--ds-border-strong)' }} />
            <p className="text-sm">Sin solicitudes</p>
          </div>
        ) : items.map(item => {
          const sc = STATUS_CFG[item.status] || STATUS_CFG.pending;
          return (
            <div key={item.id} className="rounded-2xl p-4 shadow-soft" style={cardStyle}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold" style={{ color: 'var(--ds-text)' }}>{item.title}</p>
                  {item.description && <p className="text-xs mt-0.5" style={{ color: 'var(--ds-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</p>}
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 text-[12.5px]" style={{ color: 'var(--ds-text-muted)' }}>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md font-medium" style={{ background: 'var(--ds-card-alt)' }}>{TYPE_LABELS[item.request_type] || item.request_type}</span>
                <span className="font-semibold inline-flex items-center gap-1" style={{ color: PRIORITY_COLORS[item.priority] }}>● {PRIORITY_CFG[item.priority]}</span>
                <span>{item.requester_name || '—'}</span>
                <span>{new Date(item.requested_at).toLocaleDateString('es-CL')}</span>
              </div>
              {canApprove && item.status === 'pending' && (
                <div className="flex gap-2 mt-3.5 pt-3.5" style={{ borderTop: '1px solid var(--ds-border)' }}>
                  <button type="button" onClick={() => approve(item.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold text-emerald-600 tap-scale" style={{ background: 'rgba(16,185,129,0.10)' }}>
                    <CheckCircle size={15} /> Aprobar
                  </button>
                  <button type="button" onClick={() => reject(item.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold text-red-500 tap-scale" style={{ background: 'rgba(239,68,68,0.08)' }}>
                    <XCircle size={15} /> Rechazar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── DESKTOP: table ─────────────────────────────────────────────── */}
      <div className="hidden lg:block rounded-2xl overflow-hidden shadow-soft" style={cardStyle}>
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--ds-card-alt)', borderBottom: '1px solid var(--ds-border)' }}>
              {['Solicitud','Tipo','Prioridad','Solicitante','Fecha','Estado',''].map(h => (
                <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3" style={{ color: 'var(--ds-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12" style={{ color: 'var(--ds-text-muted)' }}>Cargando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center">
                <ClipboardList size={32} className="mx-auto mb-2" style={{ color: 'var(--ds-border)' }} />
                <p className="text-sm" style={{ color: 'var(--ds-text-muted)' }}>Sin solicitudes</p>
              </td></tr>
            ) : items.map((item, i) => {
              const sc = STATUS_CFG[item.status] || STATUS_CFG.pending;
              return (
                <tr key={item.id}
                  style={{ borderTop: i > 0 ? '1px solid var(--ds-border)' : 'none', transition: 'background 120ms' }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = isDark() ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}
                >
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-medium" style={{ color: 'var(--ds-text)' }}>{item.title}</p>
                    {item.description && <p className="text-xs truncate max-w-[200px]" style={{ color: 'var(--ds-text-subtle)' }}>{item.description}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-sm" style={{ color: 'var(--ds-text-muted)' }}>{TYPE_LABELS[item.request_type] || item.request_type}</td>
                  <td className="px-4 py-3.5 text-xs font-semibold" style={{ color: PRIORITY_COLORS[item.priority] }}>{PRIORITY_CFG[item.priority]}</td>
                  <td className="px-4 py-3.5 text-sm" style={{ color: 'var(--ds-text)' }}>{item.requester_name || '—'}</td>
                  <td className="px-4 py-3.5 text-sm" style={{ color: 'var(--ds-text-muted)' }}>{new Date(item.requested_at).toLocaleDateString('es-CL')}</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    {canApprove && item.status === 'pending' && (
                      <div className="flex gap-1">
                        <button type="button" onClick={() => approve(item.id)} className="p-1.5 rounded-lg transition-colors hover:text-emerald-600" style={{ color: 'var(--ds-text-subtle)' }} aria-label="Aprobar"><CheckCircle size={16} /></button>
                        <button type="button" onClick={() => reject(item.id)} className="p-1.5 rounded-lg transition-colors hover:text-red-600" style={{ color: 'var(--ds-text-subtle)' }} aria-label="Rechazar"><XCircle size={16} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
      {showModal && <NewRequestModal onClose={() => setShowModal(false)} onCreated={load} />}
    </div>
  );
}
