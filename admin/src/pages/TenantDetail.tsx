import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Package, ArrowRightLeft, Wrench, Users, Activity, UserPlus, Check, X, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../api';

const MODULE_ICONS: Record<string, React.ReactNode> = {
  inventory:   <Package         size={16} />,
  loans:       <ArrowRightLeft  size={16} />,
  maintenance: <Wrench          size={16} />,
  personnel:   <Users           size={16} />,
  monitoring:  <Activity        size={16} />,
};

interface Module { id: number; code: string; name: string; description: string; icon: string; color: string; enabled: boolean; is_mandatory: boolean; }
interface User   { id: number; name: string; email: string; role: string; is_active: boolean; last_login: string | null; }
interface TenantDetail {
  id: number; name: string; slug: string; status: string; plan: string;
  contact_email: string; country: string; primary_color: string; logo_url: string | null;
  modules: Module[]; users: User[];
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Activo',     cls: 'bg-emerald-100 text-emerald-700' },
  trial:     { label: 'Prueba',     cls: 'bg-amber-100 text-amber-700' },
  suspended: { label: 'Suspendido', cls: 'bg-red-100 text-red-700' },
};
const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise',
};

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
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

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post(`/admin/tenants/${id}/users`, userForm);
      toast.success('Usuario creado');
      setShowAddUser(false);
      setUserForm({ name: '', email: '', password: '', role: 'operator' });
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
          <p className="text-[13px] font-semibold text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }
  if (!tenant) {
    return (
      <div className="text-center py-16">
        <p className="text-[14px] font-semibold text-slate-400">Empresa no encontrada</p>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[tenant.status];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 animate-fade-up">
        <Link
          to="/tenants"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          style={{ transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)', border: '1px solid rgba(0,0,0,0.07)' }}
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white text-[16px] flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${tenant.primary_color}, ${tenant.primary_color}BB)`,
              boxShadow: `0 4px 12px ${tenant.primary_color}40`,
            }}
          >
            {tenant.name[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[20px] font-bold text-slate-900 tracking-[-0.025em]">{tenant.name}</h1>
              {statusInfo && (
                <span className={`badge text-[10.5px] ${statusInfo.cls}`}>{statusInfo.label}</span>
              )}
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
                style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}
              >
                {PLAN_LABELS[tenant.plan] || tenant.plan}
              </span>
            </div>
            <p className="text-[12px] text-slate-400 font-medium mt-0.5 truncate">{tenant.contact_email || tenant.slug}</p>
          </div>
        </div>
      </div>

      {/* Modules */}
      <div
        className="bg-white rounded-2xl p-6 animate-fade-up delay-80"
        style={{ border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <h2 className="font-bold text-slate-900 text-[14px] mb-4 tracking-[-0.02em]">
          Módulos habilitados
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tenant.modules.map((mod, idx) => (
            <div
              key={mod.id}
              className="flex items-center justify-between p-4 rounded-2xl"
              style={{
                border: `1.5px solid ${mod.enabled ? 'rgba(99,102,241,0.20)' : 'rgba(0,0,0,0.07)'}`,
                background: mod.enabled ? 'rgba(99,102,241,0.04)' : 'rgba(0,0,0,0.015)',
                opacity: mod.enabled ? 1 : 0.65,
                transition: 'all 200ms cubic-bezier(0.23, 1, 0.32, 1)',
                animationDelay: `${idx * 40 + 80}ms`,
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: mod.enabled ? 'rgba(99,102,241,0.12)' : 'rgba(0,0,0,0.06)',
                    color: mod.enabled ? '#6366f1' : '#94a3b8',
                  }}
                >
                  {MODULE_ICONS[mod.code] || <Package size={16} />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-[13px] text-slate-900 tracking-[-0.01em]">{mod.name}</p>
                    {mod.is_mandatory && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold"
                        style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}
                      >
                        <Lock size={7} /> Obligatorio
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                    {mod.description?.slice(0, 38)}{mod.description?.length > 38 ? '…' : ''}
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0 ml-3">
                {mod.is_mandatory ? (
                  <div
                    className="relative inline-flex h-6 w-11 items-center rounded-full cursor-not-allowed opacity-80"
                    style={{ background: '#6366f1' }}
                    title="Módulo obligatorio"
                  >
                    <span className="inline-block h-4 w-4 translate-x-6 transform rounded-full bg-white shadow" />
                  </div>
                ) : (
                  <button
                    onClick={() => toggleModule(mod)}
                    aria-pressed={mod.enabled}
                    aria-label={`${mod.enabled ? 'Deshabilitar' : 'Habilitar'} ${mod.name}`}
                    className="relative inline-flex h-6 w-11 items-center rounded-full"
                    style={{
                      background: mod.enabled ? '#6366f1' : '#e2e8f0',
                      boxShadow: mod.enabled ? '0 2px 6px rgba(99,102,241,0.35)' : 'none',
                      transition: 'all 200ms cubic-bezier(0.23, 1, 0.32, 1)',
                    }}
                  >
                    <span
                      className="inline-block h-4 w-4 transform rounded-full bg-white shadow"
                      style={{
                        transform: mod.enabled ? 'translateX(24px)' : 'translateX(4px)',
                        transition: 'transform 200ms cubic-bezier(0.23, 1, 0.32, 1)',
                      }}
                    />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Users */}
      <div
        className="bg-white rounded-2xl p-6 animate-fade-up delay-150"
        style={{ border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900 text-[14px] tracking-[-0.02em]">
            Usuarios <span className="text-slate-400 font-medium">({tenant.users.length})</span>
          </h2>
          <button
            onClick={() => setShowAddUser(!showAddUser)}
            className="btn-primary text-[12px] py-1.5"
          >
            <UserPlus size={13} /> Añadir usuario
          </button>
        </div>

        {showAddUser && (
          <form
            onSubmit={addUser}
            className="rounded-2xl p-4 mb-4 grid grid-cols-2 gap-3 animate-fade-up"
            style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.07)' }}
          >
            <div>
              <label htmlFor="td-user-name" className="label">Nombre</label>
              <input id="td-user-name" className="input" value={userForm.name} onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label htmlFor="td-user-email" className="label">Email</label>
              <input id="td-user-email" className="input" type="email" value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div>
              <label htmlFor="td-user-password" className="label">Contraseña</label>
              <input id="td-user-password" className="input" type="password" value={userForm.password} onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} required autoComplete="new-password" />
            </div>
            <div>
              <label htmlFor="td-user-role" className="label">Rol</label>
              <select id="td-user-role" className="input" value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value }))}>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="operator">Operador</option>
                <option value="viewer">Visualizador</option>
              </select>
            </div>
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="btn-primary flex-1">Crear usuario</button>
              <button type="button" onClick={() => setShowAddUser(false)} className="btn-ghost flex-1">Cancelar</button>
            </div>
          </form>
        )}

        <div className="space-y-0">
          {tenant.users.map((u, i) => (
            <div
              key={u.id}
              className="flex items-center justify-between py-3.5"
              style={{ borderBottom: i < tenant.users.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[12px] text-white flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #94a3b8, #64748b)',
                  }}
                >
                  {u.name[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-[13px] font-bold text-slate-900 tracking-[-0.01em]">{u.name}</p>
                  <p className="text-[11px] text-slate-400 font-medium">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge bg-slate-100 text-slate-600 text-[10.5px]">{u.role}</span>
                {u.is_active
                  ? <span className="badge bg-emerald-100 text-emerald-700 text-[10.5px]"><Check size={9} /> Activo</span>
                  : <span className="badge bg-slate-100 text-slate-400 text-[10.5px]"><X size={9} /> Inactivo</span>
                }
                <button
                  onClick={() => toggleUserStatus(u)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs ${
                    u.is_active
                      ? 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                      : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                  }`}
                  style={{ transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)' }}
                  title={u.is_active ? 'Desactivar' : 'Activar'}
                >
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
