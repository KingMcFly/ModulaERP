import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Loader2, Tag, Clock, UserCog, X, Layers, MessageSquare, Wand2, Trash2, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { api, cardStyle, PRIORITY_CFG, LEVEL_CFG, TYPE_CFG } from './shared';

interface Agent { id: number; name: string; email: string; role: string; level: string | null }
interface Cfg {
  categories: { id: number; name: string; type: string; color: string }[];
  subcategories: { id: number; category_id: number; name: string; default_level: string }[];
  sla: { id: number; priority: string; first_response_mins: number; resolution_mins: number; is_active: boolean }[];
  agents: Agent[];
  templates: { id: number; title: string; body: string }[];
  rules: { id: number; category_id: number | null; category_name: string | null; type: string | null; level: string | null; assign_to: number; assignee_name: string }[];
  recurrences: { id: number; title: string; type: string; category_name: string | null; assignee_name: string | null; every_days: number; next_run_at: string }[];
}

type Tab = 'categories' | 'subcategories' | 'templates' | 'rules' | 'recurrences' | 'sla' | 'agents';

export default function TicketConfig({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('categories');
  const [cfg, setCfg] = useState<Cfg | null>(null);

  const load = () => api<Cfg>('/config').then(setCfg).catch(e => toast.error(e.message));
  useEffect(() => { load(); }, []);

  async function del(path: string) {
    try { await api(path, { method: 'DELETE' }); load(); } catch (e: any) { toast.error(e.message); }
  }

  const TABS: [Tab, string, any][] = [
    ['categories', 'Categorías', Tag], ['subcategories', 'Subcat.', Layers],
    ['templates', 'Plantillas', MessageSquare], ['rules', 'Reglas', Wand2],
    ['recurrences', 'Recurrentes', Repeat], ['sla', 'SLA', Clock], ['agents', 'Agentes', UserCog],
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xl flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="rounded-t-3xl sm:rounded-3xl shadow-soft-xl w-full sm:max-w-lg p-5 sm:p-6 max-h-[92dvh] overflow-y-auto scroll-touch" style={{ ...cardStyle, paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <div className="sheet-handle" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--ds-text)' }}>Configuración de tickets</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--ds-text-muted)' }}><X size={18} /></button>
        </div>

        <div className="flex gap-1 p-1 rounded-xl mb-4 overflow-x-auto scroll-touch" style={{ background: 'var(--ds-surface)' }}>
          {TABS.map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-medium tap-scale whitespace-nowrap"
              style={{ background: tab === id ? 'var(--ds-card)' : 'transparent', color: tab === id ? 'var(--ds-text)' : 'var(--ds-text-muted)', boxShadow: tab === id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {!cfg ? <div className="py-8 text-center"><Loader2 size={18} className="animate-spin mx-auto" style={{ color: 'var(--ds-text-muted)' }} /></div> : (
          <>
            {tab === 'categories' && <Categories cfg={cfg} reload={load} onDel={del} />}
            {tab === 'subcategories' && <Subcategories cfg={cfg} reload={load} onDel={del} />}
            {tab === 'templates' && <Templates cfg={cfg} reload={load} onDel={del} />}
            {tab === 'rules' && <Rules cfg={cfg} reload={load} onDel={del} />}
            {tab === 'recurrences' && <Recurrences cfg={cfg} reload={load} onDel={del} />}
            {tab === 'sla' && <Sla cfg={cfg} reload={load} onDel={del} />}
            {tab === 'agents' && <Agents cfg={cfg} reload={load} onDel={del} />}
          </>
        )}
      </div>
    </div>
  );
}

type SectionProps = { cfg: Cfg; reload: () => void; onDel: (path: string) => void };

function Row({ children, onDelete }: { children: React.ReactNode; onDelete?: () => void }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ border: '1px solid var(--ds-border)' }}>
      <div className="flex-1 min-w-0">{children}</div>
      {onDelete && <button type="button" onClick={onDelete} className="p-1.5 rounded-lg text-red-500 tap-scale"><Trash2 size={14} /></button>}
    </div>
  );
}

