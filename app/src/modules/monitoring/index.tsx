import React, { useEffect, useState, useCallback } from 'react';
import { Activity, Cpu, MemoryStick, HardDrive, Wifi, WifiOff, AlertTriangle, RefreshCw, Key, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
function authFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('token');
  return fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) } });
}

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
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const statusConfig = {
    online:  { icon: Wifi,         cls: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Online' },
    warning: { icon: AlertTriangle, cls: 'text-amber-500',   bg: 'bg-amber-50',   label: 'Alerta' },
    offline: { icon: WifiOff,      cls: 'text-slate-400',   bg: 'bg-slate-100',  label: 'Offline' },
  }[agent.agent_status];
  const StatusIcon = statusConfig.icon;

  const uptime = agent.uptime_seconds
    ? `${Math.floor(agent.uptime_seconds / 3600)}h ${Math.floor((agent.uptime_seconds % 3600) / 60)}m`
    : '—';

  return (
    <div className={`bg-white rounded-xl border p-5 ${agent.agent_status === 'warning' ? 'border-amber-200' : agent.agent_status === 'offline' ? 'border-slate-100 opacity-70' : 'border-slate-100'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-semibold text-slate-900 text-sm">{agent.hostname || agent.agent_key}</p>
          <p className="text-xs text-slate-400">{agent.ip_address || '—'}</p>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.cls}`}>
          <StatusIcon size={12} />{statusConfig.label}
        </div>
      </div>

      {agent.agent_status !== 'offline' && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Cpu size={13} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-500 w-10">CPU</span>
            <div className="flex-1"><UsageBar value={agent.cpu_usage} color={agent.cpu_usage > 80 ? '#EF4444' : '#6366F1'} /></div>
          </div>
          <div className="flex items-center gap-2">
            <MemoryStick size={13} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-500 w-10">RAM</span>
            <div className="flex-1"><UsageBar value={agent.ram_usage} color={agent.ram_usage > 80 ? '#EF4444' : '#0EA5E9'} /></div>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive size={13} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-500 w-10">Disco</span>
            <div className="flex-1"><UsageBar value={agent.disk_usage} color={agent.disk_usage > 80 ? '#EF4444' : '#10B981'} /></div>
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
        <p className="text-xs text-slate-400">{agent.os_info?.split(' ').slice(0,2).join(' ') || '—'}</p>
        <p className="text-xs text-slate-400">Uptime: {uptime}</p>
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
          <h1 className="text-2xl font-bold text-slate-900">Monitoreo</h1>
          <p className="text-slate-500 text-sm mt-0.5">Estado en tiempo real de los equipos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView(view === 'agents' ? 'tokens' : 'agents')} className="btn btn-ghost">
            {view === 'agents' ? <><Key size={15} /> Tokens</> : <><Activity size={15} /> Agentes</>}
          </button>
          <button onClick={load} className="btn btn-ghost"><RefreshCw size={15} /></button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, cls: 'text-slate-900' },
            { label: 'Online',  value: stats.online,  cls: 'text-emerald-600' },
            { label: 'Alerta',  value: stats.warning, cls: 'text-amber-600' },
            { label: 'Offline', value: stats.offline, cls: 'text-slate-400' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-soft text-center">
              <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {view === 'agents' ? (
        loading ? (
          <div className="text-center py-12 text-slate-400">Cargando...</div>
        ) : agents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 text-center py-16">
            <Activity size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Sin agentes registrados</p>
            <p className="text-slate-400 text-sm mt-1">Crea un token e instala el agente en los equipos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map(a => <AgentCard key={a.id} agent={a} />)}
          </div>
        )
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Tokens de Agente</h2>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="Etiqueta del token..." value={newTokenLabel} onChange={e => setNewTokenLabel(e.target.value)} />
            {canWrite('monitoring') && <button onClick={createToken} className="btn btn-primary"><Plus size={15} /> Crear Token</button>}
          </div>
          <div className="divide-y divide-slate-100">
            {tokens.map(t => (
              <div key={t.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">{t.label || 'Sin etiqueta'}</p>
                  <span className={`badge ${t.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                    {t.is_active ? 'Activo' : 'Revocado'}
                  </span>
                </div>
                {t.is_active && canDelete('monitoring') && (
                  <button onClick={() => revokeToken(t.id)} className="btn btn-ghost text-xs text-red-500 hover:bg-red-50">Revocar</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
