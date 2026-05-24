import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Search, Edit2, Trash2, Phone, Mail,
  Wrench, Calendar, Building2, Download,
  ShieldCheck, Eye, Pencil, Trash, KeyRound, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { exportToExcel } from '../../utils/exportExcel';
import { formatRut, validateRut, cleanRut } from '../../utils/rut';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
function authFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('token');
  return fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) },
  });
}
const isDark = () => document.documentElement.classList.contains('dark');
const cardStyle = { background: 'var(--ds-card)', border: '1px solid var(--ds-border)' };

interface Person {
  id: number | null; name: string; national_id: string | null; department: string | null;
  position: string | null; phone: string | null; email: string | null;
  is_active: boolean; hired_at: string | null;
  is_technician: boolean; specialty: string;
  user_id: number | null; role: string | null; user_rut: string | null;
  last_login: string | null; user_is_active: boolean | null;
}

interface ModulePerm {
  code: string; name: string; color: string;
  can_view: number; can_write: number; can_delete: number;
}

const ROLE_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  super_admin: { label: 'Super Admin', bg: 'rgba(168,85,247,0.12)',  color: '#A855F7' },
  admin:       { label: 'Admin',       bg: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
  manager:     { label: 'Gerente',     bg: 'rgba(99,102,241,0.12)', color: '#6366F1' },
  user:        { label: 'Usuario',     bg: 'var(--ds-card-alt)',    color: 'var(--ds-text-muted)' },
};

