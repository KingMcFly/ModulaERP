import { useState, useEffect } from 'react';
import { api } from '../api';

interface AuthUser {
  id: number; name: string; email: string; role: string;
  tenant: { id: number; name: string; slug: string; primary_color: string; logo_url: string | null };
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    api.get<AuthUser>('/auth/me')
      .then(setUser)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post<{ token: string; user: AuthUser }>('/auth/login', { email, password });
    localStorage.setItem('token', res.token);
    setUser(res.user);
    return res.user;
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
  }

  return { user, loading, login, logout };
}
