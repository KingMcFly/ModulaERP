import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Boxes, Eye, EyeOff, Check, ChevronRight, User, Building2, Puzzle, Rocket, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

interface Module { code: string; name: string; icon: string; description: string; color: string; }

const STEPS = [
  { id: 1, label: 'Tu cuenta',   icon: User },
  { id: 2, label: 'Tu empresa',  icon: Building2 },
  { id: 3, label: 'Módulos',     icon: Puzzle },
  { id: 4, label: 'Listo',       icon: Rocket },
];

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

  // Step 1
  const [name, setName]                 = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPass, setShowPass]         = useState(false);

  // Step 2
  const [company, setCompany]           = useState('');

  // Step 3
  const [selectedMods, setSelectedMods] = useState<string[]>([]);

  const MANDATORY = ['inventory', 'personnel'];

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
        : prev.length < 2
          ? [...prev, code]
          : prev
    );
  }

  function validateStep1() {
    if (!name.trim()) return 'Ingresa tu nombre';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Email inválido';
    for (const rule of PASSWORD_RULES) {
      if (!rule.re.test(password)) return rule.label;
    }
    return '';
  }

  function validateStep2() {
    if (!company.trim()) return 'Ingresa el nombre de tu empresa';
    return '';
  }

  function next() {
    setError('');
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
    }
    if (step === 2) {
      const err = validateStep2();
      if (err) { setError(err); return; }
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
      if (!res.ok) { setError(data.error || 'Error al registrar'); setLoading(false); return; }
      loginWithToken(data.token, data.user);
      setStep(4);
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#F3F3F7' }}
    >
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-60 -right-60 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(242,176,69,0.10) 0%, transparent 65%)' }}
        />
        <div
          className="absolute -bottom-60 -left-60 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(242,176,69,0.07) 0%, transparent 65%)' }}
        />
      </div>

      <div className="w-full max-w-[420px] relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-7">
          <div
            className="w-[56px] h-[56px] rounded-[18px] flex items-center justify-center mb-4"
            style={{
              background: 'linear-gradient(135deg, #F2B045 0%, #EDA135 100%)',
              boxShadow: '0 8px 28px rgba(242,176,69,0.40)',
            }}
          >
            <Boxes size={24} style={{ color: '#131316' }} />
          </div>
          <h1 className="text-[22px] font-bold text-[#0A0A0F] tracking-[-0.03em]">Crear cuenta gratis</h1>
          <p className="text-[13px] text-[#9898A3] mt-1">Plan Starter Free — sin tarjeta de crédito</p>
        </div>

        {/* Step indicators */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {STEPS.slice(0, 3).map((s, i) => (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all"
                    style={{
                      background: step > s.id ? '#22c55e' : step === s.id ? '#F2B045' : 'rgba(0,0,0,0.08)',
                      color: step >= s.id ? '#fff' : '#9898A3',
                    }}
                  >
                    {step > s.id ? <Check size={12} /> : s.id}
                  </div>
                  <span
                    className="text-[11px] font-medium hidden sm:inline"
                    style={{ color: step === s.id ? '#0A0A0F' : '#9898A3' }}
                  >
                    {s.label}
                  </span>
                </div>
                {i < 2 && (
                  <div
                    className="flex-1 h-px max-w-[32px]"
                    style={{ background: step > s.id ? '#22c55e' : 'rgba(0,0,0,0.10)' }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Card */}
        <div
          className="bg-white rounded-3xl p-7"
          style={{
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          {error && (
            <div
              className="flex items-center gap-2 rounded-xl p-3 mb-4 text-[13px]"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#ef4444' }}
            >
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Step 1 — Account */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="label">Nombre completo</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Juan Pérez"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Correo electrónico</label>
                <input
                  type="email"
                  className="input"
                  placeholder="juan@empresa.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="label">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="input pr-11"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#AEAEB2] hover:text-[#65656E]"
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {password && (
                  <div className="mt-2 space-y-1">
                    {PASSWORD_RULES.map(rule => (
                      <div key={rule.label} className="flex items-center gap-1.5 text-[11px]">
                        <div
                          className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                          style={{ background: rule.re.test(password) ? '#22c55e' : 'rgba(0,0,0,0.10)' }}
                        >
                          {rule.re.test(password) && <Check size={8} color="#fff" />}
                        </div>
                        <span style={{ color: rule.re.test(password) ? '#22c55e' : '#9898A3' }}>{rule.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <StepButton onClick={next} label="Continuar" icon={<ChevronRight size={16} />} />
            </div>
          )}

          {/* Step 2 — Company */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="label">Nombre de tu empresa</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Mi Empresa Ltda."
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  autoFocus
                />
              </div>

              <div
                className="rounded-xl p-4 text-[12.5px]"
                style={{ background: 'rgba(242,176,69,0.07)', border: '1px solid rgba(242,176,69,0.20)' }}
              >
                <p className="font-semibold text-[#0A0A0F] mb-2">Plan Starter Free incluye:</p>
                <ul className="space-y-1 text-[#65656E]">
                  <li className="flex items-center gap-2"><Check size={12} className="text-green-500" /> Módulos base: Inventario y Personal</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-green-500" /> Hasta 5 usuarios · 30 activos</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-green-500" /> 2 módulos adicionales (prueba 30 días)</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl text-[13px] font-semibold text-[#65656E]"
                  style={{ border: '1px solid rgba(0,0,0,0.10)' }}
                >
                  Atrás
                </button>
                <StepButton onClick={next} label="Continuar" icon={<ChevronRight size={16} />} className="flex-1" />
              </div>
            </div>
          )}

          {/* Step 3 — Modules */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <p className="text-[13.5px] font-semibold text-[#0A0A0F]">Elige hasta 2 módulos de prueba</p>
                <p className="text-[12px] text-[#9898A3] mt-0.5">Prueba gratis por 30 días, sin compromiso.</p>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {modules.map(mod => {
                  const selected = selectedMods.includes(mod.code);
                  const disabled = !selected && selectedMods.length >= 2;
                  return (
                    <button
                      key={mod.code}
                      type="button"
                      onClick={() => !disabled && toggleMod(mod.code)}
                      disabled={disabled}
                      className="w-full text-left rounded-xl p-3 transition-all"
                      style={{
                        border: selected
                          ? '1.5px solid #F2B045'
                          : '1px solid rgba(0,0,0,0.08)',
                        background: selected ? 'rgba(242,176,69,0.07)' : 'transparent',
                        opacity: disabled ? 0.4 : 1,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                          style={{ background: mod.color ? `${mod.color}20` : 'rgba(0,0,0,0.06)', color: mod.color || '#9898A3' }}
                        >
                          {mod.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[#0A0A0F]">{mod.name}</p>
                          {mod.description && <p className="text-[11px] text-[#9898A3] truncate">{mod.description}</p>}
                        </div>
                        <div
                          className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                          style={{ borderColor: selected ? '#F2B045' : 'rgba(0,0,0,0.20)', background: selected ? '#F2B045' : 'transparent' }}
                        >
                          {selected && <Check size={9} color="#131316" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {modules.length === 0 && (
                  <p className="text-[13px] text-[#9898A3] text-center py-4">No hay módulos adicionales disponibles.</p>
                )}
              </div>

              {selectedMods.length > 0 && (
                <p className="text-[11.5px] text-[#9898A3] text-center">
                  {selectedMods.length}/2 módulos seleccionados
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 rounded-xl text-[13px] font-semibold text-[#65656E]"
                  style={{ border: '1px solid rgba(0,0,0,0.10)' }}
                >
                  Atrás
                </button>
                <StepButton
                  onClick={handleSubmit}
                  label={loading ? 'Creando cuenta...' : 'Crear cuenta'}
                  icon={!loading ? <Rocket size={15} /> : undefined}
                  disabled={loading}
                  className="flex-1"
                />
              </div>
            </div>
          )}

          {/* Step 4 — Success */}
          {step === 4 && (
            <div className="text-center py-2">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(34,197,94,0.12)' }}
              >
                <Check size={28} color="#22c55e" />
              </div>
              <h2 className="text-[18px] font-bold text-[#0A0A0F] mb-2">¡Todo listo!</h2>
              <p className="text-[13px] text-[#65656E] mb-6">
                Tu empresa <strong>{company}</strong> está activa con el plan Starter Free.
              </p>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="w-full py-3 font-bold rounded-xl text-[13px]"
                style={{
                  background: 'linear-gradient(135deg, #F2B045 0%, #EDA135 100%)',
                  color: '#131316',
                  boxShadow: '0 2px 8px rgba(242,176,69,0.32)',
                }}
              >
                Ir al panel
              </button>
            </div>
          )}
        </div>

        {step < 4 && (
          <p className="text-center text-[#9898A3] text-[12px] mt-5">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold" style={{ color: '#F2B045' }}>
              Inicia sesión
            </Link>
          </p>
        )}

        <p className="text-center text-[#C3C3C8] text-[11.5px] mt-3 font-medium">
          FB Core · by FBSystems
        </p>
      </div>
    </div>
  );
}

function StepButton({
  onClick, label, icon, disabled = false, className = '',
}: {
  onClick: () => void; label: string; icon?: React.ReactNode; disabled?: boolean; className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 py-3 font-bold rounded-xl text-[13px] disabled:opacity-50 ${className}`}
      style={{
        background: 'linear-gradient(135deg, #F2B045 0%, #EDA135 100%)',
        color: '#131316',
        boxShadow: '0 2px 8px rgba(242,176,69,0.32)',
      }}
    >
      {label}
      {icon}
    </button>
  );
}
