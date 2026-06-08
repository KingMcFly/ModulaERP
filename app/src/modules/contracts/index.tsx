import React, { useEffect, useState, useCallback } from 'react';
import { Plus, FileCheck, AlertTriangle, Edit2, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const CLP_FMT = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
function fmtMoney(n?: number) { return n ? CLP_FMT.format(n) : '—'; }
function authFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('token');
  return fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers||{}) } });
}
const isDark = () => document.documentElement.classList.contains('dark');
const cardStyle = { background: 'var(--ds-card)', border: '1px solid var(--ds-border)' };

interface Contract { id: number; title: string; contract_number: string; contract_type: string; provider_name: string; start_date: string; end_date: string; value: number; status: string; days_remaining: number; alert_days: number; description: string; }

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  active:    { label: 'Activo',    bg: 'rgba(16,185,129,0.12)',  color: '#10B981' },
  expired:   { label: 'Vencido',   bg: 'rgba(239,68,68,0.12)',   color: '#EF4444' },
  pending:   { label: 'Pendiente', bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B' },
  cancelled: { label: 'Cancelado', bg: 'var(--ds-card-alt)',     color: 'var(--ds-text-subtle)' },
};

function fmt(d?: string) { return d ? new Date(d).toLocaleDateString('es-CL') : '—'; }

