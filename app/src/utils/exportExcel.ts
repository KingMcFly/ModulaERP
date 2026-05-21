import writeXlsxFile, { Schema } from 'write-excel-file';

export async function exportToExcel(data: Record<string, unknown>[], filename: string, sheetName = 'Datos') {
  if (data.length === 0) return;
  const keys = Object.keys(data[0]);
  const schema: Schema<Record<string, unknown>> = keys.map(key => ({
    column: key,
    width: 22,
    value: (row) => row[key] as string | number | boolean | Date | null,
  }));
  await writeXlsxFile(data, {
    schema,
    sheet: sheetName,
    fileName: `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`,
  });
}
