import React, { useEffect, useState, useCallback } from 'react';
import { Plus, ShoppingCart, Package, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
function authFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('token');
  return fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) } });
}

interface PurchaseItem { description: string; quantity: number; unit_price: number; }
interface Purchase {
  id: number; po_number: string; title: string; status: string;
  provider_id: number | null; provider_name: string | null;
  cost_center_id: number | null; cost_center_name: string | null;
  total: number; created_by_name: string; notes: string;
  created_at: string; received_at: string | null;
  items?: (PurchaseItem & { id: number; subtotal: number })[];
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  draft:    { label: 'Borrador',   cls: 'bg-slate-100 text-slate-500' },
  approved: { label: 'Aprobada',   cls: 'bg-emerald-100 text-emerald-700' },
  ordered:  { label: 'Pedida',     cls: 'bg-blue-100 text-blue-700' },
  received: { label: 'Recibida',   cls: 'bg-teal-100 text-teal-700' },
  cancelled:{ label: 'Cancelada',  cls: 'bg-red-100 text-red-600' },
};

const CLP_FMT = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
function fmtMoney(n?: number) { return n != null ? CLP_FMT.format(n) : '—'; }
function fmt(d?: string | null) { return d ? new Date(d).toLocaleDateString('es-CL') : '—'; }

interface ItemRow { _key: string; description: string; quantity: string; unit_price: string; }

function NewPurchaseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [providers, setProviders]     = useState<{ id: number; name: string }[]>([]);
  const [costCenters, setCostCenters] = useState<{ id: number; name: string }[]>([]);
  const [f, setF] = useState({ title: '', po_number: '', provider_id: '', cost_center_id: '', notes: '' });
  const [items, setItems] = useState<ItemRow[]>([{ _key: crypto.randomUUID(), description: '', quantity: '1', unit_price: '' }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    authFetch('/providers').then(r => r.json()).then(d => setProviders(Array.isArray(d) ? d : []));
    authFetch('/cost-centers').then(r => r.json()).then(d => setCostCenters(Array.isArray(d) ? d : []));
  }, []);

  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const setItem = (i: number, k: keyof ItemRow, v: string) =>
    setItems(rows => rows.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const addItem = () => setItems(r => [...r, { _key: crypto.randomUUID(), description: '', quantity: '1', unit_price: '' }]);
  const removeItem = (i: number) => setItems(r => r.filter((_, idx) => idx !== i));

  const total = items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0), 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (items.every(it => !it.description)) { toast.error('Agrega al menos un ítem'); return; }
    setSaving(true);
    try {
      const body = {
        ...f,
        provider_id: f.provider_id ? parseInt(f.provider_id) : null,
        cost_center_id: f.cost_center_id ? parseInt(f.cost_center_id) : null,
        items: items.filter(it => it.description).map(it => ({
          description: it.description,
          quantity: parseFloat(it.quantity) || 1,
          unit_price: parseFloat(it.unit_price) || 0,
        })),
      };
      const r = await authFetch('/purchases', { method: 'POST', body: JSON.stringify(body) });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      toast.success('Orden de compra creada'); onCreated(); onClose();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-soft-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-slate-900 mb-5">Nueva Orden de Compra</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label htmlFor="po-title" className="label">Título *</label>
              <input id="po-title" className="input" value={f.title} onChange={e => set('title', e.target.value)} required />
            </div>
            <div>
              <label htmlFor="po-num" className="label">N° OC</label>
              <input id="po-num" className="input" value={f.po_number} onChange={e => set('po_number', e.target.value)} placeholder="OC-2026-001" />
            </div>
            <div>
              <label htmlFor="po-provider" className="label">Proveedor</label>
              <select id="po-provider" className="input" value={f.provider_id} onChange={e => set('provider_id', e.target.value)}>
                <option value="">Sin proveedor</option>
                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="po-cc" className="label">Centro de costo</label>
              <select id="po-cc" className="input" value={f.cost_center_id} onChange={e => set('cost_center_id', e.target.value)}>
                <option value="">Sin centro</option>
                {costCenters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="po-notes" className="label">Notas</label>
              <input id="po-notes" className="input" value={f.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Ítems *</label>
              <button type="button" onClick={addItem} className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1">
                <Plus size={12} /> Agregar ítem
              </button>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Descripción</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 w-20">Cantidad</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 w-28">Precio unit.</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 w-28">Subtotal</th>
                  <th className="w-8" />
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, i) => (
                    <tr key={it._key}>
                      <td className="px-2 py-1.5">
                        <input className="input text-sm py-1" value={it.description} onChange={e => setItem(i, 'description', e.target.value)} placeholder="Descripción del ítem" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input className="input text-sm py-1 text-center" type="number" min="1" value={it.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input className="input text-sm py-1" type="number" min="0" value={it.unit_price} onChange={e => setItem(i, 'unit_price', e.target.value)} placeholder="0" />
                      </td>
                      <td className="px-3 py-1.5 text-right text-slate-700 font-medium text-xs">
                        {fmtMoney((parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0))}
                      </td>
                      <td className="px-1 py-1.5">
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(i)} className="p-1 text-slate-300 hover:text-red-500 rounded">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td colSpan={3} className="px-3 py-2 text-xs font-semibold text-slate-500 text-right">Total</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-900">{fmtMoney(total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 btn btn-primary">{saving ? 'Creando…' : 'Crear OC'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PurchaseRow({ po, onStatusChange }: { po: Purchase; onStatusChange: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<Purchase | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const sc = STATUS_CFG[po.status] || STATUS_CFG.draft;

  async function toggle() {
    if (!expanded && !detail) {
      setLoadingDetail(true);
      const d = await authFetch(`/purchases/${po.id}`).then(r => r.json()).catch(() => null);
      setDetail(d);
      setLoadingDetail(false);
    }
    setExpanded(e => !e);
  }

  async function changeStatus(status: string) {
    await authFetch(`/purchases/${po.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    toast.success('Estado actualizado'); onStatusChange();
  }

  return (
    <>
      <tr className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={toggle}>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
            <div>
              <p className="text-sm font-medium text-slate-900">{po.title}</p>
              {po.po_number && <p className="text-xs text-slate-400">#{po.po_number}</p>}
            </div>
          </div>
        </td>
        <td className="px-4 py-3.5 text-sm text-slate-500">{po.provider_name || '—'}</td>
        <td className="px-4 py-3.5 text-sm text-slate-500">{po.cost_center_name || '—'}</td>
        <td className="px-4 py-3.5 text-sm font-medium text-slate-900">{fmtMoney(po.total)}</td>
        <td className="px-4 py-3.5 text-sm text-slate-400">{fmt(po.created_at)}</td>
        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
          <select
            className="input text-xs py-1 px-2 h-auto"
            value={po.status}
            onChange={e => changeStatus(e.target.value)}
          >
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="px-6 pb-4 bg-slate-50/50">
            {loadingDetail ? (
              <p className="text-xs text-slate-400 py-2">Cargando ítems…</p>
            ) : detail?.items && detail.items.length > 0 ? (
              <table className="w-full text-xs mt-2 border border-slate-100 rounded-lg overflow-hidden">
                <thead><tr className="bg-white border-b border-slate-100">
                  <th className="text-left px-3 py-2 text-slate-500 font-semibold">Descripción</th>
                  <th className="text-center px-3 py-2 text-slate-500 font-semibold w-20">Cantidad</th>
                  <th className="text-right px-3 py-2 text-slate-500 font-semibold w-28">Precio unit.</th>
                  <th className="text-right px-3 py-2 text-slate-500 font-semibold w-28">Subtotal</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50 bg-white">
                  {detail.items.map(it => (
                    <tr key={it.id}>
                      <td className="px-3 py-2 text-slate-700">{it.description}</td>
                      <td className="px-3 py-2 text-center text-slate-500">{it.quantity}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{fmtMoney(it.unit_price)}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-700">{fmtMoney(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-slate-400 py-2">Sin ítems registrados.</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function PurchasesModule() {
  const { canWrite, canDelete } = useAuth();
  const [items, setItems]   = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatus] = useState('');

  const load = useCallback(() => {
    const p = statusFilter ? `?status=${statusFilter}` : '';
    authFetch(`/purchases${p}`).then(r => r.json()).then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); });
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const totalValue = items.reduce((s, p) => s + (p.total || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Órdenes de Compra</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestión de compras y proveedores</p>
        </div>
        {canWrite('purchases') && (
          <button type="button" onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={16} /> Nueva OC
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total órdenes', value: items.length, color: '#6366F1' },
          { label: 'Pendientes',    value: items.filter(i => i.status === 'draft' || i.status === 'approved').length, color: '#F59E0B' },
          { label: 'En tránsito',   value: items.filter(i => i.status === 'ordered').length, color: '#3B82F6' },
          { label: 'Valor total',   value: fmtMoney(totalValue), color: '#10B981', isText: true },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-soft">
            <p className="text-2xl font-semibold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-soft">
        <select className="input max-w-xs" value={statusFilter} onChange={e => setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden shadow-soft">
        <table className="w-full">
          <thead><tr className="bg-[#FAFAFA] border-b border-black/[0.04]">
            {['Orden', 'Proveedor', 'Centro de costo', 'Total', 'Fecha', 'Estado'].map(h => (
              <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400">Cargando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center">
                <ShoppingCart size={32} className="mx-auto text-slate-200 mb-2" />
                <p className="text-slate-400 text-sm">Sin órdenes de compra</p>
              </td></tr>
            ) : items.map(po => (
              <PurchaseRow key={po.id} po={po} onStatusChange={load} />
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <NewPurchaseModal onClose={() => setShowModal(false)} onCreated={load} />}
    </div>
  );
}
