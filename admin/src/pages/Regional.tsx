import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Globe, Clock, Calendar, Coins, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../api';
import { useSettings, type RegionalSettings, type DateStyle } from '../context/Settings';

const LOCALES = [
  { value: 'es-CL', label: 'Español (Chile)' },
  { value: 'es-MX', label: 'Español (México)' },
  { value: 'es-AR', label: 'Español (Argentina)' },
  { value: 'es-CO', label: 'Español (Colombia)' },
  { value: 'es-PE', label: 'Español (Perú)' },
  { value: 'es-ES', label: 'Español (España)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'pt-BR', label: 'Português (Brasil)' },
];

const CURRENCIES = [
  { value: 'CLP', label: 'CLP — Peso chileno' },
  { value: 'MXN', label: 'MXN — Peso mexicano' },
  { value: 'ARS', label: 'ARS — Peso argentino' },
  { value: 'COP', label: 'COP — Peso colombiano' },
  { value: 'PEN', label: 'PEN — Sol peruano' },
  { value: 'USD', label: 'USD — Dólar estadounidense' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'BRL', label: 'BRL — Real brasileño' },
];

const DATE_STYLES: { value: DateStyle; label: string }[] = [
  { value: 'short',  label: 'Corto (01/12/2026)' },
  { value: 'medium', label: 'Medio (1 dic 2026)' },
  { value: 'long',   label: 'Largo (1 de diciembre de 2026)' },
  { value: 'full',   label: 'Completo (lunes, 1 de diciembre de 2026)' },
];

// Full timezone list from the browser ICU data, with a sensible fallback.
function getTimezones(): string[] {
  try {
    const fn = (Intl as any).supportedValuesOf;
    if (typeof fn === 'function') return fn('timeZone');
  } catch { /* ignore */ }
  return [
    'UTC', 'America/Santiago', 'America/Mexico_City', 'America/Bogota',
    'America/Lima', 'America/Argentina/Buenos_Aires', 'America/Sao_Paulo',
    'America/New_York', 'Europe/Madrid',
  ];
}

function PreviewRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Icon size={15} className="text-slate-300 flex-shrink-0" />
      <span className="text-[12px] font-semibold text-slate-400 w-24 flex-shrink-0">{label}</span>
      <span className="text-[13px] font-bold text-slate-800 tabular-nums">{value}</span>
    </div>
  );
}

export default function Regional() {
  const { settings: ctxSettings, refresh } = useSettings();
  const [form, setForm] = useState<RegionalSettings>(ctxSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const timezones = getTimezones();

  useEffect(() => {
    api.get<RegionalSettings>('/admin/settings')
      .then(s => setForm(prev => ({ ...prev, ...s })))
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof RegionalSettings>(key: K, value: RegionalSettings[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/admin/settings', form);
      toast.success('Configuración regional guardada');
      await refresh();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  // Live preview using the in-progress form values
  const sample = new Date();
  const safe = <T,>(fn: () => T, fallback: T): T => { try { return fn(); } catch { return fallback; } };
  const previewDate = safe(() => new Intl.DateTimeFormat(form.locale, { dateStyle: form.date_style, timeZone: form.timezone }).format(sample), '—');
  const previewTime = safe(() => new Intl.DateTimeFormat(form.locale, { timeStyle: 'medium', timeZone: form.timezone }).format(sample), '—');
  const previewNum  = safe(() => new Intl.NumberFormat(form.locale).format(1234567.89), '—');
  const previewCur  = safe(() => new Intl.NumberFormat(form.locale, { style: 'currency', currency: form.currency }).format(1234567.89), '—');

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
          <h1 className="text-[22px] sm:text-[24px] font-bold text-slate-900 tracking-[-0.03em]">Regional</h1>
          <p className="text-slate-400 text-[13px] mt-0.5 font-medium">Idioma, zona horaria, moneda y formato de fecha</p>
        </div>
      </div>

      <form onSubmit={save} className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
        {/* Form card */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 sm:p-6 animate-fade-up delay-40 space-y-4"
          style={{ border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {loading ? (
            <div className="flex items-center gap-2 text-slate-400 text-[13px] py-6">
              <Loader2 size={15} className="animate-spin" /> Cargando…
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="r-locale" className="label flex items-center gap-1.5"><Globe size={11} /> Idioma</label>
                <select id="r-locale" className="input" value={form.locale} onChange={e => set('locale', e.target.value)}>
                  {LOCALES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="r-tz" className="label flex items-center gap-1.5"><Clock size={11} /> Zona horaria</label>
                <select id="r-tz" className="input" value={form.timezone} onChange={e => set('timezone', e.target.value)}>
                  {!timezones.includes(form.timezone) && <option value={form.timezone}>{form.timezone}</option>}
                  {timezones.map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="r-cur" className="label flex items-center gap-1.5"><Coins size={11} /> Moneda</label>
                <select id="r-cur" className="input" value={form.currency} onChange={e => set('currency', e.target.value)}>
                  {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="r-date" className="label flex items-center gap-1.5"><Calendar size={11} /> Formato de fecha</label>
                <select id="r-date" className="input" value={form.date_style} onChange={e => set('date_style', e.target.value as DateStyle)}>
                  {DATE_STYLES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>

              <div className="pt-2">
                <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
                  {saving ? <><Loader2 size={15} className="animate-spin" /> Guardando…</> : <><Check size={15} /> Guardar cambios</>}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Live preview */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 animate-fade-up delay-80 h-fit"
          style={{ border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 className="font-bold text-slate-900 text-[14px] tracking-[-0.02em] mb-1">Vista previa</h2>
          <p className="text-[11.5px] text-slate-400 font-medium mb-3">Cómo se verán los datos en la plataforma</p>
          <div className="divide-y divide-slate-50">
            <PreviewRow icon={Calendar} label="Fecha" value={previewDate} />
            <PreviewRow icon={Clock} label="Hora" value={previewTime} />
            <PreviewRow icon={Globe} label="Número" value={previewNum} />
            <PreviewRow icon={Coins} label="Moneda" value={previewCur} />
          </div>
        </div>
      </form>
    </div>
  );
}
