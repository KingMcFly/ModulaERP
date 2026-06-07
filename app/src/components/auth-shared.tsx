/**
 * Shared design tokens and components for all auth pages.
 * Import from here to keep visual consistency across Login, Register,
 * ForgotPassword and ResetPassword.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, Moon, Sun } from 'lucide-react';

// ── Design tokens ─────────────────────────────────────────────────────────────
export const colors = {
  dark: {
    page:         '#0F1115',
    pageSoft:     '#12151B',
    card:         '#151922',
    cardAlt:      '#11141B',
    field:        '#171B24',
    fieldHover:   '#1A1F2A',
    border:       '#252B36',
    borderStrong: '#303747',
    text:         '#F3F4F6',
    muted:        '#9CA3AF',
    subtle:       '#6B7280',
    accent:       '#C6922B',
    accentHover:  '#B8831F',
    accentText:   '#17120A',
  },
  light: {
    page:         '#F5F6F8',
    pageSoft:     '#ECEFF3',
    card:         '#FFFFFF',
    cardAlt:      '#F8F9FB',
    field:        '#FFFFFF',
    fieldHover:   '#FAFAFB',
    border:       '#E1E5EA',
    borderStrong: '#C9CED6',
    text:         '#111827',
    muted:        '#6B7280',
    subtle:       '#8A93A1',
    accent:       '#B8831F',
    accentHover:  '#9F6E19',
    accentText:   '#FFFFFF',
  },
} as const;

export type Theme = 'dark' | 'light';
export type ThemeProps = { dark: boolean };
export type C = typeof colors.dark | typeof colors.light;

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function c(dark: boolean): C {
  return dark ? colors.dark : colors.light;
}

// ── Brand mark ────────────────────────────────────────────────────────────────
export function Brand({ dark, center = false }: ThemeProps & { center?: boolean }) {
  const col = c(dark);
  return (
    <div className={cx('flex items-center gap-3', center && 'justify-center')}>
      <div
        className="grid size-11 shrink-0 place-items-center rounded-xl"
        style={{
          background: dark ? '#1B1E26' : '#F3F4F6',
          border: `1px solid ${col.border}`,
          boxShadow: dark ? 'none' : '0 1px 2px rgba(17,24,39,0.04)',
        }}
      >
        <span className="text-[15px] font-black tracking-[-0.08em]" style={{ color: col.accent }}>
          FB
        </span>
      </div>
      <div className="leading-none">
        <div className="text-[20px] font-black tracking-[-0.045em]" style={{ color: col.text }}>
          FB Core
        </div>
        <div className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.18em]" style={{ color: col.subtle }}>
          by FBSystems
        </div>
      </div>
    </div>
  );
}

// ── Page background ───────────────────────────────────────────────────────────
export function PageBackground({ dark }: ThemeProps) {
  const col = c(dark);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: col.page }} />
      <div
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage: dark
            ? 'linear-gradient(rgba(255,255,255,0.85) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.85) 1px, transparent 1px)'
            : 'linear-gradient(rgba(17,24,39,0.85) 1px, transparent 1px), linear-gradient(90deg, rgba(17,24,39,0.85) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-48"
        style={{
          background: dark
            ? 'linear-gradient(180deg, rgba(255,255,255,0.025), transparent)'
            : 'linear-gradient(180deg, rgba(255,255,255,0.92), transparent)',
        }}
      />
    </div>
  );
}

// ── Theme toggle ──────────────────────────────────────────────────────────────
export function ThemeToggle({ dark, onClick }: ThemeProps & { onClick: () => void }) {
  const col = c(dark);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="grid size-10 place-items-center rounded-xl transition hover:-translate-y-0.5 flex-shrink-0"
      style={{
        background: col.card,
        border: `1px solid ${col.border}`,
        color: col.muted,
        boxShadow: dark ? '0 12px 28px rgba(0,0,0,0.20)' : '0 12px 28px rgba(17,24,39,0.08)',
      }}
    >
      {dark ? <Sun size={17} strokeWidth={2} /> : <Moon size={17} strokeWidth={2} />}
    </button>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
export function StatusBadge({ dark }: ThemeProps) {
  const col = c(dark);
  return (
    <Link
      to="/status"
      className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-semibold transition hover:-translate-y-0.5"
      style={{
        background: col.card,
        borderColor: col.border,
        color: col.muted,
        boxShadow: dark ? 'none' : '0 8px 24px rgba(17,24,39,0.06)',
      }}
    >
      <span className="size-2 rounded-full bg-emerald-500" />
      Servicios operativos
    </Link>
  );
}

// ── Text field with icon ──────────────────────────────────────────────────────
export function Field({
  id, label, type = 'text', value, onChange, placeholder, autoComplete, dark, icon,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder: string; autoComplete: string;
  dark: boolean; icon: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const col = c(dark);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: col.subtle }}>
        {label}
      </label>
      <div
        className="flex h-12 items-center rounded-xl border transition"
        style={{
          background: focused ? col.fieldHover : col.field,
          borderColor: focused ? col.accent : col.border,
          boxShadow: focused ? `0 0 0 3px ${dark ? 'rgba(198,146,43,0.12)' : 'rgba(184,131,31,0.12)'}` : 'none',
        }}
      >
        <div className="grid size-12 shrink-0 place-items-center" style={{ color: focused ? col.accent : col.subtle }}>
          {icon}
        </div>
        <input
          id={id}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="h-full w-full bg-transparent pr-4 text-[14px] font-semibold outline-none placeholder:font-medium"
          style={{ color: col.text }}
        />
      </div>
    </div>
  );
}

// ── Password field ────────────────────────────────────────────────────────────
export function PasswordField({
  id, label, value, onChange, autoComplete, dark, right, placeholder = '••••••••',
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  autoComplete: string; dark: boolean; right?: React.ReactNode; placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [show, setShow]       = useState(false);
  const col = c(dark);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="block text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: col.subtle }}>
          {label}
        </label>
        {right}
      </div>
      <div
        className="relative flex h-12 items-center rounded-xl border transition"
        style={{
          background: focused ? col.fieldHover : col.field,
          borderColor: focused ? col.accent : col.border,
          boxShadow: focused ? `0 0 0 3px ${dark ? 'rgba(198,146,43,0.12)' : 'rgba(184,131,31,0.12)'}` : 'none',
        }}
      >
        <div className="grid size-12 shrink-0 place-items-center" style={{ color: focused ? col.accent : col.subtle }}>
          <LockKeyhole size={17} strokeWidth={2.1} />
        </div>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="h-full w-full bg-transparent pr-12 text-[14px] font-semibold outline-none placeholder:font-medium"
          style={{ color: col.text }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg transition"
          style={{ color: col.subtle }}
        >
          {show ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
}

// ── Primary button ────────────────────────────────────────────────────────────
export function PrimaryBtn({
  type = 'button', disabled = false, loading = false, loadingText = 'Cargando…', children, onClick,
}: {
  type?: 'button' | 'submit';
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  onClick?: () => void;
  dark: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      style={{ background: '#C6922B', color: '#17120A' }}
      onMouseEnter={e => { if (!disabled && !loading) e.currentTarget.style.background = '#B8831F'; }}
      onMouseLeave={e => { e.currentTarget.style.background = '#C6922B'; }}
    >
      {loading ? (
        <>
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80" />
          {loadingText}
        </>
      ) : children}
    </button>
  );
}

// ── Secondary button ──────────────────────────────────────────────────────────
export function SecondaryBtn({
  dark, children, onClick,
}: { dark: boolean; children: React.ReactNode; onClick: () => void }) {
  const col = c(dark);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 shrink-0 items-center justify-center rounded-xl px-5 text-[14px] font-bold transition hover:-translate-y-0.5"
      style={{ background: col.cardAlt, border: `1px solid ${col.border}`, color: col.text }}
    >
      {children}
    </button>
  );
}

// ── Error banner ──────────────────────────────────────────────────────────────
export function ErrorBanner({ dark, message }: { dark: boolean; message: string }) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border p-3.5 text-[13px] leading-5"
      style={{
        background: dark ? 'rgba(239,68,68,0.075)' : '#FEF2F2',
        borderColor: dark ? 'rgba(239,68,68,0.22)' : '#FECACA',
        color: dark ? '#FCA5A5' : '#991B1B',
      }}
    >
      <span>{message}</span>
    </div>
  );
}

// ── Auth page shell ───────────────────────────────────────────────────────────
export function AuthShell({
  dark, toggle, left, right, footer,
}: {
  dark: boolean;
  toggle: () => void;
  left: React.ReactNode;
  right: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const col = c(dark);
  return (
    <main className="relative min-h-[100dvh] overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
      <PageBackground dark={dark} />

      <section className="relative z-10 mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-6xl flex-col justify-center">
        <div className="grid items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Left info panel — hidden on mobile */}
          <aside className="hidden lg:flex">{left}</aside>
          {/* Right form panel */}
          <div>{right}</div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2.5">
            <StatusBadge dark={dark} />
            <ThemeToggle dark={dark} onClick={toggle} />
          </div>
          <p className="hidden text-right text-[12px] font-medium sm:block" style={{ color: col.subtle }}>
            © {new Date().getFullYear()} FBSystems
          </p>
          {footer}
        </div>
      </section>
    </main>
  );
}

