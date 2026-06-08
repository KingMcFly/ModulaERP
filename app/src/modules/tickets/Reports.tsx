import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { exportToExcel } from '../../utils/exportExcel';
import { api, authFetch, cardStyle, PRIORITY_CFG, LEVEL_CFG, STATUS_CFG, TYPE_CFG, Ticket } from './shared';

function fmtMins(m: number) {
  if (!m) return '—';
  if (m < 60) return `${Math.round(m)}m`;
  const h = Math.floor(m / 60), mm = Math.round(m % 60);
  if (h < 24) return `${h}h ${mm}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

function KPI({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div className="rounded-2xl p-4 shadow-soft" style={cardStyle}>
      <p className="text-[22px] font-bold leading-none" style={{ color: color || 'var(--ds-text)' }}>{value}</p>
      <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--ds-text-muted)' }}>{label}</p>
    </div>
  );
}

function ChartCard({ title, data, color }: { title: string; data: { name: string; count: number }[]; color?: string }) {
  const isDark = document.documentElement.classList.contains('dark');
  return (
    <div className="rounded-2xl p-5 shadow-soft" style={cardStyle}>
      <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ds-text)' }}>{title}</h3>
      {data.length === 0 ? (
        <p className="text-[13px] py-8 text-center" style={{ color: 'var(--ds-text-subtle)' }}>Sin datos</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(140, data.length * 38)}>
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: isDark ? '#9CA3AF' : '#6B7280' }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
              contentStyle={{ background: 'var(--ds-card)', border: '1px solid var(--ds-border)', borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
              {data.map((d, i) => <Cell key={i} fill={(d as any).color || color || '#C6922B'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function TicketsReports() {
  const { user } = useAuth();
  const isSup = ['super_admin', 'admin', 'manager'].includes(user?.role || '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    setLoading(true);
    Promise.all([api(`/reports?${p}`).catch(() => null), api('/dashboard').catch(() => null)])
      .then(([r, d]) => { setData(r); setDash(d); })
      .finally(() => setLoading(false));
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  async function exportAll() {
    setExporting(true);
    try {
      const rows = await authFetch('?view=').then(r => r.json()) as Ticket[];
      exportToExcel(rows.map(t => ({
        'N°': t.ticket_number, Tipo: TYPE_CFG[t.type]?.label, Título: t.title,
        Estado: STATUS_CFG[t.status]?.label, Prioridad: PRIORITY_CFG[t.priority]?.label,
        Nivel: t.level?.toUpperCase(), Categoría: t.category_name || '',
        Solicitante: t.reporter_name || '', Técnico: t.assignee_name || '',
        Creado: t.created_at ? new Date(t.created_at).toLocaleString('es-CL') : '',
        Resuelto: t.resolved_at ? new Date(t.resolved_at).toLocaleString('es-CL') : '',
      })), 'tickets');
    } catch (e: any) { toast.error(e.message || 'Error al exportar'); }
    finally { setExporting(false); }
  }

  if (!isSup) return (
    <div className="text-center py-16"><p style={{ color: 'var(--ds-text-muted)' }}>Solo supervisores pueden ver reportes.</p>
      <Link to="/tickets" className="text-sm mt-2 inline-block" style={{ color: 'var(--ds-accent)' }}>← Volver</Link></div>
  );

  const priColors = (arr: any[]) => (arr || []).map(d => ({ name: PRIORITY_CFG[d.priority]?.label || d.priority, count: d.count, color: PRIORITY_CFG[d.priority]?.color }));
  const lvlColors = (arr: any[]) => (arr || []).map(d => ({ name: LEVEL_CFG[d.level]?.label || d.level, count: d.count, color: LEVEL_CFG[d.level]?.color }));

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-start gap-3">
        <Link to="/tickets" className="size-9 flex items-center justify-center rounded-xl flex-shrink-0 tap-scale" style={{ border: '1px solid var(--ds-border)', color: 'var(--ds-text-muted)' }}><ArrowLeft size={16} /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold flex items-center gap-2" style={{ color: 'var(--ds-text)' }}><BarChart3 size={22} /> Reportes</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>Métricas y cumplimiento de SLA</p>
        </div>
        <button onClick={exportAll} disabled={exporting} className="btn btn-ghost flex-shrink-0" style={{ border: '1px solid var(--ds-border)' }}>
          {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} <span className="hidden sm:inline">Exportar Excel</span>
        </button>
      </div>

      {/* Date range */}
      <div className="rounded-2xl p-3 shadow-soft flex flex-col sm:flex-row gap-2.5 items-center" style={cardStyle}>
        <span className="text-[13px] font-medium px-1" style={{ color: 'var(--ds-text-muted)' }}>Rango:</span>
        <input type="date" className="input flex-1" value={from} onChange={e => setFrom(e.target.value)} />
        <span style={{ color: 'var(--ds-text-subtle)' }}>—</span>
        <input type="date" className="input flex-1" value={to} onChange={e => setTo(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin" style={{ color: 'var(--ds-text-muted)' }} /></div>
      ) : (
        <>
          {/* KPIs */}
          {dash && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KPI label="Cumplimiento SLA" value={`${dash.sla_compliance}%`} color={dash.sla_compliance >= 90 ? '#10B981' : dash.sla_compliance >= 70 ? '#F59E0B' : '#EF4444'} />
              <KPI label="1ª respuesta prom." value={fmtMins(dash.avg_first_response_mins)} />
              <KPI label="Resolución prom." value={fmtMins(dash.avg_resolution_mins)} />
              <KPI label="Satisfacción" value={dash.satisfaction ? `${dash.satisfaction}/5` : '—'} color="#F59E0B" />
              <KPI label="Abiertos" value={dash.open} />
              <KPI label="Vencidos SLA" value={dash.breached} color="#EF4444" />
              <KPI label="Reabiertos" value={dash.reopened} color="#F97316" />
              <KPI label="Resueltos (sem.)" value={dash.resolved_week} color="#10B981" />
            </div>
          )}

          {/* Charts */}
          {data && (
            <div className="grid lg:grid-cols-2 gap-3">
              <ChartCard title="Tickets por prioridad" data={priColors(data.by_priority)} />
              <ChartCard title="Tickets por nivel" data={lvlColors(data.by_level)} />
              <ChartCard title="Tickets por categoría" data={(data.by_category || []).map((d: any) => ({ name: d.name || 'Sin categoría', count: d.count }))} color="#0EA5E9" />
              <ChartCard title="Tickets por técnico" data={(data.by_agent || []).map((d: any) => ({ name: d.name, count: d.count }))} color="#8B5CF6" />
            </div>
          )}

          {/* Top requesters */}
          {data?.by_requester?.length > 0 && (
            <div className="rounded-2xl p-5 shadow-soft" style={cardStyle}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ds-text)' }}>Usuarios que más tickets generan</h3>
              <div className="space-y-1.5">
                {data.by_requester.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-[13px]">
                    <span style={{ color: 'var(--ds-text)' }}>{r.name}</span>
                    <span className="font-semibold px-2 py-0.5 rounded-full text-xs" style={{ background: 'var(--ds-card-alt)', color: 'var(--ds-text-muted)' }}>{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
