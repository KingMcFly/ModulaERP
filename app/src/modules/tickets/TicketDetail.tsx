import { useEffect, useRef, useState, useCallback, type FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Send, Lock, Loader2, UserCheck, ArrowUpCircle, CheckCircle2,
  RotateCcw, XCircle, Star, History, ChevronDown, AlertTriangle, Clock,
  Paperclip, Download, Trash2, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import {
  api, cardStyle, TicketDetail as TD, StatusBadge, PriorityBadge, LevelBadge, TypeBadge, SlaBadge,
  STATUS_CFG, LEVEL_CFG, RESOLUTION_TYPES, IMPACT_OPTS, URGENCY_OPTS, fmtDateTime, timeAgo, dueLabel,
  uploadAttachment, openAttachment, fmtBytes,
} from './shared';

const AGENT_STATUSES = ['in_progress', 'waiting_user', 'waiting_vendor', 'open'];

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, canWrite } = useAuth();
  const isAgent = canWrite('tickets');
  const navigate = useNavigate();

  const [t, setT] = useState<TD | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [modal, setModal] = useState<null | 'escalate' | 'resolve' | 'rate'>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [templates, setTemplates] = useState<{ id: number; title: string; body: string }[]>([]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('El archivo supera 5 MB'); return; }
    setUploading(true);
    try { await uploadAttachment(id!, file); load(); }
    catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }
  async function delAtt(attId: number) {
    if (!confirm('¿Eliminar este adjunto?')) return;
    try { await api(`/${id}/attachments/${attId}`, { method: 'DELETE' }); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  const load = useCallback(() => {
    api<TD>(`/${id}`).then(setT).catch(e => { toast.error(e.message); }).finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (isAgent) api('/config').then(d => setTemplates(d.templates || [])).catch(() => {}); }, [isAgent]);

  const isReporter = !!t && t.reported_by === user?.id;

  async function act(path: string, body?: any, method = 'POST') {
    try { await api(`/${id}${path}`, { method, body: body ? JSON.stringify(body) : undefined }); load(); }
    catch (e: any) { toast.error(e.message); }
  }
  async function sendComment(e: FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSending(true);
    try { await api(`/${id}/comments`, { method: 'POST', body: JSON.stringify({ comment, is_internal: internal }) }); setComment(''); setInternal(false); load(); }
    catch (e: any) { toast.error(e.message); }
    finally { setSending(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={22} className="animate-spin" style={{ color: 'var(--ds-text-muted)' }} /></div>;
  if (!t) return (
    <div className="text-center py-16"><p style={{ color: 'var(--ds-text-muted)' }}>Ticket no encontrado</p>
      <Link to="/tickets" className="text-sm mt-2 inline-block" style={{ color: 'var(--ds-accent)' }}>← Volver</Link></div>
  );

  const isOpen = !['resolved', 'closed', 'cancelled'].includes(t.status);
  const slaDue = t.resolution_due ? dueLabel(t.resolution_due) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="size-9 flex items-center justify-center rounded-xl flex-shrink-0 tap-scale" style={{ border: '1px solid var(--ds-border)', color: 'var(--ds-text-muted)' }}>
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-mono font-semibold px-2 py-0.5 rounded-md" style={{ background: 'var(--ds-card-alt)', color: 'var(--ds-text-muted)' }}>{t.ticket_number}</span>
            <TypeBadge type={t.type} />
            {t.reopened_count > 0 && <span className="text-[11px] font-semibold" style={{ color: '#F97316' }}>Reabierto ×{t.reopened_count}</span>}
          </div>
          <h1 className="text-[19px] sm:text-[22px] font-semibold mt-1.5 leading-snug" style={{ color: 'var(--ds-text)' }}>{t.title}</h1>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-4">
        {/* ── Side panel (first on mobile) ── */}
        <aside className="lg:order-last space-y-3 order-first">
          {/* SLA */}
          <div className="rounded-2xl p-4 shadow-soft" style={cardStyle}>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ds-text-subtle)' }}>SLA</span>
              <SlaBadge status={t.sla_status} />
            </div>
            {slaDue && (
              <div className="flex items-center gap-2 text-[13px]" style={{ color: t.sla_status === 'breached' ? '#EF4444' : 'var(--ds-text)' }}>
                <Clock size={14} /> Resolución {slaDue}
              </div>
            )}
            {t.sla_status === 'breached' && (
              <div className="flex items-center gap-1.5 mt-2 text-[12px] font-semibold" style={{ color: '#EF4444' }}><AlertTriangle size={13} /> SLA vencido</div>
            )}
          </div>

          {/* Properties */}
          <div className="rounded-2xl p-4 shadow-soft space-y-2.5 text-[13px]" style={cardStyle}>
            <Prop label="Estado"><StatusBadge status={t.status} /></Prop>
            <Prop label="Prioridad"><PriorityBadge priority={t.priority} /></Prop>
            <Prop label="Nivel"><LevelBadge level={t.level} /></Prop>
            <Prop label="Categoría"><span style={{ color: 'var(--ds-text)' }}>{t.category_name || '—'}</span></Prop>
            <Prop label="Impacto"><span className="capitalize" style={{ color: 'var(--ds-text)' }}>{IMPACT_OPTS.find(o => o[0] === t.impact)?.[1]}</span></Prop>
            <Prop label="Urgencia"><span className="capitalize" style={{ color: 'var(--ds-text)' }}>{URGENCY_OPTS.find(o => o[0] === t.urgency)?.[1]}</span></Prop>
            <div className="h-px my-1" style={{ background: 'var(--ds-border)' }} />
            {t.asset_id && (
              <Prop label="Equipo">
                <Link to={`/inventory/asset/${t.asset_id}`} className="text-right truncate max-w-[160px]" style={{ color: 'var(--ds-accent)' }}>
                  {[t.asset_type, t.brand, t.model].filter(Boolean).join(' ') || `#${t.asset_id}`}
                </Link>
              </Prop>
            )}
            <Prop label="Solicitante"><span style={{ color: 'var(--ds-text)' }}>{t.reporter_name || '—'}</span></Prop>
            <Prop label="Asignado"><span style={{ color: t.assignee_name ? 'var(--ds-text)' : 'var(--ds-text-subtle)' }}>{t.assignee_name || 'Sin asignar'}</span></Prop>
            <Prop label="Creado"><span style={{ color: 'var(--ds-text-muted)' }}>{fmtDateTime(t.created_at)}</span></Prop>
          </div>

          {/* Actions */}
          <div className="rounded-2xl p-3 shadow-soft space-y-2" style={cardStyle}>
            {isAgent && isOpen && (
              <>
                {!t.assigned_to && <ActBtn icon={UserCheck} label="Tomar ticket" onClick={() => act('/assign', {})} accent />}
                <div className="relative">
                  <select value="" onChange={e => e.target.value && act('/status', { status: e.target.value }, 'PATCH')}
                    className="input appearance-none pr-9 text-[13px] font-semibold cursor-pointer">
                    <option value="">Cambiar estado…</option>
                    {AGENT_STATUSES.filter(s => s !== t.status).map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
                  </select>
                  <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ds-text-muted)' }} />
                </div>
                <ActBtn icon={ArrowUpCircle} label="Escalar nivel" onClick={() => setModal('escalate')} />
                <ActBtn icon={CheckCircle2} label="Resolver" onClick={() => setModal('resolve')} color="#10B981" />
              </>
            )}
            {(isAgent || isReporter) && (t.status === 'resolved' || t.status === 'closed') && (
              <ActBtn icon={RotateCcw} label="Reabrir" onClick={() => act('/reopen', {})} color="#F97316" />
            )}
            {(isAgent || isReporter) && isOpen && (
              <ActBtn icon={XCircle} label="Cerrar" onClick={() => act('/close', {})} />
            )}
            {isReporter && (t.status === 'resolved' || t.status === 'closed') && !t.rating && (
              <ActBtn icon={Star} label="Calificar atención" onClick={() => setModal('rate')} color="#F59E0B" />
            )}
            {t.rating && (
              <div className="flex items-center gap-1 px-3 py-2 text-[13px]" style={{ color: 'var(--ds-text-muted)' }}>
                Calificación: {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={13} className={i < t.rating!.score ? 'fill-amber-400 text-amber-400' : ''} style={{ color: i < t.rating!.score ? '#F59E0B' : 'var(--ds-border-strong)' }} />)}
              </div>
            )}
          </div>
        </aside>

        {/* ── Main column ── */}
        <main className="space-y-4 min-w-0">
          {/* Description */}
          {t.description && (
            <div className="rounded-2xl p-4 shadow-soft" style={cardStyle}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ds-text-subtle)' }}>Descripción</p>
              <p className="text-[14px] whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--ds-text)' }}>{t.description}</p>
            </div>
          )}

          {/* Resolution */}
          {t.resolution_note && (
            <div className="rounded-2xl p-4 shadow-soft" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.22)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#10B981' }}>Solución · {RESOLUTION_TYPES[t.resolution_type || ''] || t.resolution_type}</p>
              <p className="text-[14px] whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--ds-text)' }}>{t.resolution_note}</p>
            </div>
          )}

          {/* Attachments */}
          <div className="rounded-2xl p-4 shadow-soft" style={cardStyle}>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ds-text-subtle)' }}>Adjuntos</p>
              {(isAgent || isReporter) && (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold tap-scale disabled:opacity-50" style={{ color: 'var(--ds-accent)' }}>
                  {uploading ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />} Adjuntar
                </button>
              )}
              <input ref={fileRef} type="file" className="hidden" onChange={handleFile} accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" />
            </div>
            {t.attachments.length === 0 ? (
              <p className="text-[13px]" style={{ color: 'var(--ds-text-subtle)' }}>Sin archivos adjuntos.</p>
            ) : (
              <div className="space-y-1.5">
                {t.attachments.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl" style={{ background: 'var(--ds-card-alt)' }}>
                    <FileText size={15} style={{ color: 'var(--ds-text-muted)' }} className="flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate" style={{ color: 'var(--ds-text)' }}>{a.file_name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--ds-text-subtle)' }}>{fmtBytes(a.size_bytes)}{a.uploaded_by_name ? ` · ${a.uploaded_by_name}` : ''}</p>
                    </div>
                    <button type="button" onClick={() => openAttachment(id!, a.id).catch(e => toast.error(e.message))} className="p-1.5 rounded-lg tap-scale" style={{ color: 'var(--ds-text-muted)' }} aria-label="Abrir"><Download size={15} /></button>
                    {(isAgent || isReporter) && <button type="button" onClick={() => delAtt(a.id)} className="p-1.5 rounded-lg text-red-500 tap-scale" aria-label="Eliminar"><Trash2 size={14} /></button>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Conversation */}
          <div className="rounded-2xl p-4 shadow-soft" style={cardStyle}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--ds-text-subtle)' }}>Conversación</p>
            <div className="space-y-3">
              {t.comments.length === 0 && <p className="text-[13px] py-3" style={{ color: 'var(--ds-text-subtle)' }}>Sin mensajes aún.</p>}
              {t.comments.map(c => (
                <div key={c.id} className="rounded-xl p-3" style={c.is_internal
                  ? { background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }
                  : { background: 'var(--ds-card-alt)', border: '1px solid var(--ds-border)' }}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--ds-text)' }}>{c.author}</span>
                    <div className="flex items-center gap-2">
                      {c.is_internal && <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.15)', color: '#D97706' }}><Lock size={9} /> Nota interna</span>}
                      <span className="text-[11px]" style={{ color: 'var(--ds-text-subtle)' }}>{timeAgo(c.created_at)}</span>
                    </div>
                  </div>
                  <p className="text-[13.5px] whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--ds-text)' }}>{c.comment}</p>
                </div>
              ))}
            </div>

            {/* Composer */}
            {(isAgent || isReporter) && (
              <form onSubmit={sendComment} className="mt-4">
                {isAgent && templates.length > 0 && (
                  <select className="input mb-2 text-[13px]" value=""
                    onChange={e => { const tpl = templates.find(x => String(x.id) === e.target.value); if (tpl) setComment(c => c ? `${c}\n${tpl.body}` : tpl.body); }}>
                    <option value="">Insertar plantilla de respuesta…</option>
                    {templates.map(tp => <option key={tp.id} value={tp.id}>{tp.title}</option>)}
                  </select>
                )}
                <textarea className="input resize-none" rows={3} placeholder={internal ? 'Nota interna (solo técnicos)…' : 'Escribe un comentario…'}
                  value={comment} onChange={e => setComment(e.target.value)}
                  style={internal ? { borderColor: 'rgba(245,158,11,0.4)' } : undefined} />
                <div className="flex items-center justify-between gap-2 mt-2">
                  {isAgent ? (
                    <button type="button" onClick={() => setInternal(v => !v)}
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg tap-scale"
                      style={{ background: internal ? 'rgba(245,158,11,0.12)' : 'var(--ds-card-alt)', color: internal ? '#D97706' : 'var(--ds-text-muted)' }}>
                      <Lock size={13} /> {internal ? 'Nota interna' : 'Comentario público'}
                    </button>
                  ) : <span />}
                  <button type="submit" disabled={sending || !comment.trim()} className="btn btn-primary">
                    {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Enviar
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Escalations */}
          {t.escalations.length > 0 && (
            <div className="rounded-2xl p-4 shadow-soft" style={cardStyle}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: 'var(--ds-text-subtle)' }}>Escalamientos</p>
              <div className="space-y-2">
                {t.escalations.map(e => (
                  <div key={e.id} className="text-[13px] flex items-start gap-2">
                    <ArrowUpCircle size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#8B5CF6' }} />
                    <div>
                      <span style={{ color: 'var(--ds-text)' }}>{(e.from_level || '—').toUpperCase()} → {e.to_level.toUpperCase()}</span>
                      <span className="text-[11px] ml-2" style={{ color: 'var(--ds-text-subtle)' }}>{timeAgo(e.created_at)} · {e.from_name}</span>
                      <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>{e.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History (agents) */}
          {isAgent && t.history.length > 0 && (
            <div className="rounded-2xl p-4 shadow-soft" style={cardStyle}>
              <button onClick={() => setShowHistory(v => !v)} className="w-full flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: 'var(--ds-text-subtle)' }}><History size={13} /> Auditoría ({t.history.length})</span>
                <ChevronDown size={16} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} style={{ color: 'var(--ds-text-muted)' }} />
              </button>
              {showHistory && (
                <div className="mt-3 space-y-2 text-[12.5px]">
                  {t.history.map(h => (
                    <div key={h.id} className="flex items-start gap-2">
                      <span className="size-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--ds-border-strong)' }} />
                      <div>
                        <span style={{ color: 'var(--ds-text)' }}>{auditText(h)}</span>
                        <span className="text-[11px] ml-2" style={{ color: 'var(--ds-text-subtle)' }}>{h.actor_name} · {fmtDateTime(h.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {modal === 'escalate' && <EscalateModal current={t.level} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} id={id!} />}
      {modal === 'resolve' && <ResolveModal onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} id={id!} />}
      {modal === 'rate' && <RateModal onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} id={id!} />}
    </div>
  );
}

// ── Small pieces ──────────────────────────────────────────────────────────────
function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-2"><span style={{ color: 'var(--ds-text-subtle)' }}>{label}</span>{children}</div>;
}
function ActBtn({ icon: Icon, label, onClick, accent, color }: { icon: any; label: string; onClick: () => void; accent?: boolean; color?: string }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold tap-scale"
      style={accent
        ? { background: 'var(--ds-accent)', color: 'var(--ds-accent-text)' }
        : { background: 'var(--ds-card-alt)', color: color || 'var(--ds-text)' }}>
      <Icon size={15} style={color ? { color } : undefined} /> {label}
    </button>
  );
}
function auditText(h: any) {
  const map: Record<string, string> = {
    created: 'Ticket creado', status: `Estado → ${STATUS_CFG[h.new_value]?.label || h.new_value}`,
    priority: `Prioridad → ${h.new_value}`, assigned: 'Asignación actualizada',
    escalated: `Escalado a ${(h.new_value || '').toUpperCase()}`, comment: h.new_value === 'nota interna' ? 'Nota interna agregada' : 'Comentario agregado',
    resolved: 'Ticket resuelto', closed: 'Ticket cerrado', reopened: 'Ticket reabierto',
  };
  return map[h.action] || h.action;
}

// ── Modals ────────────────────────────────────────────────────────────────────
function Sheet({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xl flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="rounded-t-3xl sm:rounded-3xl shadow-soft-xl w-full sm:max-w-md p-5 sm:p-6 max-h-[92dvh] overflow-y-auto scroll-touch" style={{ ...cardStyle, paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <div className="sheet-handle" />
        {children}
      </div>
    </div>
  );
}
function EscalateModal({ current, id, onClose, onDone }: { current: string; id: string; onClose: () => void; onDone: () => void }) {
  const [to, setTo] = useState(current === 'n1' ? 'n2' : current === 'n2' ? 'n3' : 'n2');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  async function go(e: FormEvent) {
    e.preventDefault(); if (!reason.trim()) return toast.error('El motivo es obligatorio'); setSaving(true);
    try { await api(`/${id}/escalate`, { method: 'POST', body: JSON.stringify({ to_level: to, reason }) }); toast.success('Escalado'); onDone(); }
    catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  }
  return (
    <Sheet>
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--ds-text)' }}>Escalar ticket</h2>
      <form onSubmit={go} className="space-y-4">
        <div>
          <label className="label">Nivel destino</label>
          <div className="flex gap-2">
            {(['n1', 'n2', 'n3'] as const).map(lv => (
              <button key={lv} type="button" onClick={() => setTo(lv)} disabled={lv === current}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold tap-scale disabled:opacity-40"
                style={{ background: to === lv ? LEVEL_CFG[lv].bg : 'var(--ds-card-alt)', color: to === lv ? LEVEL_CFG[lv].color : 'var(--ds-text-muted)', border: `1.5px solid ${to === lv ? LEVEL_CFG[lv].color : 'var(--ds-border)'}` }}>
                {LEVEL_CFG[lv].label}
              </button>
            ))}
          </div>
        </div>
        <div><label className="label">Motivo del escalamiento *</label><textarea className="input resize-none" rows={3} value={reason} onChange={e => setReason(e.target.value)} required placeholder="Explica por qué se escala…" /></div>
        <div className="flex gap-3"><button type="button" onClick={onClose} className="flex-1 btn btn-ghost">Cancelar</button><button type="submit" disabled={saving} className="flex-1 btn btn-primary">{saving ? 'Escalando…' : 'Escalar'}</button></div>
      </form>
    </Sheet>
  );
}
function ResolveModal({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [rtype, setRtype] = useState('resolved_permanent');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  async function go(e: FormEvent) {
    e.preventDefault(); if (!note.trim()) return toast.error('El resumen es obligatorio'); setSaving(true);
    try { await api(`/${id}/resolve`, { method: 'POST', body: JSON.stringify({ resolution_type: rtype, resolution_note: note }) }); toast.success('Ticket resuelto'); onDone(); }
    catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  }
  return (
    <Sheet>
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--ds-text)' }}>Resolver ticket</h2>
      <form onSubmit={go} className="space-y-4">
        <div><label className="label">Tipo de solución</label>
          <select className="input" value={rtype} onChange={e => setRtype(e.target.value)}>
            {Object.entries(RESOLUTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        <div><label className="label">Resumen de la solución *</label><textarea className="input resize-none" rows={4} value={note} onChange={e => setNote(e.target.value)} required placeholder="Describe cómo se resolvió…" /></div>
        <div className="flex gap-3"><button type="button" onClick={onClose} className="flex-1 btn btn-ghost">Cancelar</button><button type="submit" disabled={saving} className="flex-1 btn btn-primary">{saving ? 'Resolviendo…' : 'Resolver'}</button></div>
      </form>
    </Sheet>
  );
}
function RateModal({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  async function go(e: FormEvent) {
    e.preventDefault(); if (!score) return toast.error('Selecciona una puntuación'); setSaving(true);
    try { await api(`/${id}/rate`, { method: 'POST', body: JSON.stringify({ score, comment }) }); toast.success('¡Gracias por tu evaluación!'); onDone(); }
    catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  }
  return (
    <Sheet>
      <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--ds-text)' }}>¿Cómo fue la atención?</h2>
      <p className="text-sm mb-4" style={{ color: 'var(--ds-text-muted)' }}>Tu opinión nos ayuda a mejorar.</p>
      <form onSubmit={go} className="space-y-4">
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" onClick={() => setScore(n)} className="tap-scale">
              <Star size={34} style={{ color: n <= score ? '#F59E0B' : 'var(--ds-border-strong)', fill: n <= score ? '#F59E0B' : 'transparent' }} />
            </button>
          ))}
        </div>
        <textarea className="input resize-none" rows={3} placeholder="Comentario (opcional)…" value={comment} onChange={e => setComment(e.target.value)} />
        <div className="flex gap-3"><button type="button" onClick={onClose} className="flex-1 btn btn-ghost">Cancelar</button><button type="submit" disabled={saving} className="flex-1 btn btn-primary">{saving ? 'Enviando…' : 'Enviar'}</button></div>
      </form>
    </Sheet>
  );
}
