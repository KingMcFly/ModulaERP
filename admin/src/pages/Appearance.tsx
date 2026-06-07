import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Palette, Type, Image as ImageIcon, Check, Loader2, RotateCcw, Boxes } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../api';
import { useSettings, applyAccent, contrastText, DEFAULT_APPEARANCE } from '../context/Settings';

export default function Appearance() {
  const { appearance, refresh } = useSettings();
  const [brandName, setBrandName] = useState(appearance.brand_name);
  const [accent, setAccent] = useState(appearance.accent_color);
  const [logoUrl, setLogoUrl] = useState(appearance.logo_url || '');
  const [saving, setSaving] = useState(false);

  // Remember the persisted accent so we can restore it if the user navigates
  // away after previewing a color but without saving.
  const savedAccent = useRef(appearance.accent_color);

  useEffect(() => {
    setBrandName(appearance.brand_name);
    setAccent(appearance.accent_color);
    setLogoUrl(appearance.logo_url || '');
    savedAccent.current = appearance.accent_color;
  }, [appearance]);

  // Restore the saved accent on unmount (cancel live preview)
  useEffect(() => () => { applyAccent(savedAccent.current); }, []);

  function changeAccent(value: string) {
    setAccent(value);
    if (/^#[0-9a-fA-F]{6}$/.test(value)) applyAccent(value);
  }

  function resetDefaults() {
    setBrandName(DEFAULT_APPEARANCE.brand_name);
    changeAccent(DEFAULT_APPEARANCE.accent_color);
    setLogoUrl('');
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!brandName.trim()) return toast.error('El nombre de la marca es obligatorio');
    if (!/^#[0-9a-fA-F]{6}$/.test(accent)) return toast.error('Color de acento inválido (#RRGGBB)');
    if (logoUrl && !/^https?:\/\//i.test(logoUrl)) return toast.error('La URL del logo debe empezar con http:// o https://');
    setSaving(true);
    try {
      await api.put('/admin/settings/appearance', { brand_name: brandName.trim(), accent_color: accent, logo_url: logoUrl || null });
      toast.success('Apariencia guardada');
      savedAccent.current = accent;
      await refresh();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  const accentText = contrastText(accent);

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
          <h1 className="text-[22px] sm:text-[24px] font-bold text-slate-900 tracking-[-0.03em]">Apariencia</h1>
          <p className="text-slate-400 text-[13px] mt-0.5 font-medium">Marca, color de acento y logotipo del panel</p>
        </div>
      </div>

      <form onSubmit={save} className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
        {/* Form */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 sm:p-6 animate-fade-up delay-40 space-y-4"
          style={{ border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div>
            <label htmlFor="a-name" className="label flex items-center gap-1.5"><Type size={11} /> Nombre de la marca</label>
            <input id="a-name" className="input" maxLength={60} value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="FB Core" />
          </div>

          <div>
            <label htmlFor="a-color-hex" className="label flex items-center gap-1.5"><Palette size={11} /> Color de acento</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(accent) ? accent : '#F2B045'}
                onChange={e => changeAccent(e.target.value)}
                className="h-11 w-14 rounded-xl border border-slate-200 cursor-pointer p-0.5 flex-shrink-0"
                aria-label="Selector de color"
              />
              <input id="a-color-hex" className="input flex-1 font-mono" value={accent}
                onChange={e => changeAccent(e.target.value)} placeholder="#F2B045" maxLength={7} />
            </div>
          </div>

          <div>
            <label htmlFor="a-logo" className="label flex items-center gap-1.5"><ImageIcon size={11} /> URL del logotipo (opcional)</label>
            <input id="a-logo" className="input" value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
              placeholder="https://…/logo.png" maxLength={500} inputMode="url" />
            <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Pega un enlace público a tu logo (PNG/SVG). Se mostrará en la barra lateral.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button type="submit" disabled={saving} className="btn-primary justify-center">
              {saving ? <><Loader2 size={15} className="animate-spin" /> Guardando…</> : <><Check size={15} /> Guardar cambios</>}
            </button>
            <button type="button" onClick={resetDefaults}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[13px] font-bold text-slate-600 tap-scale"
              style={{ background: 'rgba(0,0,0,0.05)' }}>
              <RotateCcw size={14} /> Restaurar
            </button>
          </div>
        </div>

        {/* Live preview */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 animate-fade-up delay-80 h-fit"
          style={{ border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 className="font-bold text-slate-900 text-[14px] tracking-[-0.02em] mb-1">Vista previa</h2>
          <p className="text-[11.5px] text-slate-400 font-medium mb-4">En vivo en todo el panel</p>

          {/* Mini sidebar header */}
          <div className="rounded-xl p-3 flex items-center gap-2.5 mb-3" style={{ background: '#0A0A12' }}>
            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ background: logoUrl ? '#fff' : `linear-gradient(135deg, ${accent}, ${accent})` }}>
              {logoUrl
                ? <img src={logoUrl} alt="" className="w-full h-full object-contain" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                : <Boxes size={15} style={{ color: accentText }} />}
            </div>
            <div className="min-w-0">
              <p className="text-white text-[12px] font-bold leading-tight truncate">{brandName || 'FB Core'}</p>
              <p className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>Super Admin</p>
            </div>
          </div>

          {/* Sample button + chip */}
          <button type="button" className="btn-primary w-full justify-center mb-2.5" style={{ pointerEvents: 'none' }}>
            Botón principal
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg"
              style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
              Etiqueta
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: accent }}>
              <span className="w-2 h-2 rounded-full" style={{ background: accent }} /> Activo
            </span>
          </div>
        </div>
      </form>
    </div>
  );
}
