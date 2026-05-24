import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'Mínimo 8 caracteres', ok: password.length >= 8 },
    { label: 'Una mayúscula',       ok: /[A-Z]/.test(password) },
    { label: 'Un número',           ok: /[0-9]/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="space-y-1.5 mt-2.5">
      {checks.map(c => (
        <div key={c.label} className="flex items-center gap-1.5">
          {c.ok
            ? <CheckCircle size={11} className="text-emerald-500" aria-hidden="true" />
            : <AlertCircle size={11} className="text-[#AEAEB2]" aria-hidden="true" />}
          <span className={`text-xs ${c.ok ? 'text-emerald-600' : 'text-[#AEAEB2]'}`}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate  = useNavigate();
  const [password, setPassword] = useState('');
  const [show, setShow]         = useState(false);
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

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(145deg, #F5F5F7 0%, #EBEBF0 100%)' }}
    >
      <div className="w-full max-w-[360px]">
        <div
          className="bg-white rounded-3xl p-7 shadow-soft-xl"
          style={{ border: '1px solid rgba(0,0,0,0.06)' }}
        >
          {done ? (
            <div className="text-center space-y-4 py-2">
              <div className="size-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto shadow-soft">
                <CheckCircle size={26} className="text-emerald-500" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-[#1D1D1F]">¡Contraseña actualizada!</h1>
                <p className="text-sm text-[#6E6E73] mt-1">Serás redirigido al inicio de sesión…</p>
              </div>
              <Link to="/login" className="btn btn-primary w-full justify-center">Ir al login</Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="size-11 bg-primary-50 rounded-2xl flex items-center justify-center mb-4 shadow-soft">
                  <Lock size={18} className="text-primary-500" aria-hidden="true" />
                </div>
                <h1 className="text-xl font-semibold text-[#1D1D1F]">Nueva contraseña</h1>
                <p className="text-xs text-[#6E6E73] mt-1">Elige una contraseña segura para tu cuenta</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="reset-password" className="label">Nueva contraseña</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEAEB2]" aria-hidden="true" />
                    <input
                      id="reset-password"
                      type={show ? 'text' : 'password'}
                      className="input pl-10 pr-11"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      aria-controls="reset-password"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AEAEB2] hover:text-[#6E6E73] transition-colors p-1"
                    >
                      {show ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
                    </button>
                  </div>
                  <PasswordStrength password={password} />
                </div>

                {error && (
                  <p role="alert" className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2.5">{error}</p>
                )}

                <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center">
                  {loading ? 'Guardando…' : 'Guardar contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
