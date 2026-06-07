import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Package, ArrowRightLeft, Wrench, Users, Activity, UserPlus,
  Check, X, Lock, Truck, ShoppingCart, ClipboardList, FileCheck, LifeBuoy,
  PieChart, Infinity, Clock, CalendarPlus, AlertTriangle, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../api';
import { useSettings } from '../context/Settings';

const MODULE_ICONS: Record<string, ReactNode> = {
  inventory:    <Package size={15} />,
  loans:        <ArrowRightLeft size={15} />,
  maintenance:  <Wrench size={15} />,
  personnel:    <Users size={15} />,
  monitoring:   <Activity size={15} />,
  providers:    <Truck size={15} />,
  purchases:    <ShoppingCart size={15} />,
  requests:     <ClipboardList size={15} />,
  contracts:    <FileCheck size={15} />,
  tickets:      <LifeBuoy size={15} />,
  cost_centers: <PieChart size={15} />,
};

interface Module {
  id: number; code: string; name: string; description: string;
  icon: string; color: string; enabled: boolean; is_mandatory: boolean;
  trial_type: string | null; trial_status: string | null;
  expires_at: string | null; unlimited: boolean;
}
interface User { id: number; name: string; email: string; role: string; is_active: boolean; last_login: string | null; }
interface TenantDetail {
  id: number; name: string; slug: string; status: string; plan: string;
  contact_email: string; country: string; primary_color: string; logo_url: string | null;
  trial_ends_at: string | null; max_users: number | null; max_assets: number | null;
  modules: Module[]; users: User[];
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Activo',     cls: 'bg-emerald-100 text-emerald-700' },
  trial:     { label: 'Prueba',     cls: 'bg-amber-100 text-amber-700' },
  suspended: { label: 'Suspendido', cls: 'bg-red-100 text-red-700' },
};

const PLAN_LABELS: Record<string, string> = {
  starter_free:  'Starter Free',
  starter:       'Starter',
  professional:  'Professional',
  enterprise:    'Enterprise',
};

function daysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
}

