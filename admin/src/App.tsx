import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tenants from './pages/Tenants';
import TenantDetail from './pages/TenantDetail';
import Modules from './pages/Modules';
import Users from './pages/Users';
import AdminSettings from './pages/AdminSettings';
import { api } from './api';

interface AuthUser { id: number; name: string; email: string; role: string; }

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    api.get<AuthUser>('/auth/me')
      .then(setUser)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogin(email: string, password: string) {
    const res = await api.post<{ token: string; user: AuthUser }>('/auth/login', { email, password });
    if (res.user.role !== 'super_admin') throw new Error('Solo super admins pueden acceder aquí');
    localStorage.setItem('token', res.token);
    setUser(res.user);
    navigate('/');
  }

  function handleLogout() { localStorage.removeItem('token'); setUser(null); }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" replace />} />
        {user ? (
          <Route path="/*" element={
            <Layout userName={user.name} onLogout={handleLogout}>
              <Routes>
                <Route index        element={<Dashboard />} />
                <Route path="tenants"    element={<Tenants />} />
                <Route path="tenants/:id" element={<TenantDetail />} />
                <Route path="modules"    element={<Modules />} />
                <Route path="users"      element={<Users />} />
                <Route path="settings"   element={<AdminSettings />} />
                <Route path="*"          element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          } />
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </>
  );
}
