import React, { useState, useRef } from 'react';
import * as XLSX from '@e965/xlsx';
import { X, Upload, CheckCircle, AlertTriangle, Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function authFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('token');
  return fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) },
  });
}

type ImportType = 'assets' | 'supplies' | 'personnel';

interface ImportModalProps {
  type: ImportType;
  onClose: () => void;
  onImported: () => void;
}

const TEMPLATES: Record<ImportType, { columns: string[]; example: Record<string, string | number> }> = {
  assets: {
    columns: ['asset_type', 'brand', 'model', 'serial_number', 'barcode', 'value', 'purchase_date', 'location_name', 'notes'],
    example: { asset_type: 'Laptop', brand: 'Dell', model: 'Latitude 5540', serial_number: 'ABC123', barcode: 'BAR001', value: 1200000, purchase_date: '2024-01-15', location_name: 'Bodega 1', notes: '' },
  },
  supplies: {
    columns: ['name', 'category', 'unit', 'current_stock', 'min_stock', 'unit_cost', 'location_name', 'notes'],
    example: { name: 'Papel carta', category: 'Oficina', unit: 'resma', current_stock: 50, min_stock: 10, unit_cost: 3500, location_name: 'Bodega 1', notes: '' },
  },
  personnel: {
    columns: ['name', 'national_id', 'department', 'position', 'shift', 'phone', 'email', 'hired_at'],
    example: { name: 'Juan Pérez', national_id: '12345678-9', department: 'TI', position: 'Analista', shift: 'Mañana', phone: '+56912345678', email: 'juan@empresa.com', hired_at: '2023-06-01' },
  },
};

const TYPE_LABELS: Record<ImportType, string> = {
  assets:    'Activos',
  supplies:  'Insumos',
  personnel: 'Personal',
};

interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}

export default function ImportModal({ type, onClose, onImported }: ImportModalProps) {
  const [rows, setRows]         = useState<Record<string, any>[]>([]);
  const [fileName, setFileName] = useState('');
  const [result, setResult]     = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const tpl = TEMPLATES[type];

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([tpl.example], { header: tpl.columns });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, `plantilla_${type}.xlsx`);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target!.result as ArrayBuffer);
      const wb   = XLSX.read(data, { type: 'array', cellDates: true });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      setRows(json.slice(0, 500));
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      const r = await authFetch(`/import/${type}`, {
        method: 'POST',
        body: JSON.stringify({ rows }),
      });
      const data: ImportResult = await r.json();
      if (!r.ok) throw new Error((data as any).error || 'Error al importar');
      setResult(data);
      if (data.success > 0) {
        toast.success(`${data.success} registro${data.success > 1 ? 's' : ''} importado${data.success > 1 ? 's' : ''}`);
        onImported();
      }
      if (data.failed > 0) toast.error(`${data.failed} fila${data.failed > 1 ? 's' : ''} con error`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-xl flex items-center justify-center z-50 p-4"
      onClick={onClose} role="dialog" aria-modal="true" aria-label={`Importar ${TYPE_LABELS[type]}`}>
      <div className="bg-white rounded-3xl shadow-soft-xl w-full max-w-lg p-6 space-y-5"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center">
              <FileSpreadsheet size={18} className="text-primary-600" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Importar {TYPE_LABELS[type]}</h2>
              <p className="text-xs text-slate-500">Formato .xlsx o .csv · máx. 500 filas</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Template download */}
        <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">1. Descarga la plantilla</p>
            <p className="text-xs text-slate-500 mt-0.5">Columnas: {tpl.columns.join(', ')}</p>
          </div>
          <button onClick={downloadTemplate}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-white transition-colors">
            <Download size={13} aria-hidden="true" /> Plantilla
          </button>
        </div>

        {/* File upload */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">2. Sube tu archivo completado</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-primary-300 hover:bg-primary-50/30 transition-colors text-center"
          >
            <Upload size={22} className="text-slate-400" aria-hidden="true" />
            {fileName ? (
              <span className="text-sm font-medium text-slate-700">{fileName}</span>
            ) : (
              <>
                <span className="text-sm text-slate-500">Haz clic para seleccionar archivo</span>
                <span className="text-xs text-slate-400">.xlsx, .xls, .csv</span>
              </>
            )}
            {rows.length > 0 && (
              <span className="text-xs font-semibold text-primary-600">{rows.length} fila{rows.length > 1 ? 's' : ''} detectada{rows.length > 1 ? 's' : ''}</span>
            )}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={handleFile} aria-label="Seleccionar archivo Excel o CSV" />
        </div>

        {/* Preview */}
        {rows.length > 0 && !result && (
          <div className="bg-slate-50 rounded-xl p-3 overflow-x-auto">
            <p className="text-xs font-semibold text-slate-500 mb-2">Vista previa (primeras 3 filas)</p>
            <table className="text-[11px] text-slate-700">
              <thead>
                <tr>{tpl.columns.map(c => <th key={c} className="text-left pr-4 pb-1 font-semibold text-slate-500 whitespace-nowrap">{c}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 3).map((r, i) => (
                  <tr key={i}>{tpl.columns.map(c => <td key={c} className="pr-4 pb-0.5 whitespace-nowrap max-w-[120px] truncate">{String(r[c] ?? '')}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-2">
            <div className={`flex items-center gap-2 p-3 rounded-xl ${result.success > 0 ? 'bg-emerald-50' : 'bg-slate-50'}`}>
              <CheckCircle size={16} className="text-emerald-500" aria-hidden="true" />
              <span className="text-sm font-semibold text-emerald-700">{result.success} importado{result.success !== 1 ? 's' : ''} correctamente</span>
            </div>
            {result.errors.length > 0 && (
              <div className="bg-amber-50 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-600" aria-hidden="true" />
                  <span className="text-xs font-semibold text-amber-700">{result.failed} fila{result.failed > 1 ? 's' : ''} con error</span>
                </div>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-amber-600 ml-5">Fila {e.row}: {e.message}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 btn btn-ghost">
            {result ? 'Cerrar' : 'Cancelar'}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={rows.length === 0 || importing}
              className="flex-1 btn btn-primary"
            >
              {importing ? 'Importando...' : `Importar ${rows.length} fila${rows.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
