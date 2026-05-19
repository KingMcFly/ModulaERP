import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Calendar, DollarSign,
  QrCode, ArrowRightLeft, Wrench, Clock, CheckCircle,
  AlertCircle, XCircle, Activity, Paperclip,
} from 'lucide-react';
import { toast } from 'sonner';
import QRModal from '../../components/QRModal';
import AttachmentPanel from '../../components/AttachmentPanel';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function authFetch(path: string) {
  const token = localStorage.getItem('token');
  return fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />;
}

interface Asset {
  id: number;
  asset_type: string;
  serial_number?: string;
  barcode?: string;
  brand?: string;
  model?: string;
  value?: number;
  status: 'available' | 'loaned' | 'maintenance' | 'retired';
  location_name?: string;
  purchase_date?: string;
  last_maintenance?: string;
  notes?: string;
  created_at: string;
  loans: LoanRecord[];
  maintenance: MaintRecord[];
  activity: ActivityRecord[];
}

interface LoanRecord {
  id: number;
  issued_at: string;
  expected_return?: string;
  actual_return?: string;
  status: string;
  borrower?: string;
  issued_by_name?: string;
  notes?: string;
}

interface MaintRecord {
  id: number;
  maint_type: string;
  status: string;
  scheduled_at?: string;
  completed_at?: string;
  description?: string;
  cost?: number;
  technician_name?: string;
}

interface ActivityRecord {
  id: number;
  action: string;
  created_at: string;
  user_name?: string;
}

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  available:   { label: 'Disponible',   color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  loaned:      { label: 'En préstamo',  color: 'bg-blue-100 text-blue-700',       icon: ArrowRightLeft },
  maintenance: { label: 'Mantención',   color: 'bg-amber-100 text-amber-700',     icon: Wrench },
  retired:     { label: 'Retirado',     color: 'bg-slate-100 text-slate-500',     icon: XCircle },
} as const;

const MAINT_STATUS: Record<string, string> = {
  pending:     'Pendiente',
  in_progress: 'En progreso',
  completed:   'Completado',
  cancelled:   'Cancelado',
};

const MAINT_TYPE: Record<string, string> = {
  preventive: 'Preventivo',
  corrective: 'Correctivo',
  emergency:  'Emergencia',
};

