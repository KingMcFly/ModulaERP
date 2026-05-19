import React, { useEffect, useState, useRef } from 'react';
import { Paperclip, Upload, Trash2, Download, FileText, Image, File, X } from 'lucide-react';
import { toast } from 'sonner';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

interface Attachment {
  id: number;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  uploader_name?: string;
}

interface Props {
  entity: 'asset' | 'loan' | 'maintenance' | 'personnel' | 'supply';
  entityId: number;
}

function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return <Image size={16} className="text-blue-500" aria-hidden="true" />;
  if (mime === 'application/pdf') return <FileText size={16} className="text-red-500" aria-hidden="true" />;
  return <File size={16} className="text-slate-400" aria-hidden="true" />;
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AttachmentPanel({ entity, entityId }: Props) {
  const [items, setItems]       = useState<Attachment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const token = localStorage.getItem('token');

  function load() {
    setLoading(true);
    fetch(`${API}/attachments/${entity}/${entityId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, [entity, entityId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('El archivo no puede superar 10 MB'); return; }

    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);

    try {
      const r = await fetch(`${API}/attachments/${entity}/${entityId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Error al subir');
      toast.success('Archivo adjuntado');
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    try {
      const r = await fetch(`${API}/attachments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error('Error al eliminar');
      toast.success('Archivo eliminado');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function handleDownload(id: number, name: string) {
    const a = document.createElement('a');
    a.href = `${API}/attachments/${entity}/${entityId}/${id}`;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip size={15} className="text-slate-500" aria-hidden="true" />
          <span className="text-sm font-semibold text-slate-700">Adjuntos</span>
          {items.length > 0 && (
            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">{items.length}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <Upload size={12} aria-hidden="true" />
          {uploading ? 'Subiendo...' : 'Adjuntar'}
        </button>
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          aria-label="Adjuntar archivo"
          onChange={handleUpload}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
        />
      </div>

      {loading ? (
        <div className="text-xs text-slate-400 py-3 text-center">Cargando adjuntos...</div>
      ) : items.length === 0 ? (
        <div className="border-2 border-dashed border-slate-100 rounded-xl py-6 flex flex-col items-center gap-2">
          <Paperclip size={20} className="text-slate-300" aria-hidden="true" />
          <p className="text-xs text-slate-400">Sin adjuntos · Haz clic en "Adjuntar"</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors group">
              <div className="flex-shrink-0">{fileIcon(item.mime_type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-800 truncate">{item.file_name}</p>
                <p className="text-[10px] text-slate-400">
                  {fmtSize(item.file_size)} · {fmtDate(item.created_at)}
                  {item.uploader_name ? ` · ${item.uploader_name}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDownload(item.id, item.file_name)}
                  aria-label={`Descargar ${item.file_name}`}
                  className="p-1 text-slate-400 hover:text-primary-600 rounded"
                >
                  <Download size={13} aria-hidden="true" />
                </button>
                <button
                  onClick={() => handleDelete(item.id, item.file_name)}
                  aria-label={`Eliminar ${item.file_name}`}
                  className="p-1 text-slate-400 hover:text-red-600 rounded"
                >
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