// ── Info panel card wrapper ───────────────────────────────────────────────────
export function InfoPanel({
  dark, children,
}: { dark: boolean; children: React.ReactNode }) {
  const col = c(dark);
  return (
    <div
      className="flex min-h-[620px] w-full flex-col rounded-3xl border p-8"
      style={{
        background: col.cardAlt,
        borderColor: col.border,
        boxShadow: dark ? '0 20px 60px rgba(0,0,0,0.20)' : '0 20px 60px rgba(17,24,39,0.06)',
      }}
    >
      {children}
    </div>
  );
}

// ── Form card wrapper ─────────────────────────────────────────────────────────
export function FormCard({
  dark, children,
}: { dark: boolean; children: React.ReactNode }) {
  const col = c(dark);
  return (
    <div
      className="flex min-h-[auto] w-full flex-col rounded-3xl border p-6 sm:p-8 lg:min-h-[620px]"
      style={{
        background: col.card,
        borderColor: col.border,
        boxShadow: dark ? '0 20px 60px rgba(0,0,0,0.22)' : '0 20px 60px rgba(17,24,39,0.08)',
      }}
    >
      {children}
    </div>
  );
}

// ── Check-circle list item ────────────────────────────────────────────────────
export function CheckItem({ dark, children }: ThemeProps & { children: React.ReactNode }) {
  const col = c(dark);
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full" style={{ background: `${col.accent}22` }}>
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4l2.5 2.5L9 1" stroke={col.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-[14px] leading-6" style={{ color: col.muted }}>{children}</p>
    </div>
  );
}