function fmt(date?: string) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtCurrency(n?: number) {
  if (!n) return '—';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'loans' | 'maintenance' | 'activity' | 'attachments';

// ── Component ─────────────────────────────────────────────────────────────────

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('loans');
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (!id) return;
    authFetch(`/assets/${id}/detail`)
      .then(d => {
        if (d.error) { toast.error(d.error); navigate('/inventory'); return; }
        setAsset(d);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <Skeleton className="h-6 w-1/2" />
        <div className="grid grid-cols-2 gap-4">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
      </div>
    </div>
  );

  if (!asset) return null;

  const statusCfg = STATUS_CONFIG[asset.status] ?? STATUS_CONFIG.available;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back + header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate('/inventory')}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl mt-0.5 transition-colors"
          aria-label="Volver al inventario"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 truncate">
              {asset.brand} {asset.model || asset.asset_type}
            </h1>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusCfg.color}`}>
              <StatusIcon size={12} aria-hidden="true" />
              {statusCfg.label}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {asset.asset_type}{asset.serial_number ? ` · S/N: ${asset.serial_number}` : ''}
            {asset.barcode ? ` · Código: ${asset.barcode}` : ''}
          </p>
        </div>
        <button
          onClick={() => setShowQR(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0"
        >
          <QrCode size={15} aria-hidden="true" />
          <span className="hidden sm:inline">Ver QR</span>
        </button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard icon={MapPin} label="Ubicación" value={asset.location_name || '—'} color="#6366F1" />
        <InfoCard icon={Calendar} label="Fecha de compra" value={fmt(asset.purchase_date)} color="#0EA5E9" />
        <InfoCard icon={DollarSign} label="Valor" value={fmtCurrency(asset.value)} color="#10B981" />
        <InfoCard icon={Clock} label="Última mantención" value={fmt(asset.last_maintenance)} color="#F59E0B" />
      </div>

      {/* Notes */}
      {asset.notes && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Notas</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{asset.notes}</p>
        </div>
      )}

      {/* History tabs */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          {([
            { key: 'loans',       label: 'Préstamos',     count: asset.loans.length,       icon: ArrowRightLeft },
            { key: 'maintenance', label: 'Mantenciones',  count: asset.maintenance.length, icon: Wrench },
            { key: 'activity',     label: 'Actividad',  count: asset.activity.length,    icon: Activity },
          { key: 'attachments',  label: 'Adjuntos',   count: 0,                        icon: Paperclip },
          ] as { key: Tab; label: string; count: number; icon: React.ElementType }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-primary-500 text-primary-700 bg-primary-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <t.icon size={14} aria-hidden="true" />
              {t.label}
              {t.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  tab === t.key ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'loans' && <LoanHistory loans={asset.loans} />}
          {tab === 'maintenance' && <MaintenanceHistory records={asset.maintenance} />}
          {tab === 'activity' && <ActivityHistory records={asset.activity} />}
          {tab === 'attachments' && <AttachmentPanel entity="asset" entityId={asset.id} />}
        </div>
      </div>

      {showQR && (
        <QRModal
          assetId={asset.id}
          assetName={`${asset.brand || ''} ${asset.model || asset.asset_type}`.trim()}
          assetCode={asset.barcode || asset.serial_number}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
          <Icon size={14} style={{ color }} aria-hidden="true" />
        </div>
        <span className="text-xs font-semibold text-slate-500">{label}</span>
      </div>
      <p className="text-sm font-semibold text-slate-900 truncate">{value}</p>
    </div>
  );
}

function LoanHistory({ loans }: { loans: LoanRecord[] }) {
  if (loans.length === 0) return <EmptyState message="Sin préstamos registrados" />;
  return (
    <div className="space-y-3">
      {loans.map(l => (
        <div key={l.id} className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
            l.status === 'active' ? 'bg-blue-500' :
            l.status === 'returned' ? 'bg-emerald-500' : 'bg-amber-500'
          }`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-slate-900">{l.borrower || '—'}</p>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                l.status === 'active' ? 'bg-blue-100 text-blue-700' :
                l.status === 'returned' ? 'bg-emerald-100 text-emerald-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {l.status === 'active' ? 'Activo' : l.status === 'returned' ? 'Devuelto' : 'Vencido'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Emitido: {fmt(l.issued_at)}
              {l.expected_return && ` · Retorno esperado: ${fmt(l.expected_return)}`}
              {l.actual_return && ` · Devuelto: ${fmt(l.actual_return)}`}
            </p>
            {l.issued_by_name && <p className="text-xs text-slate-400 mt-0.5">Por: {l.issued_by_name}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function MaintenanceHistory({ records }: { records: MaintRecord[] }) {
  if (records.length === 0) return <EmptyState message="Sin mantenciones registradas" />;
  return (
    <div className="space-y-3">
      {records.map(r => (
        <div key={r.id} className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
            r.status === 'completed' ? 'bg-emerald-500' :
            r.status === 'in_progress' ? 'bg-blue-500' :
            r.status === 'pending' ? 'bg-amber-500' : 'bg-slate-400'
          }`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-slate-900">{MAINT_TYPE[r.maint_type] || r.maint_type}</p>
              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                {MAINT_STATUS[r.status] || r.status}
              </span>
              {r.cost && (
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                  {fmtCurrency(r.cost)}
                </span>
              )}
            </div>
            {r.description && <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{r.description}</p>}
            <p className="text-xs text-slate-400 mt-0.5">
              {r.scheduled_at ? `Programado: ${fmt(r.scheduled_at)}` : ''}
              {r.completed_at ? ` · Completado: ${fmt(r.completed_at)}` : ''}
              {r.technician_name ? ` · Técnico: ${r.technician_name}` : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityHistory({ records }: { records: ActivityRecord[] }) {
  const ACTION_LABELS: Record<string, string> = { create: 'creó', update: 'actualizó', delete: 'eliminó' };
  if (records.length === 0) return <EmptyState message="Sin actividad registrada" />;
  return (
    <div className="space-y-2">
      {records.map(r => (
        <div key={r.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-slate-500">
              {(r.user_name || '?')[0].toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-slate-700 flex-1">
            <span className="font-semibold">{r.user_name || 'Sistema'}</span>
            {' '}{ACTION_LABELS[r.action] || r.action} este activo
          </p>
          <p className="text-[11px] text-slate-400 flex-shrink-0">
            {new Date(r.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
          </p>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center py-10 gap-2 text-slate-400">
      <AlertCircle size={24} className="text-slate-300" aria-hidden="true" />
      <span className="text-sm">{message}</span>
    </div>
  );
}
