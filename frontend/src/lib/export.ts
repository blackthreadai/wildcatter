import type { Asset, ProductionRecord } from './types';

export function downloadCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = String(row[h] ?? '');
      return val.includes(',') ? `"${val}"` : val;
    }).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAssetsCSV(assets: Asset[]) {
  downloadCSV(assets as unknown as Record<string, unknown>[], 'assets.csv');
}

export function exportProductionCSV(records: ProductionRecord[]) {
  downloadCSV(records as unknown as Record<string, unknown>[], 'production.csv');
}