function TrialBadge({ expires_at, unlimited }: { expires_at: string | null; unlimited: boolean }) {
  if (unlimited) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold"
        style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}>
        <Infinity size={8} /> Ilimitado
      </span>
    );
  }
  const days = daysLeft(expires_at);
  if (days === null) return null;
  const urgent = days <= 7;
  const warn = days <= 15;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold"
      style={{
        background: urgent ? 'rgba(239,68,68,0.10)' : warn ? 'rgba(245,158,11,0.10)' : 'rgba(242,176,69,0.10)',
        color: urgent ? '#dc2626' : warn ? '#d97706' : '#b45309',
      }}>
      <Clock size={8} /> {days}d
    </span>
  );
}

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const { fmtDate } = useSettings();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'operator' });

  function load() {
    api.get<TenantDetail>(`/admin/tenants/${id}`).then(setTenant).finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  async function toggleModule(mod: Module) {
    await api.patch(`/admin/tenants/${id}/modules`, { module_id: mod.id, is_active: !mod.enabled });
    toast.success(`Módulo ${mod.enabled ? 'deshabilitado' : 'habilitado'}`);
    load();
  }

  async function toggleUserStatus(u: User) {
    try {
      await api.patch(`/admin/tenants/${id}/users/${u.id}/status`, { is_active: !u.is_active });
      toast.success(u.is_active ? 'Usuario desactivado' : 'Usuario activado');
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  async function addUser(e: FormEvent) {
    e.preventDefault();
    try {
      await api.post(`/admin/tenants/${id}/users`, userForm);
      toast.success('Usuario creado');
      setShowAddUser(false);
      setUserForm({ name: '', email: '', password: '', role: 'operator' });
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleTrialAction(modId: number, action: string, days?: number) {
    try {
      await api.patch(`/admin/tenants/${id}/module-trial`, { module_id: modId, action, days });
      toast.success(action === 'set_unlimited' ? 'Módulo activado como ilimitado' : `Extendido ${days} días`);
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <p className="text-[13px] font-semibold text-slate-400">Cargando...</p>
      </div>
    </div>
  );
  if (!tenant) return (
    <div className="text-center py-16">
      <p className="text-[14px] font-semibold text-slate-400">Empresa no encontrada</p>
    </div>
  );

  const statusInfo = STATUS_LABELS[tenant.status];
  const trialMods = tenant.modules.filter(m => m.enabled && m.trial_type === 'trial' && !m.unlimited);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap animate-fade-up">
        <Link to="/tenants"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex-shrink-0"
          style={{ border: '1px solid rgba(0,0,0,0.07)', transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)' }}>
          <ArrowLeft size={16} />
        </Link>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white text-[15px] flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${tenant.primary_color}, ${tenant.primary_color}BB)`, boxShadow: `0 4px 12px ${tenant.primary_color}40` }}>
            {tenant.name[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[18px] font-bold text-slate-900 tracking-[-0.025em]">{tenant.name}</h1>
              {statusInfo && <span className={`badge text-[10.5px] ${statusInfo.cls}`}>{statusInfo.label}</span>}
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
                style={{ background: 'rgba(242,176,69,0.10)', color: '#EDA135' }}>
                {PLAN_LABELS[tenant.plan] || tenant.plan}
              </span>
            </div>
            <p className="text-[12px] text-slate-400 font-medium mt-0.5 truncate">{tenant.contact_email || tenant.slug}</p>
          </div>
        </div>
      </div>

      {/* Trial summary banner */}
      {trialMods.length > 0 && (
        <div className="rounded-2xl p-4 flex items-start gap-3 animate-fade-up"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.20)' }}>
          <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-slate-800 mb-1">Módulos en período de prueba</p>
            <div className="flex flex-wrap gap-2">
              {trialMods.map(m => {
                const days = daysLeft(m.expires_at);
                return (
                  <span key={m.code} className="inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2.5 py-1 rounded-lg"
                    style={{ background: 'rgba(245,158,11,0.12)', color: '#b45309' }}>
                    {MODULE_ICONS[m.code] || <Package size={11} />}
                    {m.name}
                    {days !== null && <span className="font-bold">{days <= 0 ? '— vencido' : `· ${days}d`}</span>}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modules */}
      <div className="bg-white rounded-2xl p-5 animate-fade-up"
        style={{ border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h2 className="font-bold text-slate-900 text-[14px] mb-4 tracking-[-0.02em]">Módulos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tenant.modules.map(mod => {
            const days = daysLeft(mod.expires_at);
            const isTrialMod = mod.trial_type === 'trial' && !mod.unlimited;
            return (
              <div key={mod.id} className="rounded-2xl p-4"
                style={{
                  border: `1.5px solid ${mod.enabled ? 'rgba(242,176,69,0.20)' : 'rgba(0,0,0,0.07)'}`,
                  background: mod.enabled ? 'rgba(242,176,69,0.03)' : 'rgba(0,0,0,0.015)',
                  opacity: mod.enabled ? 1 : 0.55,
                }}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: mod.enabled ? 'rgba(242,176,69,0.12)' : 'rgba(0,0,0,0.06)', color: mod.enabled ? '#EDA135' : '#94a3b8' }}>
                      {MODULE_ICONS[mod.code] || <Package size={15} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-[13px] text-slate-900 tracking-[-0.01em]">{mod.name}</p>
                        {mod.is_mandatory && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold"
                            style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
                            <Lock size={7} /> Obligatorio
                          </span>
                        )}
                        {mod.enabled && <TrialBadge expires_at={mod.expires_at} unlimited={mod.unlimited} />}
                      </div>
                      {mod.expires_at && !mod.unlimited && (
                        <p className="text-[10.5px] text-slate-400 mt-0.5">
                          Vence: {fmtDate(mod.expires_at)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Toggle */}
                  {mod.is_mandatory ? (
                    <div className="relative inline-flex h-6 w-11 items-center rounded-full cursor-not-allowed opacity-80 flex-shrink-0"
                      style={{ background: '#F2B045' }}>
                      <span className="inline-block h-4 w-4 translate-x-6 transform rounded-full bg-white shadow" />
                    </div>
                  ) : (
                    <button onClick={() => toggleModule(mod)} aria-pressed={mod.enabled}
                      className="relative inline-flex h-6 w-11 items-center rounded-full flex-shrink-0"
                      style={{ background: mod.enabled ? '#F2B045' : '#e2e8f0', boxShadow: mod.enabled ? '0 2px 6px rgba(242,176,69,0.35)' : 'none', transition: 'all 200ms cubic-bezier(0.23, 1, 0.32, 1)' }}>
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white shadow"
                        style={{ transform: mod.enabled ? 'translateX(24px)' : 'translateX(4px)', transition: 'transform 200ms cubic-bezier(0.23, 1, 0.32, 1)' }} />
                    </button>
                  )}
                </div>

                {/* Trial management buttons */}
                {mod.enabled && !mod.is_mandatory && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <button onClick={() => handleTrialAction(mod.id, 'extend', 30)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold tap-scale hover:opacity-80 transition-opacity"
                      style={{ background: 'rgba(242,176,69,0.12)', color: '#b45309' }}>
                      <CalendarPlus size={11} /> +30d
                    </button>
                    <button onClick={() => handleTrialAction(mod.id, 'extend', 60)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold tap-scale hover:opacity-80 transition-opacity"
                      style={{ background: 'rgba(242,176,69,0.12)', color: '#b45309' }}>
                      <CalendarPlus size={11} /> +60d
                    </button>
                    <button onClick={() => handleTrialAction(mod.id, 'set_unlimited')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold tap-scale hover:opacity-80 transition-opacity"
                      style={{ background: isTrialMod ? 'rgba(34,197,94,0.10)' : 'rgba(99,102,241,0.10)', color: isTrialMod ? '#16a34a' : '#4f46e5' }}>
                      <Infinity size={11} /> Ilimitado
                    </button>
                    {isTrialMod && days !== null && days <= 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
                        style={{ background: 'rgba(239,68,68,0.10)', color: '#dc2626' }}>
                        <AlertTriangle size={11} /> Vencido
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Users */}
      <div className="bg-white rounded-2xl p-5 animate-fade-up"
        style={{ border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900 text-[14px] tracking-[-0.02em]">
            Usuarios <span className="text-slate-400 font-medium">({tenant.users.length})</span>
          </h2>
          <button onClick={() => setShowAddUser(!showAddUser)} className="btn-primary text-[12px] py-1.5">
            <UserPlus size={13} /> Añadir
          </button>
        </div>

        {showAddUser && (
          <form onSubmit={addUser} className="rounded-2xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-up"
            style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.07)' }}>
            <div>
              <label className="label">Nombre</label>
              <input className="input" value={userForm.name} onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input className="input" type="password" value={userForm.password} onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} required autoComplete="new-password" />
            </div>
            <div>
              <label className="label">Rol</label>
              <select className="input" value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value }))}>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="operator">Operador</option>
                <option value="viewer">Visualizador</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" className="btn-primary flex-1">Crear usuario</button>
              <button type="button" onClick={() => setShowAddUser(false)} className="btn-ghost flex-1">Cancelar</button>
            </div>
          </form>
        )}

        <div className="divide-y divide-slate-50">
          {tenant.users.map(u => (
            <div key={u.id} className="flex items-center justify-between py-3.5 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[12px] text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #94a3b8, #64748b)' }}>
                  {u.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-slate-900 tracking-[-0.01em] truncate">{u.name}</p>
                  <p className="text-[11px] text-slate-400 font-medium truncate">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="badge bg-slate-100 text-slate-600 text-[10.5px] hidden sm:inline-flex">{u.role}</span>
                {u.is_active
                  ? <span className="badge bg-emerald-100 text-emerald-700 text-[10.5px]"><Check size={9} /> Activo</span>
                  : <span className="badge bg-slate-100 text-slate-400 text-[10.5px]"><X size={9} /> Inactivo</span>
                }
                <button onClick={() => toggleUserStatus(u)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg ${u.is_active ? 'text-slate-400 hover:text-red-500 hover:bg-red-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                  style={{ transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)' }}
                  title={u.is_active ? 'Desactivar' : 'Activar'}>
                  {u.is_active ? <X size={12} /> : <Check size={12} />}
                </button>
              </div>
            </div>
          ))}
          {tenant.users.length === 0 && (
            <div className="flex flex-col items-center py-10 gap-2.5 text-slate-400">
              <Users size={24} className="text-slate-200" />
              <p className="text-[13px] font-semibold">Sin usuarios registrados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
