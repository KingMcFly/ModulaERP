import { Settings, Shield, Globe, Bell, Palette, Terminal, Database, Cpu, Server, ChevronRight, Clock } from 'lucide-react';

const sections = [
  {
    icon: Shield,
    title: 'Seguridad',
    description: 'Política de contraseñas, autenticación de dos factores y gestión de sesiones.',
    color: '#7c3aed',
    bg: 'rgba(139,92,246,0.09)',
    soon: true,
  },
  {
    icon: Globe,
    title: 'Regional',
    description: 'Zona horaria, idioma predeterminado y formato de fechas y números.',
    color: '#2563eb',
    bg: 'rgba(59,130,246,0.09)',
    soon: true,
  },
  {
    icon: Bell,
    title: 'Notificaciones',
    description: 'Configuración de alertas por correo electrónico y eventos críticos del sistema.',
    color: '#d97706',
    bg: 'rgba(245,158,11,0.09)',
    soon: true,
  },
  {
    icon: Palette,
    title: 'Apariencia',
    description: 'Personalización de tema, logotipo corporativo y colores del panel de control.',
    color: '#059669',
    bg: 'rgba(16,185,129,0.09)',
    soon: true,
  },
];

const sysInfo = [
  { icon: Terminal, label: 'Versión',        value: '1.0.0',      color: '#F2B045' },
  { icon: Server,   label: 'Entorno',        value: 'Producción', color: '#10b981' },
  { icon: Database, label: 'Base de datos',  value: 'PostgreSQL', color: '#0ea5e9' },
  { icon: Cpu,      label: 'Node.js',        value: 'v24',        color: '#f59e0b' },
];

export default function AdminSettings() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="animate-fade-up">
        <h1 className="text-[24px] font-bold text-slate-900 tracking-[-0.03em]">Configuración del sistema</h1>
        <p className="text-slate-400 text-[13px] mt-0.5 font-medium">Ajustes globales de la plataforma FB Core</p>
      </div>

      {/* Settings cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map(({ icon: Icon, title, description, color, bg, soon }, i) => (
          <div
            key={title}
            className="bg-white rounded-2xl p-5 flex items-start gap-4 animate-fade-up relative overflow-hidden"
            style={{
              border: '1px solid rgba(0,0,0,0.05)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              animationDelay: `${i * 55}ms`,
              opacity: soon ? 0.72 : 1,
            }}
          >
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: bg }}
            >
              <Icon size={20} style={{ color }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold text-slate-900 text-[14px] tracking-[-0.02em]">{title}</p>
                {soon && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold"
                    style={{ background: 'rgba(100,116,139,0.10)', color: '#64748b' }}>
                    <Clock size={8} /> Próximamente
                  </span>
                )}
              </div>
              <p className="text-[12px] text-slate-400 font-medium leading-relaxed">{description}</p>
            </div>
            {!soon && (
              <ChevronRight size={16} className="text-slate-300 flex-shrink-0 mt-0.5" />
            )}
          </div>
        ))}
      </div>

      {/* System info */}
      <div
        className="rounded-2xl p-6 animate-fade-up delay-200"
        style={{ background: '#0A0A12', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <Settings size={15} className="text-slate-300" />
          </div>
          <span className="font-bold text-white text-[14px] tracking-[-0.02em]">Información del sistema</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {sysInfo.map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={12} style={{ color: 'rgba(255,255,255,0.35)' }} />
                <p className="text-[10.5px] font-bold uppercase tracking-[0.07em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {label}
                </p>
              </div>
              <p className="font-bold text-white text-[13px] font-mono tracking-tight">{value}</p>
              <div className="mt-1.5 h-0.5 rounded-full w-8" style={{ background: color, opacity: 0.5 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
