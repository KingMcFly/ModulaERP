import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, ArrowRightLeft, RotateCcw, Clock, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { generateLoanPDF } from '../../utils/loanPDF';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
function authFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('token');
  return fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) } });
}
const isDark = () => document.documentElement.classList.contains('dark');

interface Loan {
  id: number; asset_id: number; serial_number: string; brand: string; model: string; asset_type: string;
  borrower_name: string; borrower_name_rel: string; issued_by_name: string;
  issued_at: string; expected_return: string; actual_return: string | null;
  status: 'active' | 'returned' | 'overdue'; notes: string;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  active:   { label: 'Activo',   bg: 'rgba(14,165,233,0.12)',  color: '#0EA5E9' },
  returned: { label: 'Devuelto', bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
  overdue:  { label: 'Vencido',  bg: 'rgba(239,68,68,0.12)',  color: '#EF4444' },
};

const cardStyle = { background: 'var(--ds-card)', border: '1px solid var(--ds-border)' };

function NewLoanModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [assets, setAssets]     = useState<{id: number; serial_number: string; brand: string; model: string; asset_type: string}[]>([]);
  const [personnel, setPersonnel] = useState<{id: number; name: string}[]>([]);
  const [form, setForm] = useState({ asset_id: '', borrower_id: '', borrower_name: '', expected_return: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    authFetch('/assets?status=available').then(r => r.json()).then(setAssets);
    authFetch('/personnel').then(r => r.json()).then(setPersonnel).catch(() => {});
  }, []);

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await authFetch('/loans', { method: 'POST', body: JSON.stringify({
        asset_id: parseInt(form.asset_id),
        borrower_id: form.borrower_id ? parseInt(form.borrower_id) : null,
        borrower_name: form.borrower_name,
        expected_return: form.expected_return,
        notes: form.notes,
      })});
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      toast.success('Préstamo registrado');
      onCreated(); onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xl flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="rounded-t-3xl sm:rounded-3xl shadow-soft-xl w-full sm:max-w-md p-5 sm:p-6 max-h-[92dvh] overflow-y-auto scroll-touch" style={{ ...cardStyle, paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <div className="sheet-handle" />
        <h2 className="text-lg font-semibold mb-5" style={{ color: 'var(--ds-text)' }}>Nuevo Préstamo</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="loan-asset" className="label">Activo *</label>
            <select id="loan-asset" className="input" value={form.asset_id} onChange={e => set('asset_id', e.target.value)} required>
              <option value="">Seleccionar activo disponible…</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.asset_type} — {a.brand} {a.model} ({a.serial_number || 'sin serie'})</option>)}
            </select>
          </div>
          {personnel.length > 0 && (
            <div>
              <label htmlFor="loan-person" className="label">Persona (opcional)</label>
              <select id="loan-person" className="input" value={form.borrower_id} onChange={e => { set('borrower_id', e.target.value); if (e.target.value) set('borrower_name', e.target.options[e.target.selectedIndex].text); }}>
                <option value="">Seleccionar…</option>
                {personnel.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="loan-borrower" className="label">Nombre receptor *</label>
            <input id="loan-borrower" className="input" value={form.borrower_name} onChange={e => set('borrower_name', e.target.value)} required />
          </div>
          <div>
            <label htmlFor="loan-return-date" className="label">Fecha devolución esperada</label>
            <input id="loan-return-date" className="input" type="date" value={form.expected_return} onChange={e => set('expected_return', e.target.value)} />
          </div>
          <div>
            <label htmlFor="loan-notes" className="label">Notas</label>
            <textarea id="loan-notes" className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 btn btn-primary">{saving ? 'Registrando…' : 'Registrar Préstamo'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoansModule() {
  const { user, canWrite, canDelete } = useAuth();
  const [loans, setLoans]       = useState<Loan[]>([]);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatus] = useState('active');
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    authFetch(`/loans?${params}`).then(r => r.json()).then(d => { setLoans(Array.isArray(d) ? d : []); setLoading(false); });
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function returnLoan(id: number) {
    if (!confirm('¿Confirmar devolución?')) return;
    await authFetch(`/loans/${id}/return`, { method: 'PATCH', body: JSON.stringify({}) });
    toast.success('Devolución registrada');
    load();
  }

  const filtered = loans.filter(l => {
    const name = l.borrower_name_rel || l.borrower_name || '';
    const asset = [l.serial_number, l.brand, l.model, l.asset_type].join(' ').toLowerCase();
    return asset.includes(search.toLowerCase()) || name.toLowerCase().includes(search.toLowerCase());
  });

  const overdue = loans.filter(l => l.status === 'active' && l.expected_return && new Date(l.expected_return) < new Date());

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ds-text)' }}>Préstamos</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>Control de préstamo y devolución</p>
        </div>
        {canWrite('loans') && (
          <button type="button" onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={16} /> Nuevo Préstamo
          </button>
        )}
      </div>

      {overdue.length > 0 && (
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <Clock size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-sm font-medium text-red-500">{overdue.length} préstamo{overdue.length !== 1 ? 's' : ''} con devolución vencida</p>
        </div>
      )}

      <div className="rounded-2xl p-4 shadow-soft flex gap-3" style={cardStyle}>
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ds-text-muted)' }} />
          <input className="input pl-9" placeholder="Buscar por activo o persona…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-36" value={statusFilter} onChange={e => setStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="active">Activos</option>
          <option value="returned">Devueltos</option>
        </select>
      </div>

      {/* ── MOBILE / TABLET: cards ─────────────────────────────────────── */}
      <div className="lg:hidden space-y-2.5">
        {loading ? (
          <div className="rounded-2xl p-8 text-center text-sm shadow-soft" style={{ ...cardStyle, color: 'var(--ds-text-muted)' }}>Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl p-10 text-center shadow-soft" style={{ ...cardStyle, color: 'var(--ds-text-muted)' }}>
            <ArrowRightLeft size={30} className="mx-auto mb-2" style={{ color: 'var(--ds-border-strong)' }} />
            <p className="text-sm">Sin préstamos</p>
          </div>
        ) : filtered.map(l => {
          const sc = STATUS_CONFIG[l.status];
          const isOverdue = l.status === 'active' && !!l.expected_return && new Date(l.expected_return) < new Date();
          const person = l.borrower_name_rel || l.borrower_name;
          const retDate = l.actual_return ? new Date(l.actual_return).toLocaleDateString('es')
            : l.expected_return ? new Date(l.expected_return).toLocaleDateString('es') : '—';
          return (
            <div key={l.id} className="rounded-2xl p-4 shadow-soft" style={{ ...cardStyle, ...(isOverdue ? { borderColor: 'rgba(239,68,68,0.3)' } : {}) }}>
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(14,165,233,0.12)' }}>
                  <ArrowRightLeft size={17} style={{ color: '#0EA5E9' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold truncate" style={{ color: 'var(--ds-text)' }}>{l.asset_type}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--ds-text-muted)' }}>{[l.brand, l.model, l.serial_number].filter(Boolean).join(' · ')}</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0" style={{ background: sc?.bg, color: sc?.color }}>{sc?.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium" style={{ color: 'var(--ds-text-subtle)' }}>Responsable</p>
                  <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--ds-text)' }}>{person}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium" style={{ color: 'var(--ds-text-subtle)' }}>Devolución</p>
                  <p className="text-[13px] font-semibold" style={{ color: isOverdue ? '#EF4444' : 'var(--ds-text)' }}>{retDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3.5 pt-3.5" style={{ borderTop: '1px solid var(--ds-border)' }}>
                {l.status === 'active' && canWrite('loans') && (
                  <button type="button" onClick={() => returnLoan(l.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold text-emerald-600 tap-scale"
                    style={{ background: 'rgba(16,185,129,0.10)' }}>
                    <RotateCcw size={14} /> Devolver
                  </button>
                )}
                <button type="button"
                  onClick={() => generateLoanPDF({ loan: l, tenantName: user?.tenant?.name || 'FB Core', tenantColor: user?.tenant?.primary_color, isReturn: l.status === 'returned' })}
                  className={`inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold tap-scale ${l.status === 'active' && canWrite('loans') ? 'size-[42px]' : 'flex-1'}`}
                  style={{ background: 'var(--ds-card-alt)', color: 'var(--ds-text)' }}
                  aria-label="Descargar PDF">
                  <FileDown size={15} /> {!(l.status === 'active' && canWrite('loans')) && 'PDF'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── DESKTOP: table ─────────────────────────────────────────────── */}
      <div className="hidden lg:block rounded-2xl overflow-hidden shadow-soft" style={cardStyle}>
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--ds-card-alt)', borderBottom: '1px solid var(--ds-border)' }}>
              {['Activo', 'Responsable', 'Emisión', 'Devolución', 'Estado', ''].map(h => (
                <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-5 py-3" style={{ color: 'var(--ds-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12" style={{ color: 'var(--ds-text-muted)' }}>Cargando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12" style={{ color: 'var(--ds-text-muted)' }}>Sin préstamos</td></tr>
            ) : filtered.map((l, i) => {
              const sc = STATUS_CONFIG[l.status];
              const isOverdue = l.status === 'active' && l.expected_return && new Date(l.expected_return) < new Date();
              return (
                <tr
                  key={l.id}
                  style={{
                    borderTop: i > 0 ? '1px solid var(--ds-border)' : 'none',
                    background: isOverdue ? 'rgba(239,68,68,0.04)' : '',
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={e => { if (!isOverdue) (e.currentTarget as HTMLTableRowElement).style.background = isDark() ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = isOverdue ? 'rgba(239,68,68,0.04)' : ''; }}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft size={15} style={{ color: 'var(--ds-text-subtle)' }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--ds-text)' }}>{l.asset_type}</p>
                        <p className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>{l.brand} {l.model} · {l.serial_number}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--ds-text)' }}>{l.borrower_name_rel || l.borrower_name}</td>
                  <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--ds-text-muted)' }}>{new Date(l.issued_at).toLocaleDateString('es')}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm" style={{ color: isOverdue ? '#EF4444' : 'var(--ds-text-muted)', fontWeight: isOverdue ? 600 : 400 }}>
                      {l.actual_return ? new Date(l.actual_return).toLocaleDateString('es') : l.expected_return ? new Date(l.expected_return).toLocaleDateString('es') : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: sc?.bg, color: sc?.color }}>
                      {sc?.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {l.status === 'active' && canWrite('loans') && (
                        <button type="button" onClick={() => returnLoan(l.id)} className="btn btn-ghost text-xs py-1.5 px-2.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                          <RotateCcw size={13} /> Devolver
                        </button>
                      )}
                      <button
                        type="button" onClick={() => generateLoanPDF({
                          loan: l,
                          tenantName: user?.tenant?.name || 'FB Core',
                          tenantColor: user?.tenant?.primary_color,
                          isReturn: l.status === 'returned',
                        })}
                        aria-label={`Descargar PDF préstamo ${l.id}`}
                        title="Descargar PDF"
                        className="p-1.5 rounded-lg transition-colors hover:text-primary-600"
                        style={{ color: 'var(--ds-text-subtle)' }}
                      >
                        <FileDown size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {showModal && <NewLoanModal onClose={() => setShowModal(false)} onCreated={load} />}
    </div>
  );
}
