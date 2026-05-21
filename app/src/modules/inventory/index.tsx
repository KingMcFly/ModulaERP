import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Package, MapPin, Edit2, Trash2,
  ShoppingBag, RotateCcw, AlertTriangle, QrCode, Download, ExternalLink, Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import QRModal from '../../components/QRModal';
import ImportModal from '../../components/ImportModal';
import { exportToExcel } from '../../utils/exportExcel';
import AssetLookup, { LookupResult } from '../../components/AssetLookup';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
function authFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('token');
  return fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) },
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Asset {
  id: number; serial_number: string; barcode: string; asset_type: string;
  brand: string; model: string; value: number; status: string;
  location_name: string; location_id: number; purchase_date: string; notes: string;
}

interface Supply {
  id: number; name: string; category: string; unit: string;
  current_stock: number; min_stock: number; unit_cost: number;
  location_name: string; location_id: number; notes: string;
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  available:   { label: 'Disponible', cls: 'bg-emerald-100 text-emerald-700' },
  loaned:      { label: 'Prestado',   cls: 'bg-sky-100 text-sky-700' },
  maintenance: { label: 'Mantención', cls: 'bg-amber-100 text-amber-700' },
  retired:     { label: 'Retirado',   cls: 'bg-slate-100 text-slate-500' },
};

// ── Asset Form ────────────────────────────────────────────────────────────────

