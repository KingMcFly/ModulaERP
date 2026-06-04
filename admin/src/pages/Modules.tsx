import { useEffect, useState, type ReactElement } from 'react';
import {
  Package, ArrowRightLeft, Wrench, Users, Activity, Pencil, Check, X,
  Truck, ShoppingCart, ClipboardList, FileCheck, LifeBuoy, PieChart,
  FlaskConical, Boxes,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../api';

interface Module { id: number; code: string; name: string; description: string; icon: string; color: string; is_active: boolean; sort_order: number; }

const ICONS: Record<string, ReactElement> = {
  // By icon name stored in DB
  Package:       <Package        size={20} />,
  ArrowRightLeft:<ArrowRightLeft size={20} />,
  Wrench:        <Wrench         size={20} />,
  Users:         <Users          size={20} />,
  Activity:      <Activity       size={20} />,
  Truck:         <Truck          size={20} />,
  ShoppingCart:  <ShoppingCart   size={20} />,
  ClipboardList: <ClipboardList  size={20} />,
  FileCheck:     <FileCheck      size={20} />,
  LifeBuoy:      <LifeBuoy       size={20} />,
  PieChart:      <PieChart       size={20} />,
  FlaskConical:  <FlaskConical   size={20} />,
  Boxes:         <Boxes          size={20} />,
  // By module code (fallback)
  inventory:     <Package        size={20} />,
  loans:         <ArrowRightLeft size={20} />,
  maintenance:   <Wrench         size={20} />,
  personnel:     <Users          size={20} />,
  monitoring:    <Activity       size={20} />,
  providers:     <Truck          size={20} />,
  purchases:     <ShoppingCart   size={20} />,
  requests:      <ClipboardList  size={20} />,
  contracts:     <FileCheck      size={20} />,
  tickets:       <LifeBuoy       size={20} />,
  cost_centers:  <PieChart       size={20} />,
  supplies:      <FlaskConical   size={20} />,
};

function Skeleton() {
  return (
    <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="w-14 h-5 rounded-full bg-slate-100 animate-pulse" />
      </div>
      <div className="w-24 h-4 bg-slate-100 rounded-lg animate-pulse mb-2" />
      <div className="w-full h-3 bg-slate-100 rounded-lg animate-pulse mb-1" />
      <div className="w-3/4 h-3 bg-slate-100 rounded-lg animate-pulse" />
    </div>
  );
}

export default function Modules() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Module>>({});

  useEffect(() => {
    api.get<Module[]>('/admin/modules').then(setModules).finally(() => setLoading(false));
  }, []);

  function startEdit(m: Module) { setEditing(m.id); setForm({ ...m }); }

  async function saveEdit(id: number) {
    try {
      await api.put(`/admin/modules/${id}`, form);
      toast.success('Módulo actualizado');
      setEditing(null);
      api.get<Module[]>('/admin/modules').then(setModules);
    } catch (err: any) { toast.error(err.message); }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="animate-fade-up">
        <h1 className="text-[24px] font-bold text-slate-900 tracking-[-0.03em]">Módulos</h1>
        <p className="text-slate-400 text-[13px] mt-0.5 font-medium">Catálogo global de módulos de la plataforma</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? [0, 1, 2, 3, 4].map(i => <Skeleton key={i} />)
          : modules.map((m, i) => (
            <div
              key={m.id}
              className="bg-white rounded-2xl p-5 animate-fade-up group"
              style={{
                border: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                animationDelay: `${i * 50}ms`,
                transition: 'box-shadow 250ms cubic-bezier(0.23, 1, 0.32, 1)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.09), 0 8px 32px rgba(0,0,0,0.05)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
              }}
            >
              {editing === m.id ? (
                <div className="space-y-3">
                  <div>
                    <label className="label">Nombre</label>
                    <input className="input" value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Descripción</label>
                    <textarea
                      className="input resize-none"
                      rows={2}
                      value={form.description || ''}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={form.color || '#F2B045'}
                        onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                        className="h-10 w-12 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                      />
                      <input
                        className="input flex-1"
                        value={form.color || ''}
                        onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                        placeholder="#F2B045"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => saveEdit(m.id)} className="btn-primary flex-1 text-[12px] py-1.5">
                      <Check size={12} /> Guardar
                    </button>
                    <button onClick={() => setEditing(null)} className="btn-ghost flex-1 text-[12px] py-1.5">
                      <X size={12} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${m.color}22, ${m.color}0E)`,
                        color: m.color || '#F2B045',
                      }}
                    >
                      {ICONS[m.icon] ?? ICONS[m.code] ?? <Package size={20} />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`badge text-[10.5px] ${
                          m.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {m.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                      <button
                        onClick={() => startEdit(m)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        style={{ transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)' }}
                        title="Editar módulo"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-900 text-[14px] tracking-[-0.02em]">{m.name}</h3>
                  <p className="text-[12px] text-slate-400 mt-1 font-medium leading-relaxed">{m.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span
                      className="text-[10.5px] font-bold px-2 py-0.5 rounded-lg font-mono"
                      style={{ background: 'rgba(0,0,0,0.04)', color: '#65656E' }}
                    >
                      {m.code}
                    </span>
                    <span className="text-[10.5px] font-semibold text-slate-300">
                      #{m.sort_order}
                    </span>
                  </div>
                </>
              )}
            </div>
          ))
        }
      </div>
    </div>
  );
}
