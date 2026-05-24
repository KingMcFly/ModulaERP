import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, AlertTriangle, ArrowRight, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { cleanRut, formatRut, looksLikeRut, validateRut } from '../utils/rut';

// ── Input field ───────────────────────────────────────────────────────────────
function Field({
  id, label, type = 'text', value, onChange, placeholder, autoComplete, dark, right,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder: string; autoComplete: string;
  dark: boolean; right?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: dark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.38)',
        }}>
          {label}
        </label>
        {right}
      </div>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full rounded-2xl text-sm outline-none transition-all duration-200"
        style={{
          padding: '13px 16px',
          background: dark
            ? focused ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)'
            : focused ? '#fff' : 'rgba(255,255,255,0.75)',
          border: `1.5px solid ${
            focused
              ? 'rgba(242,176,69,0.55)'
              : dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
          }`,
          boxShadow: focused
            ? '0 0 0 3px rgba(242,176,69,0.10)'
            : dark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
          color: dark ? 'rgba(255,255,255,0.90)' : '#0D0D12',
          backdropFilter: 'blur(12px)',
        }}
      />
    </div>
  );
}

// ── Password field ────────────────────────────────────────────────────────────
function PasswordField({
  id, label, value, onChange, autoComplete, dark, right,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  autoComplete: string; dark: boolean; right?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: dark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.38)',
        }}>
          {label}
        </label>
        {right}
      </div>
      <div className="relative" style={{ transition: 'all 200ms' }}>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="••••••••"
          autoComplete={autoComplete}
          required
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full rounded-2xl text-sm outline-none transition-all duration-200"
          style={{
            padding: '13px 48px 13px 16px',
            background: dark
              ? focused ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)'
              : focused ? '#fff' : 'rgba(255,255,255,0.75)',
            border: `1.5px solid ${
              focused
                ? 'rgba(242,176,69,0.55)'
                : dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
            }`,
            boxShadow: focused
              ? '0 0 0 3px rgba(242,176,69,0.10)'
              : dark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
            color: dark ? 'rgba(255,255,255,0.90)' : '#0D0D12',
            backdropFilter: 'blur(12px)',
          }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
          style={{ color: dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.28)' }}
          onMouseEnter={e => (e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.60)' : 'rgba(0,0,0,0.55)')}
          onMouseLeave={e => (e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.28)')}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

// ── Theme toggle ──────────────────────────────────────────────────────────────
function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={dark ? 'Modo claro' : 'Modo oscuro'}
      className="fixed top-4 right-4 z-50 size-9 flex items-center justify-center rounded-xl transition-all duration-200"
      style={{
        background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)'}`,
        color: dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)',
        backdropFilter: 'blur(12px)',
      }}
      onMouseEnter={e => Object.assign(e.currentTarget.style, {
        background: dark ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.09)',
        color: dark ? 'rgba(255,255,255,0.80)' : 'rgba(0,0,0,0.70)',
      })}
      onMouseLeave={e => Object.assign(e.currentTarget.style, {
        background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        color: dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)',
      })}
    >
      {dark ? <Sun size={15} strokeWidth={1.8} /> : <Moon size={15} strokeWidth={1.8} />}
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Login() {
  const { login, sessionMessage } = useAuth();
  const { theme, toggle }         = useTheme();
  const dark = theme === 'dark';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [loading, setLoading]       = useState(false);

  function handleIdentifierChange(val: string) {
    if (looksLikeRut(val) || looksLikeRut(val.replace(/[.\-]/g, ''))) {
      const clean = cleanRut(val);
      if (clean.length >= 2 && !val.endsWith('-') && !val.endsWith('.')) {
        setIdentifier(formatRut(clean));
        return;
      }
    }
    setIdentifier(val);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = identifier.trim();
    if (!id) { toast.error('Ingresa tu correo o RUT'); return; }
    if (looksLikeRut(id)) {
      if (!validateRut(id)) { toast.error('RUT inválido. Verifica el dígito verificador'); return; }
    }
    setLoading(true);
    try { await login(id, password); }
    catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-5"
      style={{
        background: dark
          ? 'radial-gradient(ellipse 90% 70% at 50% -10%, rgba(242,176,69,0.10) 0%, transparent 60%), #09090F'
          : 'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(242,176,69,0.10) 0%, transparent 60%), #F0F0F6',
      }}
    >
      {/* Subtle bottom glow */}
      <div className="pointer-events-none fixed" style={{
        bottom: -300, left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 500,
        background: dark
          ? 'radial-gradient(ellipse, rgba(242,176,69,0.04) 0%, transparent 70%)'
          : 'radial-gradient(ellipse, rgba(242,176,69,0.06) 0%, transparent 70%)',
      }} />

      <ThemeToggle dark={dark} onToggle={toggle} />

      <div className="relative z-10 w-full max-w-[390px] flex flex-col items-center">

        {/* Heading */}
        <div className="w-full mb-8 text-center">
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: dark ? 'rgba(255,255,255,0.94)' : '#0D0D12', letterSpacing: '-0.03em' }}
          >
            Bienvenido de vuelta
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.42)' }}>
            Ingresa a tu espacio de trabajo
          </p>
        </div>

        {/* Session replaced banner */}
        {sessionMessage && (
          <div
            className="w-full mb-5 flex items-start gap-3 rounded-2xl p-4 text-[13px]"
            style={{
              background: 'rgba(239,68,68,0.10)',
              border: '1px solid rgba(239,68,68,0.20)',
              color: '#f87171',
            }}
          >
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>{sessionMessage}</span>
          </div>
        )}

        {/* Card */}
        <div
          className="w-full rounded-3xl p-7"
          style={{
            background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.80)',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: dark
              ? '0 8px 40px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.07)'
              : '0 4px 24px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Field
              id="login-id"
              label="Correo electrónico o RUT"
              value={identifier}
              onChange={handleIdentifierChange}
              placeholder="correo@empresa.com o 12.345.678-9"
              autoComplete="username"
              dark={dark}
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
                  className="text-[11px] font-semibold transition-colors"
                  style={{ color: dark ? 'rgba(242,176,69,0.60)' : '#B8740A' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#F2A115')}
                  onMouseLeave={e => (e.currentTarget.style.color = dark ? 'rgba(242,176,69,0.60)' : '#B8740A')}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              }
            />

            {/* Submit */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-2xl font-bold text-[14px] transition-all duration-150 disabled:opacity-40"
                style={{
                  padding: '14px',
                  background: 'linear-gradient(135deg, #FFD166 0%, #F0A010 50%, #C8720A 100%)',
                  color: '#1C0E00',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 4px 22px rgba(200,114,10,0.30)',
                }}
                onMouseEnter={e => {
                  if (loading) return;
                  Object.assign(e.currentTarget.style, {
                    boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 30px rgba(200,114,10,0.45)',
                    transform: 'translateY(-1px)',
                  });
                }}
                onMouseLeave={e => Object.assign(e.currentTarget.style, {
                  boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 4px 22px rgba(200,114,10,0.30)',
                  transform: '',
                })}
                onMouseDown={e  => { e.currentTarget.style.transform = 'scale(0.98)'; }}
                onMouseUp={e    => { e.currentTarget.style.transform = ''; }}
              >
                {loading ? (
                  <>
                    <span className="size-4 border-2 border-[#1C0E00]/20 border-t-[#1C0E00] rounded-full animate-spin" />
                    Ingresando…
                  </>
                ) : (
                  <>Ingresar <ArrowRight size={15} strokeWidth={2.2} /></>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Divider */}
        <div className="w-full my-5 flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)' }} />
          <span className="text-[11px]" style={{ color: dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.30)' }}>
            ¿Empresa nueva?
          </span>
          <div className="flex-1 h-px" style={{ background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)' }} />
        </div>

        {/* Register */}
        <Link
          to="/register"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-150"
          style={{
            background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.70)',
            border: `1.5px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            color: dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(12px)',
          }}
          onMouseEnter={e => Object.assign(e.currentTarget.style, {
            background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)',
            color: dark ? 'rgba(255,255,255,0.80)' : '#0D0D12',
          })}
          onMouseLeave={e => Object.assign(e.currentTarget.style, {
            background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.70)',
            color: dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
          })}
        >
          Crea tu empresa gratis
        </Link>

        {/* Logo PNG at the bottom */}
        <div className="mt-12 flex flex-col items-center gap-4">
          <img
            src="/logo.png"
            alt="FB Core"
            style={{
              width: 170,
              borderRadius: 16,
              opacity: dark ? 0.80 : 0.55,
              filter: dark ? 'none' : 'brightness(0.95)',
            }}
          />
          <Link
            to="/status"
            className="flex items-center gap-1.5 text-[11px] transition-colors"
            style={{ color: dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.28)' }}
            onMouseEnter={e => (e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.55)')}
            onMouseLeave={e => (e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.28)')}
          >
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Estado del sistema
          </Link>
        </div>

      </div>
    </div>
  );
}