function ContractForm({ item, onClose, onSaved }: { item?: Contract|null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    title: item?.title||'', contract_number: item?.contract_number||'', contract_type: item?.contract_type||'',
    start_date: item?.start_date?.split('T')[0]||'', end_date: item?.end_date?.split('T')[0]||'',
    value: item?.value?.toString()||'', alert_days: item?.alert_days?.toString()||'30',
    description: item?.description||'', status: item?.status||'active',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const r = await authFetch(item ? `/contracts/${item.id}` : '/contracts', { method: item ? 'PUT' : 'POST', body: JSON.stringify(f) });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      toast.success(item ? 'Contrato actualizado' : 'Contrato creado'); onSaved(); onClose();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xl flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="rounded-t-3xl sm:rounded-3xl shadow-soft-xl w-full sm:max-w-lg p-5 sm:p-6 max-h-[92dvh] overflow-y-auto scroll-touch" style={{ ...cardStyle, paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <div className="sheet-handle" />
        <h2 className="text-lg font-semibold mb-5" style={{ color: 'var(--ds-text)' }}>{item ? 'Editar Contrato' : 'Nuevo Contrato'}</h2>
        <form onSubmit={submit} className="space-y-4">
          <div><label htmlFor="cont-title" className="label">Título *</label><input id="cont-title" className="input" value={f.title} onChange={e => set('title', e.target.value)} required /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label htmlFor="cont-num" className="label">N° Contrato</label><input id="cont-num" className="input" value={f.contract_number} onChange={e => set('contract_number', e.target.value)} /></div>
            <div><label htmlFor="cont-type" className="label">Tipo</label><input id="cont-type" className="input" value={f.contract_type} onChange={e => set('contract_type', e.target.value)} placeholder="Servicio, Licencia…" /></div>
            <div><label htmlFor="cont-start" className="label">Inicio</label><input id="cont-start" className="input" type="date" value={f.start_date} onChange={e => set('start_date', e.target.value)} /></div>
            <div><label htmlFor="cont-end" className="label">Vencimiento</label><input id="cont-end" className="input" type="date" value={f.end_date} onChange={e => set('end_date', e.target.value)} /></div>
            <div><label htmlFor="cont-value" className="label">Valor ($)</label><input id="cont-value" className="input" type="number" value={f.value} onChange={e => set('value', e.target.value)} /></div>
            <div><label htmlFor="cont-alert" className="label">Alerta (días antes)</label><input id="cont-alert" className="input" type="number" min="1" value={f.alert_days} onChange={e => set('alert_days', e.target.value)} /></div>
            {item && <div className="col-span-2"><label htmlFor="cont-status" className="label">Estado</label><select id="cont-status" className="input" value={f.status} onChange={e => set('status', e.target.value)}>{Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>}
          </div>
          <div><label htmlFor="cont-desc" className="label">Descripción</label><textarea id="cont-desc" className="input resize-none" rows={2} value={f.description} onChange={e => set('description', e.target.value)} /></div>
          <div className="flex gap-3 pt-1"><button type="button" onClick={onClose} className="flex-1 btn btn-ghost">Cancelar</button><button type="submit" disabled={saving} className="flex-1 btn btn-primary">{saving ? 'Guardando…' : 'Guardar'}</button></div>
        </form>
      </div>
    </div>
  );
}

export default function ContractsModule() {
  const { canWrite, canDelete } = useAuth();
  const [items, setItems] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Contract|null|undefined>(undefined);

  const load = useCallback(() => {
    authFetch('/contracts').then(r => r.json()).then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);
  useEffect(() => { load(); }, [load]);

  async function del(id: number) {
    if (!confirm('¿Cancelar este contrato?')) return;
    await authFetch(`/contracts/${id}`, { method: 'DELETE' });
    toast.success('Contrato cancelado'); load();
  }

  const expiring = items.filter(i => i.status === 'active' && i.days_remaining !== null && i.days_remaining <= i.alert_days && i.days_remaining >= 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ds-text)' }}>Contratos</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>Gestión de contratos y seguimiento de vencimientos</p>
        </div>
        {canWrite('contracts') && <button type="button" onClick={() => setEditing(null)} className="btn btn-primary"><Plus size={16} /> Nuevo Contrato</button>}
      </div>

      {expiring.length > 0 && (
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#F59E0B' }}>{expiring.length} contrato{expiring.length > 1 ? 's' : ''} por vencer</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>{expiring.map(c => `${c.title} (${c.days_remaining}d)`).join(' · ')}</p>
          </div>
        </div>
      )}

      {/* ── MOBILE / TABLET: cards ─────────────────────────────────────── */}
      <div className="lg:hidden space-y-2.5">
        {loading ? (
          <div className="rounded-2xl p-8 text-center text-sm shadow-soft" style={{ ...cardStyle, color: 'var(--ds-text-muted)' }}>Cargando…</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl p-10 text-center shadow-soft" style={{ ...cardStyle, color: 'var(--ds-text-muted)' }}>
            <FileCheck size={30} className="mx-auto mb-2" style={{ color: 'var(--ds-border-strong)' }} />
            <p className="text-sm">Sin contratos</p>
          </div>
        ) : items.map(c => {
          const sc = STATUS_CFG[c.status] || STATUS_CFG.active;
          const isExpiring = c.status === 'active' && c.days_remaining !== null && c.days_remaining <= c.alert_days && c.days_remaining >= 0;
          return (
            <div key={c.id} className="rounded-2xl p-4 shadow-soft" style={{ ...cardStyle, ...(isExpiring ? { borderColor: 'rgba(245,158,11,0.3)' } : {}) }}>
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(20,184,166,0.12)' }}>
                  <FileCheck size={17} className="text-teal-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold truncate" style={{ color: 'var(--ds-text)' }}>{c.title}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--ds-text-muted)' }}>
                    {[c.contract_number && `#${c.contract_number}`, c.provider_name, c.contract_type].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium" style={{ color: 'var(--ds-text-subtle)' }}>Vencimiento</p>
                  <p className="text-[13px] font-semibold flex items-center gap-1.5" style={{ color: isExpiring ? '#F59E0B' : 'var(--ds-text)' }}>
                    {fmt(c.end_date)}
                    {isExpiring && <span className="text-[10px] px-1.5 rounded-full font-bold" style={{ background: 'rgba(245,158,11,0.14)' }}>{c.days_remaining}d</span>}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium" style={{ color: 'var(--ds-text-subtle)' }}>Valor</p>
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--ds-text)' }}>{fmtMoney(c.value)}</p>
                </div>
              </div>
              {(canWrite('contracts') || canDelete('contracts')) && (
                <div className="flex items-center gap-2 mt-3.5 pt-3.5" style={{ borderTop: '1px solid var(--ds-border)' }}>
                  {canWrite('contracts') && (
                    <button type="button" onClick={() => setEditing(c)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold tap-scale" style={{ background: 'var(--ds-card-alt)', color: 'var(--ds-text)' }}>
                      <Edit2 size={14} /> Editar
                    </button>
                  )}
                  {canDelete('contracts') && (
                    <button type="button" onClick={() => del(c.id)} aria-label="Cancelar contrato"
                      className="inline-flex items-center justify-center size-[42px] rounded-xl text-red-500 tap-scale" style={{ background: 'rgba(239,68,68,0.08)' }}>
                      <Trash2 size={16} />
                    </button>
                  )}
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
              {['Contrato','Proveedor','Tipo','Inicio','Vencimiento','Valor','Estado',''].map(h => (
                <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3" style={{ color: 'var(--ds-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12" style={{ color: 'var(--ds-text-muted)' }}>Cargando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center">
                <FileCheck size={32} className="mx-auto mb-2" style={{ color: 'var(--ds-border)' }} />
                <p className="text-sm" style={{ color: 'var(--ds-text-muted)' }}>Sin contratos</p>
              </td></tr>
            ) : items.map((c, i) => {
              const sc = STATUS_CFG[c.status] || STATUS_CFG.active;
              const isExpiring = c.status === 'active' && c.days_remaining !== null && c.days_remaining <= c.alert_days && c.days_remaining >= 0;
              return (
                <tr key={c.id}
                  style={{
                    borderTop: i > 0 ? '1px solid var(--ds-border)' : 'none',
                    background: isExpiring ? 'rgba(245,158,11,0.04)' : '',
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={e => { if (!isExpiring) (e.currentTarget as HTMLTableRowElement).style.background = isDark() ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = isExpiring ? 'rgba(245,158,11,0.04)' : ''; }}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <FileCheck size={15} className="text-teal-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--ds-text)' }}>{c.title}</p>
                        {c.contract_number && <p className="text-xs" style={{ color: 'var(--ds-text-subtle)' }}>#{c.contract_number}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm" style={{ color: 'var(--ds-text-muted)' }}>{c.provider_name || '—'}</td>
                  <td className="px-4 py-3.5 text-sm" style={{ color: 'var(--ds-text-muted)' }}>{c.contract_type || '—'}</td>
                  <td className="px-4 py-3.5 text-sm" style={{ color: 'var(--ds-text-muted)' }}>{fmt(c.start_date)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} style={{ color: isExpiring ? '#F59E0B' : 'var(--ds-text-subtle)' }} />
                      <span className="text-sm" style={{ color: isExpiring ? '#F59E0B' : 'var(--ds-text)', fontWeight: isExpiring ? 600 : 400 }}>{fmt(c.end_date)}</span>
                      {isExpiring && <span className="text-[10px] px-1.5 rounded-full font-medium" style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>{c.days_remaining}d</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm" style={{ color: 'var(--ds-text)' }}>{fmtMoney(c.value)}</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1">
                      {canWrite('contracts') && <button type="button" onClick={() => setEditing(c)} className="p-1.5 rounded-lg transition-colors hover:text-primary-700" style={{ color: 'var(--ds-text-subtle)' }}><Edit2 size={13} /></button>}
                      {canDelete('contracts') && <button type="button" onClick={() => del(c.id)} className="p-1.5 rounded-lg transition-colors text-red-400 hover:text-red-600"><Trash2 size={13} /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
      {editing !== undefined && <ContractForm item={editing} onClose={() => setEditing(undefined)} onSaved={load} />}
    </div>
  );
}
