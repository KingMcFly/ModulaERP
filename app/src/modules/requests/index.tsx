import React, { useEffect, useState, useCallback } from 'react';
import { Plus, CheckCircle, XCircle, Clock, ClipboardList, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
function authFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('token');
  return fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers||{}) } });
}

interface Request { id: number; request_type: string; title: string; description: string; status: string; priority: string; requester_name: string; requested_at: string; rejection_reason?: string; }

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pendiente',   cls: 'bg-amber-100 text-amber-700' },
  approved:  { label: 'Aprobada',    cls: 'bg-emerald-100 text-emerald-700' },
  rejected:  { label: 'Rechazada',   cls: 'bg-red-100 text-red-700' },
  completed: { label: 'Completada',  cls: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Cancelada',   cls: 'bg-slate-100 text-slate-500' },
};

const PRIORITY_CFG: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente' };
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
    <div className="fixed inset-0 bg-black/20 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-soft-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-5">Nueva Solicitud</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
          <div className="flex gap-3 pt-1"><button type="button" onClick={onClose} className="flex-1 btn btn-ghost">Cancelar</button><button type="submit" disabled={saving} className="flex-1 btn btn-primary">{saving ? 'Enviando...' : 'Enviar Solicitud'}</button></div>
        </form>
      </div>
    </div>
  );
}

export default function RequestsModule() {
  const { user, canWrite, canDelete } = useAuth();
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
          <h1 className="text-2xl font-bold text-slate-900">Solicitudes</h1>
          <p className="text-slate-500 text-sm mt-0.5">Solicitudes internas y flujos de aprobación</p>
        </div>
        {canWrite('requests') && <button onClick={() => setShowModal(true)} className="btn btn-primary"><Plus size={16} /> Nueva Solicitud</button>}
      </div>

      {canApprove && pending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <Clock size={18} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-medium">{pending} solicitud{pending > 1 ? 'es' : ''} pendiente{pending > 1 ? 's' : ''} de aprobación</p>
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 shadow-soft flex gap-3 items-center">
        <Filter size={15} className="text-slate-400" />
        <select className="input flex-1 max-w-xs" value={statusFilter} onChange={e => setStatus(e.target.value)}>
          <option value="">Todas</option>
          {Object.entries(STATUS_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden shadow-soft">
        <table className="w-full">
          <thead><tr className="bg-[#FAFAFA] border-b border-black/[0.04]">
            {['Solicitud','Tipo','Prioridad','Solicitante','Fecha','Estado',''].map(h => (
              <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400">Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center"><ClipboardList size={32} className="mx-auto text-slate-200 mb-2" /><p className="text-slate-400 text-sm">Sin solicitudes</p></td></tr>
            ) : items.map(item => {
              const sc = STATUS_CFG[item.status] || STATUS_CFG.pending;
              const priorityColors: Record<string, string> = { low: 'text-slate-500', medium: 'text-amber-600', high: 'text-orange-600', urgent: 'text-red-600' };
              return (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5"><p className="text-sm font-medium text-slate-900">{item.title}</p>{item.description && <p className="text-xs text-slate-400 truncate max-w-[200px]">{item.description}</p>}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-500">{TYPE_LABELS[item.request_type] || item.request_type}</td>
                  <td className="px-4 py-3.5 text-xs font-semibold"><span className={priorityColors[item.priority]}>{PRIORITY_CFG[item.priority]}</span></td>
                  <td className="px-4 py-3.5 text-sm text-slate-600">{item.requester_name || '—'}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-500">{new Date(item.requested_at).toLocaleDateString('es-CL')}</td>
                  <td className="px-4 py-3.5"><span className={`badge ${sc.cls}`}>{sc.label}</span></td>
                  <td className="px-4 py-3.5">
                    {canApprove && item.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => approve(item.id)} className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors" aria-label="Aprobar"><CheckCircle size={16} /></button>
                        <button onClick={() => reject(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors" aria-label="Rechazar"><XCircle size={16} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showModal && <NewRequestModal onClose={() => setShowModal(false)} onCreated={load} />}
    </div>
  );
}
