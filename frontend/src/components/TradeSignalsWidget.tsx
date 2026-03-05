'use client';

import { useState, useEffect } from 'react';

interface TradeSignalsData {
  status: string;
  message: string;
  note: string;
  lastUpdated: string;
}

export default function TradeSignalsWidget() {
  const [data, setData] = useState<TradeSignalsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/trade-signals');
        const signalsData = await response.json();
        setData(signalsData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch trade signals data:', error);
        
        const fallbackData: TradeSignalsData = {
          status: 'placeholder',
          message: 'Trade Signals module is intentionally left blank as requested',
          note: 'This module can be customized for specific trading signal implementations',
          lastUpdated: new Date().toISOString()
        };
        
        setData(fallbackData);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60 * 60 * 1000); // Update every hour
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black border border-gray-700 min-h-[400px] max-h-[500px]">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>TRADE SIGNALS</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-black border border-gray-700 min-h-[400px] max-h-[500px]">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>TRADE SIGNALS</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-2 flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#DAA520] text-2xl mb-3">📊</div>
          <div className="text-white text-xs font-bold mb-2">TRADE SIGNALS</div>
          <div className="text-gray-400 text-xs mb-3 max-w-[200px]">
            {data?.message || 'Trade Signals module is intentionally left blank as requested'}
          </div>
          <div className="text-gray-500 text-xs">
            {data?.note || 'This module can be customized for specific trading signal implementations'}
          </div>
        </div>
      </div>
    </div>
  );
}