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
        const response = await fetch('/api/energy-stocks');
        const data = await response.json();
        
        // Map the API response to our Stock interface
        const mappedStocks: Stock[] = data.map((stock: any) => ({
          symbol: stock.symbol,
          name: stock.name,
          price: stock.price,
          change: stock.changePercent // Use percentage change for display
        }));
        
        setStocks(mappedStocks);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch stock data:', error);
        
        // Fallback to mock data
        const fallbackStocks: Stock[] = [
          { symbol: 'XOM', name: 'Exxon Mobil', price: 118.45, change: 2.3 },
          { symbol: 'CVX', name: 'Chevron Corp', price: 162.87, change: 1.8 },
          { symbol: 'COP', name: 'ConocoPhillips', price: 134.22, change: -0.5 },
          { symbol: 'EOG', name: 'EOG Resources', price: 145.67, change: 1.2 },
          { symbol: 'SLB', name: 'Schlumberger', price: 63.91, change: 3.2 },
          { symbol: 'PXD', name: 'Pioneer Natural', price: 267.89, change: 0.8 },
          { symbol: 'KMI', name: 'Kinder Morgan', price: 18.43, change: -0.3 },
          { symbol: 'WMB', name: 'Williams Cos', price: 41.26, change: 1.5 }
        ];
        
        setStocks(fallbackStocks);
        setLoading(false);
      }
    };

    fetchStocks();
    const interval = setInterval(fetchStocks, 5 * 60 * 1000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black border border-gray-700 min-h-[400px] max-h-[500px]">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-semibold tracking-wider">US ENERGY MARKETS</h3>
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
        <h3 className="text-white text-xs font-semibold tracking-wider">US ENERGY MARKETS</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-1">
        {stocks.map((stock, i) => (
          <div key={stock.symbol} className="flex items-center justify-between py-1 border-b border-gray-700 last:border-b-0">
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