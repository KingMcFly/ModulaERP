import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

export interface AppModule {
  code: string; name: string; icon: string; color: string; sort_order: number;
  can_view?: boolean; can_write?: boolean; can_delete?: boolean;
}
export interface Tenant { id: number; name: string; slug: string; primary_color: string; logo_url: string | null; }
export interface AuthUser {
  id: number; name: string; email: string; role: string; avatar_url: string | null;
  tenant: Tenant;
  modules: AppModule[];
}

const FULL_ACCESS_ROLES = ['super_admin', 'admin', 'manager'];

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  sessionMessage: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string, userData: AuthUser) => void;
  logout: () => void;
  hasModule: (code: string) => boolean;
  canWrite:  (code: string) => boolean;
  canDelete: (code: string) => boolean;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const Ctx = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const interceptorRef = useRef(false);

  const doLogout = useCallback((message?: string) => {
    localStorage.removeItem('token');
    setUser(null);
    if (message) setSessionMessage(message);
  }, []);

  useEffect(() => {
    if (interceptorRef.current) return;
    interceptorRef.current = true;

    const origFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const res = await origFetch(...args);
      if (res.status === 401 && !res.url.includes('/auth/login')) {
        const clone = res.clone();
        try {
          const body = await clone.json();
          if (body?.reason === 'session_replaced') {
            doLogout('Tu sesión fue cerrada porque se inició sesión en otro dispositivo.');
          } else if (body?.error === 'Token inválido o expirado') {
            doLogout();
          }
        } catch { /* ignore parse errors */ }
      }
      return res;
    };
  }, [doLogout]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setUser)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
    localStorage.setItem('token', data.token);
    setSessionMessage(null);
    setUser(data.user);
  }

  function loginWithToken(token: string, userData: AuthUser) {
    localStorage.setItem('token', token);
    setSessionMessage(null);
    setUser(userData);
  }

  function logout() { doLogout(); }

  function hasModule(code: string) {
    return user?.modules?.some(m => m.code === code) ?? false;
  }

  function canWrite(code: string) {
    if (!user) return false;
    if (FULL_ACCESS_ROLES.includes(user.role)) return true;
    return user.modules?.some(m => m.code === code && m.can_write) ?? false;
  }

  function canDelete(code: string) {
    if (!user) return false;
    if (FULL_ACCESS_ROLES.includes(user.role)) return true;
    return user.modules?.some(m => m.code === code && m.can_delete) ?? false;
  }

  return (
    <Ctx.Provider value={{ user, loading, sessionMessage, login, loginWithToken, logout, hasModule, canWrite, canDelete }}>
      {children}
    </Ctx.Provider>
  );
}
