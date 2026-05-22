import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Building2, ExternalLink, CheckCircle2, PauseCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../api';

interface Tenant {
  id: number; name: string; slug: string; status: string; plan: string;
  contact_email: string; country: string; user_count: number; module_count: number; created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Activo',     cls: 'bg-emerald-100 text-emerald-700' },
  trial:     { label: 'Prueba',     cls: 'bg-amber-100 text-amber-700' },
  suspended: { label: 'Suspendido', cls: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelado',  cls: 'bg-slate-100 text-slate-500' },
};

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise',
};
const PLAN_COLORS: Record<string, string> = {
  starter: '#F2B045', professional: '#0ea5e9', enterprise: '#10b981',
};

const MANDATORY_MODULES = [
  { code: 'inventory', label: 'Inventario' },
  { code: 'personnel', label: 'Personal' },
];
const OPTIONAL_MODULES = [
  { code: 'loans',        label: 'Préstamos' },
  { code: 'maintenance',  label: 'Mantenimientos' },
  { code: 'monitoring',   label: 'Monitoreo' },
  { code: 'supplies',     label: 'Insumos' },
  { code: 'contracts',    label: 'Contratos' },
  { code: 'providers',    label: 'Proveedores' },
  { code: 'purchases',    label: 'Compras' },
  { code: 'requests',     label: 'Solicitudes' },
  { code: 'tickets',      label: 'Tickets' },
  { code: 'cost_centers', label: 'Centros de costo' },
];

interface CreateModalProps { onClose: () => void; onCreated: () => void; }

