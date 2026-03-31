'use client';

import { useState, useEffect } from 'react';
import WidgetLoader from '@/components/WidgetLoader';

interface Spread {
  name: string;
  description: string;
  value: number;
  change: number;
  percentChange: number;
  unit: string;
  ratio: string;
}

interface Components {
  wti: { price: number; change: number };
  brent: { price: number; change: number };
  rbob: { price: number; bbl: number; change: number };
  ho: { price: number; bbl: number; change: number };
}

interface CrackSpreadData {
  spreads: Spread[];
  components: Components;
  lastUpdated: string;
  source: string;
  error?: string;
}

export default function CrackSpreadWidget() {
  const [data, setData] = useState<CrackSpreadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/crack-spread');
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
        setError('Failed to fetch crack spread data');
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getChangeColor = (val: number) => {
    if (val > 0) return 'text-green-500';
    if (val < 0) return 'text-red-500';
    return 'text-gray-400';
  };

  const formatChange = (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}`;

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>CRACK SPREADS</h3>
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
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>CRACK SPREADS</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-red-500 text-xs">{error || 'No data available'}</div>
        </div>
      </div>
    );
  }

  const primary = data.spreads[0]; // 3:2:1

  return (
    <div className="w-full flex flex-col bg-black h-full">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>CRACK SPREADS</h3>
      </div>

      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#4a5568 #1a202c' }}>
        {/* Primary: 3:2:1 */}
        {primary && (
          <div className="mb-3 pb-2 border-b border-gray-700">
            <div className="text-gray-400 text-xs mb-1">{primary.name}</div>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-2xl font-bold text-white">${primary.value.toFixed(2)}</span>
                <span className="text-gray-400 text-xs ml-1">/bbl</span>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${getChangeColor(primary.change)}`}>
                  {formatChange(primary.change)}
                </div>
                <div className={`text-xs ${getChangeColor(primary.percentChange)}`}>
                  {primary.percentChange >= 0 ? '+' : ''}{primary.percentChange.toFixed(1)}%
                </div>
              </div>
            </div>
            <div className="text-gray-500 text-xs mt-1">{primary.description}</div>
          </div>
        )}

        {/* Other spreads */}
        <div className="mb-3 pb-2 border-b border-gray-700">
          <div className="text-[#DAA520] text-xs font-bold mb-2">SPREADS</div>
          {data.spreads.slice(1).map((s, i) => (
            <div key={i} className="mb-1.5 flex items-center justify-between text-xs">
              <div>
                <div className="text-white font-medium">{s.name}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">${s.value.toFixed(2)}</span>
                <span className={`${getChangeColor(s.change)} min-w-[50px] text-right`}>
                  {formatChange(s.change)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Component Prices */}
        <div>
          <div className="text-[#DAA520] text-xs font-bold mb-2">COMPONENTS</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">WTI Crude</span>
              <span className="text-white">${data.components.wti.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Brent</span>
              <span className="text-white">${data.components.brent.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">RBOB Gas</span>
              <span className="text-white">${data.components.rbob.price.toFixed(4)}/gal</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">ULSD</span>
              <span className="text-white">${data.components.ho.price.toFixed(4)}/gal</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">RBOB/bbl</span>
              <span className="text-white">${data.components.rbob.bbl.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">ULSD/bbl</span>
              <span className="text-white">${data.components.ho.bbl.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-2 text-xs text-gray-600">
          {data.source}
        </div>
      </div>
    </div>
  );
}
