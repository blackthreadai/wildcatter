'use client';

import { useState, useEffect } from 'react';

interface EconomicIndicator {
  name: string;
  value: string;
  change: number;
  unit: string;
  period: string;
}

export default function EconomicIndicatorsWidget() {
  const [indicators, setIndicators] = useState<EconomicIndicator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIndicators = async () => {
      try {
        const response = await fetch('/api/economic-indicators');
        const data = await response.json();
        setIndicators(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch economic indicators:', error);
        
        // Fallback data
        const fallbackData: EconomicIndicator[] = [
          { name: 'National Debt', value: '$33.8T', change: 0.8, unit: 'USD Trillions', period: 'Mar 2026' },
          { name: 'GDP', value: '$27.2T', change: 2.1, unit: 'USD Trillions', period: 'Q4 2025' },
          { name: '10-Year Treasury', value: '4.25%', change: -0.12, unit: 'Yield Percentage', period: 'Current' },
          { name: 'Unemployment', value: '3.8%', change: -0.1, unit: 'Percentage', period: 'Mar 2026' }
        ];
        
        setIndicators(fallbackData);
        setLoading(false);
      }
    };

    fetchIndicators();
    const interval = setInterval(fetchIndicators, 2 * 60 * 60 * 1000); // Update every 2 hours
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col bg-black">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>ECONOMIC INDICATORS</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-black">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>ECONOMIC INDICATORS</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-1">
        {indicators.map((indicator, i) => (
          <div key={indicator.name} className="flex items-center justify-between py-1 border-b border-gray-700 last:border-b-0">
            <div className="min-w-0 flex-1">
              <div className="text-[#DAA520] text-xs font-semibold">{indicator.name}</div>
              <div className="text-gray-400 text-xs">{indicator.period}</div>
            </div>
            <div className="text-right ml-1">
              <div className="text-white text-xs font-mono font-bold">{indicator.value}</div>
              <div className={`text-xs ${indicator.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {indicator.change >= 0 ? '+' : ''}{indicator.change.toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}