function CreateModal({ onClose, onCreated }: CreateModalProps) {
  const [form, setForm] = useState({ name: '', slug: '', contact_email: '', country: '', plan: 'starter', primary_color: '#6366F1' });
  const [modules, setModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) { setForm(p => ({ ...p, [field]: value })); }
  function toggleModule(code: string) {
    setModules(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.slug) return toast.error('Nombre y slug requeridos');
    setLoading(true);
    try {
      await api.post('/admin/tenants', { ...form, module_codes: modules });
      toast.success('Empresa creada');
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        animation: 'fade-in 0.18s cubic-bezier(0.23, 1, 0.32, 1) both',
      }}
    >
      <div
        className="bg-white w-full max-w-lg p-6"
        style={{
          borderRadius: '24px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.06)',
          animation: 'slide-up 0.22s cubic-bezier(0.23, 1, 0.32, 1) both',
        }}
      >
        <h2 className="text-[17px] font-bold text-slate-900 mb-5 tracking-[-0.02em]">Nueva empresa</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tenant-name" className="label">Nombre</label>
              <input id="tenant-name" className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Empresa S.A." required />
            </div>
            <div>
              <label htmlFor="tenant-slug" className="label">Slug (URL)</label>
              <input id="tenant-slug" className="input" value={form.slug} onChange={e => set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))} placeholder="empresa-sa" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tenant-email" className="label">Email</label>
              <input id="tenant-email" className="input" type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
            </div>
            <div>
              <label htmlFor="tenant-country" className="label">País</label>
              <input id="tenant-country" className="input" value={form.country} onChange={e => set('country', e.target.value)} placeholder="Chile" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tenant-plan" className="label">Plan</label>
              <select id="tenant-plan" className="input" value={form.plan} onChange={e => set('plan', e.target.value)}>
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label htmlFor="tenant-color-hex" className="label">Color principal</label>
              <div className="flex gap-2">
                <input
                  id="tenant-color"
                  type="color"
                  value={form.primary_color}
                  onChange={e => set('primary_color', e.target.value)}
                  className="h-10 w-12 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                  aria-label="Selector de color"
                  style={{ transition: 'box-shadow 160ms cubic-bezier(0.23, 1, 0.32, 1)' }}
                />
                <input id="tenant-color-hex" className="input flex-1" value={form.primary_color} onChange={e => set('primary_color', e.target.value)} />
              </div>
            </div>
          </div>
          <div>
            <p className="label mb-2" id="modules-label">Módulos</p>
            <div className="grid grid-cols-2 gap-2 mb-2" role="group">
              {MANDATORY_MODULES.map(m => (
                <div
                  key={m.code}
                  className="flex items-center gap-2 p-2.5 rounded-xl"
                  style={{ border: '1.5px solid rgba(242,176,69,0.30)', background: 'rgba(242,176,69,0.06)' }}
                >
                  <input type="checkbox" checked readOnly className="rounded w-3.5 h-3.5" />
                  <span className="text-[13px] font-semibold text-slate-700 flex-1">{m.label}</span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
                    <Lock size={7} /> Obligatorio
                  </span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="modules-label">
              {OPTIONAL_MODULES.map(m => (
                <label
                  key={m.code}
                  className="flex items-center gap-2 p-2.5 rounded-xl cursor-pointer"
                  style={{
                    border: `1.5px solid ${modules.includes(m.code) ? 'rgba(242,176,69,0.30)' : 'rgba(0,0,0,0.08)'}`,
                    background: modules.includes(m.code) ? 'rgba(242,176,69,0.06)' : 'white',
                    transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={modules.includes(m.code)}
                    onChange={() => toggleModule(m.code)}
                    className="rounded text-primary-600 w-3.5 h-3.5"
                  />
                  <span className="text-[13px] font-semibold text-slate-700">{m.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Creando...' : 'Crear empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`} />;
}

export default function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch]   = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    api.get<Tenant[]>('/admin/tenants').then(setTenants).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function toggleStatus(t: Tenant) {
    const newStatus = t.status === 'active' ? 'suspended' : 'active';
    await api.patch(`/admin/tenants/${t.id}/status`, { status: newStatus });
    toast.success('Estado actualizado');
    load();
  }

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="text-[24px] font-bold text-slate-900 tracking-[-0.03em]">Empresas</h1>
          <p className="text-slate-400 text-[13px] mt-0.5 font-medium">
            {tenants.length} empresa{tenants.length !== 1 ? 's' : ''} registradas
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={15} /> Nueva empresa
        </button>
      </div>

      {/* Search */}
      <div
        className="bg-white rounded-2xl p-4 animate-fade-up delay-40"
        style={{ border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Buscar empresa por nombre o slug..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Buscar empresa"
          />
        </div>
      </div>

      {/* Table */}
      <div
        className="bg-white rounded-2xl overflow-hidden animate-fade-up delay-80"
        style={{ border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', background: 'rgba(0,0,0,0.015)' }}>
              {['Empresa', 'Plan', 'Estado', 'Usuarios', 'Módulos', ''].map(h => (
                <th
                  key={h}
                  className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-[0.07em] px-6 py-3.5"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
                      <div className="space-y-1.5">
                        <Skeleton className="w-32 h-3.5 rounded" />
                        <Skeleton className="w-20 h-2.5 rounded" />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><Skeleton className="w-20 h-3.5 rounded" /></td>
                  <td className="px-6 py-4"><Skeleton className="w-16 h-5 rounded-full" /></td>
                  <td className="px-6 py-4"><Skeleton className="w-8 h-3.5 rounded" /></td>
                  <td className="px-6 py-4"><Skeleton className="w-8 h-3.5 rounded" /></td>
                  <td className="px-6 py-4"><Skeleton className="w-32 h-7 rounded-xl" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Building2 size={20} className="text-slate-300" />
                    </div>
                    <p className="text-[13px] font-semibold text-slate-400">Sin resultados</p>
                    <p className="text-[12px] text-slate-300">Intenta con otro término de búsqueda</p>
                  </div>
                </td>
              </tr>
            ) : filtered.map((t, rowIdx) => {
              const s = STATUS_LABELS[t.status];
              const planColor = PLAN_COLORS[t.plan] || '#F2B045';
              return (
                <tr
                  key={t.id}
                  style={{
                    borderBottom: rowIdx < filtered.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                    transition: 'background-color 160ms cubic-bezier(0.23, 1, 0.32, 1)',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(0,0,0,0.015)'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[13px] flex-shrink-0"
                        style={{
                          background: `linear-gradient(135deg, #F2B045, #EDA135)`,
                          boxShadow: '0 2px 6px rgba(242,176,69,0.28)',
                          color: '#131316',
                        }}
                      >
                        {t.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-[13px] tracking-[-0.01em]">{t.name}</p>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">{t.contact_email || t.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="text-[12px] font-bold px-2.5 py-1 rounded-lg"
                      style={{ background: `${planColor}12`, color: planColor }}
                    >
                      {PLAN_LABELS[t.plan] || t.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge text-[10.5px] ${s?.cls}`}>{s?.label}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[13px] font-semibold text-slate-600">{t.user_count}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[13px] font-semibold text-slate-600">{t.module_count}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        to={`/tenants/${t.id}`}
                        className="btn-ghost py-1.5 px-3 text-[12px] font-semibold"
                      >
                        <ExternalLink size={13} /> Gestionar
                      </Link>
                      <button
                        onClick={() => toggleStatus(t)}
                        className={`inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-[12px] font-semibold ${
                          t.status === 'active'
                            ? 'text-red-500 hover:bg-red-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        style={{ transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)' }}
                      >
                        {t.status === 'active'
                          ? <><PauseCircle size={13} /> Suspender</>
                          : <><CheckCircle2 size={13} /> Activar</>
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && <CreateModal onClose={() => setShowModal(false)} onCreated={load} />}
    </div>
  );
}
