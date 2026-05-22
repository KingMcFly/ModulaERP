import React, { useEffect, useRef, useState } from 'react';
import { Search, Camera, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export interface LookupResult {
  brand: string | null;
  model: string | null;
  asset_type: string | null;
  description: string | null;
  confidence: 'high' | 'medium' | 'low';
  manufacturer: string;
}

interface Props {
  serial: string;
  onSerialChange: (v: string) => void;
  onResult: (r: LookupResult) => void;
}

export default function AssetLookup({ serial, onSerialChange, onResult }: Props) {
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<LookupResult | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef              = useRef<HTMLDivElement>(null);
  const html5QrRef              = useRef<any>(null);

  async function doLookup(q: string) {
    const trimmed = q.trim();
    if (trimmed.length < 3) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`${API}/lookup?q=${encodeURIComponent(trimmed)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error();
      const data: LookupResult = await r.json();
      setResult(data);
      if (data.brand || data.model || data.asset_type) {
        onResult(data);
      } else {
        setError('No se encontró información para este serial. Puedes completar los datos manualmente.');
      }
    } catch {
      setError('No se pudo consultar el serial. Verifica la conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function startScanner() {
    setScanning(true);
    setError(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scannerId = 'asset-qr-reader';
      html5QrRef.current = new Html5Qrcode(scannerId);
      await html5QrRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText: string) => {
          stopScanner();
          onSerialChange(decodedText);
          doLookup(decodedText);
        },
        undefined
      );
    } catch {
      setError('No se pudo acceder a la cámara');
      setScanning(false);
    }
  }

  function stopScanner() {
    if (html5QrRef.current) {
      html5QrRef.current.stop().catch(() => {});
      html5QrRef.current = null;
    }
    setScanning(false);
  }

  useEffect(() => () => { stopScanner(); }, []);

  const confidenceColor = result?.confidence === 'high' ? 'text-emerald-600'
    : result?.confidence === 'medium' ? 'text-amber-600' : 'text-slate-400';

  const confidenceLabel = result?.confidence === 'high' ? 'Alta'
    : result?.confidence === 'medium' ? 'Media' : 'Baja';

  return (
    <div className="space-y-2">
      <label htmlFor="asset-serial" className="label">N° Serie / Código de barras</label>

      <div className="flex gap-2">
        <input
          id="asset-serial"
          className="input flex-1"
          value={serial}
          onChange={e => {
            onSerialChange(e.target.value);
            setResult(null);
            setError(null);
          }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doLookup(serial); } }}
          placeholder="Escribe o escanea el serial…"
        />
        <button
          type="button"
          onClick={() => doLookup(serial)}
          disabled={loading || serial.trim().length < 3}
          className="btn-ghost px-3 flex-shrink-0"
          title="Buscar información del dispositivo"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        </button>
        <button
          type="button"
          onClick={scanning ? stopScanner : startScanner}
          className={`flex-shrink-0 px-3 rounded-xl font-semibold text-[13px] flex items-center gap-1.5 transition-all ${
            scanning
              ? 'bg-red-50 text-red-600 border border-red-200'
              : 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100'
          }`}
          title={scanning ? 'Detener escáner' : 'Escanear código de barras con cámara'}
        >
          {scanning ? <X size={16} /> : <Camera size={16} />}
          {scanning ? 'Detener' : 'Escanear'}
        </button>
      </div>

      {scanning && (
        <div className="rounded-2xl overflow-hidden border border-indigo-200" style={{ background: '#000' }}>
          <div id="asset-qr-reader" ref={scannerRef} />
          <p className="text-center text-white text-[12px] py-2 bg-black/80">
            Apunta al código de barras o QR del dispositivo
          </p>
        </div>
      )}

      {result && (result.brand || result.model || result.asset_type) && (
        <div
          className="rounded-xl p-3 flex items-start gap-2.5 animate-fade-up"
          style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-slate-800">
              {[result.brand, result.model].filter(Boolean).join(' ')}
              {result.asset_type && <span className="ml-2 text-slate-400 font-normal">· {result.asset_type}</span>}
            </p>
            {result.description && (
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">{result.description}</p>
            )}
            <p className={`text-[10px] mt-1 font-medium ${confidenceColor}`}>
              Confianza: {confidenceLabel} · campos pre-rellenados automáticamente
            </p>
          </div>
        </div>
      )}

      {error && (
        <div
          className="rounded-xl p-3 flex items-start gap-2 text-[12px] text-amber-700"
          style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}
        >
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
