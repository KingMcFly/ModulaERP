import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { cleanRut, formatRut, looksLikeRut, validateRut } from '../utils/rut';

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
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#F3F3F7' }}
    >
      {/* Background ambient gradient */}
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-60 -right-60 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(242,176,69,0.10) 0%, transparent 65%)' }}
        />
        <div
          className="absolute -bottom-60 -left-60 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(242,176,69,0.07) 0%, transparent 65%)' }}
        />
        <div
          className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(237,161,53,0.05) 0%, transparent 65%)' }}
        />
      </div>

      <div className="w-full max-w-[360px] relative animate-fade-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-[64px] h-[64px] rounded-[20px] flex items-center justify-center mb-5"
            style={{
              background: 'linear-gradient(135deg, #F2B045 0%, #EDA135 100%)',
              boxShadow: '0 8px 28px rgba(242,176,69,0.40), inset 0 1px 0 rgba(255,255,255,0.22)',
            }}
            aria-hidden="true"
          >
            <Boxes size={28} style={{ color: '#131316' }} />
          </div>
          <h1 className="text-[24px] font-bold text-[#0A0A0F] tracking-[-0.03em]">FB Core</h1>
          <p className="text-[13px] text-[#9898A3] mt-1 font-medium">Ingresa a tu espacio de trabajo</p>
        </div>

        {/* Session replaced banner */}
        {sessionMessage && (
          <div
            className="mb-4 flex items-start gap-3 rounded-2xl p-4 text-[13px]"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#ef4444' }}
          >
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>{sessionMessage}</span>
          </div>
        )}

        {/* Card */}
        <div
          className="bg-white rounded-3xl p-7"
          style={{
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="login-id" className="label">Correo electrónico o RUT</label>
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

            <div>
              <label htmlFor="login-password" className="label">Contraseña</label>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#AEAEB2] hover:text-[#65656E]"
                  style={{ transition: 'color 160ms cubic-bezier(0.23, 1, 0.32, 1)' }}
                >
                  {show ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-[12px] font-semibold text-primary-500 hover:text-primary-700"
                style={{ transition: 'color 160ms cubic-bezier(0.23, 1, 0.32, 1)' }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              aria-disabled={loading}
              className="w-full py-3 font-bold rounded-xl text-[13px] disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #F2B045 0%, #EDA135 100%)',
                color: '#131316',
                boxShadow: '0 2px 8px rgba(242,176,69,0.32), 0 8px 24px rgba(242,176,69,0.18)',
                transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)',
              }}
              onMouseEnter={e => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.boxShadow = '0 4px 14px rgba(242,176,69,0.42), 0 12px 32px rgba(242,176,69,0.22)';
                btn.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.boxShadow = '0 2px 8px rgba(242,176,69,0.32), 0 8px 24px rgba(242,176,69,0.18)';
                btn.style.transform = '';
              }}
              onMouseDown={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)';
              }}
              onMouseUp={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = '';
              }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-[#9898A3] text-[12px] mt-5">
          ¿No tienes cuenta?{' '}
          <Link
            to="/register"
            className="font-semibold"
            style={{ color: '#F2B045' }}
          >
            Crea tu empresa gratis
          </Link>
        </p>

        <p className="text-center text-[#C3C3C8] text-[11.5px] mt-3 font-medium">
          FB Core · by FBSystems
        </p>
      </div>
    </div>
  );
}
