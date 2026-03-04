'use client';

import { useState, useEffect } from 'react';

interface PreciousMetal {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  unit: string;
}

export default function PreciousMetalsWidget() {
  const [metals, setMetals] = useState<PreciousMetal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetals = async () => {
      try {
        const response = await fetch('/api/precious-metals');
        const data = await response.json();
        setMetals(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch precious metals data:', error);
        
        // Fallback data
        const fallbackData: PreciousMetal[] = [
          { symbol: 'XAU', name: 'Gold', price: 2045.50, change: 12.30, changePercent: 0.60, unit: 'USD/oz' },
          { symbol: 'XAG', name: 'Silver', price: 24.85, change: -0.45, changePercent: -1.78, unit: 'USD/oz' },
          { symbol: 'XPT', name: 'Platinum', price: 1028.75, change: 8.25, changePercent: 0.81, unit: 'USD/oz' }
        ];
        
        setMetals(fallbackData);
        setLoading(false);
      }
    };

    fetchMetals();
    const interval = setInterval(fetchMetals, 10 * 60 * 1000); // Update every 10 minutes
    return () => clearInterval(interval);
  }, []);

  const getMetalBarStyle = (metalName: string) => {
    switch (metalName) {
      case 'Gold':
        return {
          background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
          symbol: 'Au',
          textColor: 'text-yellow-900'
        };
      case 'Silver':
        return {
          background: 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 50%, #898989 100%)',
          symbol: 'Ag', 
          textColor: 'text-gray-700'
        };
      case 'Platinum':
        return {
          background: 'linear-gradient(135deg, #E5E4E2 0%, #BCC6CC 50%, #98AFC7 100%)',
          symbol: 'Pt',
          textColor: 'text-gray-700'
        };
      default:
        return {
          background: 'linear-gradient(135deg, #666 0%, #444 100%)',
          symbol: '??',
          textColor: 'text-gray-700'
        };
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col bg-black">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>PRECIOUS METALS</h3>
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
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>PRECIOUS METALS</h3>
      </div>
      
      <div className="flex-1 bg-black p-2">
        {/* Grid layout for 3 metal bars */}
        <div className="grid grid-cols-3 gap-2 h-full">
          {metals.map((metal) => {
            const barStyle = getMetalBarStyle(metal.name);
            
            return (
              <div key={metal.symbol} className="flex flex-col h-full">
                {/* Metal bar - takes up most of the space */}
                <div 
                  className="flex-1 rounded-lg flex flex-col items-center justify-center mb-2 shadow-lg"
                  style={{ 
                    background: barStyle.background,
                    minHeight: '60%'
                  }}
                >
                  {/* Chemical symbol */}
                  <div className={`text-2xl font-bold ${barStyle.textColor} mb-1`}>
                    {barStyle.symbol}
                  </div>
                  {/* Metal name */}
                  <div className={`text-xs font-semibold ${barStyle.textColor}`}>
                    {metal.name}
                  </div>
                </div>
                
                {/* Price and change info below the bar */}
                <div className="text-center">
                  {/* Price */}
                  <div className="text-white text-xs font-mono font-bold mb-1">
                    ${metal.price.toFixed(2)}
                  </div>
                  {/* Change with up/down indicator */}
                  <div className={`text-xs flex items-center justify-center gap-1 ${
                    metal.change >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {/* Up/Down arrow */}
                    <span className="text-xs">
                      {metal.change >= 0 ? '▲' : '▼'}
                    </span>
                    {/* Change amount and percentage */}
                    <span className="font-mono">
                      {metal.change >= 0 ? '+' : ''}{metal.change.toFixed(2)}
                    </span>
                  </div>
                  {/* Percentage change */}
                  <div className={`text-xs font-mono ${
                    metal.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    ({metal.changePercent >= 0 ? '+' : ''}{metal.changePercent.toFixed(2)}%)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}