import React, { useState } from 'react';
import { Boxes, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface Props { onLogin: (email: string, password: string) => Promise<void>; }

export default function Login({ onLogin }: Props) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow]         = useState(false);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try { await onLogin(email, password); }
    catch (err: any) { toast.error(err.message || 'Credenciales incorrectas'); }
    finally { setLoading(false); }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#070711' }}
    >
      {/* Ambient mesh gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: [
            'radial-gradient(ellipse at 50% 115%, rgba(99,102,241,0.42) 0%, transparent 55%)',
            'radial-gradient(ellipse at 82% -8%,  rgba(139,92,246,0.22) 0%, transparent 45%)',
            'radial-gradient(ellipse at 12% 92%,  rgba(59,130,246,0.14) 0%, transparent 42%)',
          ].join(','),
        }}
      />

      {/* Grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          opacity: 0.035,
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: '200px 200px',
        }}
      />

      <div className="relative z-10 w-full max-w-sm animate-fade-up">
        {/* Brand */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-[60px] h-[60px] rounded-[18px] mb-4"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              boxShadow: '0 8px 32px rgba(99,102,241,0.55), inset 0 1px 0 rgba(255,255,255,0.22)',
            }}
            aria-hidden="true"
          >
            <Boxes size={27} className="text-white" />
          </div>
          <h1 className="text-[24px] font-bold text-white tracking-[-0.03em]">ModulaERP</h1>
          <p
            className="text-[13px] mt-1 font-medium"
            style={{ color: 'rgba(255,255,255,0.38)' }}
          >
            Panel de Administración
          </p>
        </div>

        {/* Glass card */}
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '24px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 32px 64px rgba(0,0,0,0.45)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
          }}
          className="p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label
                htmlFor="admin-email"
                className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-2"
                style={{ color: 'rgba(255,255,255,0.40)' }}
              >
                Correo electrónico
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@modulaerp.com"
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-xl text-[13px] text-white placeholder-[rgba(255,255,255,0.22)] focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  transition: 'all 180ms cubic-bezier(0.23, 1, 0.32, 1)',
                }}
                onFocus={e => {
                  e.target.style.background = 'rgba(255,255,255,0.10)';
                  e.target.style.borderColor = 'rgba(99,102,241,0.60)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.18)';
                }}
                onBlur={e => {
                  e.target.style.background = 'rgba(255,255,255,0.07)';
                  e.target.style.borderColor = 'rgba(255,255,255,0.10)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            <div>
              <label
                htmlFor="admin-password"
                className="block text-[11px] font-bold uppercase tracking-[0.08em] mb-2"
                style={{ color: 'rgba(255,255,255,0.40)' }}
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 rounded-xl text-[13px] text-white placeholder-[rgba(255,255,255,0.22)] focus:outline-none pr-11"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    transition: 'all 180ms cubic-bezier(0.23, 1, 0.32, 1)',
                  }}
                  onFocus={e => {
                    e.target.style.background = 'rgba(255,255,255,0.10)';
                    e.target.style.borderColor = 'rgba(99,102,241,0.60)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.18)';
                  }}
                  onBlur={e => {
                    e.target.style.background = 'rgba(255,255,255,0.07)';
                    e.target.style.borderColor = 'rgba(255,255,255,0.10)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-controls="admin-password"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg"
                  style={{
                    color: 'rgba(255,255,255,0.35)',
                    transition: 'color 160ms cubic-bezier(0.23, 1, 0.32, 1)',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'}
                >
                  {show ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              aria-disabled={loading}
              className="w-full py-3 text-white font-bold rounded-xl text-[13px] disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                boxShadow: '0 2px 8px rgba(99,102,241,0.38), 0 8px 24px rgba(99,102,241,0.20)',
                transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)',
              }}
              onMouseEnter={e => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.boxShadow = '0 4px 14px rgba(99,102,241,0.48), 0 12px 32px rgba(99,102,241,0.25)';
                btn.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.boxShadow = '0 2px 8px rgba(99,102,241,0.38), 0 8px 24px rgba(99,102,241,0.20)';
                btn.style.transform = '';
              }}
              onMouseDown={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)';
              }}
              onMouseUp={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = '';
              }}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>

        <p
          className="text-center text-[11.5px] mt-6 font-medium"
          style={{ color: 'rgba(255,255,255,0.22)' }}
        >
          ModulaERP v1.0 · Panel Super Admin
        </p>
      </div>
    </div>
  );
}
