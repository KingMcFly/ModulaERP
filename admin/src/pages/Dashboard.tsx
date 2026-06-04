import { useEffect, useState } from 'react';
import { Building2, Users, CheckCircle2, PauseCircle, TrendingUp, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../api';

interface Tenant {
  id: number; name: string; slug: string; status: string; plan: string;
  user_count: number; module_count: number; created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  trial:     'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo', trial: 'Prueba', suspended: 'Suspendido', cancelled: 'Cancelado',
};

const PLAN_COLORS = ['#94a3b8', '#F2B045', '#0ea5e9', '#10b981'];

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`} />;
}

export default function Dashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Tenant[]>('/admin/tenants')
      .then(setTenants)
      .finally(() => setLoading(false));
  }, []);

  const active    = tenants.filter(t => t.status === 'active').length;
  const trial     = tenants.filter(t => t.status === 'trial').length;
  const suspended = tenants.filter(t => t.status === 'suspended').length;
  const totalUsers = tenants.reduce((s, t) => s + Number(t.user_count), 0);

  const planData = [
    { key: 'starter_free', name: 'Starter Free' },
    { key: 'starter',      name: 'Starter'      },
    { key: 'professional', name: 'Professional' },
    { key: 'enterprise',   name: 'Enterprise'   },
  ].map(({ key, name }, i) => ({
    name,
    value: tenants.filter(t => t.plan === key).length,
    color: PLAN_COLORS[Math.min(i, PLAN_COLORS.length - 1)],
  })).filter(p => p.value > 0 || p.name !== 'Starter Free');

  const stats = [
    {
      label: 'Total empresas',
      value: tenants.length,
      icon: Building2,
      color: '#F2B045',
      bg: 'rgba(242,176,69,0.10)',
      delta: `${active} activas`,
    },
    {
      label: 'Empresas activas',
      value: active,
      icon: CheckCircle2,
      color: '#10b981',
      bg: 'rgba(16,185,129,0.10)',
      delta: `${Math.round(tenants.length > 0 ? (active / tenants.length) * 100 : 0)}% del total`,
    },
    {
      label: 'En periodo de prueba',
      value: trial,
      icon: PauseCircle,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.10)',
      delta: `${suspended} suspendidas`,
    },
    {
      label: 'Usuarios totales',
      value: totalUsers,
      icon: Users,
      color: '#0ea5e9',
      bg: 'rgba(14,165,233,0.10)',
      delta: `en ${tenants.length} empresas`,
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="bg-white rounded-xl px-3.5 py-3 text-[12px]"
          style={{
            border: '1px solid rgba(0,0,0,0.07)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.09)',
          }}
        >
          <p className="font-bold text-slate-900">{label}</p>
          <p className="text-slate-500 mt-0.5">{payload[0].value} empresa{payload[0].value !== 1 ? 's' : ''}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-[22px] sm:text-[26px] font-bold text-slate-900 tracking-[-0.03em] leading-tight">Dashboard</h1>
        <p className="text-slate-400 text-[13px] mt-1 font-medium">Vista general de la plataforma FB Core</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? [0, 1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-5" style={{ border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <Skeleton className="w-11 h-11 rounded-2xl mb-4" />
              <Skeleton className="w-16 h-7 mb-2 rounded-lg" />
              <Skeleton className="w-24 h-3.5 rounded-lg" />
            </div>
          ))
          : stats.map(({ label, value, icon: Icon, color, bg, delta }, i) => (
            <div
              key={label}
              className="bg-white rounded-2xl p-5 animate-fade-up"
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
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: bg }}
              >
                <Icon size={20} style={{ color }} />
              </div>
              <p
                className="text-[28px] font-bold text-slate-900 tabular-nums leading-none tracking-[-0.03em]"
              >
                {value}
              </p>
              <p className="text-[12px] font-bold text-slate-700 mt-2 tracking-[-0.01em]">{label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{delta}</p>
            </div>
          ))
        }
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Plan distribution */}
        <div
          className="bg-white rounded-2xl p-6 animate-fade-up delay-150"
          style={{
            border: '1px solid rgba(0,0,0,0.05)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-slate-900 text-[14px] tracking-[-0.02em]">Distribución por plan</h2>
            <div
              className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full"
              style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}
            >
              <Activity size={11} />
              {tenants.length} total
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-44 rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={planData} barSize={36} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fontFamily: 'Plus Jakarta Sans', fontWeight: 600, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fontFamily: 'Plus Jakarta Sans', fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {planData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {!loading && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              {planData.map((p, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                  {p.name} ({p.value})
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent tenants */}
        <div
          className="bg-white rounded-2xl p-6 animate-fade-up delay-200"
          style={{
            border: '1px solid rgba(0,0,0,0.05)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-slate-900 text-[14px] tracking-[-0.02em]">Empresas recientes</h2>
            <TrendingUp size={14} className="text-slate-300" />
          </div>
          {loading ? (
            <div className="space-y-4">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4 rounded" />
                    <Skeleton className="h-2.5 w-1/2 rounded" />
                  </div>
                  <Skeleton className="w-14 h-5 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-0">
              {tenants.slice(0, 5).map((t, i) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-3"
                  style={{ borderBottom: i < Math.min(tenants.length, 5) - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[13px] flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, #F2B045, #EDA135)`,
                        boxShadow: '0 2px 6px rgba(242,176,69,0.3)',
                        color: '#131316',
                      }}
                    >
                      {t.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-slate-900 tracking-[-0.01em]">{t.name}</p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {t.user_count} usuario{t.user_count !== 1 ? 's' : ''} · {t.module_count} módulo{t.module_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <span className={`badge text-[10.5px] ${STATUS_COLORS[t.status] || 'bg-slate-100 text-slate-500'}`}>
                    {STATUS_LABELS[t.status] || t.status}
                  </span>
                </div>
              ))}
              {tenants.length === 0 && (
                <p className="text-[13px] text-slate-400 text-center py-8 font-medium">Sin empresas aún</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
