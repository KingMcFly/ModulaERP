import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Package, Users, ArrowRightLeft, Wrench, ShoppingCart, TrendingUp, AlertTriangle, Download } from 'lucide-react';
import { exportToExcel } from '../../utils/exportExcel';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function apiFetch(path: string) {
  const token = localStorage.getItem('token');
  return fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
}

const STATUS_COLORS: Record<string, string> = {
  available: '#10b981',
  loaned:    '#f59e0b',
  maintenance: '#ef4444',
  retired:   '#94a3b8',
};

const STATUS_LABELS: Record<string, string> = {
  available:   'Disponible',
  loaned:      'Prestado',
  maintenance: 'Mantenimiento',
  retired:     'Retirado',
};

const PIE_COLORS = ['#F2B045', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface KPI { label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string; }

function KPICard({ label, value, sub, icon, color }: KPI) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-start gap-4 shadow-sm">
      <div className={`p-3 rounded-xl flex-shrink-0 ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm font-medium text-slate-600">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function ReportsModule() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/reports/overview').then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-primary-500 rounded-full animate-spin" />
    </div>
  );
  if (!data) return <div className="text-center py-16 text-slate-400">Sin datos</div>;

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

  const kpis: KPI[] = [
    {
      label: 'Activos totales',
      value: data.assets.total ?? 0,
      sub: `Valor: ${fmtCurrency(data.assets.value_total ?? 0)}`,
      icon: <Package size={20} />,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Empleados activos',
      value: data.personnel.total ?? 0,
      sub: `${data.personnel.technicians ?? 0} técnicos`,
      icon: <Users size={20} />,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Préstamos activos',
      value: data.loans.active ?? 0,
      sub: data.loans.overdue > 0 ? `⚠ ${data.loans.overdue} vencidos` : 'Sin vencidos',
      icon: <ArrowRightLeft size={20} />,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Mantenimientos pendientes',
      value: (data.maintenance.pending ?? 0) + (data.maintenance.in_progress ?? 0),
      sub: `${data.maintenance.completed_this_month ?? 0} completados este mes`,
      icon: <Wrench size={20} />,
      color: 'bg-red-50 text-red-600',
    },
    {
      label: 'Insumos en inventario',
      value: data.supplies.total ?? 0,
      sub: data.supplies.low_stock > 0 ? `⚠ ${data.supplies.low_stock} con stock bajo` : 'Todos en rango',
      icon: <ShoppingCart size={20} />,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Valor insumos',
      value: fmtCurrency(data.supplies.value_total ?? 0),
      icon: <TrendingUp size={20} />,
      color: 'bg-blue-50 text-blue-600',
    },
  ];

  const assetsByStatus = (data.charts.assets_by_status ?? []).map((r: any) => ({
    ...r,
    name: STATUS_LABELS[r.name] || r.name,
    fill: STATUS_COLORS[r.name] || '#94a3b8',
  }));

  const maintenanceTrend = data.charts.maintenance_trend ?? [];
  const departments = data.charts.departments ?? [];

  function handleExport() {
    exportToExcel([
      { Sección: 'Activos', Métrica: 'Total', Valor: data.assets.total },
      { Sección: 'Activos', Métrica: 'Disponibles', Valor: data.assets.available },
      { Sección: 'Activos', Métrica: 'Prestados', Valor: data.assets.loaned },
      { Sección: 'Activos', Métrica: 'En mantenimiento', Valor: data.assets.in_maintenance },
      { Sección: 'Activos', Métrica: 'Valor total (MXN)', Valor: data.assets.value_total },
      { Sección: 'Personal', Métrica: 'Empleados activos', Valor: data.personnel.total },
      { Sección: 'Personal', Métrica: 'Técnicos', Valor: data.personnel.technicians },
      { Sección: 'Préstamos', Métrica: 'Activos', Valor: data.loans.active },
      { Sección: 'Préstamos', Métrica: 'Vencidos', Valor: data.loans.overdue },
      { Sección: 'Préstamos', Métrica: 'Devueltos', Valor: data.loans.returned },
      { Sección: 'Mantenimiento', Métrica: 'Pendientes', Valor: data.maintenance.pending },
      { Sección: 'Mantenimiento', Métrica: 'En progreso', Valor: data.maintenance.in_progress },
      { Sección: 'Mantenimiento', Métrica: 'Completados este mes', Valor: data.maintenance.completed_this_month },
      { Sección: 'Insumos', Métrica: 'Total', Valor: data.supplies.total },
      { Sección: 'Insumos', Métrica: 'Con stock bajo', Valor: data.supplies.low_stock },
      { Sección: 'Insumos', Métrica: 'Valor total (MXN)', Valor: data.supplies.value_total },
    ], 'reporte_general');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reportes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Resumen ejecutivo del sistema</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 shadow-sm transition-colors">
          <Download size={15} /> Exportar Excel
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map(k => <KPICard key={k.label} {...k} />)}
      </div>

      {/* Alerts row */}
      {(data.loans.overdue > 0 || data.supplies.low_stock > 0) && (
        <div className="flex flex-wrap gap-3">
          {data.loans.overdue > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
              <AlertTriangle size={15} /> <strong>{data.loans.overdue}</strong> préstamo{data.loans.overdue > 1 ? 's' : ''} vencido{data.loans.overdue > 1 ? 's' : ''}
            </div>
          )}
          {data.supplies.low_stock > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
              <AlertTriangle size={15} /> <strong>{data.supplies.low_stock}</strong> insumo{data.supplies.low_stock > 1 ? 's' : ''} con stock bajo
            </div>
          )}
        </div>
      )}

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets by status pie */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Activos por estado</h2>
          {assetsByStatus.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Sin activos registrados</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={assetsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {assetsByStatus.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Maintenance trend bar */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Órdenes de mantenimiento (últimos 6 meses)</h2>
          {maintenanceTrend.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Sin datos de tendencia</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={maintenanceTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="ordenes" fill="#F2B045" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      {departments.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Personal por departamento</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={departments} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="empleados" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
