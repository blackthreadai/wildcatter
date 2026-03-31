'use client';

import { useState, useEffect } from 'react';
import WidgetLoader from '@/components/WidgetLoader';

interface StorageItem {
  location: string;
  current: number;
  capacity: number;
  utilizationRate: number;
  weeklyChange: number;
  unit: string;
  lastUpdated: string;
}

interface PADDItem {
  region: string;
  stocks: number;
  change: number;
  unit: string;
  period: string;
}

interface PriceItem {
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface TrackerData {
  storage: StorageItem[];
  padds: PADDItem[];
  prices: PriceItem[];
  lastUpdated: string;
  source: string;
}

export default function GlobalOilTrackerWidget() {
  const [data, setData] = useState<TrackerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/global-oil-tracker');
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const trackerData = await response.json();
        if (trackerData.error) throw new Error(trackerData.error);
        setData(trackerData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch oil tracker data:', error);
        setData(null);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 4 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>GLOBAL O/G TRACKER</h3>
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
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>GLOBAL O/G TRACKER</h3>
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
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>GLOBAL O/G TRACKER</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto h-0" style={{ scrollbarWidth: "thin", scrollbarColor: "#4a5568 #1a202c" }}>
        {/* Crude Oil Prices */}
        {data.prices.length > 0 && (
          <div className="mb-3 pb-2 border-b border-gray-700">
            <div className="text-[#DAA520] text-xs font-bold mb-2">CRUDE OIL PRICES</div>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              {data.prices.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="text-gray-400">{p.name}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-white font-medium">${p.price.toFixed(2)}</div>
                    <div className={`font-medium ${p.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {p.change >= 0 ? '+' : ''}{p.change.toFixed(2)} ({p.changePercent >= 0 ? '+' : ''}{p.changePercent.toFixed(1)}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Storage Section */}
        <div className="mb-3">
          <div className="text-[#DAA520] text-xs font-bold mb-2">US CRUDE STORAGE</div>
          {data.storage.map((item, i) => (
            <div key={i} className="mb-2 pb-2 border-b border-gray-700 last:border-b-0">
              <div className="flex items-center justify-between mb-1">
                <div className="text-white text-xs font-medium">{item.location}</div>
                <div className="text-gray-300 text-xs">
                  {item.current.toFixed(1)} {item.unit}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="text-gray-400">
                  {item.utilizationRate.toFixed(1)}% Full
                </div>
                <div className={`font-medium ${
                  item.weeklyChange >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {item.weeklyChange >= 0 ? '+' : ''}{item.weeklyChange.toFixed(1)} {item.unit}
                </div>
              </div>
              <div className="mt-1 bg-gray-700 rounded-full h-1.5">
                <div 
                  className="bg-[#DAA520] h-1.5 rounded-full"
                  style={{ width: `${Math.min(item.utilizationRate, 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* PADD Region Breakdown */}
        {data.padds.length > 0 && (
          <div>
            <div className="text-[#DAA520] text-xs font-bold mb-2">PADD REGIONS</div>
            {data.padds.map((item, i) => (
              <div key={i} className="mb-1 pb-1 border-b border-gray-700 last:border-b-0">
                <div className="flex items-center justify-between text-xs">
                  <div className="text-white font-medium">{item.region}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-gray-300">{item.stocks.toFixed(1)} {item.unit}</div>
                    <div className={`font-medium ${
                      item.change >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {item.change >= 0 ? '+' : ''}{item.change.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