function AssetForm({ asset, onClose, onSaved }: { asset?: Asset | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    serial_number: asset?.serial_number || '',
    barcode:       asset?.barcode       || '',
    asset_type:    asset?.asset_type    || '',
    brand:         asset?.brand         || '',
    model:         asset?.model         || '',
    value:         asset?.value?.toString() || '',
    location_id:   asset?.location_id?.toString() || '',
    purchase_date: asset?.purchase_date?.split('T')[0] || '',
    notes:         asset?.notes         || '',
    status:        asset?.status        || 'available',
  });
  const [locations,  setLocations]  = useState<{ id: number; name: string }[]>([]);
  const [assetTypes, setAssetTypes] = useState<{ id: number; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    authFetch('/catalog/locations').then(r => r.json()).then(setLocations).catch(() => {});
    authFetch('/catalog/asset-types').then(r => r.json()).then(setAssetTypes).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        ...form,
        value:         parseFloat(form.value)         || null,
        location_id:   form.location_id ? parseInt(form.location_id) : null,
        purchase_date: form.purchase_date             || null,
      };
      const r = await authFetch(asset ? `/assets/${asset.id}` : '/assets', {
        method: asset ? 'PUT' : 'POST', body: JSON.stringify(body),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      toast.success(asset ? 'Activo actualizado' : 'Activo creado');
      onSaved(); onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-soft-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-slate-900 mb-5">{asset ? 'Editar Activo' : 'Nuevo Activo'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="col-span-2">
            <AssetLookup
              serial={form.serial_number}
              onSerialChange={v => set('serial_number', v)}
              onResult={(r: LookupResult) => {
                if (r.brand && !form.brand)      set('brand',      r.brand);
                if (r.model && !form.model)      set('model',      r.model);
                if (r.asset_type && !form.asset_type) set('asset_type', r.asset_type);
                if (r.description && !form.notes) set('notes',     r.description);
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="asset-type" className="label">Tipo *</label>
              {assetTypes.length > 0 ? (
                <select id="asset-type" className="input" value={form.asset_type} onChange={e => set('asset_type', e.target.value)} required>
                  <option value="">Seleccionar tipo...</option>
                  {assetTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              ) : (
                <input id="asset-type" className="input" value={form.asset_type} onChange={e => set('asset_type', e.target.value)} required
                  placeholder="Ej: Laptop (agrega tipos en Configuración)" />
              )}
            </div>
            <div><label htmlFor="asset-brand" className="label">Marca</label><input id="asset-brand" className="input" value={form.brand} onChange={e => set('brand', e.target.value)} /></div>
            <div><label htmlFor="asset-model" className="label">Modelo</label><input id="asset-model" className="input" value={form.model} onChange={e => set('model', e.target.value)} /></div>
            <div><label htmlFor="asset-value" className="label">Valor ($)</label><input id="asset-value" className="input" type="number" step="0.01" value={form.value} onChange={e => set('value', e.target.value)} /></div>
            <div><label htmlFor="asset-purchase-date" className="label">Fecha compra</label><input id="asset-purchase-date" className="input" type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} /></div>
          </div>
          <div>
            <label htmlFor="asset-location" className="label">Ubicación</label>
            <select id="asset-location" className="input" value={form.location_id} onChange={e => set('location_id', e.target.value)}>
              <option value="">Sin ubicación</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            {locations.length === 0 && (
              <p className="text-xs text-slate-400 mt-1">Agrega ubicaciones en Configuración &gt; Ubicaciones</p>
            )}
          </div>
          {asset && (
            <div>
              <label htmlFor="asset-status" className="label">Estado</label>
              <select id="asset-status" className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          )}
          <div><label htmlFor="asset-barcode" className="label">Código de barra</label><input id="asset-barcode" className="input" value={form.barcode} onChange={e => set('barcode', e.target.value)} /></div>
          <div><label htmlFor="asset-notes" className="label">Notas</label><textarea id="asset-notes" className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 btn btn-primary">{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Assets Tab ────────────────────────────────────────────────────────────────

function AssetsTab() {
  const { canWrite, canDelete } = useAuth();
  const [assets, setAssets]         = useState<Asset[]>([]);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [loading, setLoading]       = useState(true);
  const [editing, setEditing]       = useState<Asset | null | undefined>(undefined);
  const [qrAsset, setQrAsset]       = useState<Asset | null>(null);
  const [stats, setStats]           = useState<any>(null);
  const [showImport, setShowImport] = useState(false);

  function handleExport() {
    void exportToExcel(assets.map(a => ({
      Tipo: a.asset_type, 'N° Serie': a.serial_number, Marca: a.brand, Modelo: a.model,
      Ubicación: a.location_name, Valor: a.value, Estado: STATUS_CFG[a.status]?.label || a.status,
      'Código barra': a.barcode, 'Fecha compra': a.purchase_date,
    })), 'activos');
  }

  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (search)      p.set('search', search);
    if (statusFilter) p.set('status', statusFilter);
    authFetch(`/assets?${p}`).then(r => r.json()).then(setAssets).finally(() => setLoading(false));
    authFetch('/assets/stats').then(r => r.json()).then(setStats);
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function del(id: number) {
    if (!confirm('¿Eliminar este activo?')) return;
    await authFetch(`/assets/${id}`, { method: 'DELETE' });
    toast.success('Activo eliminado'); load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button onClick={handleExport} className="btn btn-ghost border border-slate-200"><Download size={15} /> Exportar</button>
        <button onClick={() => setShowImport(true)} className="btn btn-ghost border border-slate-200"><Upload size={15} /> Importar</button>
        {canWrite('inventory') && <button onClick={() => setEditing(null)} className="btn btn-primary"><Plus size={16} /> Nuevo Activo</button>}
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total',          value: stats.total,       cls: 'text-slate-900' },
            { label: 'Disponibles',    value: stats.available,   cls: 'text-emerald-600' },
            { label: 'Prestados',      value: stats.loaned,      cls: 'text-sky-600' },
            { label: 'En Mantención',  value: stats.maintenance, cls: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-soft text-center">
              <p className={`text-2xl font-bold ${s.cls}`}>{s.value ?? 0}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 shadow-soft flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar por serie, marca, modelo..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={statusFilter} onChange={e => setStatus(e.target.value)}>
          <option value="">Todos</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden shadow-soft">
        <table className="w-full">
          <thead>
            <tr className="bg-[#FAFAFA] border-b border-black/[0.04]">
              {['Activo', 'Serie', 'Marca / Modelo', 'Ubicación', 'Valor', 'Estado', ''].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400">Cargando...</td></tr>
            ) : assets.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center">
                <Package size={32} className="mx-auto text-slate-200 mb-2" />
                <p className="text-slate-400 text-sm">Sin activos. Haz clic en "Nuevo Activo".</p>
              </td></tr>
            ) : assets.map(a => {
              const sc = STATUS_CFG[a.status] || STATUS_CFG.available;
              return (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package size={15} className="text-primary-500" />
                      </div>
                      <span className="text-sm font-medium text-slate-900">{a.asset_type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-500 font-mono">{a.serial_number || '—'}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-600">{[a.brand, a.model].filter(Boolean).join(' ') || '—'}</td>
                  <td className="px-4 py-3.5">
                    {a.location_name
                      ? <span className="flex items-center gap-1.5 text-sm text-slate-600"><MapPin size={12} className="text-slate-400" />{a.location_name}</span>
                      : <span className="text-sm text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-600">
                    {a.value ? `$${Number(a.value).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3.5"><span className={`badge ${sc.cls}`}>{sc.label}</span></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      <Link to={`/inventory/asset/${a.id}`} aria-label={`Ver ficha de ${a.asset_type}`} className="p-1.5 text-slate-400 hover:text-primary-600 rounded-lg transition-colors"><ExternalLink size={14} aria-hidden="true" /></Link>
                      <button onClick={() => setQrAsset(a)} aria-label={`Ver QR de ${a.asset_type}`} className="p-1.5 text-slate-400 hover:text-violet-600 rounded-lg transition-colors"><QrCode size={14} aria-hidden="true" /></button>
                      {canWrite('inventory') && <button onClick={() => setEditing(a)} aria-label={`Editar ${a.asset_type}`} className="p-1.5 text-slate-400 hover:text-primary-700 rounded-lg transition-colors"><Edit2 size={14} aria-hidden="true" /></button>}
                      {canDelete('inventory') && <button onClick={() => del(a.id)} aria-label={`Eliminar ${a.asset_type}`} className="p-1.5 text-slate-400 hover:text-red-700 rounded-lg transition-colors"><Trash2 size={14} aria-hidden="true" /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing !== undefined && <AssetForm asset={editing} onClose={() => setEditing(undefined)} onSaved={load} />}
      {qrAsset && <QRModal assetId={qrAsset.id} assetName={qrAsset.asset_type} assetCode={qrAsset.serial_number || qrAsset.barcode} onClose={() => setQrAsset(null)} />}
      {showImport && <ImportModal type="assets" onClose={() => setShowImport(false)} onImported={load} />}
    </div>
  );
}

// ── Supply Form ───────────────────────────────────────────────────────────────

function SupplyForm({ supply, onClose, onSaved }: { supply?: Supply | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name:          supply?.name              || '',
    category:      supply?.category          || '',
    unit:          supply?.unit              || '',
    current_stock: supply?.current_stock?.toString() || '0',
    min_stock:     supply?.min_stock?.toString()     || '0',
    location_id:   supply?.location_id?.toString()   || '',
    unit_cost:     supply?.unit_cost?.toString()      || '',
    notes:         supply?.notes             || '',
  });
  const [locations,   setLocations]   = useState<{ id: number; name: string }[]>([]);
  const [categories,  setCategories]  = useState<{ id: number; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    authFetch('/catalog/locations').then(r => r.json()).then(setLocations).catch(() => {});
    authFetch('/catalog/supply-categories').then(r => r.json()).then(setCategories).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        ...form,
        current_stock: parseInt(form.current_stock) || 0,
        min_stock:     parseInt(form.min_stock)     || 0,
        location_id:   form.location_id ? parseInt(form.location_id) : null,
        unit_cost:     parseFloat(form.unit_cost)   || null,
      };
      const r = await authFetch(supply ? `/supplies/${supply.id}` : '/supplies', {
        method: supply ? 'PUT' : 'POST', body: JSON.stringify(body),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      toast.success(supply ? 'Insumo actualizado' : 'Insumo creado');
      onSaved(); onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-soft-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-5">{supply ? 'Editar Insumo' : 'Nuevo Insumo'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="supply-name" className="label">Nombre *</label>
            <input id="supply-name" className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="supply-category" className="label">Categoría</label>
              {categories.length > 0 ? (
                <select id="supply-category" className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              ) : (
                <input id="supply-category" className="input" value={form.category} onChange={e => set('category', e.target.value)} placeholder="Categoría" />
              )}
            </div>
            <div>
              <label htmlFor="supply-unit" className="label">Unidad</label>
              <input id="supply-unit" className="input" value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="unidad, kg, litros..." />
            </div>
            {!supply && (
              <div>
                <label htmlFor="supply-initial-stock" className="label">Stock inicial</label>
                <input id="supply-initial-stock" className="input" type="number" min="0" value={form.current_stock} onChange={e => set('current_stock', e.target.value)} />
              </div>
            )}
            <div>
              <label htmlFor="supply-min-stock" className="label">Stock mínimo</label>
              <input id="supply-min-stock" className="input" type="number" min="0" value={form.min_stock} onChange={e => set('min_stock', e.target.value)} />
            </div>
            <div>
              <label htmlFor="supply-unit-cost" className="label">Costo unitario</label>
              <input id="supply-unit-cost" className="input" type="number" step="0.01" value={form.unit_cost} onChange={e => set('unit_cost', e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="supply-location" className="label">Ubicación</label>
            <select id="supply-location" className="input" value={form.location_id} onChange={e => set('location_id', e.target.value)}>
              <option value="">Sin ubicación</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div><label htmlFor="supply-notes" className="label">Notas</label><textarea id="supply-notes" className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 btn btn-primary">{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Movement Modal ────────────────────────────────────────────────────────────

function MovementModal({ supply, onClose, onSaved }: { supply: Supply; onClose: () => void; onSaved: () => void }) {
  const [moveType, setMoveType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await authFetch(`/supplies/${supply.id}/movement`, {
        method: 'POST',
        body: JSON.stringify({ move_type: moveType, quantity: parseInt(quantity), notes }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      toast.success('Movimiento registrado');
      onSaved(); onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  const opts = [
    { value: 'in'         as const, label: 'Entrada',  cls: 'border-emerald-300 text-emerald-700 bg-emerald-50' },
    { value: 'out'        as const, label: 'Salida',   cls: 'border-red-300 text-red-700 bg-red-50' },
    { value: 'adjustment' as const, label: 'Ajuste',   cls: 'border-amber-300 text-amber-700 bg-amber-50' },
  ];

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-soft-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold mb-1">Movimiento de Stock</h2>
        <p className="text-sm text-slate-500 mb-5">
          {supply.name} · Stock actual: <strong>{supply.current_stock} {supply.unit || 'un.'}</strong>
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <p className="label" id="move-type-label">Tipo de movimiento</p>
            <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="move-type-label">
              {opts.map(opt => (
                <button key={opt.value} type="button" onClick={() => setMoveType(opt.value)}
                  className={`py-2 rounded-lg border text-xs font-semibold transition-all ${
                    moveType === opt.value ? opt.cls + ' ring-2 ring-offset-1 ring-current' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="move-quantity" className="label">{moveType === 'adjustment' ? 'Stock resultante' : 'Cantidad'} *</label>
            <input id="move-quantity" className="input" type="number" min="0" value={quantity}
              onChange={e => setQuantity(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="move-notes" className="label">Observaciones</label>
            <input id="move-notes" className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Motivo del movimiento..." />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 btn btn-primary">{saving ? 'Guardando...' : 'Registrar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Supplies Tab ──────────────────────────────────────────────────────────────

function SuppliesTab() {
  const { canWrite, canDelete } = useAuth();
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState<Supply | null | undefined>(undefined);
  const [moving, setMoving]     = useState<Supply | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    authFetch('/supplies').then(r => r.json()).then(data => {
      const list = Array.isArray(data) ? data : [];
      setSupplies(search
        ? list.filter((s: Supply) =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            (s.category || '').toLowerCase().includes(search.toLowerCase()))
        : list);
    }).finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  async function del(id: number) {
    if (!confirm('¿Eliminar este insumo?')) return;
    await authFetch(`/supplies/${id}`, { method: 'DELETE' });
    toast.success('Insumo eliminado'); load();
  }

  function handleExportSupplies() {
    void exportToExcel(supplies.map(s => ({
      Nombre: s.name, Categoría: s.category, Unidad: s.unit,
      'Stock actual': s.current_stock, 'Stock mínimo': s.min_stock,
      'Costo unitario': s.unit_cost, Ubicación: s.location_name,
      Estado: s.current_stock <= s.min_stock ? 'Stock bajo' : 'Normal',
    })), 'insumos');
  }

  const lowStock = supplies.filter(s => s.current_stock <= s.min_stock);

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button onClick={handleExportSupplies} className="btn btn-ghost border border-slate-200"><Download size={15} /> Exportar</button>
        {canWrite('inventory') && <button onClick={() => setEditing(null)} className="btn btn-primary"><Plus size={16} /> Nuevo Insumo</button>}
      </div>

      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Stock bajo en {lowStock.length} insumo(s)</p>
            <p className="text-xs text-amber-600 mt-0.5">{lowStock.map(s => s.name).join(' · ')}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 shadow-soft">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar por nombre o categoría..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden shadow-soft">
        <table className="w-full">
          <thead>
            <tr className="bg-[#FAFAFA] border-b border-black/[0.04]">
              {['Insumo', 'Categoría', 'Ubicación', 'Stock', 'Mín.', 'Costo U.', ''].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400">Cargando...</td></tr>
            ) : supplies.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center">
                <ShoppingBag size={32} className="mx-auto text-slate-200 mb-2" />
                <p className="text-slate-400 text-sm">Sin insumos. Haz clic en "Nuevo Insumo".</p>
              </td></tr>
            ) : supplies.map(s => {
              const isLow = s.current_stock <= s.min_stock;
              return (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <ShoppingBag size={14} className="text-emerald-600" />
                      </div>
                      <span className="text-sm font-medium text-slate-900">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-500">{s.category || '—'}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-500">
                    {s.location_name
                      ? <span className="flex items-center gap-1"><MapPin size={12} className="text-slate-400" />{s.location_name}</span>
                      : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`font-semibold text-sm ${isLow ? 'text-red-600' : 'text-slate-800'}`}>
                      {s.current_stock} {s.unit || ''}
                    </span>
                    {isLow && <AlertTriangle size={11} className="inline ml-1 text-red-500" />}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-500">{s.min_stock}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-500">
                    {s.unit_cost ? `$${Number(s.unit_cost).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      {canWrite('inventory') && (
                        <button onClick={() => setMoving(s)} title="Movimiento de stock"
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                          <RotateCcw size={13} />
                        </button>
                      )}
                      {canWrite('inventory') && <button onClick={() => setEditing(s)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Edit2 size={13} /></button>}
                      {canDelete('inventory') && <button onClick={() => del(s.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13} /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing !== undefined && <SupplyForm supply={editing} onClose={() => setEditing(undefined)} onSaved={load} />}
      {moving && <MovementModal supply={moving} onClose={() => setMoving(null)} onSaved={load} />}
    </div>
  );
}

// ── Main Module ───────────────────────────────────────────────────────────────

export default function InventoryModule() {
  const [tab, setTab] = useState<'assets' | 'supplies'>('assets');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inventario</h1>
        <p className="text-slate-500 text-sm mt-0.5">Gestión de activos y control de insumos</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          { id: 'assets',   label: 'Activos',  icon: Package    },
          { id: 'supplies', label: 'Insumos',  icon: ShoppingBag },
        ] as const).map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'assets'   ? <AssetsTab />   : <SuppliesTab />}
    </div>
  );
}
