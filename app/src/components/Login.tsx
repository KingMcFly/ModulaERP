import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, AlertTriangle, ArrowRight, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { cleanRut, formatRut, looksLikeRut, validateRut } from '../utils/rut';

// ── Logo — fiel al PNG ────────────────────────────────────────────────────────
function Logo({ dark }: { dark: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2.5 select-none">
      {/* Wordmark */}
      <div className="flex items-baseline" style={{ lineHeight: 1 }}>
        <span
          style={{
            fontFamily: '"Plus Jakarta Sans", system-ui',
            fontSize: 56,
            fontWeight: 900,
            letterSpacing: '-0.04em',
            background: 'linear-gradient(135deg, #FFD166 0%, #F2A115 55%, #C8720A 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: dark
              ? 'drop-shadow(0 0 18px rgba(242,176,69,0.45))'
              : 'drop-shadow(0 2px 6px rgba(180,100,0,0.18))',
          }}
        >
          FB
        </span>
        <span
          style={{
            fontFamily: '"Plus Jakarta Sans", system-ui',
            fontSize: 56,
            fontWeight: 300,
            letterSpacing: '-0.03em',
            marginLeft: 8,
            color: dark ? 'rgba(255,255,255,0.92)' : '#1A1A1E',
          }}
        >
          Core
        </span>
      </div>

      {/* Byline — matches the "— by FB Systems —" del PNG */}
      <div className="flex items-center gap-2">
        <div
          style={{
            width: 30, height: 1.5, borderRadius: 1,
            background: `linear-gradient(90deg, transparent, ${dark ? '#F2A115' : '#C8720A'})`,
            opacity: dark ? 0.7 : 0.5,
          }}
        />
        <span
          style={{
            fontSize: 10,
            letterSpacing: '0.20em',
            textTransform: 'uppercase',
            color: dark ? 'rgba(255,255,255,0.38)' : '#9898A3',
          }}
        >
          by{' '}
          <strong
            style={{
              fontWeight: 800,
              color: dark ? '#F2A115' : '#C8720A',
            }}
          >
            FB
          </strong>{' '}
          Systems
        </span>
        <div
          style={{
            width: 30, height: 1.5, borderRadius: 1,
            background: `linear-gradient(90deg, ${dark ? '#F2A115' : '#C8720A'}, transparent)`,
            opacity: dark ? 0.7 : 0.5,
          }}
        />
      </div>
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
function Field({
  id, label, type = 'text', value, onChange, placeholder, autoComplete, dark, right,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder: string; autoComplete: string;
  dark: boolean; right?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: dark ? 'rgba(255,255,255,0.35)' : '#8E8E93',
          }}
        >
          {label}
        </label>
        {right}
      </div>
      <div
        className="flex items-center rounded-xl overflow-hidden transition-all duration-200"
        style={{
          background: dark ? 'rgba(255,255,255,0.05)' : '#EDEDF2',
          border: `1.5px solid ${
            focused
              ? 'rgba(242,176,69,0.60)'
              : dark ? 'rgba(255,255,255,0.07)' : 'transparent'
          }`,
          boxShadow: focused ? '0 0 0 3px rgba(242,176,69,0.12)' : 'none',
        }}
      >
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
          className="w-full bg-transparent py-3 px-4 text-sm outline-none"
          style={{
            color: dark ? 'rgba(255,255,255,0.88)' : '#0A0A0F',
          }}
        />
      </div>
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: dark ? 'rgba(255,255,255,0.35)' : '#8E8E93',
          }}
        >
          {label}
        </label>
        {right}
      </div>
      <div
        className="relative flex items-center rounded-xl overflow-hidden transition-all duration-200"
        style={{
          background: dark ? 'rgba(255,255,255,0.05)' : '#EDEDF2',
          border: `1.5px solid ${
            focused
              ? 'rgba(242,176,69,0.60)'
              : dark ? 'rgba(255,255,255,0.07)' : 'transparent'
          }`,
          boxShadow: focused ? '0 0 0 3px rgba(242,176,69,0.12)' : 'none',
        }}
      >
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
          className="w-full bg-transparent py-3 pl-4 pr-12 text-sm outline-none"
          style={{ color: dark ? 'rgba(255,255,255,0.88)' : '#0A0A0F' }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-3 p-1.5 rounded-lg transition-colors"
          style={{ color: dark ? 'rgba(255,255,255,0.28)' : '#AEAEB2' }}
          onMouseEnter={e => (e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.65)' : '#65656E')}
          onMouseLeave={e => (e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.28)' : '#AEAEB2')}
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
      aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="flex items-center justify-center rounded-xl size-9 transition-all duration-200"
      style={{
        background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
        color: dark ? 'rgba(255,255,255,0.55)' : '#65656E',
      }}
      onMouseEnter={e => Object.assign((e.currentTarget as HTMLButtonElement).style, {
        background: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.09)',
        color: dark ? 'rgba(255,255,255,0.85)' : '#0A0A0F',
      })}
      onMouseLeave={e => Object.assign((e.currentTarget as HTMLButtonElement).style, {
        background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
        color: dark ? 'rgba(255,255,255,0.55)' : '#65656E',
      })}
    >
      {dark
        ? <Sun  size={15} strokeWidth={2} />
        : <Moon size={15} strokeWidth={2} />
      }
    </button>
  );
}

