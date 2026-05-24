import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Building2, Check, CheckCircle2,
  Mail, Package, ArrowRightLeft, Wrench, Users,
  Activity, Truck, ShoppingCart, ClipboardList,
  FileCheck, LifeBuoy, PieChart, Rocket, Server,
  ShieldCheck,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../context/AuthContext';
import {
  AuthShell, InfoPanel, FormCard, Brand, Field, PasswordField,
  PrimaryBtn, SecondaryBtn, ErrorBanner, CheckItem, c,
} from './auth-shared';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

interface Module { code: string; name: string; icon: string; description: string; color: string; }

const ICON_MAP: Record<string, React.ReactNode> = {
  Package:        <Package size={16} />,
  ArrowRightLeft: <ArrowRightLeft size={16} />,
  Wrench:         <Wrench size={16} />,
  Users:          <Users size={16} />,
  Activity:       <Activity size={16} />,
  Truck:          <Truck size={16} />,
  ShoppingCart:   <ShoppingCart size={16} />,
  ClipboardList:  <ClipboardList size={16} />,
  FileCheck:      <FileCheck size={16} />,
  LifeBuoy:       <LifeBuoy size={16} />,
  PieChart:       <PieChart size={16} />,
};

const MANDATORY = ['inventory', 'personnel'];

const PASSWORD_RULES = [
  { re: /.{8,}/,        label: 'Mínimo 8 caracteres' },
  { re: /[A-Z]/,        label: 'Al menos una mayúscula' },
  { re: /[a-z]/,        label: 'Al menos una minúscula' },
  { re: /[0-9]/,        label: 'Al menos un número' },
  { re: /[^A-Za-z0-9]/, label: 'Al menos un carácter especial' },
];

const STEP_LABELS = ['Tu cuenta', 'Tu empresa', 'Módulos'] as const;