function Categories({ cfg, reload, onDel }: SectionProps) {
  const [name, setName] = useState('');
  async function add(e: FormEvent) { e.preventDefault(); if (!name.trim()) return; try { await api('/config/categories', { method: 'POST', body: JSON.stringify({ name: name.trim() }) }); setName(''); reload(); } catch (e: any) { toast.error(e.message); } }
  return (
    <div className="space-y-2">
      <form onSubmit={add} className="flex gap-2 mb-3"><input className="input flex-1" placeholder="Nueva categoría…" value={name} onChange={e => setName(e.target.value)} /><button className="btn btn-primary px-3"><Plus size={16} /></button></form>
      {cfg.categories.map(c => <Row key={c.id} onDelete={() => onDel(`/config/categories/${c.id}`)}><span className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--ds-text)' }}><span className="size-3 rounded-full" style={{ background: c.color }} />{c.name}</span></Row>)}
    </div>
  );
}

function Subcategories({ cfg, reload, onDel }: SectionProps) {
  const [catId, setCatId] = useState('');
  const [name, setName] = useState('');
  const [level, setLevel] = useState('n1');
  const subs = cfg.subcategories.filter(s => String(s.category_id) === catId);
  async function add(e: FormEvent) { e.preventDefault(); if (!catId || !name.trim()) return; try { await api('/config/subcategories', { method: 'POST', body: JSON.stringify({ category_id: catId, name: name.trim(), default_level: level }) }); setName(''); reload(); } catch (e: any) { toast.error(e.message); } }
  return (
    <div className="space-y-2">
      <select className="input mb-2" value={catId} onChange={e => setCatId(e.target.value)}><option value="">Elige una categoría…</option>{cfg.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      {catId && (
        <>
          <form onSubmit={add} className="flex gap-2 mb-3">
            <input className="input flex-1" placeholder="Nueva subcategoría…" value={name} onChange={e => setName(e.target.value)} />
            <select className="input w-20" value={level} onChange={e => setLevel(e.target.value)}>{['n1', 'n2', 'n3'].map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}</select>
            <button className="btn btn-primary px-3"><Plus size={16} /></button>
          </form>
          {subs.map(s => <Row key={s.id} onDelete={() => onDel(`/config/subcategories/${s.id}`)}><span className="text-sm flex items-center gap-2" style={{ color: 'var(--ds-text)' }}>{s.name} <span className="text-[11px] font-bold" style={{ color: LEVEL_CFG[s.default_level]?.color }}>{s.default_level?.toUpperCase()}</span></span></Row>)}
          {subs.length === 0 && <p className="text-[13px] text-center py-3" style={{ color: 'var(--ds-text-subtle)' }}>Sin subcategorías en esta categoría.</p>}
        </>
      )}
    </div>
  );
}

function Templates({ cfg, reload, onDel }: SectionProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  async function add(e: FormEvent) { e.preventDefault(); if (!title.trim() || !body.trim()) return; try { await api('/config/templates', { method: 'POST', body: JSON.stringify({ title: title.trim(), body: body.trim() }) }); setTitle(''); setBody(''); reload(); } catch (e: any) { toast.error(e.message); } }
  return (
    <div className="space-y-2">
      <form onSubmit={add} className="space-y-2 mb-3">
        <input className="input" placeholder="Título de la plantilla…" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea className="input resize-none" rows={3} placeholder="Texto de respuesta…" value={body} onChange={e => setBody(e.target.value)} />
        <button className="btn btn-primary w-full"><Plus size={16} /> Agregar plantilla</button>
      </form>
      {cfg.templates.map(t => <Row key={t.id} onDelete={() => onDel(`/config/templates/${t.id}`)}><div><p className="text-sm font-medium" style={{ color: 'var(--ds-text)' }}>{t.title}</p><p className="text-[12px] truncate" style={{ color: 'var(--ds-text-muted)' }}>{t.body}</p></div></Row>)}
      {cfg.templates.length === 0 && <p className="text-[13px] text-center py-3" style={{ color: 'var(--ds-text-subtle)' }}>Sin plantillas.</p>}
    </div>
  );
}

function Rules({ cfg, reload, onDel }: SectionProps) {
  const [r, setR] = useState({ category_id: '', type: '', level: '', assign_to: '' });
  const set = (k: string, v: string) => setR(p => ({ ...p, [k]: v }));
  async function add(e: FormEvent) { e.preventDefault(); if (!r.assign_to) return toast.error('Elige un técnico'); try { await api('/config/rules', { method: 'POST', body: JSON.stringify(r) }); setR({ category_id: '', type: '', level: '', assign_to: '' }); reload(); } catch (e: any) { toast.error(e.message); } }
  return (
    <div className="space-y-2">
      <p className="text-[12px] mb-2" style={{ color: 'var(--ds-text-muted)' }}>Al crear un ticket que cumpla las condiciones, se asigna automáticamente.</p>
      <form onSubmit={add} className="space-y-2 mb-3 p-3 rounded-xl" style={{ background: 'var(--ds-card-alt)' }}>
        <div className="grid grid-cols-2 gap-2">
          <select className="input" value={r.category_id} onChange={e => set('category_id', e.target.value)}><option value="">Cualquier categoría</option>{cfg.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select className="input" value={r.type} onChange={e => set('type', e.target.value)}><option value="">Cualquier tipo</option><option value="incident">Incidencia</option><option value="request">Solicitud</option></select>
        </div>
        <select className="input" value={r.assign_to} onChange={e => set('assign_to', e.target.value)}><option value="">Asignar a…</option>{cfg.agents.map(a => <option key={a.id} value={a.id}>{a.name}{a.level ? ` (${a.level.toUpperCase()})` : ''}</option>)}</select>
        <button className="btn btn-primary w-full"><Plus size={16} /> Crear regla</button>
      </form>
      {cfg.rules.map(rule => (
        <Row key={rule.id} onDelete={() => onDel(`/config/rules/${rule.id}`)}>
          <div className="text-[13px]" style={{ color: 'var(--ds-text)' }}>
            <span style={{ color: 'var(--ds-text-muted)' }}>{rule.category_name || 'Cualquier categoría'}{rule.type ? ` · ${TYPE_CFG[rule.type]?.label}` : ''}</span>
            <span className="mx-1.5">→</span><strong>{rule.assignee_name}</strong>
          </div>
        </Row>
      ))}
      {cfg.rules.length === 0 && <p className="text-[13px] text-center py-3" style={{ color: 'var(--ds-text-subtle)' }}>Sin reglas de auto-asignación.</p>}
    </div>
  );
}

function Recurrences({ cfg, reload, onDel }: SectionProps) {
  const [r, setR] = useState({ title: '', type: 'request', category_id: '', impact: 'low', urgency: 'low', assign_to: '', every_days: '30', next_run_at: new Date().toISOString().slice(0, 10) });
  const set = (k: string, v: string) => setR(p => ({ ...p, [k]: v }));
  async function add(e: FormEvent) { e.preventDefault(); if (!r.title.trim()) return toast.error('Título requerido'); try { await api('/config/recurrences', { method: 'POST', body: JSON.stringify(r) }); setR({ ...r, title: '', assign_to: '' }); reload(); } catch (e: any) { toast.error(e.message); } }
  return (
    <div className="space-y-2">
      <p className="text-[12px] mb-2" style={{ color: 'var(--ds-text-muted)' }}>Genera tickets automáticamente cada cierto tiempo (ej. mantención preventiva).</p>
      <form onSubmit={add} className="space-y-2 mb-3 p-3 rounded-xl" style={{ background: 'var(--ds-card-alt)' }}>
        <input className="input" placeholder="Título del ticket recurrente…" value={r.title} onChange={e => set('title', e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <select className="input" value={r.type} onChange={e => set('type', e.target.value)}><option value="request">Solicitud</option><option value="incident">Incidencia</option></select>
          <select className="input" value={r.category_id} onChange={e => set('category_id', e.target.value)}><option value="">Sin categoría</option>{cfg.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select className="input" value={r.assign_to} onChange={e => set('assign_to', e.target.value)}><option value="">Sin asignar</option>{cfg.agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <div className="flex items-center gap-1.5"><span className="text-[12px]" style={{ color: 'var(--ds-text-muted)' }}>Cada</span><input className="input py-1.5 w-16" type="number" min="1" value={r.every_days} onChange={e => set('every_days', e.target.value)} /><span className="text-[12px]" style={{ color: 'var(--ds-text-muted)' }}>días</span></div>
        </div>
        <div><label className="text-[11px]" style={{ color: 'var(--ds-text-muted)' }}>Primera ejecución</label><input className="input" type="date" value={r.next_run_at} onChange={e => set('next_run_at', e.target.value)} /></div>
        <button className="btn btn-primary w-full"><Plus size={16} /> Crear recurrente</button>
      </form>
      {cfg.recurrences.map(rec => (
        <Row key={rec.id} onDelete={() => onDel(`/config/recurrences/${rec.id}`)}>
          <div><p className="text-sm font-medium" style={{ color: 'var(--ds-text)' }}>{rec.title}</p><p className="text-[12px]" style={{ color: 'var(--ds-text-muted)' }}>Cada {rec.every_days}d · próx. {new Date(rec.next_run_at).toLocaleDateString('es-CL')}{rec.assignee_name ? ` · ${rec.assignee_name}` : ''}</p></div>
        </Row>
      ))}
      {cfg.recurrences.length === 0 && <p className="text-[13px] text-center py-3" style={{ color: 'var(--ds-text-subtle)' }}>Sin tickets recurrentes.</p>}
    </div>
  );
}

function Sla({ cfg, reload }: SectionProps) {
  async function save(id: number, fr: number, rs: number) { try { await api(`/config/sla/${id}`, { method: 'PUT', body: JSON.stringify({ first_response_mins: fr, resolution_mins: rs }) }); toast.success('SLA guardado'); reload(); } catch (e: any) { toast.error(e.message); } }
  return (
    <div className="space-y-2.5">
      {cfg.sla.map(s => <SlaRow key={s.id} s={s} onSave={save} />)}
      <p className="text-[11px]" style={{ color: 'var(--ds-text-subtle)' }}>Tiempos en minutos. Primera respuesta / resolución por prioridad.</p>
    </div>
  );
}
function SlaRow({ s, onSave }: { s: any; onSave: (id: number, fr: number, rs: number) => void }) {
  const [fr, setFr] = useState(String(s.first_response_mins));
  const [rs, setRs] = useState(String(s.resolution_mins));
  const c = PRIORITY_CFG[s.priority] || PRIORITY_CFG.medium;
  const dirty = fr !== String(s.first_response_mins) || rs !== String(s.resolution_mins);
  return (
    <div className="px-3 py-2.5 rounded-xl" style={{ border: '1px solid var(--ds-border)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.color }}>{c.label}</span>
        {dirty && <button type="button" onClick={() => onSave(s.id, parseInt(fr), parseInt(rs))} className="text-[12px] font-semibold" style={{ color: 'var(--ds-accent)' }}>Guardar</button>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="text-[11px]" style={{ color: 'var(--ds-text-muted)' }}>1ª respuesta</label><input className="input py-1.5" type="number" value={fr} onChange={e => setFr(e.target.value)} /></div>
        <div><label className="text-[11px]" style={{ color: 'var(--ds-text-muted)' }}>Resolución</label><input className="input py-1.5" type="number" value={rs} onChange={e => setRs(e.target.value)} /></div>
      </div>
    </div>
  );
}

function Agents({ cfg, reload }: SectionProps) {
  async function setLevel(userId: number, level: string) { try { await api(`/config/agents/${userId}/level`, { method: 'POST', body: JSON.stringify({ level }) }); toast.success('Nivel asignado'); reload(); } catch (e: any) { toast.error(e.message); } }
  return (
    <div className="space-y-2">
      {cfg.agents.map(a => (
        <div key={a.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ border: '1px solid var(--ds-border)' }}>
          <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate" style={{ color: 'var(--ds-text)' }}>{a.name}</p><p className="text-[11px] capitalize" style={{ color: 'var(--ds-text-muted)' }}>{a.role.replace('_', ' ')}</p></div>
          <div className="flex gap-1">{(['n1', 'n2', 'n3'] as const).map(lv => <button key={lv} type="button" onClick={() => setLevel(a.id, lv)} className="px-2.5 py-1.5 rounded-lg text-[12px] font-bold tap-scale" style={{ background: a.level === lv ? LEVEL_CFG[lv].bg : 'var(--ds-card-alt)', color: a.level === lv ? LEVEL_CFG[lv].color : 'var(--ds-text-subtle)' }}>{LEVEL_CFG[lv].label}</button>)}</div>
        </div>
      ))}
      {cfg.agents.length === 0 && <p className="text-sm text-center py-6" style={{ color: 'var(--ds-text-muted)' }}>Sin técnicos. Marca usuarios como técnico en Personas.</p>}
    </div>
  );
}
