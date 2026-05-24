import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, AlertTriangle, ArrowRight, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { cleanRut, formatRut, looksLikeRut, validateRut } from '../utils/rut';

// ── Concentric rings — ambient background motif ───────────────────────────────
function Rings({ dark }: { dark: boolean }) {
  const sizes = [160, 280, 420, 580, 760, 960];
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden"
    >
      {/* Central amber pulse */}
      <div
        className="absolute rounded-full"
        style={{
          width: 220,
          height: 220,
          background: dark
            ? 'radial-gradient(circle, rgba(242,176,69,0.09) 0%, transparent 72%)'
            : 'radial-gradient(circle, rgba(200,114,10,0.08) 0%, transparent 72%)',
        }}
      />
      {/* Rings */}
      {sizes.map((s, i) => (
        <div
          key={s}
          className="absolute rounded-full"
          style={{
            width: s,
            height: s,
            border: `1px solid ${
              dark
                ? `rgba(242,176,69,${(0.10 - i * 0.014).toFixed(3)})`
                : `rgba(200,114,10,${(0.08 - i * 0.012).toFixed(3)})`
            }`,
          }}
        />
      ))}
    </div>
  );
}

// ── Floating input ────────────────────────────────────────────────────────────
function Field({
  id, label, type = 'text', value, onChange, placeholder, autoComplete, dark, right,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder: string; autoComplete: string;
  dark: boolean; right?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor={id}
          style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: dark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.36)',
          }}
        >
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
        className="w-full text-sm outline-none transition-all duration-200"
        style={{
          padding: '12px 15px',
          borderRadius: 14,
          background: dark
            ? focused ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)'
            : focused ? '#fff' : 'rgba(255,255,255,0.65)',
          border: `1.5px solid ${
            focused
              ? 'rgba(242,176,69,0.50)'
              : dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'
          }`,
          boxShadow: focused
            ? '0 0 0 3.5px rgba(242,176,69,0.09)'
            : dark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
          color: dark ? 'rgba(255,255,255,0.88)' : '#0D0D12',
        }}
      />
    </div>
  );
}

