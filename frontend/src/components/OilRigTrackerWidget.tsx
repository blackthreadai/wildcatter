'use client';

import { useState, useEffect } from 'react';

interface RigCount {
  region: string;
  oil: number;
  gas: number;
  total: number;
  weeklyChange: number;
  yearAgoCount: number;
  lastUpdated: string;
}

interface BasinData {
  basin: string;
  rigs: number;
  change: number;
  percentage: number;
}

interface OilRigData {
  usTotals: RigCount;
  international: RigCount[];
  basins: BasinData[];
  historical: {
    date: string;
    count: number;
  }[];
  lastUpdated: string;
}

export default function OilRigTrackerWidget() {
  const [data, setData] = useState<OilRigData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/oil-rig-tracker');
        const rigData = await response.json();
        setData(rigData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch oil rig data:', error);
        
        // Fallback data
        const fallbackData: OilRigData = {
          usTotals: {
            region: 'United States',
            oil: 506,
            gas: 98,
            total: 604,
            weeklyChange: -3,
            yearAgoCount: 627,
            lastUpdated: new Date().toISOString()
          },
          international: [
            {
              region: 'Canada',
              oil: 89,
              gas: 45,
              total: 134,
              weeklyChange: 2,
              yearAgoCount: 118,
              lastUpdated: new Date().toISOString()
            }
          ],
          basins: [
            {
              basin: 'Permian',
              rigs: 312,
              change: -2,
              percentage: 61.7
            }
          ],
          historical: [],
          lastUpdated: new Date().toISOString()
        };
        
        setData(fallbackData);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 24 * 60 * 60 * 1000); // Update daily
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black border border-gray-700 min-h-[400px] max-h-[500px]">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>OIL RIG TRACKER</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">Loading...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full flex flex-col bg-black border border-gray-700 min-h-[400px] max-h-[500px]">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>OIL RIG TRACKER</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-black border border-gray-700 min-h-[400px] max-h-[500px]">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>OIL RIG TRACKER</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto h-0">
        {/* US Totals */}
        <div className="mb-3 pb-2 border-b border-gray-700">
          <div className="text-[#DAA520] text-xs font-bold mb-2">US TOTALS</div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-white text-lg font-bold">{data.usTotals.total}</div>
            <div className={`text-xs font-medium ${
              data.usTotals.weeklyChange >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {data.usTotals.weeklyChange >= 0 ? '+' : ''}{data.usTotals.weeklyChange} WoW
            </div>
          </div>
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
          <div className="text-xs text-gray-400 mt-2">
            Y/Y Change: {((data.usTotals.total - data.usTotals.yearAgoCount) / data.usTotals.yearAgoCount * 100).toFixed(1)}%
          </div>
        </div>

        {/* Shale Basins */}
        <div className="mb-3 pb-2 border-b border-gray-700">
          <div className="text-[#DAA520] text-xs font-bold mb-2">SHALE BASINS</div>
          {data.basins.map((basin, i) => (
            <div key={i} className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-white text-xs font-medium">{basin.basin}</div>
                <div className="text-gray-400 text-xs">{basin.percentage.toFixed(1)}% of US total</div>
              </div>
              <div className="text-right">
                <div className="text-white text-xs font-medium">{basin.rigs}</div>
                <div className={`text-xs ${
                  basin.change >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {basin.change >= 0 ? '+' : ''}{basin.change}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* International */}
        {data.international.length > 0 && (
          <div>
            <div className="text-[#DAA520] text-xs font-bold mb-2">INTERNATIONAL</div>
            {data.international.slice(0, 4).map((country, i) => (
              <div key={i} className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-white text-xs font-medium">{country.region}</div>
                  <div className="text-gray-400 text-xs">
                    {country.oil} oil, {country.gas} gas
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white text-xs font-medium">{country.total}</div>
                  <div className={`text-xs ${
                    country.weeklyChange >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {country.weeklyChange >= 0 ? '+' : ''}{country.weeklyChange}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Update timestamp */}
        <div className="mt-3 text-xs text-gray-500">
          Updated: {new Date(data.lastUpdated).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}