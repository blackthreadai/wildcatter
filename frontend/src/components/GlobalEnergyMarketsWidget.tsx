'use client';

import { useState, useEffect } from 'react';

interface GlobalEnergyStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  region: string;
  exchange: string;
  chartUrl: string;
  sector: string;
}

export default function GlobalEnergyMarketsWidget() {
  const [stocks, setStocks] = useState<GlobalEnergyStock[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const response = await fetch('/api/global-energy-markets');
        const data = await response.json();
        setStocks(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch global energy markets:', error);
        setLoading(false);
      }
    };

    fetchStocks();
    
    // Refresh every 2 minutes during market hours
    const interval = setInterval(fetchStocks, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Group stocks by region for display
  const stocksByRegion = {
    US: stocks.filter(s => s.region === 'US'),
    Europe: stocks.filter(s => s.region === 'Europe'),
    Asia: stocks.filter(s => s.region === 'Asia')
  };

  const formatPrice = (price: number): string => {
    if (price >= 1000) {
      return `$${(price / 1000).toFixed(1)}K`;
    }
    return `$${price.toFixed(2)}`;
  };

  const getChangeColor = (change: number): string => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getChangeIcon = (change: number): string => {
    if (change > 0) return '▲';
    if (change < 0) return '▼';
    return '●';
  };

  // REMOVED CLICK FUNCTIONALITY

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black border border-gray-700 min-h-[400px] max-h-[500px]">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>
            ENERGY MARKETS
          </h3>
        </div>
        <div className="flex-1 p-2 flex items-center justify-center">
          <div className="text-gray-500 text-xs">Loading global markets...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-black border border-gray-700 min-h-[400px] max-h-[500px]">
      {/* Header - just title */}
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>
          ENERGY MARKETS
        </h3>
      </div>

      {/* Scrollable stocks list */}
      <div className="flex-1 overflow-y-auto bg-black min-h-0">
        {stocks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 text-xs">No stocks available</div>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {stocks.map((stock, i) => (
              <div
                key={`${stock.symbol}-${i}`}
                className="flex items-center justify-between py-1 px-2 border-b border-gray-800 last:border-b-0"
              >
                {/* Left side - Symbol and name */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[#DAA520] text-xs font-bold tracking-wider">
                      {stock.symbol}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {stock.region}
                    </span>
                  </div>
                  <div className="text-gray-400 text-xs truncate">
                    {stock.name}
                  </div>
                </div>

                {/* Center - Sector badge */}
                <div className="px-2">
                  <span className="text-gray-500 text-xs bg-gray-900 px-1 py-0.5 rounded">
                    {stock.sector}
                  </span>
                </div>

                {/* Right side - Price and change */}
                <div className="text-right flex-shrink-0">
                  <div className="text-white text-xs font-medium">
                    {formatPrice(stock.price)}
                  </div>
                  <div className={`text-xs flex items-center gap-1 ${getChangeColor(stock.change)}`}>
                    <span className="text-xs">{getChangeIcon(stock.change)}</span>
                    <span>{stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary footer */}
        {stocks.length > 0 && (
          <div className="bg-gray-900 p-2 text-xs text-gray-400 border-t border-gray-700">
            <div className="flex justify-between items-center">
              <span>
                US: {stocksByRegion.US.length} • EU: {stocksByRegion.Europe.length} • ASIA: {stocksByRegion.Asia.length}
              </span>
              <span className="text-green-400">
                ↗ {stocks.filter(s => s.change > 0).length} UP
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}