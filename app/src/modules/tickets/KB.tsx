import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, BookOpen, Plus, Loader2, Eye, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { api, cardStyle } from './shared';

interface Article { id: number; title: string; category_id: number | null; category_name?: string; views: number; updated_at: string; body?: string; author?: string }

export default function KnowledgeBase() {
  const { user } = useAuth();
  const isSup = ['super_admin', 'admin', 'manager'].includes(user?.role || '');
  const [list, setList] = useState<Article[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Article | null>(null);
  const [editing, setEditing] = useState<Article | null | undefined>(undefined);

  const load = useCallback(() => {
    setLoading(true);
    api<Article[]>(`/kb?${q ? `q=${encodeURIComponent(q)}` : ''}`).then(setList).finally(() => setLoading(false));
  }, [q]);
  useEffect(() => { const id = setTimeout(load, q ? 300 : 0); return () => clearTimeout(id); }, [load, q]);

  async function openArticle(id: number) {
    try { setOpen(await api<Article>(`/kb/${id}`)); } catch (e: any) { toast.error(e.message); }
  }
  async function del(id: number) {
    if (!confirm('¿Eliminar artículo?')) return;
    try { await api(`/kb/${id}`, { method: 'DELETE' }); load(); } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-start gap-3">
        <Link to="/tickets" className="size-9 flex items-center justify-center rounded-xl flex-shrink-0 tap-scale" style={{ border: '1px solid var(--ds-border)', color: 'var(--ds-text-muted)' }}><ArrowLeft size={16} /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold flex items-center gap-2" style={{ color: 'var(--ds-text)' }}><BookOpen size={22} /> Base de conocimiento</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>Artículos y guías de soporte</p>
        </div>
        {isSup && <button onClick={() => setEditing(null)} className="btn btn-primary flex-shrink-0"><Plus size={16} /> <span className="hidden sm:inline">Nuevo</span></button>}
      </div>

      <div className="rounded-2xl p-3 shadow-soft" style={cardStyle}>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ds-text-muted)' }} />
          <input className="input pl-9" placeholder="Buscar artículos…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--ds-text-muted)' }} /></div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl p-10 text-center shadow-soft" style={{ ...cardStyle, color: 'var(--ds-text-muted)' }}>
          <BookOpen size={30} className="mx-auto mb-2" style={{ color: 'var(--ds-border-strong)' }} /><p className="text-sm">Sin artículos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(a => (
            <div key={a.id} className="rounded-2xl p-4 shadow-soft flex items-center gap-3 tap-scale cursor-pointer" style={cardStyle} onClick={() => openArticle(a.id)}>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold truncate" style={{ color: 'var(--ds-text)' }}>{a.title}</p>
                <p className="text-[12px] mt-0.5 flex items-center gap-2" style={{ color: 'var(--ds-text-muted)' }}>
                  {a.category_name && <span>{a.category_name}</span>}
                  <span className="inline-flex items-center gap-1"><Eye size={11} /> {a.views}</span>
                </p>
              </div>
              {isSup && (
                <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openArticle(a.id).then(() => setEditing(a))} className="p-1.5 rounded-lg" style={{ color: 'var(--ds-text-muted)' }}><Pencil size={14} /></button>
                  <button onClick={() => del(a.id)} className="p-1.5 rounded-lg text-red-500"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Article reader */}
      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xl flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setOpen(null)}>
          <div className="rounded-t-3xl sm:rounded-3xl shadow-soft-xl w-full sm:max-w-lg p-5 sm:p-6 max-h-[92dvh] overflow-y-auto scroll-touch" style={{ ...cardStyle, paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--ds-text)' }}>{open.title}</h2>
              <button onClick={() => setOpen(null)} className="p-1.5 rounded-lg flex-shrink-0" style={{ color: 'var(--ds-text-muted)' }}><X size={18} /></button>
            </div>
            {open.category_name && <p className="text-[12px] mb-3" style={{ color: 'var(--ds-text-subtle)' }}>{open.category_name}</p>}
            <p className="text-[14px] whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--ds-text)' }}>{open.body}</p>
          </div>
        </div>
      )}

      {editing !== undefined && <ArticleEditor article={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load(); }} />}
    </div>
  );
}

function ArticleEditor({ article, onClose, onSaved }: { article: Article | null | undefined; onClose: () => void; onSaved: () => void }) {
  const [cats, setCats] = useState<{ id: number; name: string }[]>([]);
  const [f, setF] = useState({ title: article?.title || '', body: article?.body || '', category_id: article?.category_id ? String(article.category_id) : '' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  useEffect(() => { api('/config').then(d => setCats(d.categories || [])).catch(() => {}); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.title.trim() || !f.body.trim()) return toast.error('Título y contenido requeridos');
    setSaving(true);
    try {
      const body = JSON.stringify({ ...f, category_id: f.category_id || null });
      if (article) await api(`/kb/${article.id}`, { method: 'PUT', body });
      else await api('/kb', { method: 'POST', body });
      toast.success('Artículo guardado'); onSaved();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xl flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="rounded-t-3xl sm:rounded-3xl shadow-soft-xl w-full sm:max-w-lg p-5 sm:p-6 max-h-[92dvh] overflow-y-auto scroll-touch" style={{ ...cardStyle, paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <div className="sheet-handle" />
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--ds-text)' }}>{article ? 'Editar artículo' : 'Nuevo artículo'}</h2>
        <form onSubmit={submit} className="space-y-3">
          <div><label className="label">Título *</label><input className="input" value={f.title} onChange={e => set('title', e.target.value)} required /></div>
          <div><label className="label">Categoría</label><select className="input" value={f.category_id} onChange={e => set('category_id', e.target.value)}><option value="">Sin categoría</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="label">Contenido *</label><textarea className="input resize-none" rows={8} value={f.body} onChange={e => set('body', e.target.value)} required /></div>
          <div className="flex gap-3"><button type="button" onClick={onClose} className="flex-1 btn btn-ghost">Cancelar</button><button type="submit" disabled={saving} className="flex-1 btn btn-primary">{saving ? 'Guardando…' : 'Guardar'}</button></div>
        </form>
      </div>
    </div>
  );
}
