import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Moon,
  Server,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { cleanRut, formatRut, looksLikeRut, validateRut } from '../utils/rut';

type ThemeProps = {
  dark: boolean;
};

const colors = {
  dark: {
    page: '#0F1115',
    pageSoft: '#12151B',
    card: '#151922',
    cardAlt: '#11141B',
    field: '#171B24',
    fieldHover: '#1A1F2A',
    border: '#252B36',
    borderStrong: '#303747',
    text: '#F3F4F6',
    muted: '#9CA3AF',
    subtle: '#6B7280',
    accent: '#C6922B',
    accentHover: '#B8831F',
    accentText: '#17120A',
  },
  light: {
    page: '#F5F6F8',
    pageSoft: '#ECEFF3',
    card: '#FFFFFF',
    cardAlt: '#F8F9FB',
    field: '#FFFFFF',
    fieldHover: '#FAFAFB',
    border: '#E1E5EA',
    borderStrong: '#C9CED6',
    text: '#111827',
    muted: '#6B7280',
    subtle: '#8A93A1',
    accent: '#B8831F',
    accentHover: '#9F6E19',
    accentText: '#FFFFFF',
  },
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function Brand({ dark, center = false }: ThemeProps & { center?: boolean }) {
  const c = dark ? colors.dark : colors.light;

  return (
    <div className={cx('flex items-center gap-3', center && 'justify-center')}>
      <div
        className="grid size-11 shrink-0 place-items-center rounded-xl"
        style={{
          background: dark ? '#1B1E26' : '#F3F4F6',
          border: `1px solid ${c.border}`,
          boxShadow: dark ? 'none' : '0 1px 2px rgba(17,24,39,0.04)',
        }}
      >
        <span className="text-[15px] font-black tracking-[-0.08em]" style={{ color: c.accent }}>
          FB
        </span>
      </div>

      <div className="leading-none">
        <div className="text-[20px] font-black tracking-[-0.045em]" style={{ color: c.text }}>
          FB Core
        </div>
        <div className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.18em]" style={{ color: c.subtle }}>
          by FBSystems
        </div>
      </div>
    </div>
  );
}

function PageBackground({ dark }: ThemeProps) {
  const c = dark ? colors.dark : colors.light;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: c.page }} />

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

function ThemeToggle({ dark, onClick }: ThemeProps & { onClick: () => void }) {
  const c = dark ? colors.dark : colors.light;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="fixed right-4 top-4 z-50 grid size-10 place-items-center rounded-xl transition hover:-translate-y-0.5"
      style={{
        background: c.card,
        border: `1px solid ${c.border}`,
        color: c.muted,
        boxShadow: dark ? '0 12px 28px rgba(0,0,0,0.20)' : '0 12px 28px rgba(17,24,39,0.08)',
      }}
    >
      {dark ? <Sun size={17} strokeWidth={2} /> : <Moon size={17} strokeWidth={2} />}
    </button>
  );
}

function TrustItem({ dark, children }: ThemeProps & { children: React.ReactNode }) {
  const c = dark ? colors.dark : colors.light;

  return (
    <div className="flex items-start gap-3">
      <CheckCircle2 className="mt-0.5 shrink-0" size={17} strokeWidth={2.2} style={{ color: c.accent }} />
      <p className="text-[14px] leading-6" style={{ color: c.muted }}>
        {children}
      </p>
    </div>
  );
}

function InfoCard({ dark }: ThemeProps) {
  const c = dark ? colors.dark : colors.light;

  return (
    <aside className="hidden lg:flex">
      <div
        className="flex min-h-[620px] w-full flex-col rounded-3xl border p-8"
        style={{
          background: c.cardAlt,
          borderColor: c.border,
          boxShadow: dark ? '0 20px 60px rgba(0,0,0,0.20)' : '0 20px 60px rgba(17,24,39,0.06)',
        }}
      >
        <div className="flex flex-1 flex-col justify-center">
          <div className="max-w-[440px]">
            <div
              className="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em]"
              style={{
                background: dark ? '#171B24' : '#FFFFFF',
                borderColor: c.border,
                color: c.accent,
              }}
            >
              <ShieldCheck size={14} strokeWidth={2.2} />
              Acceso empresarial seguro
            </div>

            <h2 className="max-w-[420px] text-[38px] font-black leading-[1.02] tracking-[-0.055em]" style={{ color: c.text }}>
              Plataforma centralizada para tu operación.
            </h2>

            <p className="mt-5 max-w-[420px] text-[15px] leading-7" style={{ color: c.muted }}>
              FB Core reúne la gestión operativa de tu empresa en un entorno claro, controlado y preparado para equipos reales.
            </p>

            <div
              className="mt-10 rounded-2xl border p-5"
              style={{
                background: dark ? colors.dark.card : colors.light.card,
                borderColor: c.border,
              }}
            >
              <div className="mb-4 flex items-center gap-2">
                <Server size={17} style={{ color: c.accent }} />
                <span className="text-[13px] font-black uppercase tracking-[0.12em]" style={{ color: c.text }}>
                  Operación confiable
                </span>
              </div>

              <div className="space-y-4">
                <TrustItem dark={dark}>Control de acceso por empresa, usuarios y permisos.</TrustItem>
                <TrustItem dark={dark}>Diseño sobrio orientado a claridad y productividad.</TrustItem>
                <TrustItem dark={dark}>Estado del sistema visible para mayor transparencia.</TrustItem>
              </div>
            </div>
          </div>
        </div>

        <p className="max-w-[520px] text-[12px] leading-5" style={{ color: c.subtle }}>
          Software desarrollado por FBSystems para empresas que necesitan ordenar su gestión diaria sin complejidad innecesaria.
        </p>
      </div>
    </aside>
  );
}

