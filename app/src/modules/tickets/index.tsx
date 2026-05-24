import React, { useEffect, useState, useCallback } from 'react';
import { Plus, LifeBuoy, Clock, CheckCircle, AlertCircle, MessageSquare, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
function authFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('token');
  return fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers||{}) } });
}

interface Ticket { id: number; title: string; description: string; status: string; priority: string; category: string; reporter_name: string; assignee_name: string; asset_type: string; brand: string; model: string; created_at: string; age_hours: number; sla_hours: number; }

const STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  open:        { label: 'Abierto',      cls: 'bg-blue-100 text-blue-700',    icon: AlertCircle },
  in_progress: { label: 'En progreso',  cls: 'bg-amber-100 text-amber-700',  icon: Clock },
  waiting:     { label: 'En espera',    cls: 'bg-slate-100 text-slate-600',  icon: Clock },
  resolved:    { label: 'Resuelto',     cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  closed:      { label: 'Cerrado',      cls: 'bg-slate-100 text-slate-500',  icon: CheckCircle },
};

const PRIORITY_COLORS: Record<string, string> = { low: 'bg-slate-100 text-slate-500', medium: 'bg-blue-100 text-blue-700', high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700' };
const PRIORITY_LABELS: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica' };

function NewTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [f, setF] = useState({ title: '', description: '', priority: 'medium', category: '', sla_hours: '24' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const r = await authFetch('/tickets', { method: 'POST', body: JSON.stringify(f) });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      toast.success('Ticket creado'); onCreated(); onClose();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-soft-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-5">Nuevo Ticket</h2>
        <form onSubmit={submit} className="space-y-4">
          <div><label htmlFor="tkt-title" className="label">Título *</label><input id="tkt-title" className="input" value={f.title} onChange={e => set('title', e.target.value)} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="tkt-priority" className="label">Prioridad</label>
              <select id="tkt-priority" className="input" value={f.priority} onChange={e => set('priority', e.target.value)}>
                {Object.entries(PRIORITY_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
            <div><label htmlFor="tkt-category" className="label">Categoría</label><input id="tkt-category" className="input" value={f.category} onChange={e => set('category', e.target.value)} placeholder="HW, SW, Red…" /></div>
            <div className="col-span-2"><label htmlFor="tkt-sla" className="label">SLA (horas)</label><input id="tkt-sla" className="input" type="number" min="1" value={f.sla_hours} onChange={e => set('sla_hours', e.target.value)} /></div>
          </div>
          <div><label htmlFor="tkt-desc" className="label">Descripción</label><textarea id="tkt-desc" className="input resize-none" rows={3} value={f.description} onChange={e => set('description', e.target.value)} /></div>
          <div className="flex gap-3 pt-1"><button type="button" onClick={onClose} className="flex-1 btn btn-ghost">Cancelar</button><button type="submit" disabled={saving} className="flex-1 btn btn-primary">{saving ? 'Creando…' : 'Crear Ticket'}</button></div>
        </form>
      </div>
    </div>
  );
}

export default function TicketsModule() {
  const { user, canWrite, canDelete } = useAuth();
  const [items, setItems] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const canManage = ['admin','manager','super_admin'].includes(user?.role || '');

  const load = useCallback(() => {
    const p = statusFilter ? `?status=${statusFilter}` : '';
    authFetch(`/tickets${p}`).then(r => r.json()).then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); });
  }, [statusFilter]);
  useEffect(() => { load(); }, [load]);

  async function changeStatus(id: number, status: string) {
    await authFetch(`/tickets/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    toast.success('Estado actualizado'); load();
  }

  const open = items.filter(i => ['open','in_progress','waiting'].includes(i.status));
  const overSla = open.filter(i => i.age_hours > i.sla_hours);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold text-slate-900">Mesa de Ayuda</h1><p className="text-slate-500 text-sm mt-0.5">Tickets y soporte técnico interno</p></div>
        {canWrite('tickets') && <button type="button" onClick={() => setShowModal(true)} className="btn btn-primary"><Plus size={16} /> Nuevo Ticket</button>}
      </div>

      {overSla.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">{overSla.length} ticket{overSla.length > 1 ? 's' : ''} superando SLA</p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Abiertos',     value: items.filter(i=>i.status==='open').length,        color: '#3B82F6' },
          { label: 'En progreso',  value: items.filter(i=>i.status==='in_progress').length, color: '#F59E0B' },
          { label: 'Críticos',     value: items.filter(i=>i.priority==='critical').length,  color: '#EF4444' },
          { label: 'Resueltos',    value: items.filter(i=>i.status==='resolved').length,    color: '#10B981' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-soft text-center">
            <p className="text-2xl font-semibold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-soft">
        <select className="input max-w-xs" value={statusFilter} onChange={e => setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden shadow-soft">
        <table className="w-full">
          <thead><tr className="bg-[#FAFAFA] border-b border-black/[0.04]">
            {['Ticket','Prioridad','Categoría','Reportado por','Antigüedad','Estado',''].map(h => (
              <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400">Cargando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center"><LifeBuoy size={32} className="mx-auto text-slate-200 mb-2" /><p className="text-slate-400 text-sm">Sin tickets</p></td></tr>
            ) : items.map(t => {
              const sc = STATUS_CFG[t.status] || STATUS_CFG.open;
              const StatusIcon = sc.icon;
              const isOverSla = t.age_hours > t.sla_hours;
              const age = t.age_hours < 24 ? `${t.age_hours}h` : `${Math.floor(t.age_hours/24)}d`;
              return (
                <tr key={t.id} className={`hover:bg-slate-50 transition-colors ${isOverSla && ['open','in_progress','waiting'].includes(t.status) ? 'bg-red-50/20' : ''}`}>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-medium text-slate-900">{t.title}</p>
                    {t.asset_type && <p className="text-xs text-slate-400">{t.asset_type} {t.brand} {t.model}</p>}
                  </td>
                  <td className="px-4 py-3.5"><span className={`badge ${PRIORITY_COLORS[t.priority]}`}>{PRIORITY_LABELS[t.priority]}</span></td>
                  <td className="px-4 py-3.5 text-sm text-slate-500">{t.category || '—'}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-600">{t.reporter_name || '—'}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-sm ${isOverSla && ['open','in_progress','waiting'].includes(t.status) ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>{age}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    {canManage ? (
                      <select className="input text-xs py-1 px-2 h-auto" value={t.status}
                        onChange={e => changeStatus(t.id, e.target.value)}>
                        {Object.entries(STATUS_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    ) : <span className={`badge ${sc.cls}`}>{sc.label}</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <ChevronRight size={15} className="text-slate-300" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showModal && <NewTicketModal onClose={() => setShowModal(false)} onCreated={load} />}
    </div>
  );
}