// ── Background decorations ────────────────────────────────────────────────────
function BgDecor({ dark }: { dark: boolean }) {
  if (!dark) return (
    <>
      <div className="pointer-events-none fixed" style={{ top: -180, right: -180, width: 600, height: 600, background: 'radial-gradient(circle, rgba(242,176,69,0.08) 0%, transparent 60%)' }} />
      <div className="pointer-events-none fixed" style={{ bottom: -150, left: -150, width: 500, height: 500, background: 'radial-gradient(circle, rgba(242,176,69,0.05) 0%, transparent 60%)' }} />
    </>
  );
  return (
    <>
      <div className="pointer-events-none fixed" style={{ top: -200, right: -200, width: 700, height: 700, background: 'radial-gradient(circle, rgba(242,176,69,0.07) 0%, transparent 60%)' }} />
      <div className="pointer-events-none fixed" style={{ bottom: -200, left: -200, width: 600, height: 600, background: 'radial-gradient(circle, rgba(242,176,69,0.04) 0%, transparent 60%)' }} />
    </>
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
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 transition-colors duration-300"
      style={{ background: dark ? '#0D0D12' : '#F0F0F5' }}
    >
      <BgDecor dark={dark} />

      {/* Theme toggle — top right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle dark={dark} onToggle={toggle} />
      </div>

      <div className="relative z-10 w-full max-w-[400px] flex flex-col items-center">

        {/* Logo */}
        <Logo dark={dark} />

        {/* Subtitle */}
        <p
          className="mt-3 text-sm"
          style={{ color: dark ? 'rgba(255,255,255,0.35)' : '#9898A3' }}
        >
          Ingresa a tu espacio de trabajo
        </p>

        {/* Session replaced banner */}
        {sessionMessage && (
          <div
            className="w-full mt-6 flex items-start gap-3 rounded-2xl p-4 text-[13px]"
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

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="w-full mt-8 space-y-4">

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
                style={{ color: dark ? 'rgba(242,176,69,0.65)' : '#C8820A' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#F2A115')}
                onMouseLeave={e => (e.currentTarget.style.color = dark ? 'rgba(242,176,69,0.65)' : '#C8820A')}
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
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-[13.5px] transition-all duration-150 disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, #FFD166 0%, #F2A115 50%, #C8720A 100%)',
                color: '#1A0F00',
                boxShadow: dark
                  ? '0 1px 0 rgba(255,255,255,0.10) inset, 0 4px 20px rgba(242,176,69,0.28)'
                  : '0 1px 0 rgba(255,255,255,0.18) inset, 0 4px 16px rgba(200,114,10,0.22)',
              }}
              onMouseEnter={e => {
                if (loading) return;
                Object.assign((e.currentTarget as HTMLButtonElement).style, {
                  boxShadow: dark
                    ? '0 1px 0 rgba(255,255,255,0.10) inset, 0 6px 28px rgba(242,176,69,0.42)'
                    : '0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 24px rgba(200,114,10,0.34)',
                  transform: 'translateY(-1px)',
                });
              }}
              onMouseLeave={e => {
                Object.assign((e.currentTarget as HTMLButtonElement).style, {
                  boxShadow: dark
                    ? '0 1px 0 rgba(255,255,255,0.10) inset, 0 4px 20px rgba(242,176,69,0.28)'
                    : '0 1px 0 rgba(255,255,255,0.18) inset, 0 4px 16px rgba(200,114,10,0.22)',
                  transform: '',
                });
              }}
              onMouseDown={e  => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)'; }}
              onMouseUp={e    => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
            >
              {loading ? (
                <>
                  <span className="size-4 border-2 border-[#1A0F00]/25 border-t-[#1A0F00] rounded-full animate-spin" />
                  Ingresando…
                </>
              ) : (
                <>Ingresar <ArrowRight size={15} /></>
              )}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="w-full my-7 flex items-center gap-4">
          <div className="flex-1 h-px" style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }} />
          <span className="text-[11px]" style={{ color: dark ? 'rgba(255,255,255,0.20)' : '#AEAEB2' }}>
            ¿Empresa nueva?
          </span>
          <div className="flex-1 h-px" style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }} />
        </div>

        {/* Register CTA */}
        <Link
          to="/register"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-150"
          style={{
            background: dark ? 'rgba(255,255,255,0.05)' : 'white',
            border: `1.5px solid ${dark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)'}`,
            color: dark ? 'rgba(255,255,255,0.60)' : '#65656E',
            boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
          }}
          onMouseEnter={e => Object.assign((e.currentTarget as HTMLAnchorElement).style, {
            background: dark ? 'rgba(255,255,255,0.09)' : '#FAFAFA',
            color: dark ? 'rgba(255,255,255,0.88)' : '#0A0A0F',
          })}
          onMouseLeave={e => Object.assign((e.currentTarget as HTMLAnchorElement).style, {
            background: dark ? 'rgba(255,255,255,0.05)' : 'white',
            color: dark ? 'rgba(255,255,255,0.60)' : '#65656E',
          })}
        >
          Crea tu empresa gratis
        </Link>

        {/* Footer */}
        <Link
          to="/status"
          className="mt-8 flex items-center gap-1.5 text-[11.5px] transition-colors"
          style={{ color: dark ? 'rgba(255,255,255,0.18)' : '#C3C3C8' }}
          onMouseEnter={e => (e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.45)' : '#8E8E93')}
          onMouseLeave={e => (e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.18)' : '#C3C3C8')}
        >
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Estado del sistema
        </Link>
      </div>
    </div>
  );
}
