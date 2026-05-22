import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, ArrowRightLeft, Wrench, Users, Activity,
  AlertTriangle, AlertCircle, CheckCircle, Clock,
  TrendingUp, DollarSign, Plus, ChevronRight,
  PackageOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function authFetch(path: string) {
  const token = localStorage.getItem('token');
  return fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-black/[0.05] ${className}`} />;
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className="flex items-start justify-between mb-5">
        <Skeleton className="w-11 h-11 rounded-2xl" />
        <Skeleton className="w-14 h-5 rounded-full" />
      </div>
      <Skeleton className="w-24 h-8 mb-2 rounded-xl" />
      <Skeleton className="w-32 h-4 mb-1.5 rounded-lg" />
      <Skeleton className="w-20 h-3.5 rounded-lg" />
    </div>
  );
}

interface DashStats {
  assets: { total: number; available: number; loaned: number; maintenance: number; total_value: number };
  personnel: { total: number };
  monitoring: { total: number; online: number; offline: number; warning: number };
  alerts: { overdue_loans: number; low_stock: number; overdue_maintenance: number; total: number };
  recent_activity: ActivityEntry[];
  overdue_loans_list: OverdueLoan[];
  low_stock_list: LowStockItem[];
}
interface ActivityEntry {
  id: number; module: string; action: string; entity_type: string;
  entity_id: number; created_at: string; user_name: string;
}
interface OverdueLoan {
  id: number; borrower: string; brand: string; model: string;
  asset_type: string; expected_return: string;
}
interface LowStockItem {
  id: number; name: string; current_stock: number; min_stock: number; unit: string;
}

const ACTION_LABELS: Record<string, string> = {
  create: 'creó', update: 'actualizó', delete: 'eliminó',
};
const MODULE_LABELS: Record<string, string> = {
  inventory: 'activo', loans: 'préstamo', maintenance: 'mantenimiento',
  personnel: 'empleado', supplies: 'insumo',
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'hace un momento';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

function fmt(n: number) { return n?.toLocaleString('es-CL') ?? '0'; }
function fmtCurrency(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);
}

function AlertBanner({ stats }: { stats: DashStats }) {
  const { alerts, overdue_loans_list, low_stock_list } = stats;
  if (alerts.total === 0) return null;

  return (
    <div
      className="rounded-2xl p-5 space-y-4 animate-fade-up delay-40"
      style={{
        background: 'rgba(245,158,11,0.07)',
        border: '1px solid rgba(217,119,6,0.15)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55)',
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(245,158,11,0.15)' }}
        >
          <AlertTriangle size={13} className="text-amber-500" aria-hidden="true" />
        </div>
        <span className="text-[13px] font-bold text-amber-800 tracking-[-0.01em]">
          {alerts.total} alerta{alerts.total > 1 ? 's' : ''} pendiente{alerts.total > 1 ? 's' : ''}
        </span>
      </div>
      {overdue_loans_list.length > 0 && (
        <div>
          <p className="text-[10.5px] font-bold text-amber-700 mb-2 flex items-center gap-1 uppercase tracking-[0.07em]">
            <Clock size={10} aria-hidden="true" /> Préstamos vencidos ({alerts.overdue_loans})
          </p>
          <div className="space-y-1.5">
            {overdue_loans_list.map(l => (
              <div
                key={l.id}
                className="flex items-center justify-between text-[12px] text-amber-800 rounded-xl px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(217,119,6,0.08)' }}
              >
                <span className="font-semibold truncate max-w-[60%]">{l.borrower || '—'}</span>
                <span className="text-amber-600 font-medium">{l.brand} {l.model || l.asset_type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {low_stock_list.length > 0 && (
        <div>
          <p className="text-[10.5px] font-bold text-amber-700 mb-2 flex items-center gap-1 uppercase tracking-[0.07em]">
            <PackageOpen size={10} aria-hidden="true" /> Stock bajo ({alerts.low_stock})
          </p>
          <div className="space-y-1.5">
            {low_stock_list.map(s => (
              <div
                key={s.id}
                className="flex items-center justify-between text-[12px] text-amber-800 rounded-xl px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(217,119,6,0.08)' }}
              >
                <span className="font-semibold truncate max-w-[60%]">{s.name}</span>
                <span className="text-amber-600 font-medium">{s.current_stock}/{s.min_stock} {s.unit || 'u'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityFeed({ items }: { items: ActivityEntry[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 gap-2.5 text-[#AEAEB2]">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.1)' }}
        >
          <CheckCircle size={20} className="text-emerald-400" aria-hidden="true" />
        </div>
        <span className="text-[13px] font-semibold">Sin actividad reciente</span>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {items.map((item, i) => (
        <div
          key={item.id}
          className="flex items-start gap-3 py-3"
          style={{ borderBottom: i < items.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold"
            style={{
              background: 'linear-gradient(135deg, #F3F3F7, #E8E8F0)',
              color: '#65656E',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            {(item.user_name || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] text-[#1D1D1F] leading-relaxed">
              <span className="font-semibold">{item.user_name || 'Sistema'}</span>
              {' '}{ACTION_LABELS[item.action] || item.action}{' '}
              <span className="text-[#65656E]">{MODULE_LABELS[item.module] || item.module}</span>
              {item.entity_id ? <span className="text-[#AEAEB2]"> #{item.entity_id}</span> : ''}
            </p>
            <p className="text-[11px] text-[#AEAEB2] mt-0.5 font-medium">{timeAgo(item.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user, hasModule } = useAuth();
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);

  const primaryColor = user?.tenant?.primary_color || '#6366F1';

  useEffect(() => {
    authFetch('/dashboard/stats')
      .then(d => { if (!d.error) setStats(d); })
      .finally(() => setLoading(false));
  }, []);

  const cards = !stats ? [] : [
    hasModule('inventory') && stats.assets && {
      icon: Package, label: 'Activos Totales',
      value: fmt(stats.assets.total),
      sub: `${fmt(stats.assets.available)} disponibles`,
      color: primaryColor,
      extra: stats.assets.loaned > 0 ? `${stats.assets.loaned} en préstamo` : null,
    },
    hasModule('inventory') && stats.assets && stats.assets.total_value > 0 && {
      icon: DollarSign, label: 'Valor del inventario',
      value: fmtCurrency(stats.assets.total_value),
      sub: `${fmt(stats.assets.maintenance)} en mantención`,
      color: '#10B981',
      extra: null,
    },
    hasModule('personnel') && stats.personnel && {
      icon: Users, label: 'Personal activo',
      value: fmt(stats.personnel.total),
      sub: 'empleados registrados',
      color: '#0EA5E9',
      extra: null,
    },
    hasModule('monitoring') && stats.monitoring && stats.monitoring.total > 0 && {
      icon: Activity, label: 'Agentes online',
      value: fmt(stats.monitoring.online),
      sub: `de ${fmt(stats.monitoring.total)} totales`,
      color: stats.monitoring.warning > 0 ? '#EF4444' : '#10B981',
      extra: stats.monitoring.warning > 0 ? `${stats.monitoring.warning} con alertas` : null,
    },
  ].filter(Boolean) as any[];

  const quickActions = [
    hasModule('inventory')   && { label: 'Nuevo activo',       to: '/inventory',   icon: Package,        color: primaryColor },
    hasModule('loans')       && { label: 'Registrar préstamo', to: '/loans',       icon: ArrowRightLeft, color: '#0EA5E9' },
    hasModule('maintenance') && { label: 'Agendar mantención', to: '/maintenance', icon: Wrench,         color: '#F59E0B' },
    hasModule('personnel')   && { label: 'Agregar empleado',   to: '/personnel',   icon: Users,          color: '#10B981' },
  ].filter(Boolean) as any[];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-[26px] font-bold text-[#0A0A0F] tracking-[-0.03em] leading-tight">
          Hola, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-[#9898A3] text-[13px] mt-1 font-medium">
          {user?.tenant?.name} · {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Alerts */}
      {!loading && stats && stats.alerts.total > 0 && <AlertBanner stats={stats} />}

      {/* KPI cards */}
      <div className={`grid gap-4 ${
        loading || cards.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      }`}>
        {loading
          ? [0, 1, 2, 3].map(i => <CardSkeleton key={i} />)
          : cards.map(({ icon: Icon, label, value, sub, color, extra }, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 animate-fade-up group"
              style={{
                border: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 2px 10px rgba(0,0,0,0.03)',
                animationDelay: `${i * 55}ms`,
                transition: 'box-shadow 250ms cubic-bezier(0.23, 1, 0.32, 1)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.09), 0 8px 32px rgba(0,0,0,0.05)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 2px 10px rgba(0,0,0,0.03)';
              }}
            >
              <div className="flex items-start justify-between mb-5">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${color}22, ${color}0E)` }}
                >
                  <Icon size={20} style={{ color }} aria-hidden="true" />
                </div>
                <div
                  className="flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-bold text-emerald-600"
                  style={{ background: 'rgba(16,185,129,0.08)' }}
                >
                  <TrendingUp size={10} aria-hidden="true" />
                </div>
              </div>
              <p
                className="text-[30px] font-bold text-[#0A0A0F] tabular-nums leading-none tracking-[-0.03em]"
              >
                {value}
              </p>
              <p className="text-[13px] font-bold text-[#333338] mt-2 tracking-[-0.01em]">{label}</p>
              <p className="text-[12px] text-[#9898A3] mt-0.5 font-medium">{sub}</p>
              {extra && (
                <div
                  className="mt-3 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold"
                  style={{ background: `${color}12`, color }}
                >
                  {extra}
                </div>
              )}
            </div>
          ))
        }
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent activity */}
        <div
          className="lg:col-span-2 bg-white rounded-2xl overflow-hidden animate-fade-up delay-150"
          style={{
            border: '1px solid rgba(0,0,0,0.05)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}
          >
            <h2 className="font-bold text-[#0A0A0F] text-[13px] tracking-[-0.02em]">Actividad reciente</h2>
            <Link
              to="/reports"
              className="text-[12px] font-semibold flex items-center gap-0.5"
              style={{
                color: primaryColor,
                transition: 'opacity 160ms cubic-bezier(0.23, 1, 0.32, 1)',
              }}
            >
              Ver todo <ChevronRight size={12} aria-hidden="true" />
            </Link>
          </div>
          <div className="px-5 pb-2">
            {loading ? (
              <div className="space-y-4 pt-4">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-3/4 rounded-lg" />
                      <Skeleton className="h-2.5 w-1/4 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : <ActivityFeed items={stats?.recent_activity ?? []} />}
          </div>
        </div>

        {/* Sidebar: quick actions + modules */}
        <div className="space-y-4">
          {quickActions.length > 0 && (
            <div
              className="bg-white rounded-2xl p-4 animate-fade-up delay-200"
              style={{
                border: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              <h2 className="font-bold text-[#0A0A0F] text-[13px] mb-3 tracking-[-0.02em]">Acciones rápidas</h2>
              <div className="space-y-0.5">
                {quickActions.map(({ label, to, icon: Icon, color }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl group"
                    style={{ transition: 'background-color 160ms cubic-bezier(0.23, 1, 0.32, 1)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(0,0,0,0.03)'}
                    onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = ''}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}14` }}
                    >
                      <Icon size={14} style={{ color }} aria-hidden="true" />
                    </div>
                    <span className="text-[13px] font-semibold text-[#333338] flex-1">{label}</span>
                    <Plus size={12} className="text-[#C3C3C8]" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Modules grid */}
          <div
            className="bg-white rounded-2xl p-4 animate-fade-up delay-240"
            style={{
              border: '1px solid rgba(0,0,0,0.05)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <h2 className="font-bold text-[#0A0A0F] text-[13px] mb-3 tracking-[-0.02em]">Módulos</h2>
            <div className="grid grid-cols-2 gap-2">
              {loading
                ? [0, 1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)
                : user?.modules?.map(m => (
                  <Link
                    key={m.code}
                    to={`/${m.code}`}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-center group"
                    style={{ transition: 'background-color 160ms cubic-bezier(0.23, 1, 0.32, 1)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(0,0,0,0.03)'}
                    onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = ''}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: `${m.color || '#F2B045'}14` }}
                    >
                      <AlertCircle size={14} style={{ color: m.color || '#F2B045' }} aria-hidden="true" />
                    </div>
                    <span className="text-[11px] font-semibold text-[#9898A3] leading-tight">{m.name}</span>
                  </Link>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
