'use client';

import { useState, useEffect } from 'react';

interface OilStorageData {
  location: string;
  current: number;
  capacity: number;
  utilizationRate: number;
  weeklyChange: number;
  unit: string;
  lastUpdated: string;
}

interface OECDData {
  region: string;
  stocks: number;
  daysOfSupply: number;
  change: number;
  unit: string;
}

interface TrackerData {
  storage: OilStorageData[];
  oecd: OECDData[];
}

export default function GlobalOilTrackerWidget() {
  const [data, setData] = useState<TrackerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/global-oil-tracker');
        const trackerData = await response.json();
        setData(trackerData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch oil tracker data:', error);
        
        // Fallback data
        const fallbackData: TrackerData = {
          storage: [
            {
              location: 'Cushing, OK',
              current: 28.5,
              capacity: 91.0,
              utilizationRate: 31.3,
              weeklyChange: -2.1,
              unit: 'MMB',
              lastUpdated: new Date().toISOString()
            },
            {
              location: 'US Commercial',
              current: 421.8,
              capacity: 653.0,
              utilizationRate: 64.6,
              weeklyChange: -1.8,
              unit: 'MMB',
              lastUpdated: new Date().toISOString()
            }
          ],
          oecd: [
            {
              region: 'OECD Total',
              stocks: 2847,
              daysOfSupply: 61.2,
              change: -12.5,
              unit: 'MMB'
            }
          ]
        };
        
        setData(fallbackData);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 6 * 60 * 60 * 1000); // Update every 6 hours
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>GLOBAL O/G TRACKER</h3>
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
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>GLOBAL O/G TRACKER</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-black h-full">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>GLOBAL O/G TRACKER</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto h-0">
        {/* Storage Section */}
        <div className="mb-3">
          <div className="text-[#DAA520] text-xs font-bold mb-2">STORAGE LEVELS</div>
          {data.storage.map((item, i) => (
            <div key={i} className="mb-2 pb-2 border-b border-gray-700 last:border-b-0">
              <div className="flex items-center justify-between mb-1">
                <div className="text-white text-xs font-medium">{item.location}</div>
                <div className="text-gray-300 text-xs">
                  {item.current.toFixed(1)} / {item.capacity.toFixed(1)} {item.unit}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="text-gray-400">
                  {item.utilizationRate.toFixed(1)}% Utilized
                </div>
                <div className={`font-medium ${
                  item.weeklyChange >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {item.weeklyChange >= 0 ? '+' : ''}{item.weeklyChange.toFixed(1)} {item.unit}
                </div>
              </div>
              {/* Utilization Bar */}
              <div className="mt-1 bg-gray-700 rounded-full h-1.5">
                <div 
                  className="bg-[#DAA520] h-1.5 rounded-full"
                  style={{ width: `${Math.min(item.utilizationRate, 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* OECD Section */}
        <div>
          <div className="text-[#DAA520] text-xs font-bold mb-2">OECD STOCKS</div>
          {data.oecd.map((item, i) => (
            <div key={i} className="mb-1 pb-1 border-b border-gray-700 last:border-b-0">
              <div className="flex items-center justify-between">
                <div className="text-white text-xs font-medium">{item.region}</div>
                <div className="text-gray-300 text-xs">
                  {item.stocks.toFixed(0)} {item.unit}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="text-gray-400">
                  {item.daysOfSupply.toFixed(1)} days supply
                </div>
                <div className={`font-medium ${
                  item.change >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {item.change >= 0 ? '+' : ''}{item.change.toFixed(1)} {item.unit}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}