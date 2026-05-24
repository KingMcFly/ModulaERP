import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { cleanRut, formatRut, looksLikeRut, validateRut } from '../utils/rut';

type ThemeAware = {
  dark: boolean;
};

function BrandMark({ dark, compact = false }: ThemeAware & { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative grid place-items-center overflow-hidden rounded-2xl"
        style={{
          width: compact ? 42 : 52,
          height: compact ? 42 : 52,
          background: dark
            ? 'linear-gradient(145deg, rgba(242,176,69,0.24), rgba(242,176,69,0.05))'
            : 'linear-gradient(145deg, #20150A, #4B2D08)',
          border: `1px solid ${dark ? 'rgba(242,176,69,0.28)' : 'rgba(255,255,255,0.16)'}`,
          boxShadow: dark
            ? '0 18px 48px rgba(242,176,69,0.14), inset 0 1px 0 rgba(255,255,255,0.08)'
            : '0 18px 42px rgba(75,45,8,0.22), inset 0 1px 0 rgba(255,255,255,0.18)',
        }}
      >
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(circle at 25% 20%, rgba(255,255,255,0.28), transparent 30%), radial-gradient(circle at 80% 85%, rgba(242,176,69,0.32), transparent 34%)',
          }}
        />
        <span
          className="relative font-black tracking-[-0.08em]"
          style={{
            fontSize: compact ? 18 : 23,
            color: '#F2B045',
            textShadow: '0 1px 12px rgba(242,176,69,0.22)',
          }}
        >
          FB
        </span>
      </div>

      <div className="leading-none">
        <div
          className="font-black tracking-[-0.04em]"
          style={{
            fontSize: compact ? 19 : 23,
            color: dark ? 'rgba(255,255,255,0.96)' : '#101015',
          }}
        >
          FB Core
        </div>
        <div
          className="mt-1 text-[11px] font-semibold tracking-[0.18em] uppercase"
          style={{ color: dark ? 'rgba(255,255,255,0.36)' : 'rgba(16,16,21,0.48)' }}
        >
          by FBSystems
        </div>
      </div>
    </div>
  );
}

function Background({ dark }: ThemeAware) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: dark
            ? 'linear-gradient(135deg, #08080C 0%, #111116 44%, #070707 100%)'
            : 'linear-gradient(135deg, #F6F4EE 0%, #ECEAF2 48%, #F7F7FA 100%)',
        }}
      />

      <div
        className="absolute -left-48 top-[-18rem] h-[46rem] w-[46rem] rounded-full blur-3xl"
        style={{ background: dark ? 'rgba(242,176,69,0.105)' : 'rgba(242,176,69,0.22)' }}
      />
      <div
        className="absolute bottom-[-24rem] right-[-18rem] h-[52rem] w-[52rem] rounded-full blur-3xl"
        style={{ background: dark ? 'rgba(92,70,35,0.28)' : 'rgba(18,18,24,0.075)' }}
      />
      <div
        className="absolute inset-0 opacity-[0.085]"
        style={{
          backgroundImage: dark
            ? 'linear-gradient(rgba(255,255,255,0.85) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.85) 1px, transparent 1px)'
            : 'linear-gradient(rgba(0,0,0,0.72) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.72) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(circle at 50% 46%, black, transparent 72%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: dark
            ? 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.055), transparent 34%)'
            : 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.72), transparent 38%)',
        }}
      />
    </div>
  );
}

