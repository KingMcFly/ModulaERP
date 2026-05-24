import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Wrench, Calendar, CheckCircle2, Clock, AlertCircle, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
function authFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('token');
  return fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) } });
}

interface Maintenance {
  id: number; asset_id: number; serial_number: string; brand: string; model: string;
  technician_name: string; maint_type: string; status: string;
  scheduled_at: string; completed_at: string | null; description: string; cost: number | null;
}

const TYPE_CFG = {
  preventive: { label: 'Preventivo', cls: 'bg-sky-100 text-sky-700',    dot: 'bg-sky-500' },
  corrective:  { label: 'Correctivo', cls: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  emergency:   { label: 'Emergencia', cls: 'bg-red-100 text-red-700',    dot: 'bg-red-500' },
};
const STATUS_CFG = {
  pending:     { label: 'Pendiente',    cls: 'bg-slate-100 text-slate-600',       icon: Clock },
  in_progress: { label: 'En Proceso',   cls: 'bg-amber-100 text-amber-700',      icon: AlertCircle },
  completed:   { label: 'Completado',   cls: 'bg-emerald-100 text-emerald-700',   icon: CheckCircle2 },
  cancelled:   { label: 'Cancelado',    cls: 'bg-red-100 text-red-600',           icon: AlertCircle },
};

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function NewMaintenanceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [assets, setAssets]     = useState<{id: number; serial_number: string; brand: string; model: string; asset_type: string}[]>([]);
  const [technicians, setTechs] = useState<{id: number; name: string}[]>([]);
  const [form, setForm] = useState({ asset_id: '', technician_id: '', maint_type: 'preventive', scheduled_at: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    authFetch('/assets').then(r => r.json()).then(setAssets);
    authFetch('/maintenance/technicians/all').then(r => r.json()).then(setTechs);
  }, []);

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await authFetch('/maintenance', { method: 'POST', body: JSON.stringify({
        asset_id: parseInt(form.asset_id),
        technician_id: form.technician_id ? parseInt(form.technician_id) : null,
        maint_type: form.maint_type,
        scheduled_at: form.scheduled_at,
        description: form.description,
      })});
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      toast.success('Mantenimiento creado');
      onCreated(); onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-soft-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-5">Nuevo Mantenimiento</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="maint-asset" className="label">Activo *</label>
            <select id="maint-asset" className="input" value={form.asset_id} onChange={e => set('asset_id', e.target.value)} required>
              <option value="">Seleccionar activo…</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.asset_type} — {a.brand} {a.model}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="maint-type" className="label">Tipo</label>
              <select id="maint-type" className="input" value={form.maint_type} onChange={e => set('maint_type', e.target.value)}>
                <option value="preventive">Preventivo</option>
                <option value="corrective">Correctivo</option>
                <option value="emergency">Emergencia</option>
              </select>
            </div>
            <div>
              <label htmlFor="maint-date" className="label">Fecha programada</label>
              <input id="maint-date" className="input" type="date" value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="maint-technician" className="label">Técnico</label>
            <select id="maint-technician" className="input" value={form.technician_id} onChange={e => set('technician_id', e.target.value)}>
              <option value="">Sin asignar</option>
              {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="maint-description" className="label">Descripción</label>
            <textarea id="maint-description" className="input resize-none" rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 btn btn-primary">{saving ? 'Creando…' : 'Crear'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CalendarView({ records, onStatusChange }: { records: Maintenance[]; onStatusChange: (id: number, status: string) => void }) {
  const { canWrite } = useAuth();
  const [year, setYear]   = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selected, setSelected] = useState<Maintenance[] | null>(null);

  function prev() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function next() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDate: Record<string, Maintenance[]> = {};
  records.forEach(r => {
    if (!r.scheduled_at) return;
    const d = r.scheduled_at.split('T')[0];
    const [y, m2, day] = d.split('-').map(Number);
    if (y === year && m2 - 1 === month) {
      const key = day.toString();
      (byDate[key] = byDate[key] || []).push(r);
    }
  });

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const _now = new Date();
  const todayStr = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-soft">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <button type="button" onClick={prev} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"><ChevronLeft size={18} /></button>
        <h2 className="text-base font-semibold text-slate-900">{MONTHS[month]} {year}</h2>
        <button type="button" onClick={next} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"><ChevronRight size={18} /></button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {DAYS.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400 uppercase">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 divide-x divide-slate-50">
        {cells.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} className="min-h-[88px] bg-slate-50/50" />;
          const key = day.toString();
          const dayRecords = byDate[key] || [];
          const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isToday = dateStr === todayStr;
          return (
            <div
              key={dateStr}
              className={`min-h-[88px] p-1.5 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${isToday ? 'bg-primary-50/40' : ''}`}
              onClick={() => dayRecords.length > 0 ? setSelected(dayRecords) : null}
            >
              <span className={`text-xs font-medium size-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-primary-600 text-white' : 'text-slate-500'}`}>
                {day}
              </span>
              <div className="space-y-0.5">
                {dayRecords.slice(0, 3).map(r => {
                  const tc = TYPE_CFG[r.maint_type as keyof typeof TYPE_CFG];
                  return (
                    <div key={r.id} className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] leading-tight truncate ${tc?.cls || 'bg-slate-100 text-slate-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tc?.dot || 'bg-slate-400'}`} />
                      <span className="truncate">{r.brand} {r.model}</span>
                    </div>
                  );
                })}
                {dayRecords.length > 3 && (
                  <p className="text-[10px] text-slate-400 pl-1">+{dayRecords.length - 3} más</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 py-3 border-t border-slate-100">
        {Object.entries(TYPE_CFG).map(([, v]) => (
          <div key={v.label} className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${v.dot}`} />
            <span className="text-xs text-slate-500">{v.label}</span>
          </div>
        ))}
      </div>

      {/* Day detail popover */}
      {selected && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-3xl shadow-soft-xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Mantenimientos del día</h3>
              <button type="button" onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">&times;</button>
            </div>
            <div className="space-y-3">
              {selected.map(r => {
                const tc = TYPE_CFG[r.maint_type as keyof typeof TYPE_CFG];
                const sc = STATUS_CFG[r.status as keyof typeof STATUS_CFG];
                const StatusIcon = sc?.icon || Clock;
                return (
                  <div key={r.id} className="border border-slate-100 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-900">{r.brand} {r.model}</p>
                      <span className={`badge ${tc?.cls}`}>{tc?.label}</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{r.technician_name || 'Sin técnico'}</p>
                    <p className="text-xs text-slate-400 mb-3 line-clamp-2">{r.description || 'Sin descripción'}</p>
                    <div className="flex items-center justify-between">
                      <span className={`badge ${sc?.cls} flex items-center gap-1`}><StatusIcon size={10} />{sc?.label}</span>
                      <div className="flex gap-1">
                        {r.status === 'pending' && canWrite('maintenance') && (
                          <button type="button" onClick={() => { onStatusChange(r.id, 'in_progress'); setSelected(null); }} className="btn btn-ghost text-xs py-1 px-2">Iniciar</button>
                        )}
                        {r.status === 'in_progress' && canWrite('maintenance') && (
                          <button type="button" onClick={() => { onStatusChange(r.id, 'completed'); setSelected(null); }} className="btn btn-primary text-xs py-1 px-2">Completar</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MaintenanceModule() {
  const { canWrite, canDelete } = useAuth();
  const [records, setRecords]   = useState<Maintenance[]>([]);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [view, setView]         = useState<'list' | 'calendar'>('list');

  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (statusFilter) p.set('status', statusFilter);
    authFetch(`/maintenance?${p}`).then(r => r.json()).then(d => { setRecords(Array.isArray(d) ? d : []); setLoading(false); });
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: number, status: string) {
    const body: any = { status };
    if (status === 'completed') body.completed_at = new Date().toISOString();
    if (status === 'in_progress') body.started_at = new Date().toISOString();
    await authFetch(`/maintenance/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    toast.success('Estado actualizado');
    load();
  }

  const filtered = records.filter(r =>
    [r.serial_number, r.brand, r.model, r.technician_name, r.description].join(' ').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Mantenimientos</h1>
          <p className="text-slate-500 text-sm mt-0.5">Programación y seguimiento de mantenimientos</p>
        </div>
        {canWrite('maintenance') && (
          <button type="button" onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={16} /> Nuevo
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-soft flex gap-3 items-center">
        {view === 'list' && (
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        )}
        {view === 'list' && (
          <select className="input w-44" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="in_progress">En Proceso</option>
            <option value="completed">Completado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        )}
        {view === 'calendar' && <div className="flex-1" />}
        {/* View toggle */}
        <div className="flex bg-slate-100 rounded-lg p-1 gap-1 flex-shrink-0">
          <button
            type="button" onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <List size={13} /> Lista
          </button>
          <button
            type="button" onClick={() => setView('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Calendar size={13} /> Calendario
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <CalendarView records={records} onStatusChange={updateStatus} />
      ) : (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 text-center py-12 text-slate-400">Sin registros</div>
          ) : filtered.map(r => {
            const tc = TYPE_CFG[r.maint_type as keyof typeof TYPE_CFG];
            const sc = STATUS_CFG[r.status as keyof typeof STATUS_CFG];
            const StatusIcon = sc?.icon || Clock;
            return (
              <div key={r.id} className="bg-white rounded-2xl p-5 shadow-soft flex items-center gap-4">
                <div className="size-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Wrench size={18} className="text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">{r.brand} {r.model} · {r.serial_number || 'sin serie'}</p>
                    <span className={`badge ${tc?.cls}`}>{tc?.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{r.description || 'Sin descripción'}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {r.technician_name || 'Sin técnico'} ·
                    {r.scheduled_at ? ` ${new Date(r.scheduled_at).toLocaleDateString('es')}` : ' Sin fecha'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`badge ${sc?.cls} flex items-center gap-1`}>
                    <StatusIcon size={11} /> {sc?.label}
                  </span>
                  {r.status === 'pending' && canWrite('maintenance') && (
                    <button type="button" onClick={() => updateStatus(r.id, 'in_progress')} className="btn btn-ghost text-xs py-1 px-2">Iniciar</button>
                  )}
                  {r.status === 'in_progress' && canWrite('maintenance') && (
                    <button type="button" onClick={() => updateStatus(r.id, 'completed')} className="btn btn-primary text-xs py-1 px-2">Completar</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && <NewMaintenanceModal onClose={() => setShowModal(false)} onCreated={load} />}
    </div>
  );
}
