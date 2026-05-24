import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Mail, ShieldCheck } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import {
  AuthShell, InfoPanel, FormCard, Brand, Field, PrimaryBtn,
  ErrorBanner, CheckItem, c,
} from './auth-shared';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// ── Left panel ────────────────────────────────────────────────────────────────
function ForgotInfo({ dark }: { dark: boolean }) {
  const col = c(dark);
  return (
    <InfoPanel dark={dark}>
      <Brand dark={dark} />

      <div className="flex flex-1 flex-col justify-center">
        <div className="max-w-[440px]">
          <div
            className="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em]"
            style={{
              background: dark ? '#171B24' : '#FFFFFF',
              borderColor: col.border,
              color: col.accent,
            }}
          >
            <ShieldCheck size={14} strokeWidth={2.2} />
            Recuperación segura
          </div>

          <h2 className="max-w-[420px] text-[38px] font-black leading-[1.02] tracking-[-0.055em]" style={{ color: col.text }}>
            Recupera tu acceso en segundos.
          </h2>

          <p className="mt-5 max-w-[420px] text-[15px] leading-7" style={{ color: col.muted }}>
            Te enviamos un enlace seguro a tu correo. Úsalo para crear una nueva contraseña y volver a ingresar.
          </p>

          <div
            className="mt-10 rounded-2xl border p-5"
            style={{ background: dark ? '#151922' : '#FFFFFF', borderColor: col.border }}
          >
            <p className="mb-4 text-[13px] font-black uppercase tracking-[0.12em]" style={{ color: col.text }}>
              Cómo funciona
            </p>
            <div className="space-y-4">
              <CheckItem dark={dark}>Ingresa el correo asociado a tu cuenta.</CheckItem>
              <CheckItem dark={dark}>Recibirás un enlace de recuperación válido por 1 hora.</CheckItem>
              <CheckItem dark={dark}>Crea tu nueva contraseña de forma segura.</CheckItem>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[12px] leading-5" style={{ color: col.subtle }}>
        Si no encuentras el correo, revisa tu bandeja de spam.
      </p>
    </InfoPanel>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ForgotPassword() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  const col  = c(dark);

  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Error al enviar');
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const formCard = (
    <FormCard dark={dark}>
      <Brand dark={dark} />

      <div className="flex flex-1 flex-col justify-center pt-8 lg:pt-0">
        {done ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-6 grid size-16 place-items-center rounded-2xl" style={{ background: '#22c55e18' }}>
              <CheckCircle2 size={30} style={{ color: '#22c55e' }} />
            </div>
            <h2 className="text-[22px] font-black tracking-[-0.03em]" style={{ color: col.text }}>
              Revisa tu correo
            </h2>
            <p className="mt-3 max-w-[300px] text-[14px] leading-6" style={{ color: col.muted }}>
              Si el correo <strong style={{ color: col.text }}>{email}</strong> existe en el sistema, recibirás instrucciones para restablecer tu contraseña.
            </p>
            <div className="mt-8 w-full">
              <Link
                to="/login"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-black transition hover:-translate-y-0.5"
                style={{ background: col.accent, color: col.accentText }}
              >
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <Link
                to="/login"
                className="mb-6 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-bold transition hover:-translate-y-0.5"
                style={{ background: col.cardAlt, borderColor: col.border, color: col.muted }}
              >
                <ArrowLeft size={14} strokeWidth={2.2} />
                Volver al login
              </Link>

              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: col.accent }}>
                Recuperar acceso
              </p>
              <h1 className="text-[31px] font-black leading-tight tracking-[-0.045em]" style={{ color: col.text }}>
                ¿Olvidaste tu contraseña?
              </h1>
              <p className="mt-3 text-[14px] leading-6" style={{ color: col.muted }}>
                Ingresa tu correo y te enviamos un enlace de recuperación.
              </p>
            </div>

            {error && <div className="mb-5"><ErrorBanner dark={dark} message={error} /></div>}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <Field
                id="forgot-email"
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="correo@empresa.com"
                autoComplete="email"
                dark={dark}
                icon={<Mail size={17} strokeWidth={2.1} />}
              />

              <PrimaryBtn type="submit" dark={dark} loading={loading} loadingText="Enviando…" disabled={!email.trim()}>
                Enviar instrucciones
              </PrimaryBtn>
            </form>
          </>
        )}
      </div>
    </FormCard>
  );

  return (
    <AuthShell
      dark={dark}
      toggle={toggle}
      left={<ForgotInfo dark={dark} />}
      right={formCard}
    />
  );
}