function ThemeToggle({ dark, onClick }: ThemeAware & { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
      className="group fixed right-4 top-4 z-50 grid size-11 place-items-center rounded-2xl transition duration-200 hover:-translate-y-0.5"
      style={{
        background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.72)',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.10)' : 'rgba(17,17,24,0.10)'}`,
        boxShadow: dark ? '0 18px 44px rgba(0,0,0,0.28)' : '0 18px 44px rgba(35,30,20,0.12)',
        color: dark ? 'rgba(255,255,255,0.72)' : '#1C1B20',
        backdropFilter: 'blur(18px)',
      }}
    >
      {dark ? <Sun size={17} strokeWidth={2} /> : <Moon size={17} strokeWidth={2} />}
    </button>
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
  right,
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
  right?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={id}
          className="text-[11px] font-bold uppercase tracking-[0.16em]"
          style={{ color: dark ? 'rgba(255,255,255,0.46)' : 'rgba(18,18,24,0.56)' }}
        >
          {label}
        </label>
        {right}
      </div>

      <div
        className="group relative flex items-center rounded-2xl transition duration-200"
        style={{
          background: dark ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.82)',
          border: `1px solid ${
            focused
              ? 'rgba(242,176,69,0.72)'
              : dark
                ? 'rgba(255,255,255,0.10)'
                : 'rgba(18,18,24,0.10)'
          }`,
          boxShadow: focused
            ? '0 0 0 4px rgba(242,176,69,0.12)'
            : dark
              ? 'inset 0 1px 0 rgba(255,255,255,0.03)'
              : '0 10px 28px rgba(20,18,12,0.05)',
        }}
      >
        <div
          className="grid size-12 shrink-0 place-items-center"
          style={{ color: focused ? '#F2B045' : dark ? 'rgba(255,255,255,0.34)' : 'rgba(18,18,24,0.38)' }}
        >
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
          className="h-12 w-full bg-transparent pr-4 text-[15px] font-medium outline-none placeholder:font-normal"
          style={{
            color: dark ? 'rgba(255,255,255,0.92)' : '#111116',
          }}
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={id}
          className="text-[11px] font-bold uppercase tracking-[0.16em]"
          style={{ color: dark ? 'rgba(255,255,255,0.46)' : 'rgba(18,18,24,0.56)' }}
        >
          {label}
        </label>
        {right}
      </div>

      <div
        className="relative flex items-center rounded-2xl transition duration-200"
        style={{
          background: dark ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.82)',
          border: `1px solid ${
            focused
              ? 'rgba(242,176,69,0.72)'
              : dark
                ? 'rgba(255,255,255,0.10)'
                : 'rgba(18,18,24,0.10)'
          }`,
          boxShadow: focused
            ? '0 0 0 4px rgba(242,176,69,0.12)'
            : dark
              ? 'inset 0 1px 0 rgba(255,255,255,0.03)'
              : '0 10px 28px rgba(20,18,12,0.05)',
        }}
      >
        <div
          className="grid size-12 shrink-0 place-items-center"
          style={{ color: focused ? '#F2B045' : dark ? 'rgba(255,255,255,0.34)' : 'rgba(18,18,24,0.38)' }}
        >
          <LockKeyhole size={18} strokeWidth={2} />
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
          className="h-12 w-full bg-transparent pr-12 text-[15px] font-medium outline-none placeholder:font-normal"
          style={{ color: dark ? 'rgba(255,255,255,0.92)' : '#111116' }}
        />
        <button
          type="button"
          onClick={() => setShow((current) => !current)}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-xl transition hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: dark ? 'rgba(255,255,255,0.42)' : 'rgba(18,18,24,0.42)' }}
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}

function SystemBadge({ dark }: ThemeAware) {
  return (
    <Link
      to="/status"
      className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold transition hover:-translate-y-0.5"
      style={{
        background: dark ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.72)',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(18,18,24,0.08)'}`,
        color: dark ? 'rgba(255,255,255,0.58)' : 'rgba(18,18,24,0.62)',
        boxShadow: dark ? 'none' : '0 14px 34px rgba(18,18,24,0.07)',
      }}
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
      </span>
      Servicios operativos
    </Link>
  );
}

