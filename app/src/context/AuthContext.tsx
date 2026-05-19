import React, { createContext, useContext, useState, useEffect } from 'react';

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
  login: (email: string, password: string) => Promise<void>;
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
    setUser(data.user);
  }

  function logout() { localStorage.removeItem('token'); setUser(null); }

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
    <Ctx.Provider value={{ user, loading, login, logout, hasModule, canWrite, canDelete }}>
      {children}
    </Ctx.Provider>
  );
}
