import { useEffect, useState, type FormEvent } from 'react';
import { UserPlus, Pencil, KeyRound, Check, X, Shield, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../api';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

const EMPTY_FORM = { name: '', email: '', password: '', role: 'admin' };

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`} />;
}

export default function Users() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pwdUserId, setPwdUserId] = useState<number | null>(null);
  const [newPwd, setNewPwd] = useState('');

  function load() {
    api.get<AdminUser[]>('/admin/users').then(setUsers).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); }
  function openEdit(u: AdminUser) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/admin/users/${editing.id}`, { name: form.name, email: form.email, role: form.role });
        toast.success('Usuario actualizado');
      } else {
        await api.post('/admin/users', form);
        toast.success('Usuario creado');
      }
      setShowForm(false);
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  async function toggleStatus(u: AdminUser) {
    try {
      await api.patch(`/admin/users/${u.id}/status`, { is_active: !u.is_active });
      toast.success(u.is_active ? 'Usuario desactivado' : 'Usuario activado');
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  async function resetPassword(e: FormEvent) {
    e.preventDefault();
    if (!pwdUserId) return;
    try {
      await api.patch(`/admin/users/${pwdUserId}/password`, { password: newPwd });
      toast.success('Contraseña actualizada');
      setPwdUserId(null);
      setNewPwd('');
    } catch (err: any) { toast.error(err.message); }
  }

  return (
    <div className="space-y-5 sm:space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 animate-fade-up">
        <div className="min-w-0">
          <h1 className="text-[22px] sm:text-[24px] font-bold text-slate-900 tracking-[-0.03em]">Usuarios del panel</h1>
          <p className="text-slate-400 text-[13px] mt-0.5 font-medium">
            Administradores con acceso a FB Core Admin
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex-shrink-0">
          <UserPlus size={15} /> <span className="hidden sm:inline">Nuevo usuario</span><span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div
          className="bg-white rounded-2xl p-6 animate-fade-up"
          style={{
            border: '1.5px solid rgba(242,176,69,0.20)',
            boxShadow: '0 2px 8px rgba(242,176,69,0.08), 0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <h2 className="font-bold text-slate-900 text-[14px] mb-4 tracking-[-0.02em]">
            {editing ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="user-name" className="label">Nombre</label>
              <input id="user-name" className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label htmlFor="user-email" className="label">Email</label>
              <input id="user-email" className="input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            {!editing && (
              <div>
                <label htmlFor="user-password" className="label">Contraseña</label>
                <input id="user-password" className="input" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} autoComplete="new-password" minLength={8} required />
                <p className="text-[11px] text-slate-400 mt-1 font-medium">Mínimo 8 caracteres</p>
              </div>
            )}
            <div>
              <label htmlFor="user-role" className="label">Rol</label>
              <select id="user-role" className="input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex gap-2 pt-2">
              <button type="submit" className="btn-primary flex-1">{editing ? 'Guardar cambios' : 'Crear usuario'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Reset password modal */}
      {pwdUserId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            animation: 'fade-in 0.18s cubic-bezier(0.23, 1, 0.32, 1) both',
          }}
        >
          <div
            className="bg-white w-full sm:max-w-sm p-5 sm:p-6 rounded-t-[24px] sm:rounded-[24px]"
            style={{
              border: '1px solid rgba(0,0,0,0.07)',
              boxShadow: '0 -8px 48px rgba(0,0,0,0.14), 0 16px 48px rgba(0,0,0,0.14)',
              animation: 'slide-up 0.22s cubic-bezier(0.23, 1, 0.32, 1) both',
              paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
            }}
          >
            <h2 className="font-bold text-slate-900 text-[15px] mb-4 tracking-[-0.02em]">Cambiar contraseña</h2>
            <form onSubmit={resetPassword} className="space-y-3">
              <div>
                <label htmlFor="reset-password" className="label">Nueva contraseña</label>
                <input
                  id="reset-password"
                  className="input"
                  type="password"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="btn-primary flex-1">Guardar</button>
                <button type="button" onClick={() => { setPwdUserId(null); setNewPwd(''); }} className="btn-ghost flex-1">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MOBILE / TABLET: card list ─────────────────────────── */}
      <div className="lg:hidden space-y-3 animate-fade-up delay-80">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="flex items-center gap-3">
                <Skeleton className="w-11 h-11 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="w-2/3 h-3.5 rounded" />
                  <Skeleton className="w-1/2 h-2.5 rounded" />
                </div>
              </div>
            </div>
          ))
        ) : users.length === 0 ? (
          <div className="bg-white rounded-2xl py-14 flex flex-col items-center gap-2.5" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <UsersIcon size={20} className="text-slate-300" />
            </div>
            <p className="text-[13px] font-semibold text-slate-400">Sin usuarios</p>
          </div>
        ) : users.map(u => (
          <div
            key={u.id}
            className="bg-white rounded-2xl p-4"
            style={{ border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-[15px] flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #F2B045, #EDA135)', boxShadow: '0 2px 6px rgba(242,176,69,0.28)', color: '#131316' }}
              >
                {u.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-[15px] tracking-[-0.01em] truncate">{u.name}</p>
                <p className="text-[12px] text-slate-400 font-medium mt-0.5 truncate">{u.email}</p>
              </div>
              {u.is_active
                ? <span className="badge bg-emerald-100 text-emerald-700 text-[10.5px] flex-shrink-0"><Check size={9} /> Activo</span>
                : <span className="badge bg-slate-100 text-slate-400 text-[10.5px] flex-shrink-0"><X size={9} /> Inactivo</span>}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                style={u.role === 'super_admin'
                  ? { background: 'rgba(139,92,246,0.10)', color: '#7c3aed' }
                  : { background: 'rgba(59,130,246,0.10)', color: '#2563eb' }}
              >
                <Shield size={10} />
                {u.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </span>
              <span className="text-[12px] font-medium text-slate-400 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.04)' }}>
                {u.last_login
                  ? new Date(u.last_login).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                  : 'Nunca'}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-3.5 pt-3.5" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <button
                onClick={() => openEdit(u)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold text-slate-700"
                style={{ background: 'rgba(0,0,0,0.04)' }}
              >
                <Pencil size={14} /> Editar
              </button>
              <button
                onClick={() => { setPwdUserId(u.id); setNewPwd(''); }}
                className="inline-flex items-center justify-center w-[42px] h-[42px] rounded-xl text-amber-600"
                style={{ background: 'rgba(245,158,11,0.10)' }}
                aria-label="Cambiar contraseña"
              >
                <KeyRound size={15} />
              </button>
              <button
                onClick={() => toggleStatus(u)}
                className={`inline-flex items-center justify-center w-[42px] h-[42px] rounded-xl ${u.is_active ? 'text-red-600' : 'text-emerald-700'}`}
                style={{ background: u.is_active ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.10)' }}
                aria-label={u.is_active ? 'Desactivar' : 'Activar'}
              >
                {u.is_active ? <X size={15} /> : <Check size={15} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ─── DESKTOP: table ─────────────────────────────────────── */}
      <div
        className="hidden lg:block bg-white rounded-2xl overflow-hidden animate-fade-up delay-80"
        style={{ border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <div className="overflow-x-auto">
        {loading ? (
          <div className="p-6 space-y-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40 rounded" />
                  <Skeleton className="h-2.5 w-28 rounded" />
                </div>
                <Skeleton className="w-20 h-5 rounded-full" />
                <Skeleton className="w-16 h-5 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full min-w-[560px] text-[13px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', background: 'rgba(0,0,0,0.015)' }}>
                {['Usuario', 'Rol', 'Último acceso', 'Estado', ''].map(h => (
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
              {users.map((u, i) => (
                <tr
                  key={u.id}
                  style={{
                    borderBottom: i < users.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                    transition: 'background-color 160ms cubic-bezier(0.23, 1, 0.32, 1)',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(0,0,0,0.015)'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[13px] text-white flex-shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, #F2B045, #EDA135)',
                          boxShadow: '0 2px 6px rgba(242,176,69,0.28)',
                          color: '#131316',
                        }}
                      >
                        {u.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 tracking-[-0.01em]">{u.name}</p>
                        <p className="text-[11px] text-slate-400 font-medium">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                      style={
                        u.role === 'super_admin'
                          ? { background: 'rgba(139,92,246,0.10)', color: '#7c3aed' }
                          : { background: 'rgba(59,130,246,0.10)', color: '#2563eb' }
                      }
                    >
                      <Shield size={10} />
                      {u.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-medium">
                    {u.last_login
                      ? new Date(u.last_login).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                      : <span className="text-slate-300">Nunca</span>}
                  </td>
                  <td className="px-6 py-4">
                    {u.is_active
                      ? <span className="badge bg-emerald-100 text-emerald-700 text-[10.5px]"><Check size={9} /> Activo</span>
                      : <span className="badge bg-slate-100 text-slate-400 text-[10.5px]"><X size={9} /> Inactivo</span>
                    }
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(u)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50"
                        style={{ transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)' }}
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => { setPwdUserId(u.id); setNewPwd(''); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                        style={{ transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)' }}
                        title="Cambiar contraseña"
                      >
                        <KeyRound size={13} />
                      </button>
                      <button
                        onClick={() => toggleStatus(u)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg ${
                          u.is_active
                            ? 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        style={{ transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)' }}
                        title={u.is_active ? 'Desactivar' : 'Activar'}
                      >
                        {u.is_active ? <X size={13} /> : <Check size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <UsersIcon size={20} className="text-slate-300" />
                      </div>
                      <p className="text-[13px] font-semibold text-slate-400">Sin usuarios</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        </div>
      </div>
    </div>
  );
}
