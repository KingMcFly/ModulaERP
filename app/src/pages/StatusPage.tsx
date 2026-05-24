import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, ExternalLink, Boxes } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const REFRESH_INTERVAL = 60_000;

type MonitorStatus = 'operational' | 'degraded' | 'down' | 'unknown';
type OverallStatus = MonitorStatus;

interface Monitor {
  id: number;
  name: string;
  url: string;
  status: MonitorStatus;
  uptime: number | null;
  description: string | null;
}

interface IncidentUpdate {
  status: string;
  message: string;
  date: string;
}

interface Incident {
  id: number;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  updates: IncidentUpdate[];
}

interface StatusData {
  overall: OverallStatus;
  monitors: Monitor[];
  incidents: Incident[];
  updated_at: string;
}

// ── Status metadata ────────────────────────────────────────────────────────────

const STATUS_META: Record<MonitorStatus, { label: string; color: string; ring: string; dot: string }> = {
  operational: { label: 'Operacional',  color: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500' },
  degraded:    { label: 'Degradado',    color: 'text-amber-700',   ring: 'ring-amber-200',   dot: 'bg-amber-400'  },
  down:        { label: 'Caído',        color: 'text-red-700',     ring: 'ring-red-200',     dot: 'bg-red-500'    },
  unknown:     { label: 'Desconocido',  color: 'text-slate-500',   ring: 'ring-slate-200',   dot: 'bg-slate-400'  },
};

const OVERALL_META: Record<OverallStatus, { banner: string; label: string; sub: string; icon: React.ElementType }> = {
  operational: {
    banner: 'bg-emerald-50 border-emerald-200',
    label:  'Todos los sistemas operacionales',
    sub:    'Todos los servicios funcionan con normalidad.',
    icon:   CheckCircle2,
  },
  degraded: {
    banner: 'bg-amber-50 border-amber-200',
    label:  'Rendimiento degradado',
    sub:    'Algunos servicios están funcionando por debajo de lo normal.',
    icon:   AlertTriangle,
  },
  down: {
    banner: 'bg-red-50 border-red-200',
    label:  'Interrupción del servicio',
    sub:    'Estamos trabajando para resolver el problema lo antes posible.',
    icon:   XCircle,
  },
  unknown: {
    banner: 'bg-slate-50 border-slate-200',
    label:  'Estado desconocido',
    sub:    'No se puede obtener el estado en este momento.',
    icon:   RefreshCw,
  },
};

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: MonitorStatus }) {
  const { dot } = STATUS_META[status] ?? STATUS_META.unknown;
  const ping = status === 'down' || status === 'degraded';
  return (
    <span className="relative flex size-3">
      {ping && <span className={`animate-ping absolute inline-flex size-full rounded-full opacity-60 ${dot}`} />}
      <span className={`relative inline-flex rounded-full size-3 ${dot}`} />
    </span>
  );
}

function MonitorCard({ monitor }: { monitor: Monitor }) {
  const meta = STATUS_META[monitor.status] ?? STATUS_META.unknown;
  return (
    <div className="flex items-center justify-between py-4 px-5 bg-white rounded-2xl border border-slate-100 shadow-sm gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <StatusDot status={monitor.status} />
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 text-sm truncate">{monitor.name}</p>
          {monitor.description && (
            <p className="text-xs text-slate-400 truncate">{monitor.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {monitor.uptime !== null && (
          <span className="text-xs text-slate-400 tabular-nums">{monitor.uptime.toFixed(2)}% uptime</span>
        )}
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ring-1 ${meta.color} ${meta.ring} bg-white`}>
          {meta.label}
        </span>
      </div>
    </div>
  );
}

function IncidentCard({ incident }: { incident: Incident }) {
  const latestUpdate = incident.updates?.[incident.updates.length - 1];
  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
      <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-50">
        <AlertTriangle className="size-4 text-amber-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm">{incident.title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{fmtDate(incident.created_at)}</p>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-amber-200 text-amber-700 bg-amber-50 capitalize">
          {incident.status.replace('_', ' ')}
        </span>
      </div>
      {latestUpdate && (
        <div className="px-5 py-3">
          <p className="text-xs text-slate-500 leading-relaxed">{latestUpdate.message}</p>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function StatusPage() {
  const [data, setData]       = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetch, setLastFetch]   = useState<Date | null>(null);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch(`${API}/status`);
      if (!res.ok) throw new Error('Error al obtener estado');
      setData(await res.json());
      setError(null);
      setLastFetch(new Date());
    } catch {
      setError('No se puede conectar al servidor de estado.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = setInterval(() => load(), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [load]);

  const overall = data?.overall ?? 'unknown';
  const overallMeta = OVERALL_META[overall];
  const OverallIcon = overallMeta.icon;

  return (
    <div className="min-h-screen" style={{ background: '#F3F3F7' }}>
      {/* Ambient gradient */}
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-60 -right-60 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(242,176,69,0.09) 0%, transparent 65%)' }}
        />
        <div
          className="absolute -bottom-60 -left-60 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(242,176,69,0.06) 0%, transparent 65%)' }}
        />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <Link to="/login" className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-primary-500 flex items-center justify-center">
              <Boxes className="size-4 text-white" />
            </div>
            <span className="font-bold text-slate-800 text-lg">FB Core</span>
          </Link>
          <div className="flex items-center gap-3">
            {lastFetch && (
              <span className="text-xs text-slate-400 hidden sm:block">
                Actualizado {fmtDate(lastFetch.toISOString())}
              </span>
            )}
            <button
              type="button"
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-24">
            <div className="size-7 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-8 text-center">
            <XCircle className="size-8 text-red-400 mx-auto mb-3" />
            <p className="font-semibold text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => load(true)}
              className="mt-4 text-sm text-red-500 hover:text-red-700 underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Status content */}
        {!loading && data && (
          <div className="space-y-6">
            {/* Overall status banner */}
            <div className={`border rounded-2xl px-6 py-5 flex items-start gap-4 ${overallMeta.banner}`}>
              <OverallIcon
                className={`size-6 shrink-0 mt-0.5 ${
                  overall === 'operational' ? 'text-emerald-600' :
                  overall === 'degraded'   ? 'text-amber-500'   :
                  overall === 'down'       ? 'text-red-500'     : 'text-slate-400'
                }`}
              />
              <div>
                <p className="font-bold text-slate-800">{overallMeta.label}</p>
                <p className="text-sm text-slate-500 mt-0.5">{overallMeta.sub}</p>
              </div>
            </div>

            {/* Active incidents */}
            {data.incidents.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Incidentes activos
                </h2>
                <div className="space-y-3">
                  {data.incidents.map(inc => (
                    <IncidentCard key={inc.id} incident={inc} />
                  ))}
                </div>
              </section>
            )}

            {/* Services */}
            <section>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Servicios
              </h2>
              {data.monitors.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 px-5 py-8 text-center text-sm text-slate-400">
                  No hay servicios configurados.
                </div>
              ) : (
                <div className="space-y-2">
                  {data.monitors.map(m => (
                    <MonitorCard key={m.id} monitor={m} />
                  ))}
                </div>
              )}
            </section>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4">
              <Link to="/login" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                Ir a la aplicación
              </Link>
              <a
                href="https://www.openstatus.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span>Powered by OpenStatus</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
