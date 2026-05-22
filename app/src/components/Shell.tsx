import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Menu, X, LogOut, Bell, ChevronDown, Boxes, Package, ArrowRightLeft,
  Wrench, Users, Activity, LayoutDashboard, Settings, BarChart2,
  AlertCircle, AlertTriangle, CheckCircle, Truck, ClipboardList,
  FileCheck, LifeBuoy, PieChart, ShoppingCart, Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PlanInfo {
  plan: string;
  trial_days_left: number | null;
  usage: { assets: number; users: number; technicians: number; };
  limits: Record<string, number>;
  trial_modules: { code: string; name: string; days_left: number | null; }[];
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

interface NotifItem { type: string; message: string; count: number; severity: string; }
interface NotifSummary { total: number; items: NotifItem[]; }

const MODULE_ICONS: Record<string, React.ReactNode> = {
  inventory:    <Package        size={15} />,
  loans:        <ArrowRightLeft size={15} />,
  maintenance:  <Wrench         size={15} />,
  personnel:    <Users          size={15} />,
  monitoring:   <Activity       size={15} />,
  providers:    <Truck          size={15} />,
  requests:     <ClipboardList  size={15} />,
  contracts:    <FileCheck      size={15} />,
  tickets:      <LifeBuoy       size={15} />,
  cost_centers: <PieChart       size={15} />,
  purchases:    <ShoppingCart   size={15} />,
};

const MODULE_DISPLAY: Record<string, string> = {
  personnel: 'Personas',
};

const MODULE_ROUTES: Record<string, string> = {
  inventory:    '/inventory',
  loans:        '/loans',
  maintenance:  '/maintenance',
  personnel:    '/personnel',
  monitoring:   '/monitoring',
  providers:    '/providers',
  requests:     '/requests',
  contracts:    '/contracts',
  tickets:      '/tickets',
  cost_centers: '/cost_centers',
  purchases:    '/purchases',
};

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  loan:        <AlertCircle   size={13} className="text-red-400 flex-shrink-0" />,
  stock:       <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />,
  maintenance: <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />,
  contract:    <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />,
  request:     <AlertCircle   size={13} className="text-blue-400 flex-shrink-0" />,
  ticket:      <AlertCircle   size={13} className="text-red-400 flex-shrink-0" />,
};

const WHATSAPP_NUMBER = '56920023072';

