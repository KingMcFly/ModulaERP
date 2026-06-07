import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  ArrowLeft, ShieldCheck, ShieldAlert, Smartphone, Monitor, Tablet,
  Check, LogOut, Trash2, Loader2, Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../api';

interface Session {
  id: number;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  last_seen_at: string;
  current: boolean;
}

// ── Friendly device label from the user-agent string ──────────────────────────
function parseDevice(ua: string | null): { label: string; icon: 'phone' | 'tablet' | 'desktop' } {
  if (!ua) return { label: 'Dispositivo desconocido', icon: 'desktop' };
  const os =
    /iphone/i.test(ua) ? 'iPhone' :
    /ipad/i.test(ua) ? 'iPad' :
    /android/i.test(ua) ? 'Android' :
    /mac os x|macintosh/i.test(ua) ? 'Mac' :
    /windows/i.test(ua) ? 'Windows' :
    /linux/i.test(ua) ? 'Linux' : 'Dispositivo';
  const browser =
    /edg/i.test(ua) ? 'Edge' :
    /chrome|crios/i.test(ua) ? 'Chrome' :
    /firefox|fxios/i.test(ua) ? 'Firefox' :
    /safari/i.test(ua) ? 'Safari' : '';
  const icon: 'phone' | 'tablet' | 'desktop' =
    /iphone|android.*mobile/i.test(ua) ? 'phone' :
    /ipad|tablet/i.test(ua) ? 'tablet' : 'desktop';
  return { label: browser ? `${os} · ${browser}` : os, icon };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora mismo';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} día${d !== 1 ? 's' : ''}`;
}

function DeviceIcon({ kind, className }: { kind: 'phone' | 'tablet' | 'desktop'; className?: string }) {
  if (kind === 'phone')  return <Smartphone size={17} className={className} />;
  if (kind === 'tablet') return <Tablet size={17} className={className} />;
  return <Monitor size={17} className={className} />;
}

