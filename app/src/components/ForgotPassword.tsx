import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default function ForgotPassword() {
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
                <h1 className="text-xl font-semibold text-[#1D1D1F]">Revisa tu correo</h1>
                <p className="text-sm text-[#6E6E73] mt-2 leading-relaxed">
                  Si el correo <strong className="text-[#1D1D1F]">{email}</strong> existe en el sistema, recibirás instrucciones para restablecer tu contraseña.
                </p>
              </div>
              <Link to="/login" className="btn btn-primary w-full justify-center mt-2">
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <Link
                  to="/login"
                  className="p-2 text-[#AEAEB2] hover:text-[#1D1D1F] hover:bg-black/[0.05] rounded-xl transition-colors"
                  aria-label="Volver"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                </Link>
                <div>
                  <h1 className="text-lg font-semibold text-[#1D1D1F]">Recuperar contraseña</h1>
                  <p className="text-xs text-[#6E6E73] mt-0.5">Te enviaremos instrucciones por correo</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="label">Correo electrónico</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEAEB2]" aria-hidden="true" />
                    <input
                      id="forgot-email"
                      type="email"
                      className="input pl-10"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      placeholder="correo@empresa.com"
                    />
                  </div>
                </div>

                {error && (
                  <p role="alert" className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2.5">{error}</p>
                )}

                <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center">
                  {loading ? 'Enviando…' : 'Enviar instrucciones'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
