import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, PieChart, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const CLP_FMT = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
function fmtMoney(n?: number) { return n ? CLP_FMT.format(n) : '—'; }
function authFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('token');
  return fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers||{}) } });
}
const cardStyle = { background: 'var(--ds-card)', border: '1px solid var(--ds-border)' };

interface CostCenter { id: number; name: string; code: string; description: string; manager: string; budget: number; spent: number; }

function CostCenterForm({ item, onClose, onSaved }: { item?: CostCenter|null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: item?.name||'', code: item?.code||'', description: item?.description||'', manager: item?.manager||'', budget: item?.budget?.toString()||'' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const r = await authFetch(item ? `/cost-centers/${item.id}` : '/cost-centers', { method: item ? 'PUT' : 'POST', body: JSON.stringify(f) });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      toast.success(item ? 'Centro actualizado' : 'Centro creado'); onSaved(); onClose();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="rounded-3xl shadow-soft-xl w-full max-w-md p-6" style={cardStyle}>
        <h2 className="text-lg font-semibold mb-5" style={{ color: 'var(--ds-text)' }}>{item ? 'Editar Centro' : 'Nuevo Centro de Costo'}</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label htmlFor="cc-name" className="label">Nombre *</label><input id="cc-name" className="input" value={f.name} onChange={e => set('name', e.target.value)} required /></div>
            <div><label htmlFor="cc-code" className="label">Código</label><input id="cc-code" className="input" value={f.code} onChange={e => set('code', e.target.value)} placeholder="CC-001" /></div>
            <div><label htmlFor="cc-manager" className="label">Responsable</label><input id="cc-manager" className="input" value={f.manager} onChange={e => set('manager', e.target.value)} /></div>
            <div className="col-span-2"><label htmlFor="cc-budget" className="label">Presupuesto ($)</label><input id="cc-budget" className="input" type="number" value={f.budget} onChange={e => set('budget', e.target.value)} /></div>
            <div className="col-span-2"><label htmlFor="cc-desc" className="label">Descripción</label><textarea id="cc-desc" className="input resize-none" rows={2} value={f.description} onChange={e => set('description', e.target.value)} /></div>
          </div>
          <div className="flex gap-3 pt-1"><button type="button" onClick={onClose} className="flex-1 btn btn-ghost">Cancelar</button><button type="submit" disabled={saving} className="flex-1 btn btn-primary">{saving ? 'Guardando…' : 'Guardar'}</button></div>
        </form>
      </div>
    </div>
  );
}

export default function CostCentersModule() {
  const { canWrite, canDelete } = useAuth();
  const [items, setItems] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CostCenter|null|undefined>(undefined);

  const load = useCallback(() => {
    authFetch('/cost-centers').then(r => r.json()).then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);
  useEffect(() => { load(); }, [load]);

  async function del(id: number) {
    if (!confirm('¿Eliminar este centro de costo?')) return;
    await authFetch(`/cost-centers/${id}`, { method: 'DELETE' });
    toast.success('Centro eliminado'); load();
  }

  const totalBudget = items.reduce((a, c) => a + (c.budget || 0), 0);
  const totalSpent  = items.reduce((a, c) => a + (c.spent || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ds-text)' }}>Centros de Costo</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>Control de presupuesto por área</p>
        </div>
        {canWrite('cost_centers') && <button type="button" onClick={() => setEditing(null)} className="btn btn-primary"><Plus size={16} /> Nuevo Centro</button>}
      </div>

      {totalBudget > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Presupuesto total', value: fmtMoney(totalBudget), color: '#6366F1' },
            { label: 'Gastado total',     value: fmtMoney(totalSpent),  color: '#EF4444' },
            { label: 'Disponible',        value: fmtMoney(Math.max(totalBudget - totalSpent, 0)), color: '#10B981' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 shadow-soft" style={cardStyle}>
              <p className="text-2xl font-semibold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-sm col-span-3 text-center py-12" style={{ color: 'var(--ds-text-muted)' }}>Cargando…</p>
        ) : items.length === 0 ? (
          <div className="col-span-3 py-16 flex flex-col items-center gap-2" style={{ color: 'var(--ds-text-muted)' }}>
            <PieChart size={32} style={{ color: 'var(--ds-border)' }} />
            <p className="text-sm">Sin centros de costo</p>
          </div>
        ) : items.map(cc => {
          const pct = cc.budget ? Math.min(100, Math.round((cc.spent / cc.budget) * 100)) : 0;
          const overBudget = cc.budget && cc.spent > cc.budget;
          return (
            <div key={cc.id} className="rounded-2xl shadow-sm p-5" style={cardStyle}>
              <div className="flex items-start justify-between mb-3">
                <div className="size-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0"><PieChart size={18} className="text-primary-600" /></div>
                <div className="flex gap-1">
                  {canWrite('cost_centers') && <button type="button" onClick={() => setEditing(cc)} className="p-1.5 rounded-lg transition-colors hover:text-primary-700" style={{ color: 'var(--ds-text-subtle)' }}><Edit2 size={14} /></button>}
                  {canDelete('cost_centers') && <button type="button" onClick={() => del(cc.id)} className="p-1.5 rounded-lg transition-colors text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
                </div>
              </div>
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--ds-text)' }}>{cc.name}</h3>
                {cc.code && <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'var(--ds-card-alt)', color: 'var(--ds-text-muted)' }}>{cc.code}</span>}
              </div>
              {cc.manager && <p className="text-xs mb-3" style={{ color: 'var(--ds-text-muted)' }}>{cc.manager}</p>}
              {cc.budget ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs" style={{ color: 'var(--ds-text-muted)' }}>
                    <span>Gastado: {fmtMoney(cc.spent)}</span>
                    <span style={{ color: overBudget ? '#EF4444' : 'var(--ds-text-muted)', fontWeight: overBudget ? 600 : 400 }}>{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--ds-border)' }}>
                    <div className={`h-full rounded-full transition-all ${overBudget ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'var(--ds-text-subtle)' }}>Presupuesto: {fmtMoney(cc.budget)}</span>
                    {overBudget && <span className="text-red-500 font-semibold flex items-center gap-0.5"><TrendingUp size={10} />Excedido</span>}
                  </div>
                </div>
              ) : <p className="text-xs mt-2" style={{ color: 'var(--ds-text-subtle)' }}>Sin presupuesto definido</p>}
            </div>
          );
        })}
      </div>
      {editing !== undefined && <CostCenterForm item={editing} onClose={() => setEditing(undefined)} onSaved={load} />}
    </div>
  );
}
