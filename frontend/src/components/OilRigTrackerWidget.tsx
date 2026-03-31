'use client';

import { useState, useEffect } from 'react';
import WidgetLoader from '@/components/WidgetLoader';

interface BasinData {
  basin: string;
  rigs: number;
  change: number;
  percentage: number;
  period: string;
}

interface USTotals {
  oil: number;
  gas: number;
  total: number;
  weeklyChange: number;
  period: string;
}

interface StateData {
  state: string;
  rigs: number;
  change: number;
}

interface CanadaData {
  total: number;
  weeklyChange: number;
}

interface OilRigData {
  usTotals: USTotals;
  basins: BasinData[];
  canada: CanadaData;
  topStates: StateData[];
  reportDate: string;
  lastUpdated: string;
  source: string;
}

export default function OilRigTrackerWidget() {
  const [data, setData] = useState<OilRigData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/oil-rig-tracker');
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const rigData = await response.json();
        if (rigData.error) throw new Error(rigData.error);
        setData(rigData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch oil rig data:', error);
        setData(null);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 12 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>OIL RIG TRACKER</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <WidgetLoader />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>OIL RIG TRACKER</h3>
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
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>OIL RIG TRACKER</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto h-0" style={{ scrollbarWidth: "thin", scrollbarColor: "#4a5568 #1a202c" }}>
        {/* US Totals */}
        <div className="mb-3 pb-2 border-b border-gray-700">
          <div className="text-[#DAA520] text-xs font-bold mb-2">US TOTALS</div>
          <div className="flex items-center justify-between mb-2">
            <div className={`text-lg font-bold ${data.usTotals.weeklyChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>{data.usTotals.total}</div>
            {data.usTotals.weeklyChange !== 0 && (
              <div className={`text-xs font-medium ${
                data.usTotals.weeklyChange >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {data.usTotals.weeklyChange >= 0 ? '+' : ''}{data.usTotals.weeklyChange} WoW
              </div>
            )}
          </div>
          {(data.usTotals.oil > 0 || data.usTotals.gas > 0) && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-gray-400">Oil Rigs</div>
                <div className="text-white font-medium">{data.usTotals.oil}</div>
              </div>
              <div>
                <div className="text-gray-400">Gas Rigs</div>
                <div className="text-white font-medium">{data.usTotals.gas}</div>
              </div>
            </div>
          )}
        </div>

        {/* Shale Basins */}
        {data.basins.length > 0 && (
          <div className="mb-3 pb-2 border-b border-gray-700">
            <div className="text-[#DAA520] text-xs font-bold mb-2">SHALE BASINS</div>
            {data.basins.map((basin, i) => (
              <div key={i} className={`py-1 px-2 -mx-2 flex items-center justify-between ${i % 2 === 1 ? 'bg-[#DAA520]/10' : 'bg-transparent'}`}>
                <div>
                  <div className="text-white text-xs font-medium">{basin.basin}</div>
                  <div className="text-gray-500 text-xs">{basin.percentage.toFixed(1)}% of total</div>
                </div>
                <div className="text-right">
                  <div className="text-white text-xs font-medium">{basin.rigs}</div>
                  {basin.change !== 0 && (
                    <div className={`text-xs ${
                      basin.change >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {basin.change >= 0 ? '+' : ''}{basin.change}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Canada */}
        {data.canada && data.canada.total > 0 && (
          <div className="mb-3 pb-2 border-b border-gray-700">
            <div className="text-[#DAA520] text-xs font-bold mb-2">CANADA</div>
            <div className="flex items-center justify-between text-xs">
              <div className="text-white font-medium">Total Rigs</div>
              <div className="flex items-center gap-2">
                <div className="text-white font-medium">{data.canada.total}</div>
                {data.canada.weeklyChange !== 0 && (
                  <div className={data.canada.weeklyChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {data.canada.weeklyChange >= 0 ? '+' : ''}{data.canada.weeklyChange}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Top States */}
        {data.topStates && data.topStates.length > 0 && (
          <div>
            <div className="text-[#DAA520] text-xs font-bold mb-2">TOP STATES</div>
            {data.topStates.map((s, i) => (
              <div key={i} className="pb-1 mb-1 flex items-center justify-between text-xs border-b border-gray-800">
                <div className="text-white font-medium">{s.state}</div>
                <div className="flex items-center gap-2">
                  <div className="text-gray-300">{s.rigs}</div>
                  {s.change !== 0 && (
                    <div className={s.change >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {s.change >= 0 ? '+' : ''}{s.change}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
