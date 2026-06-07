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

type DateInput = string | number | Date | null | undefined;

interface SettingsCtx {
  settings: RegionalSettings;
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

  const refresh = useCallback(async () => {
    try {
      const s = await api.get<RegionalSettings>('/admin/settings');
      setSettings({ ...DEFAULT_SETTINGS, ...s });
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
    <Ctx.Provider value={{ settings, refresh, fmtDate, fmtDateTime, fmtNumber, fmtCurrency }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSettings(): SettingsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
