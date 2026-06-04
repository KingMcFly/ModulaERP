import { useState, type ReactNode, type FormEvent } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, ArrowRight, ShieldCheck, CheckCircle2, Server } from 'lucide-react';
import { toast } from 'sonner';

// ── Design tokens (dark only — admin is always dark) ──────────────────────────
const col = {
  page:         '#0F1115',
  card:         '#151922',
  cardAlt:      '#11141B',
  field:        '#171B24',
  fieldHover:   '#1A1F2A',
  border:       '#252B36',
  text:         '#F3F4F6',
  muted:        '#9CA3AF',
  subtle:       '#6B7280',
  accent:       '#C6922B',
  accentHover:  '#B8831F',
  accentText:   '#17120A',
} as const;

// ── Background ────────────────────────────────────────────────────────────────
function PageBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: col.page }} />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.85) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.85) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-48"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.025), transparent)' }}
      />
    </div>
  );
}

// ── Brand ─────────────────────────────────────────────────────────────────────
function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="grid size-11 shrink-0 place-items-center rounded-xl"
        style={{ background: '#1B1E26', border: `1px solid ${col.border}` }}
      >
        <span className="text-[15px] font-black tracking-[-0.08em]" style={{ color: col.accent }}>FB</span>
      </div>
      <div className="leading-none">
        <div className="text-[20px] font-black tracking-[-0.045em]" style={{ color: col.text }}>FB Core</div>
        <div className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.18em]" style={{ color: col.subtle }}>
          by FBSystems
        </div>
      </div>
    </div>
  );
}

// ── Check item ────────────────────────────────────────────────────────────────
function CheckItem({ children }: { children: ReactNode }) {
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

// ── Text field ────────────────────────────────────────────────────────────────
function Field({
  id, label, type = 'text', value, onChange, placeholder, autoComplete, icon,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder: string; autoComplete: string;
  icon: ReactNode;
}) {
  const [focused, setFocused] = useState(false);
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
          boxShadow: focused ? '0 0 0 3px rgba(198,146,43,0.12)' : 'none',
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
          required
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
function PasswordField({
  id, label, value, onChange, autoComplete,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string;
}) {
  const [focused, setFocused] = useState(false);
  const [show, setShow]       = useState(false);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: col.subtle }}>
        {label}
      </label>
      <div
        className="relative flex h-12 items-center rounded-xl border transition"
        style={{
          background: focused ? col.fieldHover : col.field,
          borderColor: focused ? col.accent : col.border,
          boxShadow: focused ? '0 0 0 3px rgba(198,146,43,0.12)' : 'none',
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
          placeholder="••••••••"
          autoComplete={autoComplete}
          required
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="h-full w-full bg-transparent pr-12 text-[14px] font-semibold outline-none placeholder:font-medium"
          style={{ color: col.text }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          aria-label={show ? 'Ocultar' : 'Mostrar'}
          className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg transition"
          style={{ color: col.subtle }}
        >
          {show ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
}

// ── Left info panel ───────────────────────────────────────────────────────────
function InfoPanel() {
  return (
    <aside className="hidden lg:flex">
      <div
        className="flex min-h-[620px] w-full flex-col rounded-3xl border p-8"
        style={{
          background: col.cardAlt,
          borderColor: col.border,
          boxShadow: '0 20px 60px rgba(0,0,0,0.20)',
        }}
      >
        <div className="flex flex-1 flex-col justify-center">
          <div className="max-w-[440px]">
            <div
              className="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em]"
              style={{ background: '#171B24', borderColor: col.border, color: col.accent }}
            >
              <ShieldCheck size={14} strokeWidth={2.2} />
              Acceso restringido
            </div>

            <h2 className="max-w-[420px] text-[38px] font-black leading-[1.02] tracking-[-0.055em]" style={{ color: col.text }}>
              Panel de administración del sistema.
            </h2>

            <p className="mt-5 max-w-[420px] text-[15px] leading-7" style={{ color: col.muted }}>
              Área exclusiva para super administradores. Gestión de empresas, módulos, usuarios y configuración global de FB Core.
            </p>

            <div
              className="mt-10 rounded-2xl border p-5"
              style={{ background: col.card, borderColor: col.border }}
            >
              <div className="mb-4 flex items-center gap-2">
                <Server size={17} style={{ color: col.accent }} />
                <span className="text-[13px] font-black uppercase tracking-[0.12em]" style={{ color: col.text }}>
                  Acceso habilitado para
                </span>
              </div>
              <div className="space-y-4">
                <CheckItem>Gestión y configuración de empresas tenant.</CheckItem>
                <CheckItem>Administración de módulos y planes.</CheckItem>
                <CheckItem>Control de usuarios y permisos globales.</CheckItem>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CheckCircle2 size={14} style={{ color: col.subtle }} />
          <p className="text-[12px] leading-5" style={{ color: col.subtle }}>
            Solo cuentas con rol super_admin pueden ingresar aquí.
          </p>
        </div>
      </div>
    </aside>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
interface Props { onLogin: (email: string, password: string) => Promise<void>; }

export default function Login({ onLogin }: Props) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try { await onLogin(email, password); }
    catch (err: any) { toast.error(err.message || 'Credenciales incorrectas'); }
    finally { setLoading(false); }
  }

  return (
    <main
      className="relative overflow-hidden px-4 py-5 sm:px-6 lg:px-8"
      style={{ minHeight: '100dvh', background: col.page }}
    >
      <PageBackground />

      <section className="relative z-10 mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-6xl flex-col justify-center">
        <div className="grid items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
          <InfoPanel />

          {/* Form card */}
          <div
            className="flex min-h-[auto] w-full flex-col rounded-3xl border p-6 sm:p-8 lg:min-h-[620px]"
            style={{
              background: col.card,
              borderColor: col.border,
              boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
            }}
          >
            <Brand />

            <div className="flex flex-1 flex-col justify-center pt-8 lg:pt-0">
              <div className="mb-8">
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: col.accent }}>
                  Super Admin
                </p>
                <h1 className="text-[31px] font-black leading-tight tracking-[-0.045em]" style={{ color: col.text }}>
                  Accede al panel
                </h1>
                <p className="mt-3 text-[14px] leading-6" style={{ color: col.muted }}>
                  Área exclusiva para administradores del sistema FB Core.
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <Field
                  id="admin-email"
                  label="Correo electrónico"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="admin@fbcore.cloud"
                  autoComplete="email"
                  icon={<Mail size={17} strokeWidth={2.1} />}
                />

                <PasswordField
                  id="admin-password"
                  label="Contraseña"
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  style={{ background: col.accent, color: col.accentText }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = col.accentHover; }}
                  onMouseLeave={e => { e.currentTarget.style.background = col.accent; }}
                >
                  {loading ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80" />
                      Iniciando sesión…
                    </>
                  ) : (
                    <>Ingresar <ArrowRight size={17} strokeWidth={2.4} /></>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="mt-5 px-1">
          <p className="text-[12px] font-medium" style={{ color: col.subtle }}>
            FB Core v1.0 · Panel Super Admin · © {new Date().getFullYear()} FBSystems
          </p>
        </div>
      </section>
    </main>
  );
}
