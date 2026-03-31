'use client';


interface SpotPrice {
  benchmark: string;
  region: string;
  price: number;
  change: number;
  percentChange: number;
  unit: string;
}

interface Premium {
  name: string;
  value: number;
}

interface MonthlyExport {
  period: string;
  mcf: number;
}

interface LNGData {
  spotPrices: SpotPrice[];
  premiums: Premium[];
  usExports: {
    totalMcf: number;
    prevTotalMcf: number;
    monthly: MonthlyExport[];
    period: string;
  };
  usImports: {
    totalMcf: number;
    period: string;
  };
  lastUpdated: string;
  source: string;
  error?: string;
}

export default function GlobalLNGWidget() {
  const [data, setData] = useState<LNGData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/global-lng');
        const json = await response.json();
        if (!response.ok || json.error) {
          setError(json.error || 'Failed to load data');
          setLoading(false);
          return;
        }
        setData(json);
        setError(null);
        setLoading(false);
      } catch {
        setError('Failed to fetch LNG data');
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getChangeColor = (val: number) => val > 0 ? 'text-green-500' : val < 0 ? 'text-red-500' : 'text-gray-400';

  const formatMcf = (mcf: number) => {
    if (mcf >= 1000000) return `${(mcf / 1000000).toFixed(1)}B cf`;
    if (mcf >= 1000) return `${(mcf / 1000).toFixed(0)}M cf`;
    return `${mcf} Mcf`;
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>GLOBAL LNG</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <WidgetLoader />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>GLOBAL LNG</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-red-500 text-xs">{error || 'No data available'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-black h-full">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>GLOBAL LNG</h3>
      </div>

      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#4a5568 #1a202c' }}>
        {/* Spot Prices */}
        <div className="mb-3 pb-2 border-b border-gray-700">
          <div className="text-[#DAA520] text-xs font-bold mb-2">BENCHMARK PRICES</div>
          {data.spotPrices.map((p, i) => (
            <div key={i} className="mb-1.5 flex items-center justify-between text-xs">
              <div>
                <div className="text-white font-medium">{p.benchmark}</div>
                <div className="text-gray-500">{p.region}</div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold">${p.price.toFixed(3)}</div>
                <div className={`${getChangeColor(p.change)}`}>
                  {p.change >= 0 ? '+' : ''}{p.change.toFixed(3)} ({p.percentChange >= 0 ? '+' : ''}{p.percentChange.toFixed(1)}%)
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Regional Premiums */}
        {data.premiums.length > 0 && (
          <div className="mb-3 pb-2 border-b border-gray-700">
            <div className="text-[#DAA520] text-xs font-bold mb-2">REGIONAL PREMIUMS</div>
            {data.premiums.map((p, i) => (
              <div key={i} className="mb-1 flex items-center justify-between text-xs">
                <span className="text-gray-300">{p.name}</span>
                <span className={`font-medium ${p.value > 0 ? 'text-green-400' : p.value < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {p.value >= 0 ? '+' : ''}${p.value.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* US LNG Exports */}
        {data.usExports.totalMcf > 0 && (
          <div className="mb-3 pb-2 border-b border-gray-700">
            <div className="text-[#DAA520] text-xs font-bold mb-2">US LNG EXPORTS</div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-gray-400">Total ({data.usExports.period})</span>
              <div className="text-right">
                <span className="text-white font-bold">{formatMcf(data.usExports.totalMcf)}</span>
                {data.usExports.prevTotalMcf > 0 && (
                  <span className={`ml-1 ${data.usExports.totalMcf >= data.usExports.prevTotalMcf ? 'text-green-500' : 'text-red-500'}`}>
                    {data.usExports.totalMcf >= data.usExports.prevTotalMcf ? '+' : ''}
                    {Math.round(((data.usExports.totalMcf - data.usExports.prevTotalMcf) / data.usExports.prevTotalMcf) * 100)}%
                  </span>
                )}
              </div>
            </div>
            {data.usExports.monthly.map((m, i) => {
              const maxMcf = Math.max(...data.usExports.monthly.map(x => x.mcf));
              const barPct = maxMcf > 0 ? (m.mcf / maxMcf) * 100 : 0;
              return (
                <div key={i} className="mb-1">
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-gray-400">{m.period}</span>
                    <span className="text-white">{formatMcf(m.mcf)}</span>
                  </div>
                  <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${barPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* US LNG Imports */}
        {data.usImports.totalMcf > 0 && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">US LNG Imports ({data.usImports.period})</span>
              <span className="text-white">{formatMcf(data.usImports.totalMcf)}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-2 text-xs text-gray-600">{data.source}</div>
      </div>
    </div>
  );

import { useState, useEffect } from 'react';
import WidgetLoader from '@/components/WidgetLoader';
