'use client';

import { useState, useEffect } from 'react';
import WidgetLoader from '@/components/WidgetLoader';

interface Market {
  symbol: string;
  name: string;
  type: string;
  region: string;
  price: number;
  change: number;
  percentChange: number;
  currency: string;
  history: number[];
}

interface Headline {
  name: string;
  price: number;
  change: number;
  percentChange: number;
  currency: string;
}

interface CarbonData {
  markets: Market[];
  headline: Headline | null;
  lastUpdated: string;
  source: string;
  error?: string;
}

export default function CarbonCreditWidget() {
  const [data, setData] = useState<CarbonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/carbon-credit');
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
        setError('Failed to fetch carbon credit data');
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getChangeColor = (val: number) => val > 0 ? 'text-green-500' : val < 0 ? 'text-red-500' : 'text-gray-400';

  const getCurrencySymbol = (c: string) => c === 'EUR' ? '\u20AC' : '$';

  // Mini sparkline SVG
  const Sparkline = ({ data: points, color }: { data: number[]; color: string }) => {
    if (points.length < 2) return null;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const w = 60, h = 20;
    const pathD = points.map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');
    return (
      <svg width={w} height={h} className="inline-block">
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>CARBON CREDITS</h3>
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
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>CARBON CREDITS</h3>
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
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>CARBON CREDITS</h3>
      </div>

      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#4a5568 #1a202c' }}>
        {/* Headline: EU ETS */}
        {data.headline && (
          <div className="mb-3 pb-2 border-b border-gray-700">
            <div className="text-gray-400 text-xs mb-1">{data.headline.name}</div>
            <div className="flex items-end justify-between">
              <div>
                <span className={`text-2xl font-bold ${data.headline.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {getCurrencySymbol(data.headline.currency)}{data.headline.price.toFixed(2)}
                </span>
                <span className="text-gray-400 text-xs ml-1">/tCO2</span>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${getChangeColor(data.headline.change)}`}>
                  {data.headline.change >= 0 ? '+' : ''}{data.headline.change.toFixed(2)}
                </div>
                <div className={`text-xs ${getChangeColor(data.headline.percentChange)}`}>
                  {data.headline.percentChange >= 0 ? '+' : ''}{data.headline.percentChange.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Markets */}
        <div>
          <div className="text-[#DAA520] text-xs font-bold mb-2">CARBON MARKETS</div>
          {data.markets.map((m, i) => (
            <div key={i} className="mb-2 pb-2 border-b border-gray-800 last:border-b-0">
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{m.name}</div>
                  <div className="text-gray-500">{m.region} | {m.type}</div>
                </div>
                <div className="text-right ml-2">
                  <div className="text-white font-bold">
                    {getCurrencySymbol(m.currency)}{m.price.toFixed(2)}
                  </div>
                  <div className={`${getChangeColor(m.change)}`}>
                    {m.change >= 0 ? '+' : ''}{m.change.toFixed(2)} ({m.percentChange >= 0 ? '+' : ''}{m.percentChange.toFixed(1)}%)
                  </div>
                </div>
              </div>
              {m.history.length >= 2 && (
                <div className="flex justify-end">
                  <Sparkline data={m.history} color={m.change >= 0 ? '#22c55e' : '#ef4444'} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-2 text-xs text-gray-600">{data.source}</div>
      </div>
    </div>
  );
}
