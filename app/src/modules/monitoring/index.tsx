import React, { useEffect, useState, useCallback } from 'react';
import { Activity, Cpu, MemoryStick, HardDrive, Wifi, WifiOff, AlertTriangle, RefreshCw, Key, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
function authFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('token');
  return fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) } });
}
const cardStyle = { background: 'var(--ds-card)', border: '1px solid var(--ds-border)' };

interface Agent {
  id: number; agent_key: string; hostname: string; ip_address: string;
  os_info: string; processor: string; cpu_usage: number; ram_usage: number;
  disk_usage: number; uptime_seconds: number; last_heartbeat: string;
  agent_status: 'online' | 'offline' | 'warning';
  serial_number: string | null; brand: string | null; model: string | null;
}
interface Stats { total: number; online: number; offline: number; warning: number; }

function UsageBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--ds-text-muted)' }}>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ds-border)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const statusConfig = {
    online:  { icon: Wifi,          bg: 'rgba(16,185,129,0.12)',  color: '#10B981',              label: 'Online' },
    warning: { icon: AlertTriangle, bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B',              label: 'Alerta' },
    offline: { icon: WifiOff,       bg: 'var(--ds-card-alt)',     color: 'var(--ds-text-muted)', label: 'Offline' },
  }[agent.agent_status];
  const StatusIcon = statusConfig.icon;

  const uptime = agent.uptime_seconds
    ? `${Math.floor(agent.uptime_seconds / 3600)}h ${Math.floor((agent.uptime_seconds % 3600) / 60)}m`
    : '—';

  const borderColor = agent.agent_status === 'warning' ? 'rgba(245,158,11,0.4)' : 'var(--ds-border)';

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--ds-card)', border: `1px solid ${borderColor}`, opacity: agent.agent_status === 'offline' ? 0.7 : 1 }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--ds-text)' }}>{agent.hostname || agent.agent_key}</p>
          <p className="text-xs" style={{ color: 'var(--ds-text-subtle)' }}>{agent.ip_address || '—'}</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: statusConfig.bg, color: statusConfig.color }}>
          <StatusIcon size={12} />{statusConfig.label}
        </div>
      </div>

      {agent.agent_status !== 'offline' && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Cpu size={13} className="flex-shrink-0" style={{ color: 'var(--ds-text-subtle)' }} />
            <span className="text-xs w-10" style={{ color: 'var(--ds-text-muted)' }}>CPU</span>
            <div className="flex-1"><UsageBar value={agent.cpu_usage} color={agent.cpu_usage > 80 ? '#EF4444' : '#6366F1'} /></div>
          </div>
          <div className="flex items-center gap-2">
            <MemoryStick size={13} className="flex-shrink-0" style={{ color: 'var(--ds-text-subtle)' }} />
            <span className="text-xs w-10" style={{ color: 'var(--ds-text-muted)' }}>RAM</span>
            <div className="flex-1"><UsageBar value={agent.ram_usage} color={agent.ram_usage > 80 ? '#EF4444' : '#0EA5E9'} /></div>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive size={13} className="flex-shrink-0" style={{ color: 'var(--ds-text-subtle)' }} />
            <span className="text-xs w-10" style={{ color: 'var(--ds-text-muted)' }}>Disco</span>
            <div className="flex-1"><UsageBar value={agent.disk_usage} color={agent.disk_usage > 80 ? '#EF4444' : '#10B981'} /></div>
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--ds-border)' }}>
        <p className="text-xs" style={{ color: 'var(--ds-text-subtle)' }}>{agent.os_info?.split(' ').slice(0,2).join(' ') || '—'}</p>
        <p className="text-xs" style={{ color: 'var(--ds-text-subtle)' }}>Uptime: {uptime}</p>
      </div>
    </div>
  );
}

