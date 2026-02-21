'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { formatNumber, formatCurrency } from '@/lib/utils';

interface AssetOption {
  id: string;
  name: string;
  state: string;
  basin: string;
  type: string;
}

interface AssetDetail {
  id: string;
  name: string;
  type: string;
  status: string;
  state: string;
  county: string;
  basin: string;
  operatorName: string;
  depth: number;
  spudDate: string;
  declineRate: number;
  estimatedLife: number;
  currentProduction: number;
  cashFlow: number;
  productionHistory: Array<{
    month: string;
    oilVolume: number;
    gasVolume: number;
    waterCut: number;
    downtime: number;
  }>;
  financials: {
    revenue: number;
    operatingCost: number;
    netCashFlow: number;
    breakevenPrice: number;
  } | null;
}

interface CompareRow {
  label: string;
  key: string;
  format: (v: unknown) => string;
  higherIsBetter?: boolean;
}

const ROWS: CompareRow[] = [
  { label: 'Type', key: 'type', format: (v) => String(v).toUpperCase() },
  { label: 'Status', key: 'status', format: (v) => String(v).toUpperCase() },
  { label: 'State', key: 'state', format: (v) => String(v) },
  { label: 'County', key: 'county', format: (v) => String(v) },
  { label: 'Basin', key: 'basin', format: (v) => String(v) },
  { label: 'Operator', key: 'operatorName', format: (v) => String(v) },
  { label: 'Depth (ft)', key: 'depth', format: (v) => formatNumber(Number(v)), higherIsBetter: false },
  { label: 'Spud Date', key: 'spudDate', format: (v) => v ? new Date(String(v)).toLocaleDateString() : '—' },
  { label: 'Production (bbl/mo)', key: 'currentProduction', format: (v) => formatNumber(Number(v)), higherIsBetter: true },
  { label: 'Decline Rate', key: 'declineRate', format: (v) => Number(v).toFixed(1) + '%', higherIsBetter: false },
  { label: 'Est. Life (months)', key: 'estimatedLife', format: (v) => formatNumber(Number(v)), higherIsBetter: true },
  { label: 'Cash Flow', key: 'cashFlow', format: (v) => formatCurrency(Number(v)), higherIsBetter: true },
];

const FINANCIAL_ROWS: CompareRow[] = [
  { label: 'Revenue', key: 'revenue', format: (v) => formatCurrency(Number(v)), higherIsBetter: true },
  { label: 'Operating Cost', key: 'operatingCost', format: (v) => formatCurrency(Number(v)), higherIsBetter: false },
  { label: 'Net Cash Flow', key: 'netCashFlow', format: (v) => formatCurrency(Number(v)), higherIsBetter: true },
  { label: 'Breakeven Price', key: 'breakevenPrice', format: (v) => '$' + Number(v).toFixed(2), higherIsBetter: false },
];

function getWinner(a: unknown, b: unknown, higherIsBetter?: boolean): 'a' | 'b' | null {
  if (higherIsBetter === undefined) return null;
  const na = Number(a), nb = Number(b);
  if (isNaN(na) || isNaN(nb) || na === nb) return null;
  if (higherIsBetter) return na > nb ? 'a' : 'b';
  return na < nb ? 'a' : 'b';
}

/* ── Autocomplete Picker ──────────────────────────────────────────── */