function ProductPreview({ dark }: ThemeAware) {
  const modules = useMemo(
    () => [
      { label: 'Activos', value: '128', icon: Building2 },
      { label: 'Usuarios', value: '24', icon: ShieldCheck },
      { label: 'Alertas', value: '03', icon: Sparkles },
    ],
    []
  );

  return (
    <div className="relative hidden min-h-[620px] overflow-hidden rounded-[2rem] p-8 shadow-2xl lg:block">
      <div
        className="absolute inset-0"
        style={{
          background: dark
            ? 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.025))'
            : 'linear-gradient(145deg, rgba(18,18,24,0.94), rgba(18,18,24,0.82))',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)'}`,
          backdropFilter: 'blur(28px)',
        }}
      />
      <div
        className="absolute -right-24 -top-24 size-72 rounded-full blur-3xl"
        style={{ background: 'rgba(242,176,69,0.22)' }}
      />
      <div
        className="absolute bottom-[-8rem] left-[-8rem] size-72 rounded-full blur-3xl"
        style={{ background: dark ? 'rgba(255,255,255,0.055)' : 'rgba(242,176,69,0.16)' }}
      />

      <div className="relative flex h-full flex-col justify-between">
        <div>
          <BrandMark dark={dark} />

          <div className="mt-16 max-w-[440px]">
            <div
              className="mb-5 inline-flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-bold uppercase tracking-[0.13em]"
              style={{
                color: '#F2B045',
                background: 'rgba(242,176,69,0.10)',
                border: '1px solid rgba(242,176,69,0.18)',
              }}
            >
              <ShieldCheck size={15} />
              ERP seguro multi-empresa
            </div>

            <h2 className="text-[42px] font-black leading-[0.98] tracking-[-0.055em] text-white">
              Gestiona tu operación desde un solo lugar.
            </h2>
            <p className="mt-5 max-w-[380px] text-[15px] leading-7 text-white/48">
              Control de activos, usuarios, técnicos y módulos en una experiencia rápida, ordenada y lista para tus clientes.
            </p>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-3 gap-3">
            {modules.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-3xl p-4"
                  style={{
                    background: 'rgba(255,255,255,0.075)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                  }}
                >
                  <Icon size={18} className="text-[#F2B045]" />
                  <div className="mt-5 text-2xl font-black tracking-[-0.04em] text-white">{item.value}</div>
                  <div className="mt-1 text-[12px] font-semibold text-white/38">{item.label}</div>
                </div>
              );
            })}
          </div>

          <div
            className="mt-4 flex items-start gap-3 rounded-3xl p-4"
            style={{
              background: 'linear-gradient(135deg, rgba(242,176,69,0.16), rgba(255,255,255,0.06))',
              border: '1px solid rgba(242,176,69,0.22)',
            }}
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#F2B045]" />
            <p className="text-[13px] leading-6 text-white/58">
              Acceso protegido, interfaz adaptable y diseño pensado para generar confianza desde el primer ingreso.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const { login, sessionMessage } = useAuth();
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';

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
    <main className="relative min-h-screen overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
      <Background dark={dark} />
      <ThemeToggle dark={dark} onClick={toggle} />

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <ProductPreview dark={dark} />

        <div className="mx-auto flex w-full max-w-[440px] flex-col">
          <div className="mb-8 flex items-center justify-between gap-4 lg:hidden">
            <BrandMark dark={dark} compact />
            <SystemBadge dark={dark} />
          </div>

          <div
            className="relative overflow-hidden rounded-[2rem] p-6 shadow-2xl sm:p-8"
            style={{
              background: dark ? 'rgba(12,12,17,0.72)' : 'rgba(255,255,255,0.78)',
              border: `1px solid ${dark ? 'rgba(255,255,255,0.11)' : 'rgba(18,18,24,0.10)'}`,
              boxShadow: dark
                ? '0 28px 90px rgba(0,0,0,0.44), inset 0 1px 0 rgba(255,255,255,0.045)'
                : '0 28px 90px rgba(25,22,16,0.14), inset 0 1px 0 rgba(255,255,255,0.70)',
              backdropFilter: 'blur(26px)',
            }}
          >
            <div
              aria-hidden
              className="absolute left-6 right-6 top-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(242,176,69,0.58), transparent)' }}
            />

            <div className="hidden lg:block">
              <BrandMark dark={dark} compact />
            </div>

            <div className="mt-8">
              <p
                className="mb-3 text-[12px] font-black uppercase tracking-[0.18em]"
                style={{ color: '#C78325' }}
              >
                Acceso de clientes
              </p>
              <h1
                className="text-[34px] font-black leading-none tracking-[-0.055em] sm:text-[38px]"
                style={{ color: dark ? 'rgba(255,255,255,0.96)' : '#111116' }}
              >
                Ingresa a tu panel
              </h1>
              <p
                className="mt-4 text-[14px] leading-6"
                style={{ color: dark ? 'rgba(255,255,255,0.48)' : 'rgba(18,18,24,0.58)' }}
              >
                Administra tu empresa, módulos, usuarios y activos desde FB Core.
              </p>
            </div>

            {sessionMessage && (
              <div
                className="mt-6 flex items-start gap-3 rounded-2xl p-4 text-[13px] leading-5"
                style={{
                  background: dark ? 'rgba(239,68,68,0.105)' : 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.22)',
                  color: dark ? '#FDA4A4' : '#B91C1C',
                }}
              >
                <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                <span>{sessionMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
              <Field
                id="login-id"
                label="Correo electrónico o RUT"
                value={identifier}
                onChange={handleIdentifierChange}
                placeholder="correo@empresa.com"
                autoComplete="username"
                dark={dark}
                icon={<Mail size={18} strokeWidth={2} />}
              />

              <PasswordField
                id="login-password"
                label="Contraseña"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                dark={dark}
                right={
                  <Link
                    to="/forgot-password"
                    className="text-[12px] font-bold transition hover:opacity-80"
                    style={{ color: dark ? '#F2B045' : '#9A5A0B' }}
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                }
              />

              <button
                type="submit"
                disabled={loading}
                className="group flex h-13 w-full items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-black transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
                style={{
                  background: 'linear-gradient(135deg, #F7C76E 0%, #F2B045 42%, #D98B16 100%)',
                  color: '#171006',
                  boxShadow: dark
                    ? '0 18px 42px rgba(242,176,69,0.22), inset 0 1px 0 rgba(255,255,255,0.30)'
                    : '0 18px 42px rgba(184,108,13,0.26), inset 0 1px 0 rgba(255,255,255,0.46)',
                }}
              >
                {loading ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-[#171006]/25 border-t-[#171006]" />
                    Ingresando…
                  </>
                ) : (
                  <>
                    Ingresar ahora
                    <ArrowRight size={17} strokeWidth={2.5} className="transition group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1" style={{ background: dark ? 'rgba(255,255,255,0.09)' : 'rgba(18,18,24,0.10)' }} />
              <span
                className="text-[12px] font-semibold"
                style={{ color: dark ? 'rgba(255,255,255,0.36)' : 'rgba(18,18,24,0.45)' }}
              >
                ¿Empresa nueva?
              </span>
              <div className="h-px flex-1" style={{ background: dark ? 'rgba(255,255,255,0.09)' : 'rgba(18,18,24,0.10)' }} />
            </div>

            <Link
              to="/register"
              className="flex h-12 w-full items-center justify-center rounded-2xl text-[14px] font-black transition duration-200 hover:-translate-y-0.5"
              style={{
                background: dark ? 'rgba(255,255,255,0.065)' : 'rgba(18,18,24,0.045)',
                border: `1px solid ${dark ? 'rgba(255,255,255,0.10)' : 'rgba(18,18,24,0.10)'}`,
                color: dark ? 'rgba(255,255,255,0.78)' : '#19191F',
              }}
            >
              Crear empresa gratis
            </Link>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 px-1">
            <SystemBadge dark={dark} />
            <p
              className="hidden text-right text-[12px] font-medium sm:block"
              style={{ color: dark ? 'rgba(255,255,255,0.30)' : 'rgba(18,18,24,0.42)' }}
            >
              © {new Date().getFullYear()} FBSystems
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
