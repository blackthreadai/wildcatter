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
    <div className="w-full flex flex-col bg-black border-2 min-h-[400px] max-h-[500px] relative overflow-hidden" 
         style={{
           borderImageSource: 'linear-gradient(45deg, #1e40af, #3b82f6, #1e40af)',
           borderImageSlice: 1,
           boxShadow: '0 0 20px rgba(59, 130, 246, 0.3), inset 0 0 20px rgba(59, 130, 246, 0.1)'
         }}>
      {/* Federal Reserve Seal/Indicator */}
      <div className="absolute top-1 left-1 z-10">
        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center border border-blue-400">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L3.09 8.26l1.14 12.28L12 22l7.77-1.46L20.91 8.26L12 2zm-1 15.92V9.5L5.18 7.63l6.82-4.13v14.42zm2 0V3.5l6.82 4.13L14 9.5v8.42z"/>
          </svg>
        </div>
      </div>
      
      {/* Unique header with gradient */}
      <div className="bg-gradient-to-r from-gray-800 via-blue-900 to-gray-800 p-2 flex-shrink-0 relative">
        <h3 className="text-white text-xs font-bold tracking-[0.2em] text-center" style={{ fontStretch: 'condensed' }}>
          ECONOMIC INDICATORS
        </h3>
        <div className="text-blue-300 text-xs text-center mt-1 opacity-75">FEDERAL RESERVE DATA</div>
      </div>
      
      <div className="flex-1 bg-gradient-to-b from-black to-gray-900 px-3 py-1 relative">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%233b82f6' fill-opacity='0.3'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
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
              <div key={indicator.name} className="flex items-center justify-between py-1 border-b border-blue-800/30 last:border-b-0 relative">
                <div className="min-w-0 flex-1">
                  <div className="text-blue-300 text-xs font-semibold">{indicator.name}</div>
                  <div className="text-gray-400 text-xs">{indicator.period}</div>
                </div>
                <div className="text-right ml-1">
                  <div className="text-white text-xs font-mono font-bold">{indicator.value}</div>
                  <div className={`text-xs ${indicator.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {indicator.change >= 0 ? '+' : ''}{indicator.change.toFixed(2)}
                    {indicator.name.includes('Treasury') || indicator.name.includes('Rate') || indicator.name.includes('Unemployment') ? 'bp' : '%'}
                  </div>
                </div>
                {/* Subtle indicator glow */}
                <div className="absolute left-0 w-1 h-full bg-gradient-to-b from-transparent via-blue-500/20 to-transparent"></div>
              </div>
            ))}
            
            {/* Source attribution */}
            <div className="text-xs text-blue-400 text-center mt-2 pt-2 border-t border-blue-800/30">
              Source: Federal Reserve Economic Data (FRED API)
            </div>
          </>
        )}
      </div>
    </div>
  );
}