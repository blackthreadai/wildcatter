'use client';

import { useState, useEffect } from 'react';

interface StorageData {
  region: string;
  current: number;
  capacity: number;
  utilizationRate: number;
  weeklyChange: number;
  yearAgoLevel: number;
  fiveYearAvg: number;
  unit: string;
  lastUpdated: string;
}

interface LNGData {
  utilization: number;
  exports: number;
  imports: number;
  capacity: number;
  unit: string;
}

interface PriceData {
  henryHub: number;
  henryHubChange: number;
  ttf: number;
  ttfChange: number;
  jkm: number;
  jkmChange: number;
  currency: string;
}

interface NaturalGasData {
  storage: StorageData[];
  lng: LNGData;
  prices: PriceData;
  lastUpdated: string;
}

export default function NaturalGasWidget() {
  const [data, setData] = useState<NaturalGasData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/natural-gas-data');
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const gasData = await response.json();
        setData(gasData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch natural gas data:', error);
        setData(null);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 4 * 60 * 60 * 1000); // Update every 4 hours
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>NATURAL GAS</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">Loading...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>NATURAL GAS</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-red-500 text-xs">Failed to load data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-black h-full">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>NATURAL GAS</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto h-0" style={{ scrollbarWidth: "thin", scrollbarColor: "#4a5568 #1a202c" }}>
        {/* Key Prices */}
        <div className="mb-3 pb-2 border-b border-gray-700">
          <div className="text-[#DAA520] text-xs font-bold mb-2">BENCHMARK PRICES</div>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="text-gray-400">Henry Hub</div>
              <div className="flex items-center gap-2">
                <div className="text-white font-medium">
                  ${data.prices.henryHub.toFixed(2)}
                </div>
                <div className={`font-medium ${
                  data.prices.henryHubChange >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {data.prices.henryHubChange >= 0 ? '+' : ''}{data.prices.henryHubChange.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-gray-400">TTF (Europe)</div>
              <div className="flex items-center gap-2">
                <div className="text-white font-medium">
                  ${data.prices.ttf.toFixed(2)}
                </div>
                <div className={`font-medium ${
                  data.prices.ttfChange >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {data.prices.ttfChange >= 0 ? '+' : ''}{data.prices.ttfChange.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-gray-400">JKM (Asia)</div>
              <div className="flex items-center gap-2">
                <div className="text-white font-medium">
                  ${data.prices.jkm.toFixed(2)}
                </div>
                <div className={`font-medium ${
                  data.prices.jkmChange >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {data.prices.jkmChange >= 0 ? '+' : ''}{data.prices.jkmChange.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Storage */}
        <div className="mb-3 pb-2 border-b border-gray-700">
          <div className="text-[#DAA520] text-xs font-bold mb-2">STORAGE LEVELS</div>
          {data.storage.map((item, i) => (
            <div key={i} className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <div className="text-white text-xs font-medium">{item.region}</div>
                <div className="text-gray-300 text-xs">
                  {item.current.toFixed(0)} {item.unit}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="text-gray-400">
                  {item.utilizationRate.toFixed(1)}% Full
                </div>
                <div className={`font-medium ${
                  item.weeklyChange >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {item.weeklyChange >= 0 ? '+' : ''}{item.weeklyChange.toFixed(0)} {item.unit}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="text-gray-500">
                  5Y Avg: {item.fiveYearAvg.toFixed(0)}
                </div>
                <div className="text-gray-500">
                  Y/Y: {((item.current - item.yearAgoLevel) / item.yearAgoLevel * 100).toFixed(1)}%
                </div>
              </div>
              {/* Storage Bar */}
              <div className="mt-1 bg-gray-700 rounded-full h-1.5">
                <div 
                  className="bg-[#DAA520] h-1.5 rounded-full"
                  style={{ width: `${Math.min(item.utilizationRate, 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* LNG */}
        <div>
          <div className="text-[#DAA520] text-xs font-bold mb-2">LNG CAPACITY</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-400">Utilization</div>
              <div className="text-white font-medium">{data.lng.utilization.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-gray-400">Exports</div>
              <div className="text-white font-medium">{data.lng.exports.toFixed(1)} {data.lng.unit}</div>
            </div>
          </div>
          <div className="mt-1 bg-gray-700 rounded-full h-1.5">
            <div 
              className="bg-green-500 h-1.5 rounded-full"
              style={{ width: `${Math.min(data.lng.utilization, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}