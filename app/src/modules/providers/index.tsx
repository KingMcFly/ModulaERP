import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Truck, Mail, Phone, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
function authFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('token');
  return fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers||{}) } });
}

interface Provider { id: number; name: string; rut: string; contact_name: string; email: string; phone: string; address: string; category: string; notes: string; }

function ProviderForm({ item, onClose, onSaved }: { item?: Provider|null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: item?.name||'', rut: item?.rut||'', contact_name: item?.contact_name||'', email: item?.email||'', phone: item?.phone||'', address: item?.address||'', category: item?.category||'', notes: item?.notes||'' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const r = await authFetch(item ? `/providers/${item.id}` : '/providers', { method: item ? 'PUT' : 'POST', body: JSON.stringify(f) });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      toast.success(item ? 'Proveedor actualizado' : 'Proveedor creado'); onSaved(); onClose();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-soft-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-slate-900 mb-5">{item ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label htmlFor="prov-name" className="label">Nombre *</label><input id="prov-name" className="input" value={f.name} onChange={e => set('name', e.target.value)} required /></div>
            <div><label htmlFor="prov-rut" className="label">RUT</label><input id="prov-rut" className="input" value={f.rut} onChange={e => set('rut', e.target.value)} /></div>
            <div><label htmlFor="prov-category" className="label">Categoría</label><input id="prov-category" className="input" value={f.category} onChange={e => set('category', e.target.value)} placeholder="Ej: TI, Mantenimiento..." /></div>
            <div><label htmlFor="prov-contact" className="label">Contacto</label><input id="prov-contact" className="input" value={f.contact_name} onChange={e => set('contact_name', e.target.value)} /></div>
            <div><label htmlFor="prov-phone" className="label">Teléfono</label><input id="prov-phone" className="input" value={f.phone} onChange={e => set('phone', e.target.value)} /></div>
            <div className="col-span-2"><label htmlFor="prov-email" className="label">Email</label><input id="prov-email" className="input" type="email" value={f.email} onChange={e => set('email', e.target.value)} /></div>
            <div className="col-span-2"><label htmlFor="prov-address" className="label">Dirección</label><input id="prov-address" className="input" value={f.address} onChange={e => set('address', e.target.value)} /></div>
            <div className="col-span-2"><label htmlFor="prov-notes" className="label">Notas</label><textarea id="prov-notes" className="input resize-none" rows={2} value={f.notes} onChange={e => set('notes', e.target.value)} /></div>
          </div>
          <div className="flex gap-3 pt-1"><button type="button" onClick={onClose} className="flex-1 btn btn-ghost">Cancelar</button><button type="submit" disabled={saving} className="flex-1 btn btn-primary">{saving ? 'Guardando...' : 'Guardar'}</button></div>
        </form>
      </div>
    </div>
  );
}

export default function ProvidersModule() {
  const { canWrite, canDelete } = useAuth();
  const [items, setItems] = useState<Provider[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Provider|null|undefined>(undefined);

  const load = useCallback(() => {
    const p = search ? `?search=${encodeURIComponent(search)}` : '';
    authFetch(`/providers${p}`).then(r => r.json()).then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); });
  }, [search]);
  useEffect(() => { load(); }, [load]);

  async function del(id: number) {
    if (!confirm('¿Eliminar proveedor?')) return;
    await authFetch(`/providers/${id}`, { method: 'DELETE' });
    toast.success('Proveedor eliminado'); load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Proveedores</h1><p className="text-slate-500 text-sm mt-0.5">Gestión de proveedores y contactos</p></div>
        {canWrite('providers') && <button onClick={() => setEditing(null)} className="btn btn-primary"><Plus size={16} /> Nuevo Proveedor</button>}
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-soft">
        <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input pl-9" placeholder="Buscar por nombre, RUT o contacto..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-slate-400 text-sm col-span-3 text-center py-12">Cargando...</p>
        ) : items.length === 0 ? (
          <div className="col-span-3 py-16 flex flex-col items-center gap-2 text-slate-400"><Truck size={32} className="text-slate-200" /><p className="text-sm">Sin proveedores. Haz clic en "Nuevo Proveedor".</p></div>
        ) : items.map(p => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0"><Truck size={18} className="text-violet-500" aria-hidden="true" /></div>
              <div className="flex gap-1">
                {canWrite('providers') && <button onClick={() => setEditing(p)} className="p-1.5 text-slate-400 hover:text-primary-700 rounded-lg transition-colors"><Edit2 size={14} aria-hidden="true" /></button>}
                {canDelete('providers') && <button onClick={() => del(p.id)} className="p-1.5 text-slate-400 hover:text-red-700 rounded-lg transition-colors"><Trash2 size={14} aria-hidden="true" /></button>}
              </div>
            </div>
            <h3 className="font-semibold text-slate-900 text-sm mb-0.5 truncate">{p.name}</h3>
            {p.rut && <p className="text-xs text-slate-500 mb-2">RUT: {p.rut}</p>}
            {p.category && <span className="inline-block text-[10px] font-semibold bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full mb-2">{p.category}</span>}
            <div className="space-y-1 mt-2">
              {p.contact_name && <p className="text-xs text-slate-500 flex items-center gap-1.5"><Building2 size={11} aria-hidden="true" />{p.contact_name}</p>}
              {p.email && <p className="text-xs text-slate-500 flex items-center gap-1.5"><Mail size={11} aria-hidden="true" />{p.email}</p>}
              {p.phone && <p className="text-xs text-slate-500 flex items-center gap-1.5"><Phone size={11} aria-hidden="true" />{p.phone}</p>}
            </div>
          </div>
        ))}
      </div>
      {editing !== undefined && <ProviderForm item={editing} onClose={() => setEditing(undefined)} onSaved={load} />}
    </div>
  );
}