// ── Left panel ────────────────────────────────────────────────────────────────
function RegisterInfo({ dark }: { dark: boolean }) {
  const col = c(dark);
  return (
    <InfoPanel dark={dark}>
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
            <Rocket size={14} strokeWidth={2.2} />
            Plan Starter Free
          </div>

          <h2 className="max-w-[420px] text-[38px] font-black leading-[1.02] tracking-[-0.055em]" style={{ color: col.text }}>
            Empieza gratis, sin tarjeta de crédito.
          </h2>

          <p className="mt-5 max-w-[420px] text-[15px] leading-7" style={{ color: col.muted }}>
            Crea tu empresa en minutos y accede a las herramientas que tu equipo necesita para operar con claridad.
          </p>

          <div
            className="mt-10 rounded-2xl border p-5"
            style={{ background: dark ? '#151922' : '#FFFFFF', borderColor: col.border }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Server size={17} style={{ color: col.accent }} />
              <span className="text-[13px] font-black uppercase tracking-[0.12em]" style={{ color: col.text }}>
                Qué incluye
              </span>
            </div>
            <div className="space-y-4">
              <CheckItem dark={dark}>Módulos base: Inventario y Personal.</CheckItem>
              <CheckItem dark={dark}>Hasta 5 usuarios y 30 activos registrados.</CheckItem>
              <CheckItem dark={dark}>2 módulos adicionales de prueba por 30 días.</CheckItem>
              <CheckItem dark={dark}>Sin restricciones de funcionalidades base.</CheckItem>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ShieldCheck size={14} style={{ color: col.subtle }} />
        <p className="text-[12px] leading-5" style={{ color: col.subtle }}>
          Sin compromisos. Cancela cuando quieras.
        </p>
      </div>
    </InfoPanel>
  );
}

// ── Step progress bar ─────────────────────────────────────────────────────────
function StepBar({ step, dark }: { step: number; dark: boolean }) {
  const col = c(dark);
  return (
    <div className="mb-8 flex items-center gap-1">
      {STEP_LABELS.map((label, i) => {
        const s     = i + 1;
        const done  = step > s;
        const active = step === s;
        return (
          <React.Fragment key={s}>
            <div className="flex items-center gap-2">
              <div
                className="grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-black"
                style={{
                  background: done ? '#22c55e' : active ? col.accent : col.border,
                  color: done || active ? (done ? '#fff' : col.accentText) : col.subtle,
                }}
              >
                {done ? <Check size={11} /> : s}
              </div>
              <span
                className="hidden text-[12px] font-bold whitespace-nowrap sm:block"
                style={{ color: active ? col.text : col.subtle }}
              >
                {label}
              </span>
            </div>
            {i < 2 && (
              <div
                className="mx-2 h-px flex-1"
                style={{ background: step > s ? '#22c55e' : col.border }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Register() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const { theme, toggle }  = useTheme();
  const dark = theme === 'dark';
  const col  = c(dark);

  const [step, setStep]                 = useState(1);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [modules, setModules]           = useState<Module[]>([]);

  const [name, setName]                 = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [company, setCompany]           = useState('');
  const [selectedMods, setSelectedMods] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API}/register/modules`)
      .then(r => r.json())
      .then((data: Module[]) => setModules(data.filter(m => !MANDATORY.includes(m.code))))
      .catch(() => {});
  }, []);

  function toggleMod(code: string) {
    setSelectedMods(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : prev.length < 2 ? [...prev, code] : prev
    );
  }

  function validateStep1() {
    if (!name.trim()) return 'Ingresa tu nombre completo';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Correo electrónico inválido';
    for (const rule of PASSWORD_RULES) if (!rule.re.test(password)) return rule.label;
    return '';
  }

  function next() {
    setError('');
    if (step === 1) { const err = validateStep1(); if (err) { setError(err); return; } }
    if (step === 2 && !company.trim()) { setError('Ingresa el nombre de tu empresa'); return; }
    setStep(s => s + 1);
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: name.trim(), email: email.trim(), password,
          company_name: company.trim(), trial_modules: selectedMods,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al crear la empresa'); setLoading(false); return; }
      loginWithToken(data.token, data.user);
      setStep(4);
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
      setLoading(false);
    }
  }

  const passOk = PASSWORD_RULES.every(r => r.re.test(password));

  const formCard = (
    <FormCard dark={dark}>
      <Brand dark={dark} />

      <div className="flex flex-1 flex-col justify-center pt-8 lg:pt-0">
        {step < 4 && (
          <>
            <div className="mb-6">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: col.accent }}>
                Crear cuenta
              </p>
              <h1 className="text-[31px] font-black leading-tight tracking-[-0.045em]" style={{ color: col.text }}>
                {step === 1 ? 'Tus datos personales' : step === 2 ? 'Tu empresa' : 'Elige módulos'}
              </h1>
              <p className="mt-3 text-[14px] leading-6" style={{ color: col.muted }}>
                {step === 1 ? 'Crea tu cuenta de administrador.' : step === 2 ? 'Con qué nombre registramos tu empresa.' : 'Hasta 2 módulos de prueba gratis por 30 días.'}
              </p>
            </div>

            <StepBar step={step} dark={dark} />

            {error && <div className="mb-5"><ErrorBanner dark={dark} message={error} /></div>}
          </>
        )}

        {/* ── Step 1 ── */}
        {step === 1 && (
          <div className="space-y-5">
            <Field id="reg-name" label="Nombre completo" value={name} onChange={setName}
              placeholder="Juan Pérez" autoComplete="name" dark={dark}
              icon={<Users size={17} strokeWidth={2.1} />} />

            <Field id="reg-email" label="Correo electrónico" type="email" value={email} onChange={setEmail}
              placeholder="juan@empresa.com" autoComplete="email" dark={dark}
              icon={<Mail size={17} strokeWidth={2.1} />} />

            <PasswordField id="reg-pass" label="Contraseña" value={password} onChange={setPassword}
              autoComplete="new-password" dark={dark} />

            {password && (
              <div className="space-y-2 pl-1">
                {PASSWORD_RULES.map(rule => (
                  <div key={rule.label} className="flex items-center gap-2">
                    <div
                      className="grid size-4 shrink-0 place-items-center rounded-full"
                      style={{ background: rule.re.test(password) ? '#22c55e' : col.border }}
                    >
                      {rule.re.test(password) && <Check size={8} color="#fff" />}
                    </div>
                    <span className="text-[12px]" style={{ color: rule.re.test(password) ? '#22c55e' : col.subtle }}>
                      {rule.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <PrimaryBtn dark={dark} disabled={!name || !email || !passOk} onClick={next}>
              Continuar <ArrowRight size={16} strokeWidth={2.4} />
            </PrimaryBtn>
          </div>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <div className="space-y-5">
            <Field id="reg-company" label="Nombre de la empresa" value={company} onChange={setCompany}
              placeholder="Mi Empresa Ltda." autoComplete="organization" dark={dark}
              icon={<Building2 size={17} strokeWidth={2.1} />} />

            <div
              className="rounded-xl border p-4"
              style={{ background: dark ? `${col.accent}12` : `${col.accent}10`, borderColor: `${col.accent}33` }}
            >
              <p className="mb-3 text-[12.5px] font-black" style={{ color: col.text }}>Plan Starter Free incluye:</p>
              <div className="space-y-2.5">
                {['Inventario y Personal sin límite de registros', 'Hasta 5 usuarios activos · 30 activos', '2 módulos de prueba por 30 días'].map(t => (
                  <div key={t} className="flex items-center gap-2 text-[12.5px]" style={{ color: col.muted }}>
                    <Check size={12} style={{ color: '#22c55e', flexShrink: 0 }} />
                    {t}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <SecondaryBtn dark={dark} onClick={() => { setError(''); setStep(1); }}>Atrás</SecondaryBtn>
              <PrimaryBtn dark={dark} disabled={!company.trim()} onClick={next}>
                Continuar <ArrowRight size={16} strokeWidth={2.4} />
              </PrimaryBtn>
            </div>
          </div>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="max-h-[280px] space-y-2 overflow-y-auto -mx-1 px-1">
              {modules.length === 0 && (
                <p className="py-8 text-center text-[13px]" style={{ color: col.muted }}>Cargando módulos…</p>
              )}
              {modules.map(mod => {
                const selected = selectedMods.includes(mod.code);
                const disabled = !selected && selectedMods.length >= 2;
                return (
                  <button
                    key={mod.code}
                    type="button"
                    onClick={() => !disabled && toggleMod(mod.code)}
                    disabled={disabled}
                    className="w-full rounded-xl border p-3.5 text-left transition-all"
                    style={{
                      background: selected ? `${col.accent}12` : dark ? col.cardAlt : '#FAFAFA',
                      borderColor: selected ? col.accent : col.border,
                      borderWidth: selected ? 1.5 : 1,
                      opacity: disabled ? 0.35 : 1,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="grid size-9 shrink-0 place-items-center rounded-lg"
                        style={{ background: `${mod.color || '#6366f1'}18`, color: mod.color || '#6366f1' }}
                      >
                        {ICON_MAP[mod.icon] ?? <Package size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold" style={{ color: col.text }}>{mod.name}</p>
                        {mod.description && (
                          <p className="truncate text-[11.5px]" style={{ color: col.subtle }}>{mod.description}</p>
                        )}
                      </div>
                      <div
                        className="grid size-5 shrink-0 place-items-center rounded-full border-2"
                        style={{ borderColor: selected ? col.accent : col.border, background: selected ? col.accent : 'transparent' }}
                      >
                        {selected && <Check size={10} color={dark ? '#17120A' : '#fff'} />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedMods.length > 0 && (
              <p className="text-center text-[12px]" style={{ color: col.subtle }}>
                {selectedMods.length} de 2 seleccionado{selectedMods.length !== 1 ? 's' : ''}
              </p>
            )}

            <div className="flex gap-3">
              <SecondaryBtn dark={dark} onClick={() => { setError(''); setStep(2); }}>Atrás</SecondaryBtn>
              <PrimaryBtn dark={dark} loading={loading} loadingText="Creando cuenta…" onClick={handleSubmit}>
                <Rocket size={15} strokeWidth={2} /> Crear cuenta
              </PrimaryBtn>
            </div>
          </div>
        )}

        {/* ── Step 4: Success ── */}
        {step === 4 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-6 grid size-16 place-items-center rounded-2xl" style={{ background: '#22c55e18' }}>
              <CheckCircle2 size={30} style={{ color: '#22c55e' }} />
            </div>
            <h2 className="text-[22px] font-black tracking-[-0.03em]" style={{ color: col.text }}>¡Todo listo!</h2>
            <p className="mt-2 text-[14px] leading-6" style={{ color: col.muted }}>
              <strong>{company}</strong> está activa con el plan Starter Free.
            </p>
            <div className="mt-8 w-full">
              <PrimaryBtn dark={dark} onClick={() => navigate('/', { replace: true })}>
                Ir al panel <ArrowRight size={16} strokeWidth={2.4} />
              </PrimaryBtn>
            </div>
          </div>
        )}

        {step < 4 && (
          <p className="mt-7 text-center text-[12px] font-semibold" style={{ color: col.subtle }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-black transition hover:underline" style={{ color: col.accent }}>
              Inicia sesión
            </Link>
          </p>
        )}
      </div>
    </FormCard>
  );

  return (
    <AuthShell
      dark={dark}
      toggle={toggle}
      left={<RegisterInfo dark={dark} />}
      right={formCard}
    />
  );
}
