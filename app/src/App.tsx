import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from './context/AuthContext';
import Shell from './components/Shell';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword  from './components/ResetPassword';

const Dashboard      = lazy(() => import('./modules/Dashboard'));
const Inventory      = lazy(() => import('./modules/inventory'));
const AssetDetail    = lazy(() => import('./modules/inventory/AssetDetail'));
const Loans          = lazy(() => import('./modules/loans'));
const Maintenance    = lazy(() => import('./modules/maintenance'));
const Personnel      = lazy(() => import('./modules/personnel'));
const Monitoring     = lazy(() => import('./modules/monitoring'));
const Settings       = lazy(() => import('./modules/settings'));
const Reports        = lazy(() => import('./modules/reports'));
const Providers      = lazy(() => import('./modules/providers'));
const Requests       = lazy(() => import('./modules/requests'));
const Contracts      = lazy(() => import('./modules/contracts'));
const Tickets        = lazy(() => import('./modules/tickets'));
const CostCenters    = lazy(() => import('./modules/cost_centers'));
const Purchases      = lazy(() => import('./modules/purchases'));

function ModuleGuard({ code, children }: { code: string; children: React.ReactNode }) {
  const { hasModule } = useAuth();
  if (!hasModule(code)) return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
      <p className="font-medium">Módulo no disponible</p>
      <p className="text-sm mt-1">Contacta al administrador para habilitarlo.</p>
    </div>
  );
  return <>{children}</>;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="size-7 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  );
}

function AppRoutes() {
  return (
    <Shell>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="inventory"            element={<ModuleGuard code="inventory">     <Inventory />    </ModuleGuard>} />
          <Route path="inventory/asset/:id"  element={<ModuleGuard code="inventory">     <AssetDetail />  </ModuleGuard>} />
          <Route path="loans"                element={<ModuleGuard code="loans">         <Loans />        </ModuleGuard>} />
          <Route path="maintenance"          element={<ModuleGuard code="maintenance">   <Maintenance />  </ModuleGuard>} />
          <Route path="personnel"            element={<ModuleGuard code="personnel">     <Personnel />    </ModuleGuard>} />
          <Route path="monitoring"           element={<ModuleGuard code="monitoring">    <Monitoring />   </ModuleGuard>} />
          <Route path="providers"            element={<ModuleGuard code="providers">     <Providers />    </ModuleGuard>} />
          <Route path="requests"             element={<ModuleGuard code="requests">      <Requests />     </ModuleGuard>} />
          <Route path="contracts"            element={<ModuleGuard code="contracts">     <Contracts />    </ModuleGuard>} />
          <Route path="tickets"              element={<ModuleGuard code="tickets">       <Tickets />      </ModuleGuard>} />
          <Route path="cost_centers"         element={<ModuleGuard code="cost_centers">  <CostCenters />  </ModuleGuard>} />
          <Route path="purchases"            element={<ModuleGuard code="purchases">     <Purchases />    </ModuleGuard>} />
          <Route path="settings"    element={<Settings />} />
          <Route path="reports"     element={<Reports />} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Shell>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="size-9 border-4 border-primary-800 border-t-primary-400 rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login"                   element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register"               element={user ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/forgot-password"         element={user ? <Navigate to="/" replace /> : <ForgotPassword />} />
        <Route path="/reset-password/:token"   element={user ? <Navigate to="/" replace /> : <ResetPassword />} />
        <Route path="/*"                       element={user ? <AppRoutes /> : <Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}
