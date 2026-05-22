import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Boxes, Eye, EyeOff, Check, ChevronRight, AlertCircle, Rocket,
  Package, ArrowRightLeft, Wrench, Users, Activity,
  Truck, ShoppingCart, ClipboardList, FileCheck, LifeBuoy, PieChart,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
  { re: /.{8,}/, label: 'Mínimo 8 caracteres' },
  { re: /[A-Z]/, label: 'Al menos una mayúscula' },
  { re: /[0-9]/, label: 'Al menos un número' },
];

export default function Register() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  const [step, setStep]                 = useState(1);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [modules, setModules]           = useState<Module[]>([]);

  const [name, setName]                 = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPass, setShowPass]         = useState(false);
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
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : prev.length < 2 ? [...prev, code] : prev
    );
  }

  function validateStep1() {
    if (!name.trim()) return 'Ingresa tu nombre completo';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Correo electrónico inválido';
    for (const rule of PASSWORD_RULES) {
      if (!rule.re.test(password)) return rule.label;
    }
    return '';
  }

  function next() {
    setError('');
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
    }
    if (step === 2 && !company.trim()) {
      setError('Ingresa el nombre de tu empresa');
      return;
    }
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
          user_name: name.trim(),
          email: email.trim(),
          password,
          company_name: company.trim(),
          trial_modules: selectedMods,
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

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#F3F3F7' }}
    >
      {/* Background glow */}
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-60 -right-60 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(242,176,69,0.10) 0%, transparent 65%)' }} />
        <div className="absolute -bottom-60 -left-60 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(242,176,69,0.07) 0%, transparent 65%)' }} />
      </div>

      <div className="w-full max-w-[420px] relative">

        {/* Logo */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-[56px] h-[56px] rounded-[18px] flex items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg, #F2B045 0%, #EDA135 100%)', boxShadow: '0 8px 28px rgba(242,176,69,0.40)' }}>
            <Boxes size={24} style={{ color: '#131316' }} />
          </div>
          <h1 className="text-[22px] font-bold text-[#0A0A0F] tracking-[-0.03em]">Crear cuenta gratis</h1>
          <p className="text-[13px] text-[#9898A3] mt-1">Plan Starter Free · sin tarjeta de crédito</p>
        </div>

        {/* Step bar */}
        {step < 4 && (
          <div className="flex items-center mb-6 px-2">
            {(['Tu cuenta', 'Tu empresa', 'Módulos'] as const).map((label, i) => {
              const s = i + 1;
              const done = step > s;
              const active = step === s;
              return (
                <React.Fragment key={s}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{
                        background: done ? '#22c55e' : active ? '#F2B045' : 'rgba(0,0,0,0.08)',
                        color: done || active ? '#fff' : '#AEAEB2',
                      }}>
                      {done ? <Check size={11} /> : s}
                    </div>
                    <span className="text-[11px] font-medium whitespace-nowrap"
                      style={{ color: active ? '#0A0A0F' : '#AEAEB2' }}>
                      {label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div className="flex-1 h-px mx-2"
                      style={{ background: step > s ? '#22c55e' : 'rgba(0,0,0,0.10)' }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-3xl p-7"
          style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)' }}>

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl p-3 mb-5 text-[13px]"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#ef4444' }}>
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Step 1: Account ─────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="label">Nombre completo</label>
                <input type="text" className="input" placeholder="Juan Pérez"
                  value={name} onChange={e => setName(e.target.value)}
                  autoComplete="name" autoFocus onKeyDown={e => e.key === 'Enter' && next()} />
              </div>
              <div>
                <label className="label">Correo electrónico</label>
                <input type="email" className="input" placeholder="juan@empresa.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  autoComplete="email" onKeyDown={e => e.key === 'Enter' && next()} />
              </div>
              <div>
                <label className="label">Contraseña</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} className="input pr-11" placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password" onKeyDown={e => e.key === 'Enter' && next()} />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#AEAEB2] hover:text-[#65656E]">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {password && (
                  <div className="mt-2.5 space-y-1.5">
                    {PASSWORD_RULES.map(rule => (
                      <div key={rule.label} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: rule.re.test(password) ? '#22c55e' : 'rgba(0,0,0,0.08)' }}>
                          {rule.re.test(password) && <Check size={8} color="#fff" />}
                        </div>
                        <span className="text-[11px]"
                          style={{ color: rule.re.test(password) ? '#22c55e' : '#9898A3' }}>
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <PrimaryButton onClick={next} disabled={!name || !email || !passOk}>
                Continuar <ChevronRight size={15} />
              </PrimaryButton>
            </div>
          )}

          {/* ── Step 2: Company ─────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="label">Nombre de tu empresa</label>
                <input type="text" className="input" placeholder="Mi Empresa Ltda."
                  value={company} onChange={e => setCompany(e.target.value)}
                  autoFocus onKeyDown={e => e.key === 'Enter' && next()} />
              </div>

              <div className="rounded-xl p-4"
                style={{ background: 'rgba(242,176,69,0.07)', border: '1px solid rgba(242,176,69,0.20)' }}>
                <p className="text-[12.5px] font-semibold text-[#0A0A0F] mb-2">Plan Starter Free incluye:</p>
                <ul className="space-y-1.5">
                  {[
                    'Módulos base: Inventario y Personal',
                    'Hasta 5 usuarios · 30 activos',
                    '2 módulos adicionales de prueba (30 días)',
                  ].map(t => (
                    <li key={t} className="flex items-center gap-2 text-[12px] text-[#65656E]">
                      <Check size={12} color="#22c55e" className="shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2.5">
                <SecondaryButton onClick={() => { setError(''); setStep(1); }}>
                  Atrás
                </SecondaryButton>
                <PrimaryButton onClick={next} disabled={!company.trim()}>
                  Continuar <ChevronRight size={15} />
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* ── Step 3: Modules ─────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <p className="text-[14px] font-semibold text-[#0A0A0F]">Elige hasta 2 módulos de prueba</p>
                <p className="text-[12px] text-[#9898A3] mt-0.5">30 días gratis, sin compromiso. Puedes cambiarlos después.</p>
              </div>

              <div className="space-y-2 max-h-[260px] overflow-y-auto -mx-1 px-1">
                {modules.length === 0 && (
                  <p className="text-[13px] text-[#9898A3] text-center py-6">Cargando módulos...</p>
                )}
                {modules.map(mod => {
                  const selected = selectedMods.includes(mod.code);
                  const disabled = !selected && selectedMods.length >= 2;
                  return (
                    <button key={mod.code} type="button"
                      onClick={() => !disabled && toggleMod(mod.code)}
                      disabled={disabled}
                      className="w-full text-left rounded-xl p-3.5 transition-all"
                      style={{
                        border: selected ? '1.5px solid #F2B045' : '1px solid rgba(0,0,0,0.08)',
                        background: selected ? 'rgba(242,176,69,0.07)' : 'transparent',
                        opacity: disabled ? 0.38 : 1,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                      }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${mod.color || '#6366f1'}18`, color: mod.color || '#6366f1' }}>
                          {ICON_MAP[mod.icon] ?? <Package size={16} />}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-[13px] font-semibold text-[#0A0A0F] truncate">{mod.name}</p>
                          {mod.description && (
                            <p className="text-[11px] text-[#9898A3] truncate mt-0.5">{mod.description}</p>
                          )}
                        </div>
                        <div className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ml-1"
                          style={{ borderColor: selected ? '#F2B045' : 'rgba(0,0,0,0.18)', background: selected ? '#F2B045' : 'transparent' }}>
                          {selected && <Check size={10} color="#131316" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedMods.length > 0 && (
                <p className="text-center text-[11.5px] text-[#9898A3]">
                  {selectedMods.length} de 2 seleccionado{selectedMods.length !== 1 ? 's' : ''}
                </p>
              )}

              <div className="flex gap-2.5">
                <SecondaryButton onClick={() => { setError(''); setStep(2); }}>
                  Atrás
                </SecondaryButton>
                <PrimaryButton onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Creando cuenta...' : <><Rocket size={14} /> Crear cuenta</>}
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* ── Step 4: Success ─────────────────────────────────────── */}
          {step === 4 && (
            <div className="text-center py-3">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(34,197,94,0.12)' }}>
                <Check size={30} color="#22c55e" />
              </div>
              <h2 className="text-[18px] font-bold text-[#0A0A0F] mb-1">¡Todo listo!</h2>
              <p className="text-[13px] text-[#65656E] mb-6 leading-relaxed">
                <strong>{company}</strong> está activa con el plan Starter Free.
              </p>
              <PrimaryButton onClick={() => navigate('/', { replace: true })}>
                Ir al panel →
              </PrimaryButton>
            </div>
          )}
        </div>

        {step < 4 && (
          <p className="text-center text-[#9898A3] text-[12px] mt-5">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={{ color: '#F2B045', fontWeight: 600 }}>Inicia sesión</Link>
          </p>
        )}
        <p className="text-center text-[#C3C3C8] text-[11.5px] mt-3 font-medium">
          FB Core · by FBSystems
        </p>
      </div>
    </div>
  );
}

function PrimaryButton({
  onClick, disabled = false, children,
}: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold disabled:opacity-50 transition-all"
      style={{ background: 'linear-gradient(135deg, #F2B045 0%, #EDA135 100%)', color: '#131316', boxShadow: '0 2px 8px rgba(242,176,69,0.32)' }}>
      {children}
    </button>
  );
}

function SecondaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center justify-center py-3 px-5 rounded-xl text-[13px] font-semibold text-[#65656E] hover:bg-black/[0.04] transition-colors shrink-0"
      style={{ border: '1px solid rgba(0,0,0,0.10)' }}>
      {children}
    </button>
  );
}
