import React, { useEffect, useState, useCallback } from 'react';
import { MapPin, Tag, Building2, Clock, Layers, Plus, Edit2, Trash2, Check, X, Settings, Zap, Users, Database, BarChart3, ShieldCheck, Eye, Pencil, Trash, KeyRound, UserPlus, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

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

// ── Generic simple catalog section ────────────────────────────────────────────

interface CatalogItem { id: number; name: string; }

function SimpleCatalog({ title, icon: Icon, apiPath }: { title: string; icon: React.ElementType; apiPath: string }) {
  const [items, setItems]     = useState<CatalogItem[]>([]);
  const [adding, setAdding]   = useState(false);
  const [newName, setNewName] = useState('');
  const [editId, setEditId]   = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    authFetch(`/catalog${apiPath}`).then(r => r.json()).then(setItems).finally(() => setLoading(false));
  }, [apiPath]);
  useEffect(load, [load]);

  async function add() {
    if (!newName.trim()) return;
    const r = await authFetch(`/catalog${apiPath}`, { method: 'POST', body: JSON.stringify({ name: newName.trim() }) });
    if (r.ok) { toast.success('Agregado'); setNewName(''); setAdding(false); load(); }
    else { const d = await r.json(); toast.error(d.error); }
  }

  async function save(id: number) {
    if (!editName.trim()) return;
    const r = await authFetch(`/catalog${apiPath}/${id}`, { method: 'PUT', body: JSON.stringify({ name: editName.trim() }) });
    if (r.ok) { toast.success('Actualizado'); setEditId(null); load(); }
    else { const d = await r.json(); toast.error(d.error); }
  }

  async function remove(id: number) {
    if (!confirm(`¿Eliminar "${items.find(i => i.id === id)?.name}"?`)) return;
    const r = await authFetch(`/catalog${apiPath}/${id}`, { method: 'DELETE' });
    if (r.ok) { toast.success('Eliminado'); load(); }
    else { const d = await r.json(); toast.error(d.error); }
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-soft" style={cardStyle}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--ds-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="size-8 bg-primary-50 rounded-lg flex items-center justify-center">
            <Icon size={16} className="text-primary-500" />
          </div>
          <h3 className="font-semibold" style={{ color: 'var(--ds-text)' }}>{title}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--ds-card-alt)', color: 'var(--ds-text-subtle)' }}>{items.length}</span>
        </div>
        <button type="button" onClick={() => { setAdding(true); setNewName(''); }} className="btn btn-primary text-xs py-1.5 px-3">
          <Plus size={13} /> Agregar
        </button>
      </div>

      {adding && (
        <div className="px-5 py-3 flex items-center gap-2" style={{ background: 'var(--ds-surface)', borderBottom: '1px solid var(--ds-border)' }}>
          <input
            className="input flex-1 text-sm"
            placeholder={`Nuevo ${title.toLowerCase().replace('categorías de ', '')}…`}
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setAdding(false); }}
          />
          <button type="button" onClick={add} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Check size={16} /></button>
          <button type="button" onClick={() => setAdding(false)} className="p-2 rounded-lg" style={{ color: 'var(--ds-text-subtle)' }}><X size={16} /></button>
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm" style={{ color: 'var(--ds-text-subtle)' }}>Cargando…</div>
      ) : items.length === 0 ? (
        <div className="py-10 text-center">
          <Icon size={28} className="mx-auto mb-2" style={{ color: 'var(--ds-border)' }} />
          <p className="text-sm" style={{ color: 'var(--ds-text-subtle)' }}>Sin registros. Haz clic en "Agregar" para comenzar.</p>
        </div>
      ) : (
        <ul>
          {items.map((item, i) => (
            <li
              key={item.id}
              className="flex items-center gap-3 px-5 py-3 group"
              style={{ borderTop: i > 0 ? '1px solid var(--ds-border)' : 'none', transition: 'background 120ms' }}
              onMouseEnter={e => (e.currentTarget as HTMLLIElement).style.background = isDark() ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}
              onMouseLeave={e => (e.currentTarget as HTMLLIElement).style.background = ''}
            >
              {editId === item.id ? (
                <>
                  <input autoFocus className="input flex-1 text-sm" value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') save(item.id); if (e.key === 'Escape') setEditId(null); }} />
                  <button type="button" onClick={() => save(item.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Check size={14} /></button>
                  <button type="button" onClick={() => setEditId(null)} className="p-1.5 rounded-lg" style={{ color: 'var(--ds-text-subtle)' }}><X size={14} /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm" style={{ color: 'var(--ds-text)' }}>{item.name}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => { setEditId(item.id); setEditName(item.name); }}
                      className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                      <Edit2 size={13} />
                    </button>
                    <button type="button" onClick={() => remove(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Locations catalog ─────────────────────────────────────────────────────────

interface Location {
  id: number; name: string; description: string;
  floor_level: number; color: string; criticality: string;
}

const CRITICALITY: Record<string, { label: string; bg: string; color: string }> = {
  low:    { label: 'Baja',  bg: 'var(--ds-card-alt)',        color: 'var(--ds-text-muted)' },
  medium: { label: 'Media', bg: 'rgba(245,158,11,0.12)',     color: '#F59E0B' },
  high:   { label: 'Alta',  bg: 'rgba(239,68,68,0.12)',      color: '#EF4444' },
};

function LocationForm({ loc, onClose, onSaved }: { loc: Location | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name:        loc?.name         || '',
    description: loc?.description  || '',
    floor_level: loc?.floor_level?.toString() || '1',
    color:       loc?.color        || '#94A3B8',
    criticality: loc?.criticality  || 'low',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, floor_level: parseInt(form.floor_level) || 1 };
      const r = await authFetch(loc ? `/catalog/locations/${loc.id}` : '/catalog/locations', {
        method: loc ? 'PUT' : 'POST', body: JSON.stringify(body),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      toast.success(loc ? 'Ubicación actualizada' : 'Ubicación creada');
      onSaved(); onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="rounded-3xl shadow-soft-xl w-full max-w-md p-6" style={cardStyle}>
        <h2 className="text-lg font-semibold mb-5" style={{ color: 'var(--ds-text)' }}>{loc ? 'Editar Ubicación' : 'Nueva Ubicación'}</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="loc-name" className="label">Nombre *</label>
            <input id="loc-name" className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div>
            <label htmlFor="loc-description" className="label">Descripción</label>
            <input id="loc-description" className="input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Ej: Bodega norte, Sala de servidores…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="loc-floor" className="label">Nivel / Piso</label>
              <input id="loc-floor" className="input" type="number" min="1" value={form.floor_level} onChange={e => set('floor_level', e.target.value)} />
            </div>
            <div>
              <label htmlFor="loc-color" className="label">Color identificador</label>
              <input id="loc-color" className="input p-1.5 h-[38px] cursor-pointer" type="color" value={form.color} onChange={e => set('color', e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="loc-criticality" className="label">Criticidad</label>
            <select id="loc-criticality" className="input" value={form.criticality} onChange={e => set('criticality', e.target.value)}>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 btn btn-primary">{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LocationsCatalog() {
  const [items, setItems]   = useState<Location[]>([]);
  const [editing, setEditing] = useState<Location | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    authFetch('/catalog/locations').then(r => r.json()).then(setItems).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  async function remove(loc: Location) {
    if (!confirm(`¿Eliminar "${loc.name}"? Los activos e insumos asignados quedarán sin ubicación.`)) return;
    const r = await authFetch(`/catalog/locations/${loc.id}`, { method: 'DELETE' });
    if (r.ok) { toast.success('Eliminada'); load(); }
    else { const d = await r.json(); toast.error(d.error); }
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-soft" style={cardStyle}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--ds-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="size-8 bg-primary-50 rounded-lg flex items-center justify-center">
            <MapPin size={16} className="text-primary-500" />
          </div>
          <h3 className="font-semibold" style={{ color: 'var(--ds-text)' }}>Ubicaciones</h3>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--ds-card-alt)', color: 'var(--ds-text-subtle)' }}>{items.length}</span>
        </div>
        <button type="button" onClick={() => setEditing(null)} className="btn btn-primary text-xs py-1.5 px-3">
          <Plus size={13} /> Agregar
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm" style={{ color: 'var(--ds-text-subtle)' }}>Cargando…</div>
      ) : items.length === 0 ? (
        <div className="py-10 text-center">
          <MapPin size={28} className="mx-auto mb-2" style={{ color: 'var(--ds-border)' }} />
          <p className="text-sm" style={{ color: 'var(--ds-text-subtle)' }}>Sin ubicaciones. Agrega bodegas, pisos o áreas.</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--ds-card-alt)', borderBottom: '1px solid var(--ds-border)' }}>
              {['Nombre', 'Descripción', 'Piso', 'Criticidad', ''].map(h => (
                <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--ds-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((loc, i) => {
              const cc = CRITICALITY[loc.criticality] || CRITICALITY.low;
              return (
                <tr
                  key={loc.id}
                  className="group"
                  style={{ borderTop: i > 0 ? '1px solid var(--ds-border)' : 'none', transition: 'background 120ms' }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = isDark() ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="size-3 rounded-full flex-shrink-0" style={{ backgroundColor: loc.color }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--ds-text)' }}>{loc.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm max-w-[200px] truncate" style={{ color: 'var(--ds-text-muted)' }}>{loc.description || '—'}</td>
                  <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--ds-text-muted)' }}>Piso {loc.floor_level}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: cc.bg, color: cc.color }}>{cc.label}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={() => setEditing(loc)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"><Edit2 size={13} /></button>
                      <button type="button" onClick={() => remove(loc)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {editing !== undefined && (
        <LocationForm loc={editing} onClose={() => setEditing(undefined)} onSaved={load} />
      )}
    </div>
  );
}

// ── Plan tab ──────────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, { label: string; color: string; description: string }> = {
  starter_free:  { label: 'Starter Free',  color: '#F2B045', description: '30 días de prueba incluidos' },
  starter:       { label: 'Starter',       color: '#64748B', description: 'Para equipos pequeños' },
  professional:  { label: 'Professional',  color: '#6366F1', description: 'Para empresas en crecimiento' },
  enterprise:    { label: 'Enterprise',    color: '#10B981', description: 'Sin límites' },
};

const RESOURCE_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  assets:       { label: 'Activos',      icon: Database },
  users:        { label: 'Usuarios',     icon: Users },
  technicians:  { label: 'Técnicos',     icon: ShieldCheck },
  locations:    { label: 'Ubicaciones',  icon: MapPin },
};

const WHATSAPP_NUMBER = '56920023072';

function UsageBar({ used, max, label, icon: Icon }: { used: number; max: number; label: string; icon: React.ElementType }) {
  const unlimited = max === -1;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / max) * 100));
  const near = !unlimited && pct >= 80;
  const over = !unlimited && pct >= 100;

  return (
    <div className="rounded-xl p-4" style={cardStyle}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`size-8 rounded-lg flex items-center justify-center ${near ? 'bg-red-50' : 'bg-primary-50'}`}>
            <Icon size={15} className={near ? 'text-red-500' : 'text-primary-500'} />
          </div>
          <span className="text-sm font-medium" style={{ color: 'var(--ds-text-muted)' }}>{label}</span>
        </div>
        <span className="text-sm font-bold" style={{ color: over ? '#EF4444' : near ? '#F59E0B' : 'var(--ds-text)' }}>
          {used} {unlimited ? '' : `/ ${max}`}
        </span>
      </div>
      {!unlimited && (
        <>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--ds-border)' }}>
            <div
              className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : near ? 'bg-amber-500' : 'bg-primary-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs" style={{ color: 'var(--ds-text-subtle)' }}>{pct}% utilizado</span>
            {near && !over && <span className="text-xs text-amber-600 font-medium">Cerca del límite</span>}
            {over && <span className="text-xs text-red-600 font-medium">Límite alcanzado</span>}
          </div>
        </>
      )}
      {unlimited && <p className="text-xs" style={{ color: 'var(--ds-text-subtle)' }}>Sin límite</p>}
    </div>
  );
}

interface PlanData {
  plan: string;
  trial_ends_at: string | null;
  trial_days_left: number | null;
  usage: Record<string, number>;
  limits: Record<string, number>;
  trial_modules: { code: string; name: string; days_left: number | null; expires_at: string | null }[];
}

function PlanTab() {
  const { user } = useAuth();
  const [data, setData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/dashboard/plan').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-12 text-center" style={{ color: 'var(--ds-text-subtle)' }}>Cargando…</div>;
  if (!data) return <div className="py-12 text-center" style={{ color: 'var(--ds-text-subtle)' }}>No disponible</div>;

  const planCfg = PLAN_LABELS[data.plan] || PLAN_LABELS.starter;
  const isStarterFree = data.plan === 'starter_free';
  const hasUpgrade = data.plan !== 'enterprise';
  const tenantName = user?.tenant?.name || 'mi empresa';

  const waText = `Hola, soy administrador de la empresa ${tenantName} en FB Core ERP. Quiero solicitar información sobre planes.`;
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`;

  const anyNear = Object.entries(data.limits).some(([k, max]) => {
    const used = data.usage[k] || 0;
    return max !== -1 && max > 0 && used / max >= 0.8;
  });

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={15} style={{ color: planCfg.color }} />
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: planCfg.color }}>Plan actual</span>
            </div>
            <h2 className="text-[22px] font-bold" style={{ color: 'var(--ds-text)' }}>{planCfg.label}</h2>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>{planCfg.description}</p>
            {data.trial_days_left !== null && (
              <div className="flex items-center gap-1.5 mt-2">
                <Clock size={13} className={data.trial_days_left <= 7 ? 'text-red-500' : 'text-amber-500'} />
                <span className={`text-[12px] font-semibold ${data.trial_days_left <= 7 ? 'text-red-600' : 'text-amber-600'}`}>
                  {data.trial_days_left === 0 ? 'Prueba vencida' : `Prueba: ${data.trial_days_left} día${data.trial_days_left !== 1 ? 's' : ''} restante${data.trial_days_left !== 1 ? 's' : ''}`}
                </span>
              </div>
            )}
          </div>
          {hasUpgrade && (
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold shrink-0"
              style={{ background: 'linear-gradient(135deg, #F2B045, #EDA135)', color: '#131316', boxShadow: '0 2px 8px rgba(242,176,69,0.30)' }}>
              <Zap size={14} /> Mejorar plan
            </a>
          )}
        </div>
      </div>

      {anyNear && (
        <div className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <BarChart3 size={16} className="text-amber-500 flex-shrink-0" />
          <p className="text-[13px] text-amber-800 font-medium">
            Estás cerca del límite de tu plan.{' '}
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
              style={{ color: '#F2B045', fontWeight: 700, textDecoration: 'none' }}>
              Contacta a FBSystems para ampliar →
            </a>
          </p>
        </div>
      )}

      <div>
        <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--ds-text-muted)' }}>Uso actual</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(RESOURCE_LABELS).map(([key, cfg]) => {
            const limit = data.limits[key] ?? -1;
            if (limit === undefined && data.usage[key] === undefined) return null;
            return (
              <UsageBar key={key} label={cfg.label} icon={cfg.icon}
                used={data.usage[key] || 0} max={limit} />
            );
          })}
        </div>
      </div>

      {data.trial_modules.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--ds-border)' }}>
            <h3 className="font-semibold text-[14px]" style={{ color: 'var(--ds-text)' }}>Módulos en período de prueba</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--ds-card-alt)', color: 'var(--ds-text-subtle)' }}>
              {data.trial_modules.length} módulo{data.trial_modules.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div>
            {data.trial_modules.map((m, i) => {
              const urgent = m.days_left !== null && m.days_left <= 7;
              const warn   = m.days_left !== null && m.days_left <= 15 && !urgent;
              const expired = m.days_left !== null && m.days_left <= 0;
              const modWaText = `Hola, soy administrador de ${tenantName} en FB Core. Quiero extender la prueba del módulo ${m.name}.`;
              const modWaUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(modWaText)}`;
              return (
                <div key={m.code} className="flex items-center justify-between px-5 py-4 gap-4 flex-wrap"
                  style={{ borderTop: i > 0 ? '1px solid var(--ds-border)' : 'none' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-8 rounded-full shrink-0 ${expired ? 'bg-red-400' : urgent ? 'bg-red-400' : warn ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    <div>
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--ds-text)' }}>{m.name}</p>
                      <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--ds-text-subtle)' }}>
                        {expired
                          ? <span className="text-red-500 font-medium">Prueba vencida</span>
                          : m.expires_at
                            ? <>Vence {new Date(m.expires_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}</>
                            : 'Sin fecha de vencimiento'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.days_left !== null && !expired && (
                      <span className={`text-[11.5px] font-bold px-2.5 py-1 rounded-lg ${urgent ? 'bg-red-50 text-red-600' : warn ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                        {m.days_left}d restantes
                      </span>
                    )}
                    <a href={modWaUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-bold"
                      style={{ background: 'rgba(242,176,69,0.12)', color: '#b45309' }}>
                      <Zap size={11} /> Extender
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3" style={{ background: 'var(--ds-surface)', borderTop: '1px solid var(--ds-border)' }}>
            <p className="text-[11.5px]" style={{ color: 'var(--ds-text-subtle)' }}>
              Al vencer, los datos se conservan pero perderás acceso al módulo.{' '}
              <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#F2B045', fontWeight: 600 }}>
                Contáctanos para extender o mejorar tu plan →
              </a>
            </p>
          </div>
        </div>
      )}

      {isStarterFree && (
        <div className="rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap"
          style={{ background: 'linear-gradient(135deg, rgba(242,176,69,0.08), rgba(237,161,53,0.04))', border: '1px solid rgba(242,176,69,0.20)' }}>
          <div>
            <p className="text-[14px] font-bold" style={{ color: 'var(--ds-text)' }}>¿Listo para crecer?</p>
            <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>Más usuarios, activos ilimitados y módulos sin fecha de vencimiento.</p>
          </div>
          <a href={waUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, #F2B045, #EDA135)', color: '#131316', boxShadow: '0 2px 8px rgba(242,176,69,0.30)' }}>
            <Zap size={14} /> Vuélvete Plus
          </a>
        </div>
      )}
    </div>
  );
}

// ── Users tab ─────────────────────────────────────────────────────────────────

interface TenantUser { id: number; name: string; email: string; role: string; is_active: number; last_login: string | null; }
interface ModulePerm { code: string; name: string; color: string; can_view: number; can_write: number; can_delete: number; }

const ROLE_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  admin:   { label: 'Admin',    bg: 'rgba(168,85,247,0.12)', color: '#A855F7' },
  manager: { label: 'Gerente',  bg: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
  user:    { label: 'Usuario',  bg: 'var(--ds-card-alt)',    color: 'var(--ds-text-muted)' },
};

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
          if (field === 'can_view' && !next.can_view) {
            next.can_write = 0; next.can_delete = 0;
          }
          if ((field === 'can_write' || field === 'can_delete') && next[field]) {
            next.can_view = 1;
          }
          return next;
        }),
      };
    });
  }

  async function save() {
    setSaving(true);
    try {
      const r = await authFetch(`/users/${userId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissions: data?.modules ?? [] }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      toast.success('Permisos guardados');
      onClose();
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
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8 text-center">
            <ShieldCheck size={32} className="text-emerald-400" />
            <p className="text-sm font-semibold" style={{ color: 'var(--ds-text)' }}>Acceso completo</p>
            <p className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>
              Los roles Admin y Gerente tienen acceso total a todos los módulos habilitados del tenant.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2">
            <div className="grid grid-cols-[1fr_60px_60px_60px] gap-2 px-3 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ds-text-subtle)' }}>Módulo</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-center" style={{ color: 'var(--ds-text-subtle)' }}>Ver</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-center" style={{ color: 'var(--ds-text-subtle)' }}>Crear/Editar</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-center" style={{ color: 'var(--ds-text-subtle)' }}>Eliminar</span>
            </div>
            {data.modules.map(m => (
              <div key={m.code} className="grid grid-cols-[1fr_60px_60px_60px] gap-2 items-center rounded-xl px-3 py-2.5" style={{ background: 'var(--ds-surface)' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--ds-text)' }}>{m.name}</span>
                </div>
                {(['can_view', 'can_write', 'can_delete'] as const).map(field => (
                  <div key={field} className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => toggle(m.code, field)}
                      className={`size-8 rounded-xl flex items-center justify-center transition-all ${
                        m[field]
                          ? 'bg-primary-500 text-white shadow-[0_1px_4px_rgba(242,176,69,0.3)]'
                          : 'text-[#AEAEB2]'
                      }`}
                      style={!m[field] ? { background: 'var(--ds-card)', border: '1px solid var(--ds-border)' } : {}}
                    >
                      {field === 'can_view'   && <Eye    size={13} />}
                      {field === 'can_write'  && <Pencil size={13} />}
                      {field === 'can_delete' && <Trash  size={13} />}
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

function UserForm({ item, onClose, onSaved }: { item?: TenantUser | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: item?.name || '',
    email: item?.email || '',
    password: '',
    role: item?.role || 'user',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!item && f.password.length < 8) { toast.error('Contraseña mínimo 8 caracteres'); return; }
    if (!item && !/[A-Z]/.test(f.password)) { toast.error('La contraseña debe tener al menos una mayúscula'); return; }
    if (!item && !/[a-z]/.test(f.password)) { toast.error('La contraseña debe tener al menos una minúscula'); return; }
    if (!item && !/[0-9]/.test(f.password)) { toast.error('La contraseña debe tener al menos un número'); return; }
    if (!item && !/[^A-Za-z0-9]/.test(f.password)) { toast.error('La contraseña debe tener al menos un carácter especial'); return; }
    setSaving(true);
    try {
      const body: any = { name: f.name, email: f.email, role: f.role };
      if (!item) body.password = f.password;
      const r = await authFetch(item ? `/users/${item.id}` : '/users', {
        method: item ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      toast.success(item ? 'Usuario actualizado' : 'Usuario creado');
      onSaved(); onClose();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="rounded-3xl shadow-soft-xl w-full max-w-md p-6" style={cardStyle}>
        <h2 className="text-base font-bold mb-5" style={{ color: 'var(--ds-text)' }}>{item ? 'Editar usuario' : 'Nuevo usuario'}</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="u-name" className="label">Nombre *</label>
            <input id="u-name" className="input" value={f.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div>
            <label htmlFor="u-email" className="label">Correo electrónico *</label>
            <input id="u-email" className="input" type="email" value={f.email} onChange={e => set('email', e.target.value)} required />
          </div>
          {!item && (
            <div>
              <label htmlFor="u-pass" className="label">Contraseña *</label>
              <input id="u-pass" className="input" type="password" value={f.password} onChange={e => set('password', e.target.value)} required placeholder="Mín. 8 chars, mayúscula, minúscula, número y símbolo" />
            </div>
          )}
          <div>
            <label htmlFor="u-role" className="label">Rol</label>
            <select id="u-role" className="input" value={f.role} onChange={e => set('role', e.target.value)}>
              <option value="user">Usuario — acceso por módulo</option>
              <option value="manager">Gerente — acceso completo</option>
              <option value="admin">Admin — acceso completo + configuración</option>
            </select>
            {f.role === 'user' && !item && (
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--ds-text-muted)' }}>
                Se asignará acceso a <strong>Solicitudes</strong> por defecto. Puedes editar los permisos después.
              </p>
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 btn btn-primary">
              {saving ? 'Guardando…' : item ? 'Guardar' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({ userId, userName, onClose }: { userId: number; userName: string; onClose: () => void }) {
  const [pw, setPw] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { toast.error('Contraseña mínimo 8 caracteres'); return; }
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
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="rp-pw" className="label">Nueva contraseña</label>
            <input id="rp-pw" className="input" type="password" value={pw} onChange={e => setPw(e.target.value)} required placeholder="Mínimo 8 caracteres, mayúscula y número" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 btn btn-primary">{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UsersTab() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TenantUser | null | undefined>(undefined);
  const [permUser, setPermUser] = useState<TenantUser | null>(null);
  const [resetUser, setResetUser] = useState<TenantUser | null>(null);

  const load = useCallback(() => {
    authFetch('/users').then(r => r.json()).then(d => { setUsers(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggleActive(u: TenantUser) {
    await authFetch(`/users/${u.id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active: !u.is_active }) });
    toast.success(u.is_active ? 'Usuario desactivado' : 'Usuario activado');
    load();
  }

  return (
    <div className="rounded-2xl shadow-soft overflow-hidden" style={cardStyle}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--ds-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="size-8 bg-primary-50 rounded-xl flex items-center justify-center">
            <Users size={16} className="text-primary-500" />
          </div>
          <h3 className="font-semibold" style={{ color: 'var(--ds-text)' }}>Usuarios</h3>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--ds-card-alt)', color: 'var(--ds-text-subtle)' }}>{users.length}</span>
        </div>
        <button type="button" onClick={() => setEditing(null)} className="btn btn-primary text-xs py-1.5 px-3">
          <UserPlus size={13} /> Nuevo usuario
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm" style={{ color: 'var(--ds-text-subtle)' }}>Cargando…</div>
      ) : users.length === 0 ? (
        <div className="py-12 text-center">
          <Users size={28} className="mx-auto mb-2" style={{ color: 'var(--ds-border)' }} />
          <p className="text-sm" style={{ color: 'var(--ds-text-subtle)' }}>Sin usuarios registrados</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--ds-card-alt)', borderBottom: '1px solid var(--ds-border)' }}>
              {['Usuario', 'Rol', 'Último acceso', 'Estado', ''].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide px-5 py-3" style={{ color: 'var(--ds-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => {
              const rc = ROLE_LABELS[u.role] || ROLE_LABELS.user;
              const isSelf = u.id === me?.id;
              return (
                <tr
                  key={u.id}
                  className="group"
                  style={{ borderTop: i > 0 ? '1px solid var(--ds-border)' : 'none', transition: 'background 120ms' }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = isDark() ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary-600">{u.name[0].toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--ds-text)' }}>
                          {u.name} {isSelf && <span className="text-[10px]" style={{ color: 'var(--ds-text-subtle)' }}>(tú)</span>}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: rc.bg, color: rc.color }}>{rc.label}</span>
                  </td>
                  <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--ds-text-muted)' }}>
                    {u.last_login ? new Date(u.last_login).toLocaleDateString('es-CL') : 'Nunca'}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      type="button" onClick={() => !isSelf && toggleActive(u)}
                      disabled={isSelf}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${isSelf ? 'opacity-40 cursor-default' : ''}`}
                      style={{ color: isSelf ? 'var(--ds-text-subtle)' : u.is_active ? '#10B981' : 'var(--ds-text-subtle)' }}
                    >
                      {u.is_active
                        ? <><ToggleRight size={16} /> Activo</>
                        : <><ToggleLeft size={16} /> Inactivo</>}
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button
                        type="button" onClick={() => setPermUser(u)}
                        title="Permisos de módulo"
                        className="p-1.5 hover:text-primary-500 hover:bg-primary-50 rounded-lg"
                        style={{ color: 'var(--ds-text-subtle)' }}
                      >
                        <ShieldCheck size={14} />
                      </button>
                      <button
                        type="button" onClick={() => setEditing(u)}
                        title="Editar"
                        className="p-1.5 rounded-lg"
                        style={{ color: 'var(--ds-text-subtle)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--ds-text)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-surface)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--ds-text-subtle)'; (e.currentTarget as HTMLButtonElement).style.background = ''; }}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button" onClick={() => setResetUser(u)}
                        title="Cambiar contraseña"
                        className="p-1.5 hover:text-amber-500 hover:bg-amber-50 rounded-lg"
                        style={{ color: 'var(--ds-text-subtle)' }}
                      >
                        <KeyRound size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {editing !== undefined && (
        <UserForm item={editing} onClose={() => setEditing(undefined)} onSaved={load} />
      )}
      {permUser && (
        <PermissionsModal userId={permUser.id} userName={permUser.name} onClose={() => { setPermUser(null); }} />
      )}
      {resetUser && (
        <ResetPasswordModal userId={resetUser.id} userName={resetUser.name} onClose={() => setResetUser(null)} />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'locations',         label: 'Ubicaciones',         icon: MapPin   },
  { id: 'asset-types',       label: 'Tipos de Activo',     icon: Tag      },
  { id: 'departments',       label: 'Departamentos',       icon: Building2 },
  { id: 'shifts',            label: 'Turnos',              icon: Clock    },
  { id: 'supply-categories', label: 'Categorías Insumos',  icon: Layers   },
  { id: 'plan',              label: 'Plan y Límites',      icon: Zap      },
];

export default function SettingsModule() {
  const [tab, setTab] = useState('locations');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--ds-text)' }}>Configuración</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>Datos maestros y catálogos del sistema</p>
      </div>

      <div className="flex gap-5 items-start">
        <div className="w-52 flex-shrink-0 rounded-2xl p-2" style={cardStyle}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button type="button" key={t.id} onClick={() => setTab(t.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: active ? 'rgba(242,176,69,0.10)' : 'transparent',
                  color: active ? '#F2B045' : 'var(--ds-text-muted)',
                }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-surface)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--ds-text)'; } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--ds-text-muted)'; } }}
              >
                <Icon size={16} className="flex-shrink-0" />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-w-0">
          {tab === 'locations'         && <LocationsCatalog />}
          {tab === 'asset-types'       && <SimpleCatalog title="Tipos de Activo"     icon={Tag}      apiPath="/asset-types" />}
          {tab === 'departments'       && <SimpleCatalog title="Departamentos"        icon={Building2} apiPath="/departments" />}
          {tab === 'shifts'            && <SimpleCatalog title="Turnos"               icon={Clock}    apiPath="/shifts" />}
          {tab === 'supply-categories' && <SimpleCatalog title="Categorías de Insumos" icon={Layers}  apiPath="/supply-categories" />}
          {tab === 'plan'              && <PlanTab />}
          {tab === 'users'             && <UsersTab />}
        </div>
      </div>
    </div>
  );
}
