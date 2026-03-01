'use client';

import { useState, useEffect } from 'react';

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
}

export default function StockWidget() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        // Top 4 US energy stocks only
        const topEnergyStocks: Stock[] = [
          { symbol: 'XOM', name: 'Exxon Mobil', price: 118.45, change: 2.3 },
          { symbol: 'CVX', name: 'Chevron Corp', price: 162.87, change: 1.8 },
          { symbol: 'COP', name: 'ConocoPhillips', price: 134.22, change: -0.5 },
          { symbol: 'SLB', name: 'Schlumberger', price: 63.91, change: 3.2 }
        ];

        // Randomize the changes slightly for demo
        const randomizedStocks = topEnergyStocks.map(stock => ({
          ...stock,
          change: stock.change + (Math.random() - 0.5) * 2
        }));

        setStocks(randomizedStocks);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch stock data:', error);
        setLoading(false);
      }
    };

    fetchStocks();
    const interval = setInterval(fetchStocks, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col bg-black">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-semibold tracking-wider">US MARKETS</h3>
        </div>
        <div className="flex-1 p-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-black">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-semibold tracking-wider">US MARKETS</h3>
      </div>
      
      <div className="flex-1 bg-black p-1">
        {stocks.map((stock, i) => (
          <div key={stock.symbol} className="flex items-center justify-between py-1">
            <div className="min-w-0 flex-1">
              <div className="text-[#DAA520] text-xs font-semibold">{stock.symbol}</div>
              <div className="text-gray-400 text-xs truncate">{stock.name}</div>
            </div>
            <div className="text-right ml-1">
              <div className="text-white text-xs font-mono">${stock.price.toFixed(2)}</div>
              <div className={`text-xs ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}