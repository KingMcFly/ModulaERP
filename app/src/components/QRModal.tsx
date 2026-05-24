import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Printer } from 'lucide-react';

interface Props {
  assetId: number;
  assetName: string;
  assetCode?: string;
  onClose: () => void;
}

// Escapa caracteres HTML para prevenir XSS en el iframe de impresión (A03)
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default function QRModal({ assetId, assetName, assetCode, onClose }: Props) {
  const qrValue = `ASSET:${assetId}:${assetCode || assetName}`;
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;

    // Usar textContent para texto dinámico — evita XSS (A03)
    const safeName = escapeHtml(assetName);
    const safeCode = assetCode ? escapeHtml(assetCode) : '';

    win.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';" />
        <title>QR</title>
        <style>
          body { display:flex; align-items:center; justify-content:center; min-height:100vh; font-family:sans-serif; margin:0; }
          .box { text-align:center; padding:24px; border:1px solid #e2e8f0; border-radius:12px; }
          h2 { font-size:16px; font-weight:700; margin:12px 0 4px; }
          p  { font-size:12px; color:#64748b; margin:0; }
        </style>
      </head>
      <body>
        <div class="box">
          ${content.innerHTML}
          <h2>${safeName}</h2>
          ${safeCode ? `<p>${safeCode}</p>` : ''}
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.print();
  }

  function handleDownload() {
    const svg = printRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.download = `QR_${assetCode || assetId}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = url;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Código QR de ${assetName}`}
    >
      <div className="bg-white rounded-3xl shadow-soft-xl p-6 w-72 text-center" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900 text-sm">Código QR</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div ref={printRef} className="flex justify-center mb-4">
          <QRCodeSVG value={qrValue} size={180} level="M" includeMargin />
        </div>

        <p className="font-semibold text-slate-900 text-sm mb-1">{assetName}</p>
        {assetCode && <p className="text-xs text-slate-500 mb-4">{assetCode}</p>}

        <div className="flex gap-2 mt-4">
          <button type="button" onClick={handleDownload} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Download size={13} aria-hidden="true" /> Descargar
          </button>
          <button type="button" onClick={handlePrint} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700 transition-colors">
            <Printer size={13} aria-hidden="true" /> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