export default function MonitoringModule() {
  const { canWrite, canDelete } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats]   = useState<Stats | null>(null);
  const [tokens, setTokens] = useState<{id: number; label: string; is_active: boolean}[]>([]);
  const [view, setView]     = useState<'agents' | 'tokens'>('agents');
  const [loading, setLoading] = useState(true);
  const [newTokenLabel, setNewTokenLabel] = useState('');

  const load = useCallback(() => {
    authFetch('/monitoring/agents').then(r => r.json()).then(d => { setAgents(Array.isArray(d) ? d : []); setLoading(false); });
    authFetch('/monitoring/stats').then(r => r.json()).then(setStats);
  }, []);

  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv); }, [load]);

  useEffect(() => {
    if (view === 'tokens') {
      authFetch('/monitoring/tokens').then(r => r.json()).then(setTokens);
    }
  }, [view]);

  async function createToken() {
    if (!newTokenLabel) return;
    const r = await authFetch('/monitoring/tokens', { method: 'POST', body: JSON.stringify({ label: newTokenLabel }) });
    const d = await r.json();
    toast.success(`Token creado: ${d.token}`);
    setNewTokenLabel('');
    authFetch('/monitoring/tokens').then(r => r.json()).then(setTokens);
  }

  async function revokeToken(id: number) {
    await authFetch(`/monitoring/tokens/${id}`, { method: 'DELETE' });
    toast.success('Token revocado');
    authFetch('/monitoring/tokens').then(r => r.json()).then(setTokens);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ds-text)' }}>Monitoreo</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>Estado en tiempo real de los equipos</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setView(view === 'agents' ? 'tokens' : 'agents')} className="btn btn-ghost">
            {view === 'agents' ? <><Key size={15} /> Tokens</> : <><Activity size={15} /> Agentes</>}
          </button>
          <button type="button" onClick={load} className="btn btn-ghost"><RefreshCw size={15} /></button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total',   value: stats.total,   color: 'var(--ds-text)' },
            { label: 'Online',  value: stats.online,  color: '#10B981' },
            { label: 'Alerta',  value: stats.warning, color: '#F59E0B' },
            { label: 'Offline', value: stats.offline, color: 'var(--ds-text-subtle)' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 shadow-soft text-center" style={cardStyle}>
              <p className="text-2xl font-semibold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {view === 'agents' ? (
        loading ? (
          <div className="text-center py-12" style={{ color: 'var(--ds-text-muted)' }}>Cargando…</div>
        ) : agents.length === 0 ? (
          <div className="rounded-2xl text-center py-16" style={cardStyle}>
            <Activity size={32} className="mx-auto mb-3" style={{ color: 'var(--ds-border)' }} />
            <p className="font-medium" style={{ color: 'var(--ds-text-muted)' }}>Sin agentes registrados</p>
            <p className="text-sm mt-1" style={{ color: 'var(--ds-text-subtle)' }}>Crea un token e instala el agente en los equipos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map(a => <AgentCard key={a.id} agent={a} />)}
          </div>
        )
      ) : (
        <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
          <h2 className="font-semibold" style={{ color: 'var(--ds-text)' }}>Tokens de Agente</h2>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="Etiqueta del token…" value={newTokenLabel} onChange={e => setNewTokenLabel(e.target.value)} />
            {canWrite('monitoring') && <button type="button" onClick={createToken} className="btn btn-primary"><Plus size={15} /> Crear Token</button>}
          </div>
          <div>
            {tokens.map((t, i) => (
              <div key={t.id} className="py-3 flex items-center justify-between" style={{ borderTop: i > 0 ? '1px solid var(--ds-border)' : 'none' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--ds-text)' }}>{t.label || 'Sin etiqueta'}</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                    style={t.is_active ? { background: 'rgba(16,185,129,0.12)', color: '#10B981' } : { background: 'var(--ds-card-alt)', color: 'var(--ds-text-subtle)' }}>
                    {t.is_active ? 'Activo' : 'Revocado'}
                  </span>
                </div>
                {t.is_active && canDelete('monitoring') && (
                  <button type="button" onClick={() => revokeToken(t.id)} className="btn btn-ghost text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">Revocar</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
