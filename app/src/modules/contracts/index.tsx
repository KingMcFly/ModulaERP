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

interface Contract { id: number; title: string; contract_number: string; contract_type: string; provider_name: string; start_date: string; end_date: string; value: number; status: string; days_remaining: number; alert_days: number; description: string; }

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Activo',    cls: 'bg-emerald-100 text-emerald-700' },
  expired:   { label: 'Vencido',   cls: 'bg-red-100 text-red-700' },
  pending:   { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700' },
  cancelled: { label: 'Cancelado', cls: 'bg-slate-100 text-slate-500' },
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
    <div className="fixed inset-0 bg-black/20 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-soft-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-slate-900 mb-5">{item ? 'Editar Contrato' : 'Nuevo Contrato'}</h2>
        <form onSubmit={submit} className="space-y-4">
          <div><label htmlFor="cont-title" className="label">Título *</label><input id="cont-title" className="input" value={f.title} onChange={e => set('title', e.target.value)} required /></div>
          <div className="grid grid-cols-2 gap-3">
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
        <div><h1 className="text-2xl font-semibold text-slate-900">Contratos</h1><p className="text-slate-500 text-sm mt-0.5">Gestión de contratos y seguimiento de vencimientos</p></div>
        {canWrite('contracts') && <button type="button" onClick={() => setEditing(null)} className="btn btn-primary"><Plus size={16} /> Nuevo Contrato</button>}
      </div>

      {expiring.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">{expiring.length} contrato{expiring.length > 1 ? 's' : ''} por vencer</p>
            <p className="text-xs text-amber-600 mt-0.5">{expiring.map(c => `${c.title} (${c.days_remaining}d)`).join(' · ')}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl overflow-hidden shadow-soft">
        <table className="w-full">
          <thead><tr className="bg-[#FAFAFA] border-b border-black/[0.04]">
            {['Contrato','Proveedor','Tipo','Inicio','Vencimiento','Valor','Estado',''].map(h => (
              <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">Cargando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center"><FileCheck size={32} className="mx-auto text-slate-200 mb-2" /><p className="text-slate-400 text-sm">Sin contratos</p></td></tr>
            ) : items.map(c => {
              const sc = STATUS_CFG[c.status] || STATUS_CFG.active;
              const isExpiring = c.status === 'active' && c.days_remaining !== null && c.days_remaining <= c.alert_days && c.days_remaining >= 0;
              return (
                <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${isExpiring ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <FileCheck size={15} className="text-teal-500 flex-shrink-0" />
                      <div><p className="text-sm font-medium text-slate-900">{c.title}</p>{c.contract_number && <p className="text-xs text-slate-400">#{c.contract_number}</p>}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-500">{c.provider_name || '—'}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-500">{c.contract_type || '—'}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-500">{fmt(c.start_date)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className={isExpiring ? 'text-amber-500' : 'text-slate-400'} />
                      <span className={`text-sm ${isExpiring ? 'text-amber-700 font-semibold' : 'text-slate-600'}`}>{fmt(c.end_date)}</span>
                      {isExpiring && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded-full font-medium">{c.days_remaining}d</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-600">{fmtMoney(c.value)}</td>
                  <td className="px-4 py-3.5"><span className={`badge ${sc.cls}`}>{sc.label}</span></td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1">
                      {canWrite('contracts') && <button type="button" onClick={() => setEditing(c)} className="p-1.5 text-slate-400 hover:text-primary-700 rounded-lg"><Edit2 size={13} /></button>}
                      {canDelete('contracts') && <button type="button" onClick={() => del(c.id)} className="p-1.5 text-slate-400 hover:text-red-700 rounded-lg"><Trash2 size={13} /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing !== undefined && <ContractForm item={editing} onClose={() => setEditing(undefined)} onSaved={load} />}
    </div>
  );
}
