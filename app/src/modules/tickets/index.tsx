import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, LifeBuoy, ChevronRight, Loader2, Settings2, BarChart3, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import {
  authFetch, api, apiAbs, cardStyle, Ticket, StatusBadge, PriorityBadge, LevelBadge, TypeBadge, SlaBadge,
  TYPE_CFG, IMPACT_OPTS, URGENCY_OPTS, timeAgo,
} from './shared';
import TicketConfig from './Config';

// Priority preview (mirrors backend matrix)
const MX: Record<string, Record<string, string>> = {
  low:      { low: 'low', medium: 'low', high: 'medium', critical: 'high' },
  medium:   { low: 'low', medium: 'medium', high: 'high', critical: 'high' },
  high:     { low: 'medium', medium: 'high', high: 'high', critical: 'critical' },
  critical: { low: 'high', medium: 'high', high: 'critical', critical: 'critical' },
};
const derivePriority = (i: string, u: string) => MX[i]?.[u] || 'medium';

// ── New ticket modal ──────────────────────────────────────────────────────────
function NewTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const [cats, setCats] = useState<{ id: number; name: string }[]>([]);
  const [subs, setSubs] = useState<{ id: number; category_id: number; name: string }[]>([]);
  const [assets, setAssets] = useState<{ id: number; asset_type: string; brand: string; model: string; serial_number: string }[]>([]);
  const [f, setF] = useState({ type: 'incident', title: '', description: '', category_id: '', subcategory_id: '', impact: 'low', urgency: 'low', channel: 'web', asset_id: '' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const priority = derivePriority(f.impact, f.urgency);
  const catSubs = subs.filter(s => String(s.category_id) === f.category_id);
  const [kbSug, setKbSug] = useState<{ id: number; title: string }[]>([]);
  const [kbView, setKbView] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    api('/config').then(d => { setCats(d.categories || []); setSubs(d.subcategories || []); }).catch(() => {});
    apiAbs('/assets').then((d: any) => setAssets(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (f.title.trim().length < 4) { setKbSug([]); return; }
    const id = setTimeout(() => { api(`/kb?q=${encodeURIComponent(f.title)}`).then((d: any) => setKbSug((d || []).slice(0, 3))).catch(() => {}); }, 350);
    return () => clearTimeout(id);
  }, [f.title]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) return toast.error('El título es obligatorio');
    setSaving(true);
    try {
      const r = await api<{ id: number; ticket_number: string }>('', { method: 'POST', body: JSON.stringify({ ...f, category_id: f.category_id || null, subcategory_id: f.subcategory_id || null, asset_id: f.asset_id || null }) });
      toast.success(`Ticket ${r.ticket_number} creado`);
      onCreated(r.id);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  const PR = { low: '#6B7280', medium: '#3B82F6', high: '#F97316', critical: '#EF4444' }[priority];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xl flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="rounded-t-3xl sm:rounded-3xl shadow-soft-xl w-full sm:max-w-lg p-5 sm:p-6 max-h-[92dvh] overflow-y-auto scroll-touch" style={{ ...cardStyle, paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <div className="sheet-handle" />
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--ds-text)' }}>Nuevo ticket</h2>
        <form onSubmit={submit} className="space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2">
            {(['incident', 'request'] as const).map(tp => {
              const c = TYPE_CFG[tp]; const Icon = c.icon; const active = f.type === tp;
              return (
                <button key={tp} type="button" onClick={() => set('type', tp)}
                  className="flex items-center gap-2 p-3 rounded-xl text-sm font-semibold tap-scale"
                  style={{ border: `1.5px solid ${active ? c.color : 'var(--ds-border)'}`, background: active ? c.bg : 'transparent', color: active ? c.color : 'var(--ds-text-muted)' }}>
                  <Icon size={16} /> {c.label}
                </button>
              );
            })}
          </div>
          <div>
            <label htmlFor="tk-title" className="label">Título *</label>
            <input id="tk-title" className="input" value={f.title} onChange={e => set('title', e.target.value)} required placeholder={f.type === 'incident' ? 'Ej: No tengo internet' : 'Ej: Solicitar acceso a sistema'} />
          </div>
          {kbSug.length > 0 && (
            <div className="rounded-xl p-2.5" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)' }}>
              <p className="text-[11px] font-semibold mb-1" style={{ color: '#3B82F6' }}>Quizás esto resuelva tu problema:</p>
              {kbSug.map(a => (
                <button key={a.id} type="button" onClick={() => api(`/kb/${a.id}`).then((d: any) => setKbView(d)).catch(() => {})} className="block w-full text-left text-[13px] py-1 tap-scale" style={{ color: 'var(--ds-text)' }}>📄 {a.title}</button>
              ))}
            </div>
          )}
          {kbView && (
            <div className="rounded-xl p-3" style={{ background: 'var(--ds-card-alt)' }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[13px] font-semibold" style={{ color: 'var(--ds-text)' }}>{kbView.title}</p>
                <button type="button" onClick={() => setKbView(null)} className="text-[12px]" style={{ color: 'var(--ds-text-muted)' }}>Cerrar</button>
              </div>
              <p className="text-[13px] whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--ds-text-muted)' }}>{kbView.body}</p>
            </div>
          )}
          <div>
            <label htmlFor="tk-desc" className="label">Descripción</label>
            <textarea id="tk-desc" className="input resize-none" rows={3} value={f.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="tk-cat" className="label">Categoría</label>
              <select id="tk-cat" className="input" value={f.category_id} onChange={e => setF(p => ({ ...p, category_id: e.target.value, subcategory_id: '' }))}>
                <option value="">Sin categoría</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {catSubs.length > 0 && (
              <div>
                <label htmlFor="tk-sub" className="label">Subcategoría</label>
                <select id="tk-sub" className="input" value={f.subcategory_id} onChange={e => set('subcategory_id', e.target.value)}>
                  <option value="">—</option>
                  {catSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="tk-channel" className="label">Canal</label>
              <select id="tk-channel" className="input" value={f.channel} onChange={e => set('channel', e.target.value)}>
                <option value="web">Web</option><option value="email">Correo</option>
                <option value="phone">Teléfono</option><option value="whatsapp">WhatsApp</option><option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label htmlFor="tk-impact" className="label">Impacto</label>
              <select id="tk-impact" className="input" value={f.impact} onChange={e => set('impact', e.target.value)}>
                {IMPACT_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="tk-urgency" className="label">Urgencia</label>
              <select id="tk-urgency" className="input" value={f.urgency} onChange={e => set('urgency', e.target.value)}>
                {URGENCY_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          {assets.length > 0 && (
            <div>
              <label htmlFor="tk-asset" className="label">Equipo afectado (opcional)</label>
              <select id="tk-asset" className="input" value={f.asset_id} onChange={e => set('asset_id', e.target.value)}>
                <option value="">Sin equipo</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.asset_type} {a.brand} {a.model} {a.serial_number ? `· ${a.serial_number}` : ''}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2 text-[13px] px-3 py-2 rounded-xl" style={{ background: 'var(--ds-card-alt)' }}>
            <span style={{ color: 'var(--ds-text-muted)' }}>Prioridad calculada:</span>
            <span className="font-bold capitalize" style={{ color: PR }}>{{ low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica' }[priority]}</span>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 btn btn-primary">{saving ? 'Creando…' : 'Crear ticket'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Metric chip ───────────────────────────────────────────────────────────────
function Metric({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div className="rounded-xl px-3 py-2.5 shadow-soft min-w-[92px]" style={cardStyle}>
      <p className="text-[19px] font-bold leading-none" style={{ color: color || 'var(--ds-text)' }}>{value}</p>
      <p className="text-[11px] mt-1 font-medium" style={{ color: 'var(--ds-text-muted)' }}>{label}</p>
    </div>
  );
}

export default function TicketsModule() {
  const { user, canWrite } = useAuth();
  const isAgent = canWrite('tickets');
  const isSup = ['super_admin', 'admin', 'manager'].includes(user?.role || '');
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [view, setView] = useState(isAgent ? 'open' : 'mine');
  const [type, setType] = useState('');
  const [priority, setPriority] = useState('');
  const [q, setQ] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const VIEWS = isAgent
    ? [['open', 'Abiertos'], ['unassigned', 'Sin asignar'], ['assigned', 'Asignados a mí'], ['overdue', 'Vencidos'], ['critical', 'Críticos'], ['escalated', 'Escalados'], ['n1', 'N1'], ['n2', 'N2'], ['n3', 'N3'], ['closed', 'Cerrados'], ['', 'Todos']]
    : [['mine', 'Mis tickets'], ['closed', 'Cerrados']];

  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (view) p.set('view', view);
    if (type) p.set('type', type);
    if (priority) p.set('priority', priority);
    if (q) p.set('q', q);
    setLoading(true);
    authFetch(`?${p}`).then(r => r.json()).then(d => setTickets(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, [view, type, priority, q]);

  useEffect(() => { const id = setTimeout(load, q ? 300 : 0); return () => clearTimeout(id); }, [load, q]);
  useEffect(() => { if (isAgent) api('/dashboard').then(setStats).catch(() => {}); }, [isAgent]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ds-text)' }}>Mesa de Ayuda</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>Soporte TI · incidencias y solicitudes</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link to="/tickets/kb" className="btn btn-ghost" style={{ border: '1px solid var(--ds-border)' }} aria-label="Base de conocimiento">
            <BookOpen size={16} /> <span className="hidden lg:inline">Base</span>
          </Link>
          {isSup && (
            <Link to="/tickets/reports" className="btn btn-ghost" style={{ border: '1px solid var(--ds-border)' }} aria-label="Reportes">
              <BarChart3 size={16} /> <span className="hidden md:inline">Reportes</span>
            </Link>
          )}
          {isAgent && (
            <button type="button" onClick={() => setShowConfig(true)} className="btn btn-ghost" style={{ border: '1px solid var(--ds-border)' }} aria-label="Configuración">
              <Settings2 size={16} /> <span className="hidden md:inline">Config</span>
            </button>
          )}
          <button type="button" onClick={() => setShowNew(true)} className="btn btn-primary">
            <Plus size={16} /> <span className="hidden sm:inline">Nuevo ticket</span><span className="sm:hidden">Nuevo</span>
          </button>
        </div>
      </div>

      {/* Metrics (agents) */}
      {isAgent && stats && (
        <div className="flex gap-2.5 overflow-x-auto scroll-touch pb-1 -mx-1 px-1">
          <Metric label="Abiertos" value={stats.open} />
          <Metric label="Sin asignar" value={stats.unassigned} color="#F59E0B" />
          <Metric label="Vencidos SLA" value={stats.breached} color="#EF4444" />
          <Metric label="Críticos" value={stats.critical} color="#EF4444" />
          <Metric label="Cumpl. SLA" value={`${stats.sla_compliance}%`} color="#10B981" />
          <Metric label="N1 / N2 / N3" value={`${stats.by_level.n1}/${stats.by_level.n2}/${stats.by_level.n3}`} />
        </div>
      )}

      {/* Views */}
      <div className="flex gap-1.5 overflow-x-auto scroll-touch pb-1 -mx-1 px-1">
        {VIEWS.map(([id, label]) => {
          const active = view === id;
          return (
            <button key={id} type="button" onClick={() => setView(id)}
              className="px-3 py-1.5 rounded-lg text-[13px] font-semibold whitespace-nowrap tap-scale"
              style={{ background: active ? 'var(--ds-accent)' : 'var(--ds-card)', color: active ? 'var(--ds-accent-text)' : 'var(--ds-text-muted)', border: `1px solid ${active ? 'var(--ds-accent)' : 'var(--ds-border)'}` }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Search + filters */}
      <div className="rounded-2xl p-3 shadow-soft flex flex-col sm:flex-row gap-2.5" style={cardStyle}>
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ds-text-muted)' }} />
          <input className="input pl-9" placeholder="Buscar por #, título, descripción o usuario…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="flex gap-2.5">
          <select className="input flex-1 sm:w-40" value={type} onChange={e => setType(e.target.value)}>
            <option value="">Todo tipo</option><option value="incident">Incidencias</option><option value="request">Solicitudes</option>
          </select>
          <select className="input flex-1 sm:w-36" value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="">Toda prioridad</option><option value="critical">Crítica</option><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option>
          </select>
        </div>
      </div>

      {/* ── MOBILE: cards ── */}
      <div className="lg:hidden space-y-2.5">
        {loading ? (
          <div className="rounded-2xl p-8 text-center shadow-soft flex items-center justify-center gap-2" style={{ ...cardStyle, color: 'var(--ds-text-muted)' }}><Loader2 size={16} className="animate-spin" /> Cargando…</div>
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl p-10 text-center shadow-soft" style={{ ...cardStyle, color: 'var(--ds-text-muted)' }}>
            <LifeBuoy size={30} className="mx-auto mb-2" style={{ color: 'var(--ds-border-strong)' }} /><p className="text-sm">Sin tickets en esta vista</p>
          </div>
        ) : tickets.map(t => (
          <Link key={t.id} to={`/tickets/${t.id}`} className="block rounded-2xl p-4 shadow-soft tap-scale" style={cardStyle}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-mono" style={{ color: 'var(--ds-text-subtle)' }}>{t.ticket_number}</div>
                <p className="text-[15px] font-semibold truncate mt-0.5" style={{ color: 'var(--ds-text)' }}>{t.title}</p>
              </div>
              <StatusBadge status={t.status} />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <TypeBadge type={t.type} /><PriorityBadge priority={t.priority} /><LevelBadge level={t.level} />
              {t.sla_status && <SlaBadge status={t.sla_status} />}
            </div>
            <div className="flex items-center justify-between gap-2 mt-2.5 text-[12px]" style={{ color: 'var(--ds-text-muted)' }}>
              <span className="truncate">{t.assignee_name ? `→ ${t.assignee_name}` : 'Sin asignar'}</span>
              <span className="flex-shrink-0">{timeAgo(t.updated_at)}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* ── DESKTOP: table ── */}
      <div className="hidden lg:block rounded-2xl overflow-hidden shadow-soft" style={cardStyle}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--ds-card-alt)', borderBottom: '1px solid var(--ds-border)' }}>
                {['Ticket', 'Tipo', 'Prioridad', 'Nivel', 'Asignado', 'SLA', 'Estado', 'Actualizado'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3" style={{ color: 'var(--ds-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12" style={{ color: 'var(--ds-text-muted)' }}>Cargando…</td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center"><LifeBuoy size={30} className="mx-auto mb-2" style={{ color: 'var(--ds-border-strong)' }} /><p className="text-sm" style={{ color: 'var(--ds-text-muted)' }}>Sin tickets</p></td></tr>
              ) : tickets.map((t, i) => (
                <tr key={t.id} onClick={() => navigate(`/tickets/${t.id}`)} className="cursor-pointer"
                  style={{ borderTop: i > 0 ? '1px solid var(--ds-border)' : 'none' }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--ds-card-alt)'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}>
                  <td className="px-4 py-3">
                    <p className="text-[11px] font-mono" style={{ color: 'var(--ds-text-subtle)' }}>{t.ticket_number}</p>
                    <p className="text-sm font-medium truncate max-w-[280px]" style={{ color: 'var(--ds-text)' }}>{t.title}</p>
                  </td>
                  <td className="px-4 py-3"><TypeBadge type={t.type} /></td>
                  <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                  <td className="px-4 py-3"><LevelBadge level={t.level} /></td>
                  <td className="px-4 py-3 text-sm" style={{ color: t.assignee_name ? 'var(--ds-text)' : 'var(--ds-text-subtle)' }}>{t.assignee_name || 'Sin asignar'}</td>
                  <td className="px-4 py-3"><SlaBadge status={t.sla_status} /></td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--ds-text-muted)' }}>{timeAgo(t.updated_at)} <ChevronRight size={13} className="inline" style={{ color: 'var(--ds-border-strong)' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && <NewTicketModal onClose={() => setShowNew(false)} onCreated={(id) => { setShowNew(false); navigate(`/tickets/${id}`); }} />}
      {showConfig && <TicketConfig onClose={() => setShowConfig(false)} />}
    </div>
  );
}
