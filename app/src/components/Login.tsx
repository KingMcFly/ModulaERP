import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { cleanRut, formatRut, looksLikeRut, validateRut } from '../utils/rut';

// ── Dark-glass input with amber focus glow ────────────────────────────────────
function Field({
  id, label, type = 'text', value, onChange, placeholder, autoComplete, children,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder: string; autoComplete: string;
  children?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="flex items-center justify-between">
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
          {label}
        </span>
        {children}
      </label>
      <div
        className="relative flex items-center rounded-xl overflow-hidden transition-all duration-200"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${focused ? 'rgba(242,176,69,0.55)' : 'rgba(255,255,255,0.08)'}`,
          boxShadow: focused ? '0 0 0 3px rgba(242,176,69,0.10)' : 'none',
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
          className="w-full bg-transparent py-3 px-4 text-sm outline-none placeholder:text-[rgba(255,255,255,0.18)]"
          style={{ color: 'rgba(255,255,255,0.88)' }}
        />
      </div>
    </div>
  );
}

// ── Password field variant ─────────────────────────────────────────────────────
function PasswordField({
  id, label, value, onChange, placeholder, autoComplete, forgotLink,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  placeholder: string; autoComplete: string; forgotLink?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const [show, setShow]       = useState(false);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="flex items-center justify-between">
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
          {label}
        </span>
        {forgotLink}
      </label>
      <div
        className="relative flex items-center rounded-xl overflow-hidden transition-all duration-200"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${focused ? 'rgba(242,176,69,0.55)' : 'rgba(255,255,255,0.08)'}`,
          boxShadow: focused ? '0 0 0 3px rgba(242,176,69,0.10)' : 'none',
        }}
      >
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full bg-transparent py-3 pl-4 pr-12 text-sm outline-none placeholder:text-[rgba(255,255,255,0.18)]"
          style={{ color: 'rgba(255,255,255,0.88)' }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          aria-label={show ? 'Ocultar' : 'Mostrar'}
          className="absolute right-3 p-1.5 rounded-lg transition-colors"
          style={{ color: 'rgba(255,255,255,0.25)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.60)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

// ── Logo with blend ───────────────────────────────────────────────────────────
function Logo() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Amber glow behind the logo so las letras brillen */}
      <div
        aria-hidden="true"
        className="absolute"
        style={{
          width: 320, height: 120,
          background: 'radial-gradient(ellipse, rgba(242,176,69,0.18) 0%, transparent 70%)',
          filter: 'blur(12px)',
        }}
      />
      <img
        src="/logo.png"
        alt="FB Core"
        draggable={false}
        style={{
          width: 220,
          position: 'relative',
          mixBlendMode: 'lighten',
          userSelect: 'none',
        }}
      />
    </div>
  );
}

// ── Noise / grain overlay ──────────────────────────────────────────────────────
const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`;

export default function Login() {
  const { login, sessionMessage } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [loading, setLoading]       = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

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
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4" style={{ background: '#0D0D12' }}>

      {/* Grain texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{ backgroundImage: NOISE_SVG, backgroundRepeat: 'repeat', backgroundSize: '128px 128px' }}
      />

      {/* Ambient glow — top right */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed"
        style={{
          top: -200, right: -200, width: 700, height: 700,
          background: 'radial-gradient(circle, rgba(242,176,69,0.07) 0%, transparent 60%)',
        }}
      />
      {/* Ambient glow — bottom left */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed"
        style={{
          bottom: -200, left: -200, width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(242,176,69,0.04) 0%, transparent 60%)',
        }}
      />

      {/* ── Content ── */}
      <div className="relative z-10 w-full max-w-[400px] flex flex-col items-center">

        {/* Logo */}
        <Logo />

        {/* Subtitle */}
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Ingresa a tu espacio de trabajo
        </p>

        {/* Session replaced banner */}
        {sessionMessage && (
          <div
            className="w-full mt-6 flex items-start gap-3 rounded-2xl p-4 text-[13px]"
            style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', color: '#f87171' }}
          >
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>{sessionMessage}</span>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="w-full mt-8 space-y-4"
        >
          <Field
            id="login-id"
            label="Correo electrónico o RUT"
            value={identifier}
            onChange={handleIdentifierChange}
            placeholder="correo@empresa.com o 12.345.678-9"
            autoComplete="username"
          />

          <PasswordField
            id="login-password"
            label="Contraseña"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="current-password"
            forgotLink={
              <Link
                to="/forgot-password"
                className="text-[11px] font-semibold transition-colors"
                style={{ color: 'rgba(242,176,69,0.70)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#F2B045')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(242,176,69,0.70)')}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            }
          />

          <div className="pt-1">
            <button
              ref={btnRef}
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-[13.5px] transition-all duration-150 disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, #F2B045 0%, #C8831A 100%)',
                color: '#0D0D12',
                boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset, 0 4px 20px rgba(242,176,69,0.25)',
              }}
              onMouseEnter={e => {
                if (loading) return;
                Object.assign((e.currentTarget as HTMLButtonElement).style, {
                  boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset, 0 6px 28px rgba(242,176,69,0.40)',
                  transform: 'translateY(-1px)',
                });
              }}
              onMouseLeave={e => {
                Object.assign((e.currentTarget as HTMLButtonElement).style, {
                  boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset, 0 4px 20px rgba(242,176,69,0.25)',
                  transform: '',
                });
              }}
              onMouseDown={e  => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)'; }}
              onMouseUp={e    => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 border-2 border-[#0D0D12]/30 border-t-[#0D0D12] rounded-full animate-spin" />
                  Ingresando…
                </span>
              ) : (
                <>Ingresar <ArrowRight size={15} /></>
              )}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="w-full my-7 flex items-center gap-4">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.20)' }}>¿Empresa nueva?</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>

        {/* Register CTA */}
        <Link
          to="/register"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-150"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.65)',
          }}
          onMouseEnter={e => {
            Object.assign((e.currentTarget as HTMLAnchorElement).style, {
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.88)',
            });
          }}
          onMouseLeave={e => {
            Object.assign((e.currentTarget as HTMLAnchorElement).style, {
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.65)',
            });
          }}
        >
          Crea tu empresa gratis
        </Link>

        {/* Footer */}
        <Link
          to="/status"
          className="mt-8 flex items-center gap-1.5 text-[11.5px] transition-colors"
          style={{ color: 'rgba(255,255,255,0.20)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.20)')}
        >
          <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
          Estado del sistema
        </Link>
      </div>
    </div>
  );
}