function AssetPicker({
  label,
  options,
  value,
  onChange,
  excludeId,
}: {
  label: string;
  options: AssetOption[];
  value: string;
  onChange: (id: string) => void;
  excludeId: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value);

  const filtered = options.filter(
    (o) =>
      o.id !== excludeId &&
      (o.name.toLowerCase().includes(query.toLowerCase()) ||
        o.state.toLowerCase().includes(query.toLowerCase()) ||
        o.basin.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 20);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <label className="text-xs text-[#DAA520] tracking-wider block">{label}</label>
      <div ref={ref} className="relative">
        <input
          type="text"
          placeholder={selected ? selected.name : 'Type to search assets...'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#DAA520]"
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
            {filtered.map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  onChange(o.id);
                  setQuery('');
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-700 transition-colors border-b border-gray-700/50 last:border-0 ${
                  o.id === value ? 'text-[#DAA520]' : 'text-gray-300'
                }`}
              >
                <span className="font-medium">{o.name}</span>
                <span className="text-gray-500 ml-2">— {o.state} ({o.basin})</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {selected && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="px-2 py-0.5 rounded bg-gray-800 text-[#DAA520]">{selected.type.toUpperCase()}</span>
          <span>{selected.name} — {selected.state}, {selected.basin}</span>
          <button onClick={() => { onChange(''); setQuery(''); }} className="ml-auto text-gray-500 hover:text-white">✕</button>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────── */

export default function EvaluatePage() {
  const [options, setOptions] = useState<AssetOption[]>([]);
  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');
  const [assetA, setAssetA] = useState<AssetDetail | null>(null);
  const [assetB, setAssetB] = useState<AssetDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/assets', { params: { limit: 500 } }).then((res) => {
      setOptions((res.data.data || res.data).map((a: AssetOption) => ({
        id: a.id, name: a.name, state: a.state, basin: a.basin, type: a.type,
      })));
    }).catch(() => {});
  }, []);

  const fetchAsset = useCallback(async (id: string): Promise<AssetDetail | null> => {
    if (!id) return null;
    try {
      const res = await api.get(`/assets/${id}`);
      return res.data;
    } catch { return null; }
  }, []);

  const handleCompare = async () => {
    if (!idA || !idB) return;
    setLoading(true);
    const [a, b] = await Promise.all([fetchAsset(idA), fetchAsset(idB)]);
    setAssetA(a);
    setAssetB(b);
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!assetA || !assetB) return;
    const allRows = [...ROWS, ...((assetA.financials || assetB.financials) ? FINANCIAL_ROWS : [])];
    const lines = ['Metric,' + assetA.name + ',' + assetB.name];
    for (const row of allRows) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vA = FINANCIAL_ROWS.includes(row) ? (assetA.financials as any)?.[row.key] : (assetA as any)?.[row.key];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vB = FINANCIAL_ROWS.includes(row) ? (assetB.financials as any)?.[row.key] : (assetB as any)?.[row.key];
      lines.push(`"${row.label}","${vA != null ? row.format(vA) : '—'}","${vB != null ? row.format(vB) : '—'}"`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evaluate-${assetA.name}-vs-${assetB.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderRow = (row: CompareRow, a: AssetDetail | null, b: AssetDetail | null, src: 'main' | 'financial') => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const valA = src === 'financial' ? (a?.financials as any)?.[row.key] : (a as any)?.[row.key];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const valB = src === 'financial' ? (b?.financials as any)?.[row.key] : (b as any)?.[row.key];
    const winner = getWinner(valA, valB, row.higherIsBetter);

    return (
      <tr key={row.key} className="border-b border-gray-800">
        <td className={`py-3 px-4 text-right font-medium ${winner === 'a' ? 'text-green-400' : 'text-gray-300'}`}>
          {valA != null ? row.format(valA) : '—'}
        </td>
        <td className="py-3 px-4 text-center text-xs text-gray-500 bg-gray-900/50 w-40">
          {row.label}
        </td>
        <td className={`py-3 px-4 text-left font-medium ${winner === 'b' ? 'text-green-400' : 'text-gray-300'}`}>
          {valB != null ? row.format(valB) : '—'}
        </td>
      </tr>
    );
  };

  const hasResults = assetA && assetB;

  return (
    <>
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; color: black !important; }
          aside, button, input, nav, .no-print { display: none !important; }
          .print-area { background: white !important; color: black !important; border-color: #ccc !important; }
          .print-area th, .print-area td { color: black !important; border-color: #ccc !important; }
          .print-area .text-green-400 { color: #16a34a !important; }
          .print-area .text-\\[\\#DAA520\\] { color: #996515 !important; }
        }
      `}</style>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-[#DAA520]">EVALUATE — SIDE-BY-SIDE COMPARISON</h2>
          {hasResults && (
            <div className="flex items-center gap-2 no-print">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 transition-colors"
              >
                ↓ Export CSV
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 transition-colors"
              >
                🖨 Print
              </button>
            </div>
          )}
        </div>

        {/* Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
          <AssetPicker label="ASSET A" options={options} value={idA} onChange={setIdA} excludeId={idB} />
          <AssetPicker label="ASSET B" options={options} value={idB} onChange={setIdB} excludeId={idA} />
        </div>

        <div className="flex justify-center no-print">
          <button
            onClick={handleCompare}
            disabled={!idA || !idB || loading}
            className="flex items-center gap-2 px-6 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 disabled:opacity-30 transition-colors"
          >
            {loading ? 'Loading...' : 'COMPARE'}
          </button>
        </div>

        {/* Comparison Table */}
        <div ref={printRef} className="print-area">
          {hasResults && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="py-3 px-4 text-right text-[#DAA520] text-sm font-bold w-1/3 truncate">
                      {assetA.name}
                    </th>
                    <th className="py-3 px-4 text-center text-gray-500 text-xs bg-gray-900/50 w-40">
                      METRIC
                    </th>
                    <th className="py-3 px-4 text-left text-[#DAA520] text-sm font-bold w-1/3 truncate">
                      {assetB.name}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => renderRow(row, assetA, assetB, 'main'))}
                  {(assetA.financials || assetB.financials) && (
                    <>
                      <tr>
                        <td colSpan={3} className="py-2 px-4 text-xs text-[#DAA520] tracking-wider bg-gray-800/50 text-center font-medium">
                          FINANCIALS
                        </td>
                      </tr>
                      {FINANCIAL_ROWS.map((row) => renderRow(row, assetA, assetB, 'financial'))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Production History Comparison */}
          {hasResults && (assetA.productionHistory?.length > 0 || assetB.productionHistory?.length > 0) && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mt-6">
              <h3 className="text-xs text-[#DAA520] tracking-wider mb-4">PRODUCTION TREND (LAST 12 MONTHS)</h3>
              <div className="grid grid-cols-2 gap-8">
                {[assetA, assetB].map((asset, i) => (
                  <div key={i}>
                    <p className="text-sm text-gray-400 mb-2">{asset.name}</p>
                    <div className="space-y-1">
                      {(asset.productionHistory || []).slice(0, 12).reverse().map((rec, j) => {
                        const maxProd = Math.max(
                          ...((asset.productionHistory || []).slice(0, 12).map((r) => r.oilVolume || 0)),
                          1
                        );
                        const pct = ((rec.oilVolume || 0) / maxProd) * 100;
                        return (
                          <div key={j} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-16 shrink-0">
                              {new Date(rec.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                            </span>
                            <div className="flex-1 h-4 bg-gray-800 rounded overflow-hidden">
                              <div
                                className="h-full bg-[#DAA520]/70 rounded"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400 w-16 text-right">
                              {formatNumber(rec.oilVolume || 0)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
