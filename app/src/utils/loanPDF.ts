import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface LoanPDFData {
  loan: {
    id: number;
    asset_type: string;
    brand?: string;
    model?: string;
    serial_number?: string;
    borrower_name?: string;
    borrower_name_rel?: string;
    issued_by_name?: string;
    issued_at: string;
    expected_return?: string;
    actual_return?: string | null;
    status: string;
    notes?: string;
  };
  tenantName: string;
  tenantColor?: string;
  isReturn?: boolean;
}

function fmt(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function generateLoanPDF({ loan, tenantName, tenantColor = '#6366F1', isReturn = false }: LoanPDFData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const primary = tenantColor;
  const docTitle = isReturn ? 'COMPROBANTE DE DEVOLUCIÓN' : 'COMPROBANTE DE PRÉSTAMO';
  const borrower = loan.borrower_name_rel || loan.borrower_name || '—';

  // ── Header ─────────────────────────────────────────────────────────────
  doc.setFillColor(primary);
  doc.rect(0, 0, 210, 22, 'F');

  doc.setTextColor('#FFFFFF');
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(tenantName, 14, 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(docTitle, 14, 17);

  // Date top-right
  doc.setFontSize(8);
  doc.text(`Fecha: ${fmt(new Date().toISOString())}`, 196, 10, { align: 'right' });
  doc.text(`N° ${loan.id}`, 196, 17, { align: 'right' });

  // ── Asset details ───────────────────────────────────────────────────────
  doc.setTextColor('#1E293B');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Datos del activo', 14, 32);

  autoTable(doc, {
    startY: 36,
    theme: 'grid',
    headStyles: { fillColor: primary, textColor: '#FFFFFF', fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, textColor: '#334155' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
    head: [['Campo', 'Valor']],
    body: [
      ['Tipo de activo', loan.asset_type || '—'],
      ['Marca / Modelo', [loan.brand, loan.model].filter(Boolean).join(' ') || '—'],
      ['N° de serie',    loan.serial_number || '—'],
      ['Estado',         isReturn ? 'Devuelto' : 'En préstamo'],
    ],
    margin: { left: 14, right: 14 },
  });

  // ── Loan details ────────────────────────────────────────────────────────
  const afterAsset = (doc as any).lastAutoTable.finalY + 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(isReturn ? 'Datos de la devolución' : 'Datos del préstamo', 14, afterAsset);

  autoTable(doc, {
    startY: afterAsset + 4,
    theme: 'grid',
    headStyles: { fillColor: primary, textColor: '#FFFFFF', fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, textColor: '#334155' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
    head: [['Campo', 'Valor']],
    body: [
      ['Receptor',             borrower],
      ['Emitido por',          loan.issued_by_name || '—'],
      ['Fecha de emisión',     fmt(loan.issued_at)],
      ['Devolución esperada',  fmt(loan.expected_return)],
      ...(isReturn ? [['Fecha de devolución', fmt(loan.actual_return)]] : []),
      ...(loan.notes ? [['Notas', loan.notes]] : []),
    ],
    margin: { left: 14, right: 14 },
  });

  // ── Signatures ──────────────────────────────────────────────────────────
  const afterLoan = (doc as any).lastAutoTable.finalY + 20;

  doc.setDrawColor('#CBD5E1');
  doc.setLineWidth(0.3);

  // Entregado por
  doc.line(14, afterLoan, 85, afterLoan);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#64748B');
  doc.text('Firma — Entregado por', 14, afterLoan + 5);
  doc.text(loan.issued_by_name || 'Responsable', 14, afterLoan + 10);

  // Recibido por
  doc.line(125, afterLoan, 196, afterLoan);
  doc.text('Firma — Recibido por', 125, afterLoan + 5);
  doc.text(borrower, 125, afterLoan + 10);

  // ── Footer ──────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.height;
  doc.setFontSize(7);
  doc.setTextColor('#94A3B8');
  doc.text('Documento generado por FB Core · ' + tenantName, 105, pageH - 8, { align: 'center' });

  const filename = `${isReturn ? 'devolucion' : 'prestamo'}_${loan.id}_${Date.now()}.pdf`;
  doc.save(filename);
}
