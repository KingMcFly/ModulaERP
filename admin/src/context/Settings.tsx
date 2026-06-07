import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api } from '../api';

export type DateStyle = 'short' | 'medium' | 'long' | 'full';

export interface RegionalSettings {
  locale: string;
  timezone: string;
  currency: string;
  date_style: DateStyle;
}

export const DEFAULT_SETTINGS: RegionalSettings = {
  locale: 'es-CL',
  timezone: 'America/Santiago',
  currency: 'CLP',
  date_style: 'medium',
};

export interface AppearanceSettings {
  brand_name: string;
  accent_color: string;
  logo_url: string | null;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  brand_name: 'FB Core',
  accent_color: '#F2B045',
  logo_url: null,
};

type DateInput = string | number | Date | null | undefined;

// ── Color helpers for the live accent (darker shade + readable text) ──────────
export function shadeColor(hex: string, amount: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const adj = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 + amount))));
  const r = adj((n >> 16) & 255), g = adj((n >> 8) & 255), b = adj(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
export function contrastText(hex: string): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return '#131316';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  // Relative luminance
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.6 ? '#131316' : '#ffffff';
}

export function applyAccent(accent: string) {
  const root = document.documentElement;
  root.style.setProperty('--brand', accent);
  root.style.setProperty('--brand-strong', shadeColor(accent, -0.08));
  root.style.setProperty('--brand-text', contrastText(accent));
}

interface SettingsCtx {
  settings: RegionalSettings;
  appearance: AppearanceSettings;
  refresh: () => Promise<void>;
  fmtDate: (d: DateInput) => string;
  fmtDateTime: (d: DateInput) => string;
  fmtNumber: (n: number) => string;
  fmtCurrency: (n: number) => string;
}

const Ctx = createContext<SettingsCtx | null>(null);

function toDate(d: DateInput): Date | null {
  if (d === null || d === undefined || d === '') return null;
  const date = d instanceof Date ? d : new Date(d);
  return isNaN(date.getTime()) ? null : date;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<RegionalSettings>(DEFAULT_SETTINGS);
  const [appearance, setAppearance] = useState<AppearanceSettings>(DEFAULT_APPEARANCE);

  const refresh = useCallback(async () => {
    try {
      const s = await api.get<RegionalSettings & Partial<AppearanceSettings>>('/admin/settings');
      setSettings({ ...DEFAULT_SETTINGS, ...s });
      const appr: AppearanceSettings = {
        brand_name: s.brand_name || DEFAULT_APPEARANCE.brand_name,
        accent_color: s.accent_color || DEFAULT_APPEARANCE.accent_color,
        logo_url: s.logo_url ?? null,
      };
      setAppearance(appr);
      applyAccent(appr.accent_color);
    } catch { /* keep defaults on error */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const fmtDate = useCallback((d: DateInput) => {
    const date = toDate(d);
    if (!date) return '—';
    try {
      return new Intl.DateTimeFormat(settings.locale, {
        dateStyle: settings.date_style,
        timeZone: settings.timezone,
      }).format(date);
    } catch { return date.toLocaleDateString(); }
  }, [settings]);

  const fmtDateTime = useCallback((d: DateInput) => {
    const date = toDate(d);
    if (!date) return '—';
    try {
      return new Intl.DateTimeFormat(settings.locale, {
        dateStyle: settings.date_style,
        timeStyle: 'short',
        timeZone: settings.timezone,
      }).format(date);
    } catch { return date.toLocaleString(); }
  }, [settings]);

  const fmtNumber = useCallback((n: number) => {
    try { return new Intl.NumberFormat(settings.locale).format(n); }
    catch { return String(n); }
  }, [settings]);

  const fmtCurrency = useCallback((n: number) => {
    try { return new Intl.NumberFormat(settings.locale, { style: 'currency', currency: settings.currency }).format(n); }
    catch { return String(n); }
  }, [settings]);

  return (
    <Ctx.Provider value={{ settings, appearance, refresh, fmtDate, fmtDateTime, fmtNumber, fmtCurrency }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSettings(): SettingsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
