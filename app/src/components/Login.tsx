import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Eye, EyeOff, AlertTriangle, ShieldCheck, BarChart3, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { cleanRut, formatRut, looksLikeRut, validateRut } from '../utils/rut';

const FEATURES = [
  { icon: Layers,      text: 'Gestión de activos, contratos y personal en un solo lugar' },
  { icon: BarChart3,   text: 'Reportes y métricas en tiempo real para tomar mejores decisiones' },
  { icon: ShieldCheck, text: 'Acceso seguro con roles y permisos por módulo' },
];

export default function Login() {
  const { login, sessionMessage } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [show, setShow]             = useState(false);
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
    <div className="min-h-screen flex" style={{ background: '#F0F0F4' }}>

      {/* ── Left panel — branding ─────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #1A1A22 0%, #111118 100%)' }}
      >
        {/* Grid texture */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Amber glow */}
        <div
          aria-hidden="true"
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(242,176,69,0.12) 0%, transparent 65%)' }}
        />
        <div
          aria-hidden="true"
          className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(237,161,53,0.07) 0%, transparent 65%)' }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div
            className="size-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #F2B045 0%, #EDA135 100%)',
              boxShadow: '0 4px 16px rgba(242,176,69,0.35)',
            }}
          >
            <Boxes size={20} style={{ color: '#131316' }} />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">FB Core</span>
        </div>

        {/* Headline */}
        <div className="relative">
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#F2B045' }}>
            ERP para empresas modernas
          </p>
          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-[1.1] tracking-tight mb-6">
            Gestiona tu empresa<br />desde un solo lugar
          </h2>
          <p className="text-[15px] leading-relaxed mb-10" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Activos, personal, mantenimiento, contratos y más — todo conectado, seguro y a tu medida.
          </p>

          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div
                  className="size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(242,176,69,0.12)', border: '1px solid rgba(242,176,69,0.18)' }}
                >
                  <Icon size={15} style={{ color: '#F2B045' }} />
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative flex items-center justify-between">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            © 2025 FBSystems · Todos los derechos reservados
          </p>
          <Link
            to="/status"
            className="text-xs flex items-center gap-1.5 transition-colors"
            style={{ color: 'rgba(255,255,255,0.25)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
          >
            <span
              className="size-1.5 rounded-full bg-emerald-400 animate-pulse"
              aria-hidden="true"
            />
            Estado del sistema
          </Link>
        </div>
      </div>

      {/* ── Right panel — form ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative">
        {/* Mobile logo */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <div
            className="size-14 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'linear-gradient(135deg, #F2B045 0%, #EDA135 100%)',
              boxShadow: '0 6px 20px rgba(242,176,69,0.35)',
            }}
          >
            <Boxes size={26} style={{ color: '#131316' }} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0A0A0F' }}>FB Core</h1>
          <p className="text-sm mt-1" style={{ color: '#9898A3' }}>Ingresa a tu espacio de trabajo</p>
        </div>

        <div className="w-full max-w-[380px]">
          {/* Heading */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: '#0A0A0F' }}>Bienvenido de vuelta</h2>
            <p className="text-sm mt-1.5" style={{ color: '#9898A3' }}>Ingresa tus credenciales para continuar</p>
          </div>

          {/* Session replaced banner */}
          {sessionMessage && (
            <div
              className="mb-5 flex items-start gap-3 rounded-2xl p-4 text-[13px]"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.16)', color: '#ef4444' }}
            >
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>{sessionMessage}</span>
            </div>
          )}

          {/* Form card */}
          <div
            className="bg-white rounded-3xl p-7"
            style={{
              border: '1px solid rgba(0,0,0,0.07)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-1.5">
                <label
                  htmlFor="login-id"
                  className="block text-[11.5px] font-semibold tracking-wider uppercase"
                  style={{ color: '#6E6E73' }}
                >
                  Correo electrónico o RUT
                </label>
                <input
                  id="login-id"
                  type="text"
                  value={identifier}
                  onChange={e => handleIdentifierChange(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="correo@empresa.com o 12.345.678-9"
                  className="input"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="block text-[11.5px] font-semibold tracking-wider uppercase"
                    style={{ color: '#6E6E73' }}
                  >
                    Contraseña
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-[12px] font-semibold"
                    style={{ color: '#F2B045' }}
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="input pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-controls="login-password"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors"
                    style={{ color: '#AEAEB2' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#65656E')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#AEAEB2')}
                  >
                    {show ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                aria-disabled={loading}
                className="w-full py-3 font-bold rounded-xl text-[13.5px] disabled:opacity-50 transition-all duration-150"
                style={{
                  background: 'linear-gradient(135deg, #F2B045 0%, #EDA135 100%)',
                  color: '#131316',
                  boxShadow: '0 2px 8px rgba(242,176,69,0.30), 0 6px 20px rgba(242,176,69,0.15)',
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    Object.assign((e.currentTarget as HTMLButtonElement).style, {
                      boxShadow: '0 4px 14px rgba(242,176,69,0.40), 0 10px 28px rgba(242,176,69,0.20)',
                      transform: 'translateY(-1px)',
                    });
                  }
                }}
                onMouseLeave={e => {
                  Object.assign((e.currentTarget as HTMLButtonElement).style, {
                    boxShadow: '0 2px 8px rgba(242,176,69,0.30), 0 6px 20px rgba(242,176,69,0.15)',
                    transform: '',
                  });
                }}
                onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
                onMouseUp={e =>   { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
              >
                {loading ? 'Ingresando…' : 'Ingresar'}
              </button>
            </form>
          </div>

          <p className="text-center text-[12px] mt-5" style={{ color: '#9898A3' }}>
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="font-semibold" style={{ color: '#F2B045' }}>
              Crea tu empresa gratis
            </Link>
          </p>

          {/* Mobile status + footer */}
          <div className="lg:hidden flex items-center justify-center gap-4 mt-5">
            <Link to="/status" className="text-[11.5px] flex items-center gap-1.5" style={{ color: '#C3C3C8' }}>
              <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              Estado del sistema
            </Link>
            <span style={{ color: '#E0E0E5' }}>·</span>
            <p className="text-[11.5px]" style={{ color: '#C3C3C8' }}>FB Core · by FBSystems</p>
          </div>
        </div>
      </div>
    </div>
  );
}
