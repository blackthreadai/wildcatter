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
        
        // NO FALLBACK DATA - show empty state
        setIndicators([]);
        setLoading(false);
      }
    };

    fetchIndicators();
    const interval = setInterval(fetchIndicators, 2 * 60 * 60 * 1000); // Update every 2 hours
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black border border-gray-700 min-h-[400px] max-h-[500px]">
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
    <div className="w-full flex flex-col bg-black border border-gray-700 min-h-[400px] max-h-[500px]">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>ECONOMIC INDICATORS</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-1">
        {indicators.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-red-400 text-xs font-bold mb-2">FRED API UNAVAILABLE</div>
              <div className="text-gray-500 text-xs">Real economic data requires Federal Reserve API</div>
              <div className="text-gray-600 text-xs mt-1">Check API connection</div>
            </div>
          </div>
        ) : (
          <>
            {indicators.map((indicator, i) => (
              <div 
                key={indicator.name} 
                className={`flex items-center justify-between py-1 px-2 ${i % 2 === 1 ? 'bg-[#DAA520]/10' : 'bg-transparent'}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[#DAA520] text-xs font-semibold">{indicator.name}</div>
                  <div className="text-gray-400 text-xs">{indicator.period}</div>
                </div>
                <div className="text-right ml-1">
                  <div className="text-white text-xs font-mono font-bold">{indicator.value}</div>
                  <div className={`text-xs ${indicator.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {indicator.change >= 0 ? '+' : ''}{indicator.change.toFixed(2)}
                    {indicator.name.includes('Treasury') || indicator.name.includes('Rate') || indicator.name.includes('Unemployment') ? 'bp' : '%'}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Source attribution */}
            <div className="text-xs text-gray-500 text-center mt-2 pt-2 border-t border-gray-700">
              Source: Federal Reserve Economic Data
            </div>
          </>
        )}
      </div>
    </div>
  );
}