export default function Security() {
  // 2FA state
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [twoFaLoading, setTwoFaLoading] = useState(true);
  const [setup, setSetup] = useState<{ secret: string; uri: string; qr: string } | null>(null);
  const [enableCode, setEnableCode] = useState('');
  const [enabling, setEnabling] = useState(false);
  const [showDisable, setShowDisable] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessLoading, setSessLoading] = useState(true);

  function loadStatus() {
    api.get<{ enabled: boolean }>('/auth/2fa/status')
      .then(r => setTwoFaEnabled(r.enabled))
      .finally(() => setTwoFaLoading(false));
  }
  function loadSessions() {
    api.get<Session[]>('/auth/sessions')
      .then(setSessions)
      .finally(() => setSessLoading(false));
  }
  useEffect(() => { loadStatus(); loadSessions(); }, []);

  // ── 2FA setup flow ──────────────────────────────────────────────────────────
  async function startSetup() {
    try {
      const r = await api.post<{ secret: string; otpauth_uri: string }>('/auth/2fa/setup', {});
      const qr = await QRCode.toDataURL(r.otpauth_uri, { margin: 1, width: 220, color: { dark: '#0A0A12', light: '#ffffff' } });
      setSetup({ secret: r.secret, uri: r.otpauth_uri, qr });
      setEnableCode('');
    } catch (err: any) { toast.error(err.message); }
  }

  async function confirmEnable(e: FormEvent) {
    e.preventDefault();
    if (enableCode.replace(/\s/g, '').length < 6) return toast.error('Ingresa el código de 6 dígitos');
    setEnabling(true);
    try {
      await api.post('/auth/2fa/enable', { code: enableCode.replace(/\s/g, '') });
      toast.success('Doble autenticación activada');
      setSetup(null);
      setTwoFaEnabled(true);
    } catch (err: any) { toast.error(err.message); }
    finally { setEnabling(false); }
  }

  function copySecret() {
    if (!setup) return;
    navigator.clipboard?.writeText(setup.secret).then(
      () => toast.success('Clave copiada'),
      () => toast.error('No se pudo copiar'),
    );
  }

  // ── Sessions ────────────────────────────────────────────────────────────────
  async function revokeSession(id: number) {
    try {
      await api.delete(`/auth/sessions/${id}`);
      toast.success('Sesión cerrada');
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err: any) { toast.error(err.message); }
  }
  async function revokeOthers() {
    try {
      await api.delete('/auth/sessions/others');
      toast.success('Otras sesiones cerradas');
      loadSessions();
    } catch (err: any) { toast.error(err.message); }
  }

  const otherSessions = sessions.filter(s => !s.current);

  return (
    <div className="space-y-5 sm:space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 animate-fade-up">
        <Link to="/settings"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex-shrink-0"
          style={{ border: '1px solid rgba(0,0,0,0.07)', transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)' }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-[22px] sm:text-[24px] font-bold text-slate-900 tracking-[-0.03em]">Seguridad</h1>
          <p className="text-slate-400 text-[13px] mt-0.5 font-medium">Doble autenticación y sesiones activas</p>
        </div>
      </div>

      {/* ── 2FA card ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 animate-fade-up delay-40"
        style={{ border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: twoFaEnabled ? 'rgba(16,185,129,0.10)' : 'rgba(139,92,246,0.10)' }}>
            {twoFaEnabled
              ? <ShieldCheck size={20} style={{ color: '#10b981' }} />
              : <ShieldAlert size={20} style={{ color: '#7c3aed' }} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-slate-900 text-[15px] tracking-[-0.02em]">Doble autenticación (2FA)</h2>
              {!twoFaLoading && (
                twoFaEnabled
                  ? <span className="badge bg-emerald-100 text-emerald-700 text-[10.5px]"><Check size={9} /> Activada</span>
                  : <span className="badge bg-slate-100 text-slate-500 text-[10.5px]">Desactivada</span>
              )}
            </div>
            <p className="text-[12.5px] text-slate-400 mt-1 font-medium leading-relaxed">
              Protege tu cuenta con un código temporal de tu app de autenticación, además de la contraseña.
            </p>
          </div>
        </div>

        {/* Body */}
        {twoFaLoading ? (
          <div className="flex items-center gap-2 mt-5 text-slate-400 text-[13px]">
            <Loader2 size={15} className="animate-spin" /> Cargando…
          </div>
        ) : twoFaEnabled ? (
          <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            <button onClick={() => setShowDisable(true)}
              className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl text-[13px] font-bold text-red-600 tap-scale"
              style={{ background: 'rgba(239,68,68,0.08)' }}>
              <ShieldAlert size={15} /> Desactivar 2FA
            </button>
          </div>
        ) : setup ? (
          // ── Setup flow: QR + verify ──
          <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            <div className="flex flex-col sm:flex-row gap-5">
              <div className="flex flex-col items-center gap-3 flex-shrink-0">
                <div className="p-2.5 bg-white rounded-2xl" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                  <img src={setup.qr} alt="Código QR para 2FA" width={180} height={180} className="rounded-lg block" />
                </div>
                <button onClick={copySecret}
                  className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500 px-2.5 py-1.5 rounded-lg tap-scale"
                  style={{ background: 'rgba(0,0,0,0.04)' }}>
                  <Copy size={12} /> Copiar clave manual
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <ol className="space-y-2 text-[13px] text-slate-600 font-medium list-decimal list-inside mb-4">
                  <li>Abre Google Authenticator, Authy o similar.</li>
                  <li>Escanea el código QR (o pega la clave manual).</li>
                  <li>Ingresa el código de 6 dígitos que aparece.</li>
                </ol>
                <form onSubmit={confirmEnable} className="space-y-3">
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={enableCode}
                    onChange={e => setEnableCode(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="000000"
                    className="input text-center text-[20px] font-bold tracking-[0.4em]"
                  />
                  <div className="flex gap-2">
                    <button type="submit" disabled={enabling} className="btn-primary flex-1">
                      {enabling ? 'Activando…' : 'Activar 2FA'}
                    </button>
                    <button type="button" onClick={() => setSetup(null)} className="btn-ghost">Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            <button onClick={startSetup}
              className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl text-[13px] font-bold text-white tap-scale"
              style={{ background: '#7c3aed' }}>
              <ShieldCheck size={15} /> Activar doble autenticación
            </button>
          </div>
        )}
      </div>

      {/* ── Sessions card ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 animate-fade-up delay-80"
        style={{ border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold text-slate-900 text-[15px] tracking-[-0.02em]">Sesiones activas</h2>
            <p className="text-[12.5px] text-slate-400 mt-0.5 font-medium">Dispositivos con acceso a tu cuenta</p>
          </div>
          {otherSessions.length > 0 && (
            <button onClick={revokeOthers}
              className="inline-flex items-center gap-1.5 py-2 px-3 rounded-xl text-[12px] font-bold text-red-600 flex-shrink-0 tap-scale"
              style={{ background: 'rgba(239,68,68,0.08)' }}>
              <LogOut size={13} /> <span className="hidden sm:inline">Cerrar las demás</span><span className="sm:hidden">Otras</span>
            </button>
          )}
        </div>

        {sessLoading ? (
          <div className="flex items-center gap-2 text-slate-400 text-[13px] py-3">
            <Loader2 size={15} className="animate-spin" /> Cargando sesiones…
          </div>
        ) : (
          <div className="space-y-2.5">
            {sessions.map(s => {
              const dev = parseDevice(s.user_agent);
              return (
                <div key={s.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ border: '1px solid rgba(0,0,0,0.06)', background: s.current ? 'rgba(242,176,69,0.05)' : 'white' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: s.current ? 'rgba(242,176,69,0.14)' : 'rgba(0,0,0,0.04)' }}>
                    <DeviceIcon kind={dev.icon} className={s.current ? 'text-[#EDA135]' : 'text-slate-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-bold text-slate-900 truncate">{dev.label}</p>
                      {s.current && <span className="badge bg-amber-100 text-amber-700 text-[10px] flex-shrink-0">Este dispositivo</span>}
                    </div>
                    <p className="text-[11.5px] text-slate-400 font-medium mt-0.5 truncate">
                      {s.ip_address || 'IP desconocida'} · {timeAgo(s.last_seen_at)}
                    </p>
                  </div>
                  {!s.current && (
                    <button onClick={() => revokeSession(s.id)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0 tap-scale"
                      style={{ transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)' }}
                      title="Cerrar sesión">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
            {sessions.length === 0 && (
              <p className="text-[13px] text-slate-400 text-center py-6 font-medium">Sin sesiones activas</p>
            )}
          </div>
        )}
      </div>

      {showDisable && <DisableModal onClose={() => setShowDisable(false)} onDisabled={() => { setShowDisable(false); setTwoFaEnabled(false); }} />}
    </div>
  );
}

// ── Disable 2FA modal (requires password + current code) ──────────────────────
function DisableModal({ onClose, onDisabled }: { onClose: () => void; onDisabled: () => void }) {
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/2fa/disable', { password, code: code.replace(/\s/g, '') });
      toast.success('Doble autenticación desactivada');
      onDisabled();
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', animation: 'fade-in 0.18s cubic-bezier(0.23, 1, 0.32, 1) both' }}>
      <div className="bg-white w-full sm:max-w-sm p-5 sm:p-6 rounded-t-[24px] sm:rounded-[24px]"
        style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 -8px 48px rgba(0,0,0,0.14), 0 16px 48px rgba(0,0,0,0.14)', animation: 'slide-up 0.22s cubic-bezier(0.23, 1, 0.32, 1) both', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <div className="sheet-handle" />
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(239,68,68,0.10)' }}>
          <ShieldAlert size={20} className="text-red-500" />
        </div>
        <h2 className="text-[17px] font-bold text-slate-900 tracking-[-0.02em]">Desactivar 2FA</h2>
        <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">
          Confirma con tu contraseña y un código actual para desactivar la doble autenticación.
        </p>
        <form onSubmit={submit} className="space-y-3 mt-4">
          <div>
            <label htmlFor="dis-pwd" className="label">Contraseña</label>
            <input id="dis-pwd" className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <div>
            <label htmlFor="dis-code" className="label">Código 2FA</label>
            <input id="dis-code" className="input text-center tracking-[0.3em] font-bold" inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/[^\d]/g, ''))} placeholder="000000" required />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
            <button type="submit" disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[13px] font-bold text-white"
              style={{ background: loading ? '#fca5a5' : '#ef4444' }}>
              {loading ? 'Desactivando…' : 'Desactivar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