function RutInput({ value, onChange, placeholder = '12.345.678-9' }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [error, setError] = useState('');

  function handleChange(raw: string) {
    const clean = cleanRut(raw);
    if (raw.endsWith('-') || raw.endsWith('.')) { onChange(raw); return; }
    onChange(clean.length >= 2 ? formatRut(clean) : raw);
    setError('');
  }

  function handleBlur() {
    if (!value) { setError(''); return; }
    if (!validateRut(value)) setError('RUT inválido — verifica el dígito verificador');
    else setError('');
  }

  return (
    <div>
      <input className="input" value={value} onChange={e => handleChange(e.target.value)}
        onBlur={handleBlur} placeholder={placeholder} inputMode="numeric" maxLength={12} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${checked ? 'bg-primary-600' : 'bg-slate-300'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
      {label && <span className="text-sm font-medium select-none" style={{ color: 'var(--ds-text)' }}>{label}</span>}
    </div>
  );
}

function PermissionsModal({ userId, userName, onClose }: { userId: number; userName: string; onClose: () => void }) {
  const [data, setData] = useState<{ role: string; modules: ModulePerm[] } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    authFetch(`/users/${userId}/permissions`).then(r => r.json()).then(setData);
  }, [userId]);

  function toggle(code: string, field: 'can_view' | 'can_write' | 'can_delete') {
    setData(d => {
      if (!d) return d;
      return {
        ...d,
        modules: d.modules.map(m => {
          if (m.code !== code) return m;
          const next = { ...m, [field]: m[field] ? 0 : 1 };
          if (field === 'can_view' && !next.can_view) { next.can_write = 0; next.can_delete = 0; }
          if ((field === 'can_write' || field === 'can_delete') && next[field]) next.can_view = 1;
          return next;
        }),
      };
    });
  }

  async function save() {
    setSaving(true);
    try {
      const r = await authFetch(`/users/${userId}/permissions`, {
        method: 'PUT', body: JSON.stringify({
          permissions: (data?.modules ?? []).map(m => ({
            module_code: m.code, can_view: m.can_view, can_write: m.can_write, can_delete: m.can_delete,
          })),
        }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      toast.success('Permisos guardados'); onClose();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  }

  const isFullAccess = data && ['admin', 'manager', 'super_admin'].includes(data.role);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="rounded-3xl shadow-soft-xl w-full max-w-lg p-6 max-h-[85vh] flex flex-col" style={cardStyle}>
        <div className="flex items-center gap-3 mb-5">
          <div className="size-10 rounded-2xl bg-primary-50 flex items-center justify-center">
            <ShieldCheck size={18} className="text-primary-500" />
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--ds-text)' }}>Permisos de módulo</h2>
            <p className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>{userName}</p>
          </div>
        </div>
        {!data ? (
          <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--ds-text-subtle)' }}>Cargando…</div>
        ) : isFullAccess ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-center">
            <ShieldCheck size={32} className="text-emerald-400" />
            <p className="text-sm font-semibold" style={{ color: 'var(--ds-text)' }}>Acceso completo</p>
            <p className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>Admin y Gerente tienen acceso a todos los módulos.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2">
            <div className="grid grid-cols-[1fr_60px_60px_60px] gap-2 px-3 pb-1">
              {['Módulo', 'Ver', 'Editar', 'Borrar'].map(h => (
                <span key={h} className="text-[10px] font-semibold uppercase tracking-wide text-center first:text-left" style={{ color: 'var(--ds-text-subtle)' }}>{h}</span>
              ))}
            </div>
            {data.modules.map(m => (
              <div key={m.code} className="grid grid-cols-[1fr_60px_60px_60px] gap-2 items-center rounded-xl px-3 py-2.5" style={{ background: 'var(--ds-surface)' }}>
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--ds-text)' }}>{m.name}</span>
                </div>
                {(['can_view', 'can_write', 'can_delete'] as const).map(field => (
                  <div key={field} className="flex justify-center">
                    <button type="button" onClick={() => toggle(m.code, field)}
                      className={`size-8 rounded-xl flex items-center justify-center transition-all ${
                        m[field] ? 'bg-primary-500 text-white' : 'bg-white text-[#AEAEB2] border border-black/[0.07]'
                      }`}>
                      {field === 'can_view' && <Eye size={13} />}
                      {field === 'can_write' && <Pencil size={13} />}
                      {field === 'can_delete' && <Trash size={13} />}
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-3 pt-4 mt-2" style={{ borderTop: '1px solid var(--ds-border)' }}>
          <button type="button" onClick={onClose} className="flex-1 btn btn-ghost">Cancelar</button>
          {!isFullAccess && (
            <button type="button" onClick={save} disabled={saving} className="flex-1 btn btn-primary">
              {saving ? 'Guardando…' : 'Guardar permisos'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({ userId, userName, onClose }: { userId: number; userName: string; onClose: () => void }) {
  const [pw, setPw] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { toast.error('Mínimo 8 caracteres'); return; }
    if (!/[A-Z]/.test(pw)) { toast.error('Debe tener al menos una mayúscula'); return; }
    if (!/[0-9]/.test(pw)) { toast.error('Debe tener al menos un número'); return; }
    setSaving(true);
    try {
      const r = await authFetch(`/users/${userId}/password`, { method: 'PATCH', body: JSON.stringify({ password: pw }) });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      toast.success('Contraseña actualizada'); onClose();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="rounded-3xl shadow-soft-xl w-full max-w-sm p-6" style={cardStyle}>
        <div className="flex items-center gap-3 mb-5">
          <KeyRound size={18} className="text-primary-500" />
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--ds-text)' }}>Restablecer contraseña</h2>
            <p className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>{userName}</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <input className="input" type="password" value={pw} onChange={e => setPw(e.target.value)}
            placeholder="Mínimo 8 caracteres, mayúscula y número" />
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 btn btn-primary">{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PersonForm({ person, onClose, onSaved }: { person?: Person | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name:          person?.name          || '',
    national_id:   person?.national_id   || '',
    department:    person?.department    || '',
    position:      person?.position      || '',
    phone:         person?.phone         || '',
    email:         person?.email         || '',
    hired_at:      person?.hired_at?.split('T')[0] || '',
    is_active:     person?.is_active !== false,
    is_technician: person?.is_technician ?? false,
    specialty:     person?.specialty     || '',
    password:      '',
    role:          person?.role          || 'user',
  });
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    authFetch('/catalog/departments').then(r => r.json()).then(setDepartments).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return; }
    if (!form.email.trim()) { toast.error('El email es requerido'); return; }
    if (form.national_id && !validateRut(form.national_id)) {
      toast.error('RUT inválido. Verifica el dígito verificador'); return;
    }
    if (!person) {
      if (form.password.length < 8) { toast.error('Contraseña mínimo 8 caracteres'); return; }
      if (!/[A-Z]/.test(form.password)) { toast.error('La contraseña debe tener al menos una mayúscula'); return; }
      if (!/[0-9]/.test(form.password)) { toast.error('La contraseña debe tener al menos un número'); return; }
    }
    setSaving(true);
    try {
      const body = { ...form, hired_at: form.hired_at || null };
      const r = await authFetch(person ? `/personnel/${person.id}` : '/personnel', {
        method: person ? 'PUT' : 'POST', body: JSON.stringify(body),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      toast.success(person ? 'Persona actualizada' : 'Persona creada');
      onSaved(); onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="rounded-3xl shadow-soft-xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto" style={cardStyle}>
        <h2 className="text-lg font-semibold mb-5" style={{ color: 'var(--ds-text)' }}>
          {person ? 'Editar Persona' : 'Nueva Persona'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ds-text-subtle)' }}>Datos personales</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Nombre completo *</label>
                <input className="input" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <label className="label">RUT / ID</label>
                <RutInput value={form.national_id} onChange={v => set('national_id', v)} />
              </div>
              <div>
                <label className="label">Fecha contratación</label>
                <input className="input" type="date" value={form.hired_at} onChange={e => set('hired_at', e.target.value)} />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <label className="label">Email *</label>
                <input className="input" type="text" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="pt-4" style={{ borderTop: '1px solid var(--ds-border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ds-text-subtle)' }}>Datos laborales</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Cargo / Puesto</label>
                <input className="input" value={form.position} onChange={e => set('position', e.target.value)} />
              </div>
              <div>
                <label className="label">Departamento / Área</label>
                {departments.length > 0 ? (
                  <select className="input" value={form.department} onChange={e => set('department', e.target.value)}>
                    <option value="">Sin departamento</option>
                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                ) : (
                  <input className="input" value={form.department} onChange={e => set('department', e.target.value)} placeholder="Agrega en Configuración" />
                )}
              </div>
              {person && (
                <div className="col-span-2 flex items-center">
                  <Toggle checked={form.is_active} onChange={v => set('is_active', v)} label="Persona activa" />
                </div>
              )}
            </div>
          </div>

          <div className="pt-4" style={{ borderTop: '1px solid var(--ds-border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ds-text-subtle)' }}>Cuenta del sistema</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Rol</label>
                <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
                  <option value="user">Usuario</option>
                  <option value="manager">Gerente</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {!person && (
                <div>
                  <label className="label">Contraseña *</label>
                  <input className="input" type="password" value={form.password}
                    onChange={e => set('password', e.target.value)}
                    placeholder="8+ car., mayúscula y número" />
                </div>
              )}
            </div>
          </div>

          <div className="pt-4" style={{ borderTop: '1px solid var(--ds-border)' }}>
            <div className={`rounded-xl border-2 p-4 transition-all ${form.is_technician ? 'border-amber-200 bg-amber-50/20' : ''}`}
              style={!form.is_technician ? { border: '2px solid var(--ds-border)', background: 'var(--ds-surface)' } : {}}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${form.is_technician ? 'bg-amber-100' : ''}`}
                    style={!form.is_technician ? { background: 'var(--ds-border)' } : {}}>
                    <Wrench size={16} className={form.is_technician ? 'text-amber-600' : ''} style={!form.is_technician ? { color: 'var(--ds-text-subtle)' } : {}} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--ds-text)' }}>Técnico de mantenimiento</p>
                    <p className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>Disponible para asignar en órdenes de trabajo</p>
                  </div>
                </div>
                <Toggle checked={form.is_technician} onChange={v => set('is_technician', v)} />
              </div>
              {form.is_technician && (
                <div className="mt-3 pt-3 border-t border-amber-200">
                  <label className="label">Especialidad</label>
                  <input className="input" value={form.specialty} onChange={e => set('specialty', e.target.value)}
                    placeholder="Ej: Electricidad, Mecánica…" />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 btn btn-primary">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PersonnelModule() {
  const { canWrite, canDelete, user: me } = useAuth();
  const [people, setPeople]   = useState<Person[]>([]);
  const [search, setSearch]   = useState('');
  const [filterDept, setDept] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Person | null | undefined>(undefined);
  const [permPerson, setPermPerson]   = useState<Person | null>(null);
  const [resetPerson, setResetPerson] = useState<Person | null>(null);
  const [stats, setStats] = useState<any>(null);

  const isAdmin = me && ['super_admin', 'admin', 'manager'].includes(me.role);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search)     p.set('search', search);
    if (filterDept) p.set('department', filterDept);
    authFetch(`/personnel?${p}`)
      .then(r => r.json())
      .then(d => { setPeople(Array.isArray(d) ? d : []); setLoading(false); });
    authFetch('/personnel/stats').then(r => r.json()).then(setStats).catch(() => {});
  }, [search, filterDept]);

  useEffect(() => { load(); }, [load]);

  async function deactivate(p: Person & { id: number }) {
    if (!confirm(`¿Desactivar a ${p.name}?`)) return;
    await authFetch(`/personnel/${p.id}`, { method: 'DELETE' });
    toast.success('Persona desactivada'); load();
  }

  const departments = [...new Set(people.map(p => p.department).filter(Boolean))];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--ds-text)' }}>Personas</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>Gestión de personas y accesos al sistema</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Total personas', value: stats.total,                    color: 'var(--ds-text)' },
            { label: 'Técnicos',       value: stats.technicians,              color: '#F59E0B' },
            { label: 'Departamentos',  value: stats.departments?.length ?? 0, color: 'var(--ds-accent)' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 shadow-soft text-center" style={cardStyle}>
              <p className="text-2xl font-semibold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ds-text-subtle)' }} />
          <input className="input pl-9" placeholder="Buscar por nombre, RUT o área…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {departments.length > 0 && (
          <select className="input w-44" value={filterDept} onChange={e => setDept(e.target.value)}>
            <option value="">Todos los depts.</option>
            {departments.map(d => <option key={d} value={d!}>{d}</option>)}
          </select>
        )}
        <button
          type="button" onClick={() => exportToExcel(people.map(p => ({
            Nombre: p.name, 'RUT/ID': p.national_id, Departamento: p.department,
            Cargo: p.position, Teléfono: p.phone, Email: p.email,
            Rol: p.role, 'Último acceso': p.last_login,
            'Fecha ingreso': p.hired_at, Técnico: p.is_technician ? 'Sí' : 'No',
          })), 'personas')}
          className="btn btn-ghost border border-slate-200"
        >
          <Download size={15} /> Exportar
        </button>
        {canWrite('personnel') && (
          <button type="button" onClick={() => setEditing(null)} className="btn btn-primary">
            <Plus size={16} /> Nueva Persona
          </button>
        )}
      </div>

      <div className="rounded-2xl overflow-hidden shadow-soft" style={cardStyle}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--ds-card-alt)', borderBottom: '1px solid var(--ds-border)' }}>
              {['Persona', 'RUT', 'Cargo · Área', 'Rol en sistema', 'Último acceso', 'Estado', ''].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide px-4 py-3" style={{ color: 'var(--ds-text-subtle)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12" style={{ color: 'var(--ds-text-muted)' }}>Cargando…</td></tr>
            ) : people.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center" style={{ color: 'var(--ds-text-muted)' }}>Sin personas registradas</td></tr>
            ) : people.map((p, i) => {
              const rc = ROLE_LABELS[p.role || 'user'] || ROLE_LABELS.user;
              return (
                <tr key={p.id}
                  style={{ borderTop: i > 0 ? '1px solid var(--ds-border)' : 'none', transition: 'background 120ms' }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = isDark() ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                        {p.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--ds-text)' }}>{p.name}</p>
                        <p className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>{p.email || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--ds-text-muted)' }}>
                    {p.national_id || p.user_rut || '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm" style={{ color: 'var(--ds-text)' }}>{p.position || '—'}</p>
                    {p.department && <p className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>{p.department}</p>}
                  </td>
                  <td className="px-4 py-3.5">
                    {p.user_id ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: rc.bg, color: rc.color }}>{rc.label}</span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--ds-text-subtle)' }}>Sin cuenta</span>
                    )}
                    {p.is_technician && (
                      <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
                        <Wrench size={9} /> Técnico
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--ds-text-muted)' }}>
                    {p.last_login ? new Date(p.last_login).toLocaleDateString('es-CL') : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-medium ${p.is_active ? 'text-emerald-600' : ''}`} style={!p.is_active ? { color: 'var(--ds-text-subtle)' } : {}}>
                      {p.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      {canWrite('personnel') && p.id && (
                        <button type="button" onClick={() => setEditing(p as any)} title="Editar persona"
                          className="p-1.5 rounded-lg transition-colors hover:text-primary-600 hover:bg-primary-50" style={{ color: 'var(--ds-text-subtle)' }}>
                          <Edit2 size={13} />
                        </button>
                      )}
                      {isAdmin && p.user_id && (
                        <button type="button" onClick={() => setPermPerson(p)} title="Editar permisos"
                          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors hover:text-primary-600 hover:bg-primary-50" style={{ color: 'var(--ds-text-muted)' }}>
                          <ShieldCheck size={12} />
                          <span>Permisos</span>
                        </button>
                      )}
                      {isAdmin && p.user_id && (
                        <button type="button" onClick={() => setResetPerson(p)} title="Cambiar contraseña"
                          className="p-1.5 rounded-lg transition-colors hover:text-amber-600 hover:bg-amber-50" style={{ color: 'var(--ds-text-subtle)' }}>
                          <KeyRound size={13} />
                        </button>
                      )}
                      {canDelete('personnel') && p.id && (
                        <button type="button" onClick={() => deactivate(p as any)} title="Desactivar"
                          className="p-1.5 rounded-lg transition-colors hover:text-red-600 hover:bg-red-50" style={{ color: 'var(--ds-text-subtle)' }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing !== undefined && (
        <PersonForm person={editing} onClose={() => setEditing(undefined)} onSaved={load} />
      )}
      {permPerson?.user_id && (
        <PermissionsModal userId={permPerson.user_id} userName={permPerson.name} onClose={() => setPermPerson(null)} />
      )}
      {resetPerson?.user_id && (
        <ResetPasswordModal userId={resetPerson.user_id} userName={resetPerson.name} onClose={() => setResetPerson(null)} />
      )}
    </div>
  );
}