function StatusBadge({ dark }: ThemeProps) {
  const c = dark ? colors.dark : colors.light;

  return (
    <Link
      to="/status"
      className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-semibold transition hover:-translate-y-0.5"
      style={{
        background: c.card,
        borderColor: c.border,
        color: c.muted,
        boxShadow: dark ? 'none' : '0 8px 24px rgba(17,24,39,0.06)',
      }}
    >
      <span className="size-2 rounded-full bg-emerald-500" />
      Servicios operativos
    </Link>
  );
}

function Field({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  dark,
  icon,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  dark: boolean;
  icon: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const c = dark ? colors.dark : colors.light;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: c.subtle }}>
        {label}
      </label>

      <div
        className="flex h-12 items-center rounded-xl border transition"
        style={{
          background: focused ? c.fieldHover : c.field,
          borderColor: focused ? c.accent : c.border,
          boxShadow: focused ? `0 0 0 3px ${dark ? 'rgba(198,146,43,0.12)' : 'rgba(184,131,31,0.12)'}` : 'none',
        }}
      >
        <div className="grid size-12 shrink-0 place-items-center" style={{ color: focused ? c.accent : c.subtle }}>
          {icon}
        </div>

        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="h-full w-full bg-transparent pr-4 text-[14px] font-semibold outline-none placeholder:font-medium"
          style={{ color: c.text }}
        />
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  dark,
  right,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  dark: boolean;
  right?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);
  const c = dark ? colors.dark : colors.light;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="block text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: c.subtle }}>
          {label}
        </label>
        {right}
      </div>

      <div
        className="relative flex h-12 items-center rounded-xl border transition"
        style={{
          background: focused ? c.fieldHover : c.field,
          borderColor: focused ? c.accent : c.border,
          boxShadow: focused ? `0 0 0 3px ${dark ? 'rgba(198,146,43,0.12)' : 'rgba(184,131,31,0.12)'}` : 'none',
        }}
      >
        <div className="grid size-12 shrink-0 place-items-center" style={{ color: focused ? c.accent : c.subtle }}>
          <LockKeyhole size={17} strokeWidth={2.1} />
        </div>

        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="••••••••"
          autoComplete={autoComplete}
          required
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="h-full w-full bg-transparent pr-12 text-[14px] font-semibold outline-none placeholder:font-medium"
          style={{ color: c.text }}
        />

        <button
          type="button"
          onClick={() => setShow((current) => !current)}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg transition"
          style={{ color: c.subtle }}
        >
          {show ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
}