// ── Floating password ─────────────────────────────────────────────────────────
function PasswordField({
  id, label, value, onChange, autoComplete, dark, right,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  autoComplete: string; dark: boolean; right?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const [show, setShow]       = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor={id}
          style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: dark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.36)',
          }}
        >
          {label}
        </label>
        {right}
      </div>
      <div className="relative">
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
          className="w-full text-sm outline-none transition-all duration-200"
          style={{
            padding: '12px 44px 12px 15px',
            borderRadius: 14,
            background: dark
              ? focused ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)'
              : focused ? '#fff' : 'rgba(255,255,255,0.65)',
            border: `1.5px solid ${
              focused
                ? 'rgba(242,176,69,0.50)'
                : dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'
            }`,
            boxShadow: focused
              ? '0 0 0 3.5px rgba(242,176,69,0.09)'
              : dark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
            color: dark ? 'rgba(255,255,255,0.88)' : '#0D0D12',
          }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          aria-label={show ? 'Ocultar' : 'Mostrar'}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
          style={{ color: dark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.25)' }}
          onMouseEnter={e => (e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)')}
          onMouseLeave={e => (e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.25)')}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
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
      if (clean.length >= 2 && !val.endsWith('-') && !val.endsWith('.'))
        return setIdentifier(formatRut(clean));
    }
    setIdentifier(val);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = identifier.trim();
    if (!id)            { toast.error('Ingresa tu correo o RUT'); return; }
    if (looksLikeRut(id) && !validateRut(id))
                        { toast.error('RUT inválido'); return; }
    setLoading(true);
    try   { await login(id, password); }
    catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-5"
      style={{ background: dark ? '#08080E' : '#EBEBF2' }}
    >
      {/* Background rings */}
      <Rings dark={dark} />

      {/* Top ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed"
        style={{
          top: -180, left: '50%', transform: 'translateX(-50%)',
          width: 700, height: 500,
          background: dark
            ? 'radial-gradient(ellipse, rgba(242,176,69,0.07) 0%, transparent 65%)'
            : 'radial-gradient(ellipse, rgba(200,114,10,0.07) 0%, transparent 65%)',
        }}
      />

      {/* Theme toggle */}
      <button
        type="button"
        onClick={toggle}
        aria-label={dark ? 'Modo claro' : 'Modo oscuro'}
        className="fixed top-4 right-4 z-50 size-9 flex items-center justify-center rounded-xl transition-all duration-200"
        style={{
          background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)'}`,
          color: dark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.38)',
        }}
        onMouseEnter={e => Object.assign(e.currentTarget.style, {
          background: dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.09)',
          color: dark ? 'rgba(255,255,255,0.80)' : 'rgba(0,0,0,0.70)',
        })}
        onMouseLeave={e => Object.assign(e.currentTarget.style, {
          background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          color: dark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.38)',
        })}
      >
        {dark ? <Sun size={15} strokeWidth={1.8} /> : <Moon size={15} strokeWidth={1.8} />}
      </button>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[380px] flex flex-col items-center">

        {/* Brand pill */}
        <div
          className="mb-6 flex items-center gap-2 rounded-full px-3.5 py-1.5"
          style={{
            background: dark ? 'rgba(242,176,69,0.10)' : 'rgba(200,114,10,0.09)',
            border: `1px solid ${dark ? 'rgba(242,176,69,0.22)' : 'rgba(200,114,10,0.18)'}`,
          }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ background: '#F2B045' }}
          />
          <span
            style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: dark ? '#F2B045' : '#A06010',
            }}
          >
            FB Core
          </span>
        </div>

        {/* Heading */}
        <h1
          className="text-center"
          style={{
            fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em',
            color: dark ? 'rgba(255,255,255,0.95)' : '#0D0D12',
            lineHeight: 1.12,
          }}
        >
          Bienvenido de vuelta
        </h1>
        <p
          className="mt-2.5 text-center text-sm"
          style={{ color: dark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.40)' }}
        >
          Ingresa a tu espacio de trabajo
        </p>

        {/* Session replaced banner */}
        {sessionMessage && (
          <div
            className="w-full mt-6 flex items-start gap-3 rounded-2xl p-3.5 text-[13px]"
            style={{
              background: 'rgba(239,68,68,0.10)',
              border: '1px solid rgba(239,68,68,0.20)',
              color: '#f87171',
            }}
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{sessionMessage}</span>
          </div>
        )}

        {/* Form — no card, floating fields */}
        <form onSubmit={handleSubmit} noValidate className="w-full mt-8 space-y-4">
          <Field
            id="login-id"
            label="Correo electrónico o RUT"
            value={identifier}
            onChange={handleIdentifierChange}
            placeholder="correo@empresa.com"
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
                style={{ fontSize: 10.5, fontWeight: 600, color: dark ? 'rgba(242,176,69,0.58)' : '#A06010' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#F2A115')}
                onMouseLeave={e => (e.currentTarget.style.color = dark ? 'rgba(242,176,69,0.58)' : '#A06010')}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            }
          />

          {/* Submit */}
          <div className="pt-1.5">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 font-bold text-[13.5px] transition-all duration-150 disabled:opacity-40"
              style={{
                padding: '13.5px',
                borderRadius: 14,
                background: '#F2B045',
                color: '#180D00',
                boxShadow: dark
                  ? '0 0 0 1px rgba(242,176,69,0.18), 0 4px 24px rgba(242,176,69,0.20)'
                  : '0 1px 0 rgba(255,255,255,0.22) inset, 0 4px 18px rgba(180,100,0,0.22)',
              }}
              onMouseEnter={e => {
                if (loading) return;
                Object.assign(e.currentTarget.style, {
                  background: '#EDAB3A',
                  transform: 'translateY(-1px)',
                  boxShadow: dark
                    ? '0 0 0 1px rgba(242,176,69,0.24), 0 8px 32px rgba(242,176,69,0.32)'
                    : '0 1px 0 rgba(255,255,255,0.22) inset, 0 8px 28px rgba(180,100,0,0.30)',
                });
              }}
              onMouseLeave={e => Object.assign(e.currentTarget.style, {
                background: '#F2B045',
                transform: '',
                boxShadow: dark
                  ? '0 0 0 1px rgba(242,176,69,0.18), 0 4px 24px rgba(242,176,69,0.20)'
                  : '0 1px 0 rgba(255,255,255,0.22) inset, 0 4px 18px rgba(180,100,0,0.22)',
              })}
              onMouseDown={e  => { e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={e    => { e.currentTarget.style.transform = ''; }}
            >
              {loading ? (
                <>
                  <span className="size-4 border-2 border-[#180D00]/20 border-t-[#180D00] rounded-full animate-spin" />
                  Ingresando…
                </>
              ) : (
                <>Ingresar <ArrowRight size={15} strokeWidth={2.2} /></>
              )}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="w-full mt-7 mb-4 flex items-center gap-3.5">
          <div className="flex-1 h-px" style={{ background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)' }} />
          <span style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.30)' }}>
            ¿Empresa nueva?
          </span>
          <div className="flex-1 h-px" style={{ background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)' }} />
        </div>

        {/* Register */}
        <Link
          to="/register"
          className="w-full flex items-center justify-center py-3.5 rounded-2xl text-sm font-semibold transition-all duration-150"
          style={{
            background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.60)',
            border: `1.5px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'}`,
            color: dark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.40)',
          }}
          onMouseEnter={e => Object.assign(e.currentTarget.style, {
            background: dark ? 'rgba(255,255,255,0.08)' : '#fff',
            color: dark ? 'rgba(255,255,255,0.75)' : '#0D0D12',
          })}
          onMouseLeave={e => Object.assign(e.currentTarget.style, {
            background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.60)',
            color: dark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.40)',
          })}
        >
          Crea tu empresa gratis
        </Link>

        {/* Logo PNG — bottom, rounded corners */}
        <div className="mt-14 mb-2 flex flex-col items-center gap-3.5">
          <img
            src="/logo.png"
            alt="FB Core"
            style={{
              width: 160,
              borderRadius: 14,
              opacity: dark ? 0.75 : 0.50,
              filter: !dark ? 'brightness(0.92) saturate(0.9)' : 'none',
            }}
          />
          <Link
            to="/status"
            className="flex items-center gap-1.5 text-[10.5px] transition-colors"
            style={{ color: dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.26)' }}
            onMouseEnter={e => (e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.50)')}
            onMouseLeave={e => (e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.26)')}
          >
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Estado del sistema
          </Link>
        </div>

      </div>
    </div>
  );
}
