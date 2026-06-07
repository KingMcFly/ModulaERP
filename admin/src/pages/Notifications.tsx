import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Bell, Mail, Send, Loader2, Check, AlertTriangle,
  Building2, ShieldAlert, UserPlus, Power,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../api';

interface NotifySettings {
  notify_enabled: boolean;
  notify_email: string | null;
  notify_events: Record<string, boolean>;
  mail_configured: boolean;
  available_events: Record<string, string>;
}

// Icon per event key
const EVENT_ICONS: Record<string, any> = {
  new_tenant:       Building2,
  tenant_suspended: Power,
  admin_created:    UserPlus,
  twofa_disabled:   ShieldAlert,
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={onChange}
      className="relative inline-flex h-6 w-11 items-center rounded-full flex-shrink-0"
      style={{ background: checked ? '#F2B045' : '#e2e8f0', boxShadow: checked ? '0 2px 6px rgba(242,176,69,0.35)' : 'none', transition: 'all 200ms cubic-bezier(0.23, 1, 0.32, 1)' }}>
      <span className="inline-block h-4 w-4 transform rounded-full bg-white shadow"
        style={{ transform: checked ? 'translateX(24px)' : 'translateX(4px)', transition: 'transform 200ms cubic-bezier(0.23, 1, 0.32, 1)' }} />
    </button>
  );
}

export default function Notifications() {
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState('');
  const [events, setEvents] = useState<Record<string, boolean>>({});
  const [available, setAvailable] = useState<Record<string, string>>({});
  const [mailConfigured, setMailConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    api.get<NotifySettings>('/admin/settings')
      .then(s => {
        setEnabled(!!s.notify_enabled);
        setEmail(s.notify_email || '');
        setAvailable(s.available_events || {});
        setMailConfigured(!!s.mail_configured);
        // Default every known event to its stored value (or true if missing)
        const ev: Record<string, boolean> = {};
        for (const key of Object.keys(s.available_events || {})) {
          ev[key] = s.notify_events?.[key] ?? false;
        }
        setEvents(ev);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleEvent(key: string) {
    setEvents(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (enabled && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return toast.error('Ingresa un email de destino válido');
    }
    setSaving(true);
    try {
      await api.put('/admin/settings/notifications', { notify_enabled: enabled, notify_email: email, notify_events: events });
      toast.success('Notificaciones guardadas');
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function sendTest() {
    setTesting(true);
    try {
      const r = await api.post<{ message: string }>('/admin/settings/notifications/test', {});
      toast.success(r.message);
    } catch (err: any) { toast.error(err.message); }
    finally { setTesting(false); }
  }

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
          <h1 className="text-[22px] sm:text-[24px] font-bold text-slate-900 tracking-[-0.03em]">Notificaciones</h1>
          <p className="text-slate-400 text-[13px] mt-0.5 font-medium">Alertas por correo de eventos críticos del sistema</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-6 flex items-center gap-2 text-slate-400 text-[13px]" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
          <Loader2 size={15} className="animate-spin" /> Cargando…
        </div>
      ) : (
        <form onSubmit={save} className="space-y-5">
          {/* SMTP warning */}
          {!mailConfigured && (
            <div className="rounded-2xl p-4 flex items-start gap-3 animate-fade-up"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.22)' }}>
              <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-[12.5px] text-amber-800 font-medium leading-relaxed">
                No hay servidor SMTP configurado. Las alertas se registrarán en el log del servidor pero
                no se enviarán por correo hasta definir las variables <span className="font-mono font-bold">SMTP_*</span>.
              </p>
            </div>
          )}

          {/* Master switch + recipient */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 animate-fade-up delay-40"
            style={{ border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: enabled ? 'rgba(242,176,69,0.12)' : 'rgba(0,0,0,0.05)' }}>
                <Bell size={20} style={{ color: enabled ? '#EDA135' : '#94a3b8' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-slate-900 text-[15px] tracking-[-0.02em]">Alertas por correo</h2>
                <p className="text-[12.5px] text-slate-400 mt-1 font-medium leading-relaxed">
                  Recibe un correo cuando ocurra un evento importante en la plataforma.
                </p>
              </div>
              <Toggle checked={enabled} onChange={() => setEnabled(v => !v)} />
            </div>

            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', opacity: enabled ? 1 : 0.5 }}>
              <label htmlFor="notify-email" className="label flex items-center gap-1.5"><Mail size={11} /> Email de destino</label>
              <input id="notify-email" type="email" className="input" placeholder="alertas@miempresa.com"
                value={email} onChange={e => setEmail(e.target.value)} disabled={!enabled} autoComplete="email" />
            </div>
          </div>

          {/* Event toggles */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 animate-fade-up delay-80"
            style={{ border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', opacity: enabled ? 1 : 0.55 }}>
            <h2 className="font-bold text-slate-900 text-[15px] tracking-[-0.02em] mb-1">Eventos</h2>
            <p className="text-[12.5px] text-slate-400 font-medium mb-4">Elige qué eventos disparan una alerta</p>
            <div className="space-y-2.5">
              {Object.entries(available).map(([key, label]) => {
                const Icon = EVENT_ICONS[key] || Bell;
                return (
                  <div key={key} className="flex items-center gap-3 p-3 rounded-xl" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,0,0,0.04)' }}>
                      <Icon size={16} className="text-slate-500" />
                    </div>
                    <span className="flex-1 text-[13px] font-semibold text-slate-700 min-w-0">{label}</span>
                    <Toggle checked={!!events[key]} onChange={() => enabled && toggleEvent(key)} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 animate-fade-up delay-100">
            <button type="submit" disabled={saving} className="btn-primary justify-center">
              {saving ? <><Loader2 size={15} className="animate-spin" /> Guardando…</> : <><Check size={15} /> Guardar cambios</>}
            </button>
            <button type="button" onClick={sendTest} disabled={testing || !mailConfigured}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[13px] font-bold text-slate-700 tap-scale disabled:opacity-50"
              style={{ background: 'rgba(0,0,0,0.05)' }}>
              {testing ? <><Loader2 size={15} className="animate-spin" /> Enviando…</> : <><Send size={15} /> Enviar correo de prueba</>}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