function LoginCard({
  dark,
  identifier,
  password,
  loading,
  sessionMessage,
  onIdentifierChange,
  onPasswordChange,
  onSubmit,
}: ThemeProps & {
  identifier: string;
  password: string;
  loading: boolean;
  sessionMessage?: string | null;
  onIdentifierChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  const c = dark ? colors.dark : colors.light;

  return (
    <div className="flex">
      <div
        className="flex min-h-[auto] w-full flex-col rounded-3xl border p-6 sm:p-8 lg:min-h-[620px]"
        style={{
          background: c.card,
          borderColor: c.border,
          boxShadow: dark ? '0 20px 60px rgba(0,0,0,0.22)' : '0 20px 60px rgba(17,24,39,0.08)',
        }}
      >
        <Brand dark={dark} />

        <div className="flex flex-1 flex-col justify-center pt-8 lg:pt-0">
          <div>
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: c.accent }}>
              Acceso de clientes
            </p>

            <h1 className="text-[31px] font-black leading-tight tracking-[-0.045em]" style={{ color: c.text }}>
              Accede a tu cuenta
            </h1>

            <p className="mt-3 text-[14px] leading-6" style={{ color: c.muted }}>
              Ingresa con tu correo electrónico o RUT para continuar en FB Core.
            </p>
          </div>

          {sessionMessage && (
            <div
              className="mt-6 flex items-start gap-3 rounded-xl border p-4 text-[13px] leading-5"
              style={{
                background: dark ? 'rgba(239,68,68,0.075)' : '#FEF2F2',
                borderColor: dark ? 'rgba(239,68,68,0.22)' : '#FECACA',
                color: dark ? '#FCA5A5' : '#991B1B',
              }}
            >
              <AlertTriangle size={17} className="mt-0.5 shrink-0" />
              <span>{sessionMessage}</span>
            </div>
          )}

          <form onSubmit={onSubmit} noValidate className="mt-7 space-y-5">
            <Field
              id="login-id"
              label="Correo electrónico o RUT"
              value={identifier}
              onChange={onIdentifierChange}
              placeholder="correo@empresa.com"
              autoComplete="username"
              dark={dark}
              icon={<Mail size={17} strokeWidth={2.1} />}
            />

            <PasswordField
              id="login-password"
              label="Contraseña"
              value={password}
              onChange={onPasswordChange}
              autoComplete="current-password"
              dark={dark}
              right={
                <Link to="/forgot-password" className="text-[12px] font-bold transition hover:underline" style={{ color: c.accent }}>
                  ¿Olvidaste tu contraseña?
                </Link>
              }
            />

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              style={{
                background: c.accent,
                color: c.accentText,
                boxShadow: 'none',
              }}
              onMouseEnter={(event) => {
                if (!loading) event.currentTarget.style.background = c.accentHover;
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = c.accent;
              }}
            >
              {loading ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80" aria-hidden />
                  Ingresando…
                </>
              ) : (
                <>
                  Ingresar
                  <ArrowRight size={17} strokeWidth={2.4} />
                </>
              )}
            </button>
          </form>

          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1" style={{ background: c.border }} />
            <span className="text-[12px] font-semibold" style={{ color: c.subtle }}>
              ¿Empresa nueva?
            </span>
            <div className="h-px flex-1" style={{ background: c.border }} />
          </div>

          <Link
            to="/register"
            className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl border text-[14px] font-black"
            style={{
              background: dark ? colors.dark.cardAlt : colors.light.cardAlt,
              borderColor: c.border,
              color: c.text,
              transition: 'transform 160ms cubic-bezier(0.23,1,0.32,1), background 160ms, border-color 160ms, box-shadow 160ms',
            }}
            onMouseEnter={e => Object.assign(e.currentTarget.style, {
              background: dark ? '#1A1F2C' : '#EFF1F5',
              borderColor: c.borderStrong,
              transform: 'translateY(-2px)',
              boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.28)' : '0 8px 24px rgba(17,24,39,0.10)',
            })}
            onMouseLeave={e => Object.assign(e.currentTarget.style, {
              background: dark ? colors.dark.cardAlt : colors.light.cardAlt,
              borderColor: c.border,
              transform: '',
              boxShadow: 'none',
            })}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          >
            Crear empresa gratis
            <ArrowRight
              size={15}
              strokeWidth={2.4}
              style={{ transition: 'transform 200ms cubic-bezier(0.23,1,0.32,1)' }}
              className="group-hover:translate-x-1"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const { login, sessionMessage } = useAuth();
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  const c = dark ? colors.dark : colors.light;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  function handleIdentifierChange(value: string) {
    if (looksLikeRut(value) || looksLikeRut(value.replace(/[.\-]/g, ''))) {
      const cleaned = cleanRut(value);

      if (cleaned.length >= 2 && !value.endsWith('-') && !value.endsWith('.')) {
        setIdentifier(formatRut(cleaned));
        return;
      }
    }

    setIdentifier(value);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const id = identifier.trim();

    if (!id) {
      toast.error('Ingresa tu correo o RUT');
      return;
    }

    if (looksLikeRut(id) && !validateRut(id)) {
      toast.error('RUT inválido');
      return;
    }

    setLoading(true);

    try {
      await login(id, password);
    } catch (error: any) {
      toast.error(error?.message || 'No fue posible iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
      <PageBackground dark={dark} />
      <ThemeToggle dark={dark} onClick={toggle} />

      <section className="relative z-10 mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-6xl flex-col justify-center">
        <div className="grid items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
          <InfoCard dark={dark} />

          <LoginCard
            dark={dark}
            identifier={identifier}
            password={password}
            loading={loading}
            sessionMessage={sessionMessage}
            onIdentifierChange={handleIdentifierChange}
            onPasswordChange={setPassword}
            onSubmit={handleSubmit}
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 px-1">
          <StatusBadge dark={dark} />
          <p className="hidden text-right text-[12px] font-medium sm:block" style={{ color: c.subtle }}>
            © {new Date().getFullYear()} FBSystems
          </p>
        </div>
      </section>
    </main>
  );
}
