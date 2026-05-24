import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import {
  AuthShell, InfoPanel, FormCard, Brand, PasswordField, PrimaryBtn,
  ErrorBanner, CheckItem, c,
} from './auth-shared';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const PASSWORD_RULES = [
  { re: /.{8,}/,  label: 'Mínimo 8 caracteres' },
  { re: /[A-Z]/,  label: 'Una mayúscula'        },
  { re: /[0-9]/,  label: 'Un número'            },
];

// ── Left panel ────────────────────────────────────────────────────────────────
function ResetInfo({ dark }: { dark: boolean }) {
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
            Acceso seguro
          </div>

          <h2 className="max-w-[420px] text-[38px] font-black leading-[1.02] tracking-[-0.055em]" style={{ color: col.text }}>
            Crea una contraseña nueva y segura.
          </h2>

          <p className="mt-5 max-w-[420px] text-[15px] leading-7" style={{ color: col.muted }}>
            Elige una contraseña fuerte para mantener tu cuenta protegida. Este enlace es válido por 1 hora.
          </p>

          <div
            className="mt-10 rounded-2xl border p-5"
            style={{ background: dark ? '#151922' : '#FFFFFF', borderColor: col.border }}
          >
            <p className="mb-4 text-[13px] font-black uppercase tracking-[0.12em]" style={{ color: col.text }}>
              Requisitos de seguridad
            </p>
            <div className="space-y-4">
              <CheckItem dark={dark}>Mínimo 8 caracteres de longitud.</CheckItem>
              <CheckItem dark={dark}>Al menos una letra mayúscula.</CheckItem>
              <CheckItem dark={dark}>Al menos un número.</CheckItem>
              <CheckItem dark={dark}>Evita contraseñas usadas anteriormente.</CheckItem>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[12px] leading-5" style={{ color: col.subtle }}>
        Una vez confirmada, se cerrará la sesión en todos los dispositivos.
      </p>
    </InfoPanel>
  );
}

// ── Password strength checker ─────────────────────────────────────────────────
function StrengthBar({ password, dark }: { password: string; dark: boolean }) {
  const col = c(dark);
  if (!password) return null;
  return (
    <div className="space-y-2 pl-1">
      {PASSWORD_RULES.map(rule => (
        <div key={rule.label} className="flex items-center gap-2">
          <div
            className="grid size-4 shrink-0 place-items-center rounded-full"
            style={{ background: rule.re.test(password) ? '#22c55e' : col.border }}
          >
            {rule.re.test(password) && (
              <svg width="8" height="7" viewBox="0 0 8 7" fill="none">
                <path d="M1 3.5l2 2L7 1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className="text-[12px]" style={{ color: rule.re.test(password) ? '#22c55e' : col.subtle }}>
            {rule.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ResetPassword() {
  const { token }  = useParams<{ token: string }>();
  const navigate   = useNavigate();
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  const col  = c(dark);

  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await fetch(`${API}/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Error al restablecer');
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const passOk = PASSWORD_RULES.every(r => r.re.test(password));

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
              ¡Contraseña actualizada!
            </h2>
            <p className="mt-3 text-[14px] leading-6" style={{ color: col.muted }}>
              Serás redirigido al inicio de sesión en unos segundos…
            </p>
            <div className="mt-8 w-full">
              <Link
                to="/login"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-black transition hover:-translate-y-0.5"
                style={{ background: col.accent, color: col.accentText }}
              >
                Ir al inicio de sesión
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: col.accent }}>
                Nueva contraseña
              </p>
              <h1 className="text-[31px] font-black leading-tight tracking-[-0.045em]" style={{ color: col.text }}>
                Elige una contraseña segura
              </h1>
              <p className="mt-3 text-[14px] leading-6" style={{ color: col.muted }}>
                Crea una nueva contraseña para recuperar el acceso a tu cuenta.
              </p>
            </div>

            {error && <div className="mb-5"><ErrorBanner dark={dark} message={error} /></div>}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <PasswordField
                id="reset-password"
                label="Nueva contraseña"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                dark={dark}
              />

              <StrengthBar password={password} dark={dark} />

              <PrimaryBtn type="submit" dark={dark} loading={loading} loadingText="Guardando…" disabled={!passOk}>
                Guardar contraseña
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
      left={<ResetInfo dark={dark} />}
      right={formCard}
    />
  );
}