function getWhatsappUrl(tenantName: string) {
  const msg = `Hola, soy administrador de la empresa ${tenantName} en FB Core ERP. Quiero solicitar información sobre planes.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

function PlanBanner({
  plan, tenantName, dismissed, onDismiss,
}: {
  plan: PlanInfo | null; tenantName: string; dismissed: boolean; onDismiss: () => void;
}) {
  if (!plan || dismissed) return null;

  const isStarterFree = plan.plan === 'starter_free';
  const trialDays = plan.trial_days_left;
  const urgentTrial = trialDays !== null && trialDays <= 7;
  const warnTrial   = trialDays !== null && trialDays <= 15 && !urgentTrial;

  const assetsLimit  = plan.limits.assets  ?? -1;
  const usersLimit   = plan.limits.users   ?? -1;
  const nearAssets   = assetsLimit > 0 && plan.usage.assets  >= assetsLimit * 0.8;
  const nearUsers    = usersLimit  > 0 && plan.usage.users   >= usersLimit  * 0.8;
  const nearLimit    = nearAssets || nearUsers;

  const expiringMods = plan.trial_modules.filter(m => m.days_left !== null && m.days_left <= 7);

  if (!urgentTrial && !warnTrial && !nearLimit && expiringMods.length === 0 && !isStarterFree) return null;

  const waUrl = getWhatsappUrl(tenantName);

  if (urgentTrial) {
    return (
      <div
        className="flex items-center justify-between gap-4 rounded-2xl px-5 py-3.5 mb-5 text-[13px]"
        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}
      >
        <div className="flex items-center gap-3">
          <AlertTriangle size={15} className="text-red-500 shrink-0" />
          <span className="font-semibold text-red-600">
            Tu prueba vence en {trialDays} día{trialDays !== 1 ? 's' : ''}.
          </span>
          <span className="text-[#65656E] hidden sm:inline">No pierdas acceso a tus módulos.</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold"
            style={{ background: '#F2B045', color: '#131316' }}
          >
            <Zap size={12} /> Extender ahora
          </a>
          <button onClick={onDismiss} className="text-[#AEAEB2] hover:text-[#65656E] text-[18px] leading-none">&times;</button>
        </div>
      </div>
    );
  }

  if (warnTrial || expiringMods.length > 0) {
    const modNames = expiringMods.map(m => m.name).join(', ');
    return (
      <div
        className="flex items-center justify-between gap-4 rounded-2xl px-5 py-3.5 mb-5 text-[13px]"
        style={{ background: 'rgba(242,176,69,0.08)', border: '1px solid rgba(242,176,69,0.20)' }}
      >
        <div className="flex items-center gap-3">
          <AlertTriangle size={15} style={{ color: '#F2B045' }} className="shrink-0" />
          <span style={{ color: '#65656E' }}>
            {warnTrial
              ? <><strong className="text-[#0A0A0F]">Tu prueba vence en {trialDays} días.</strong> Mejora tu plan para no perder acceso.</>
              : <><strong className="text-[#0A0A0F]">Módulos por vencer:</strong> {modNames} — menos de 7 días.</>
            }
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
            style={{ background: 'rgba(242,176,69,0.15)', color: '#D4940B', border: '1px solid rgba(242,176,69,0.30)' }}
          >
            Ver planes
          </a>
          <button onClick={onDismiss} className="text-[#AEAEB2] hover:text-[#65656E] text-[18px] leading-none">&times;</button>
        </div>
      </div>
    );
  }

  if (nearLimit && isStarterFree) {
    const what = nearAssets ? `activos (${plan.usage.assets}/${assetsLimit})` : `usuarios (${plan.usage.users}/${usersLimit})`;
    return (
      <div
        className="flex items-center justify-between gap-4 rounded-2xl px-5 py-3 mb-5 text-[12.5px]"
        style={{ background: 'rgba(242,176,69,0.06)', border: '1px solid rgba(242,176,69,0.15)' }}
      >
        <span style={{ color: '#9898A3' }}>
          Estás al límite de tu plan en <strong className="text-[#0A0A0F]">{what}</strong>.{' '}
          <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#F2B045', fontWeight: 600 }}>
            Vuélvete Plus →
          </a>
        </span>
        <button onClick={onDismiss} className="text-[#AEAEB2] hover:text-[#65656E] text-[18px] leading-none shrink-0">&times;</button>
      </div>
    );
  }

  return null;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen]     = useState(false);
  const [notifs, setNotifs]           = useState<NotifSummary>({ total: 0, items: [] });
  const [plan, setPlan]               = useState<PlanInfo | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    localStorage.getItem('plan_banner_dismissed') === new Date().toDateString()
  );
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close sidebar on mobile after nav
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const primaryColor = user?.tenant?.primary_color || '#F2B045';

  function handleLogout() { logout(); navigate('/login'); }

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    function fetchNotifs() {
      fetch(`${API}/notifications/summary`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { if (typeof d.total === 'number') setNotifs(d); })
        .catch(() => {});
    }
    fetchNotifs();
    const id = setInterval(fetchNotifs, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API}/dashboard/plan`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPlan(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-semibold ${
      isActive
        ? ''
        : 'hover:bg-black/[0.038]'
    }`;

  const navLinkStyle = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? {
          color: primaryColor,
          background: `linear-gradient(135deg, ${primaryColor}18, ${primaryColor}0A)`,
          boxShadow: `0 0 0 1px ${primaryColor}1E, inset 0 1px 0 rgba(255,255,255,0.55)`,
          transition: 'all 200ms cubic-bezier(0.23, 1, 0.32, 1)',
        }
      : {
          color: '#65656E',
          transition: 'all 200ms cubic-bezier(0.23, 1, 0.32, 1)',
        };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F3F3F7' }}>
      <a href="#main-content" className="skip-link">Saltar al contenido principal</a>

      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        aria-label="Navegación principal"
        style={{
          width: sidebarOpen ? 236 : (isMobile ? 0 : 62),
          position: isMobile ? 'fixed' : 'relative',
          top: isMobile ? 0 : undefined,
          left: isMobile ? 0 : undefined,
          height: isMobile ? '100dvh' : undefined,
          zIndex: isMobile ? 50 : undefined,
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(28px) saturate(220%)',
          WebkitBackdropFilter: 'blur(28px) saturate(220%)',
          borderRight: '1px solid rgba(0,0,0,0.06)',
          boxShadow: isMobile && sidebarOpen ? '4px 0 24px rgba(0,0,0,0.12)' : '1px 0 0 rgba(255,255,255,0.6) inset',
          transition: 'width 280ms cubic-bezier(0.32, 0.72, 0, 1)',
          overflow: 'hidden',
        }}
        className="flex flex-col flex-shrink-0"
      >
        {/* Branding */}
        <div
          className="flex items-center gap-3 px-4 h-[58px] flex-shrink-0 relative overflow-hidden"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{
              background: `radial-gradient(ellipse at 0% 50%, ${primaryColor}14, transparent 70%)`,
            }}
          />
          <div
            className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 text-white font-bold text-sm relative z-10"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}CC)`,
              boxShadow: `0 4px 10px ${primaryColor}40, inset 0 1px 0 rgba(255,255,255,0.25)`,
            }}
            aria-hidden="true"
          >
            {user?.tenant?.logo_url
              ? <img src={user.tenant.logo_url} className="w-full h-full object-contain rounded-[8px]" alt="" />
              : <Boxes size={15} />}
          </div>
          {sidebarOpen && (
            <div className="min-w-0 flex-1 relative z-10">
              <p className="font-bold text-[#0A0A0F] text-[13px] truncate leading-tight tracking-[-0.02em]">
                {user?.tenant?.name || 'FB Core'}
              </p>
              <p className="text-[10.5px] text-[#AEAEB2] truncate font-medium mt-0.5">Sistema de gestión</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav aria-label="Módulos" className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5">

          <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
            <NavLink to="/" end className={navLinkClass} style={navLinkStyle}
              onClick={() => isMobile && setSidebarOpen(false)}>
              <LayoutDashboard size={15} className="flex-shrink-0" aria-hidden="true" />
              {sidebarOpen ? <span>Dashboard</span> : <span className="sr-only">Dashboard</span>}
            </NavLink>
          </div>

          {user?.modules && user.modules.filter(m => MODULE_ROUTES[m.code]).length > 0 && (
            <>
              {sidebarOpen
                ? <p className="px-3 pt-5 pb-1.5 text-[10px] font-bold text-[#C3C3C8] uppercase tracking-[0.1em]">Operación</p>
                : <div className="my-3 mx-2 border-t border-black/[0.06]" role="separator" />}
              {user.modules.filter(m => MODULE_ROUTES[m.code]).map((m, idx) => (
                <div
                  key={m.code}
                  className="animate-fade-up"
                  style={{ animationDelay: `${(idx + 1) * 35}ms` }}
                >
                  <NavLink to={MODULE_ROUTES[m.code]} className={navLinkClass} style={navLinkStyle}
                    onClick={() => isMobile && setSidebarOpen(false)}>
                    <span className="flex-shrink-0 text-current" aria-hidden="true">
                      {MODULE_ICONS[m.code] || <Package size={15} />}
                    </span>
                    {sidebarOpen
                      ? <span>{MODULE_DISPLAY[m.code] || m.name}</span>
                      : <span className="sr-only">{MODULE_DISPLAY[m.code] || m.name}</span>}
                  </NavLink>
                </div>
              ))}
            </>
          )}

          {sidebarOpen
            ? <p className="px-3 pt-5 pb-1.5 text-[10px] font-bold text-[#C3C3C8] uppercase tracking-[0.1em]">Análisis</p>
            : <div className="my-3 mx-2 border-t border-black/[0.06]" role="separator" />}
          <div className="animate-fade-up" style={{ animationDelay: '240ms' }}>
            <NavLink to="/reports" className={navLinkClass} style={navLinkStyle}
              onClick={() => isMobile && setSidebarOpen(false)}>
              <BarChart2 size={15} className="flex-shrink-0" aria-hidden="true" />
              {sidebarOpen ? <span>Reportes</span> : <span className="sr-only">Reportes</span>}
            </NavLink>
          </div>

          {sidebarOpen
            ? <p className="px-3 pt-5 pb-1.5 text-[10px] font-bold text-[#C3C3C8] uppercase tracking-[0.1em]">Sistema</p>
            : <div className="my-3 mx-2 border-t border-black/[0.06]" role="separator" />}
          <div className="animate-fade-up" style={{ animationDelay: '280ms' }}>
            <NavLink to="/settings" className={navLinkClass} style={navLinkStyle}
              onClick={() => isMobile && setSidebarOpen(false)}>
              <Settings size={15} className="flex-shrink-0" aria-hidden="true" />
              {sidebarOpen ? <span>Configuración</span> : <span className="sr-only">Configuración</span>}
            </NavLink>
          </div>
        </nav>

        {/* User profile */}
        <div className="p-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          {sidebarOpen ? (
            <>
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                aria-label={`Menú de usuario: ${user?.name}`}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-black/[0.04] transition-colors text-left"
                style={{ transition: 'background-color 160ms cubic-bezier(0.23, 1, 0.32, 1)' }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}BB)`,
                    boxShadow: `0 2px 6px ${primaryColor}35`,
                  }}
                  aria-hidden="true"
                >
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-[#0A0A0F] truncate leading-tight">{user?.name}</p>
                  <p className="text-[10px] text-[#AEAEB2] truncate capitalize font-medium">{user?.role?.replace('_', ' ')}</p>
                </div>
                <ChevronDown
                  size={12}
                  className={`text-[#AEAEB2] flex-shrink-0 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}
                  style={{ transition: 'transform 200ms cubic-bezier(0.23, 1, 0.32, 1)' }}
                  aria-hidden="true"
                />
              </button>
              {profileOpen && (
                <div
                  role="menu"
                  className="mt-1.5 bg-white rounded-xl overflow-hidden animate-slide-up"
                  style={{
                    border: '1px solid rgba(0,0,0,0.07)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.09)',
                  }}
                >
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-red-500 hover:bg-red-50 font-semibold"
                    style={{ transition: 'background-color 160ms cubic-bezier(0.23, 1, 0.32, 1)' }}
                  >
                    <LogOut size={13} aria-hidden="true" /> Cerrar sesión
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="w-full flex items-center justify-center p-2.5 rounded-xl text-[#AEAEB2] hover:bg-red-50 hover:text-red-500"
              style={{ transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)' }}
            >
              <LogOut size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header
          className="h-[58px] flex items-center justify-between px-5 flex-shrink-0"
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(28px) saturate(200%)',
            WebkitBackdropFilter: 'blur(28px) saturate(200%)',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.7) inset',
          }}
        >
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-expanded={sidebarOpen}
            aria-controls="sidebar"
            aria-label={sidebarOpen ? 'Cerrar menú lateral' : 'Abrir menú lateral'}
            className="w-8 h-8 flex items-center justify-center text-[#AEAEB2] hover:text-[#0A0A0F] hover:bg-black/[0.05] rounded-xl"
            style={{ transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)' }}
          >
            {sidebarOpen
              ? <X size={16} aria-hidden="true" />
              : <Menu size={16} aria-hidden="true" />}
          </button>

          <div className="flex items-center gap-1.5">
            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen(!notifOpen)}
                aria-label={notifs.total > 0 ? `${notifs.total} notificaciones pendientes` : 'Sin notificaciones'}
                aria-expanded={notifOpen}
                aria-haspopup="dialog"
                className="relative w-8 h-8 flex items-center justify-center text-[#AEAEB2] hover:text-[#0A0A0F] hover:bg-black/[0.05] rounded-xl"
                style={{ transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)' }}
              >
                <Bell size={16} aria-hidden="true" />
                {notifs.total > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none px-1"
                    style={{ boxShadow: '0 2px 6px rgba(239,68,68,0.4)' }}
                  >
                    {notifs.total > 9 ? '9+' : notifs.total}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  role="dialog"
                  aria-label="Notificaciones"
                  aria-live="polite"
                  className="absolute right-0 top-11 w-80 bg-white rounded-2xl z-50 overflow-hidden animate-slide-up"
                  style={{
                    border: '1px solid rgba(0,0,0,0.07)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  <div
                    className="px-4 py-3.5 flex items-center justify-between"
                    style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}
                  >
                    <span className="font-bold text-[13px] text-[#0A0A0F] tracking-[-0.02em]">Notificaciones</span>
                    {notifs.total > 0 && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">
                        {notifs.total}
                      </span>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {(notifs.items ?? []).length === 0 ? (
                      <div className="flex flex-col items-center py-10 gap-2 text-[#AEAEB2]">
                        <CheckCircle size={20} className="text-emerald-400" aria-hidden="true" />
                        <span className="text-[13px] font-semibold">Todo al día</span>
                      </div>
                    ) : (notifs.items ?? []).map((item, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-black/[0.02]"
                        style={{
                          borderBottom: i < notifs.items.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                          transition: 'background-color 160ms cubic-bezier(0.23, 1, 0.32, 1)',
                        }}
                      >
                        {NOTIF_ICONS[item.type] || <AlertCircle size={13} className="text-[#AEAEB2] flex-shrink-0" />}
                        <p className="text-[12px] text-[#3C3C43] leading-relaxed">{item.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {!sidebarOpen && (
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Cerrar sesión"
                className="w-8 h-8 flex items-center justify-center text-[#AEAEB2] hover:text-red-500 hover:bg-red-50 rounded-xl"
                style={{ transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)' }}
              >
                <LogOut size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </header>

        {/* Content */}
        <main id="main-content" className="flex-1 overflow-y-auto p-6" tabIndex={-1}>
          <PlanBanner
            plan={plan}
            tenantName={user?.tenant?.name || 'tu empresa'}
            dismissed={bannerDismissed}
            onDismiss={() => {
              localStorage.setItem('plan_banner_dismissed', new Date().toDateString());
              setBannerDismissed(true);
            }}
          />
          {children}
        </main>
      </div>
    </div>
  );
}
