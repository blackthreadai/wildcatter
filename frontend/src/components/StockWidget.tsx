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
        
        // Ensure we have exactly 8 stocks for display
        const displayStocks = mappedStocks.slice(0, 8);
        setStocks(displayStocks);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch stock data:', error);
        // No fallback - let API handle its own fallbacks
        setStocks([]);
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
        {stocks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 text-xs">Real-time data temporarily unavailable</div>
          </div>
        ) : (
          stocks.map((stock, i) => (
          <div key={stock.symbol} className="flex items-center justify-between py-1 border-b border-gray-700 last:border-b-0">
            <a 
              href={`https://finance.yahoo.com/chart/${stock.symbol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 hover:opacity-75 transition-opacity cursor-pointer"
            >
              <div className="text-[#DAA520] text-xs font-semibold hover:underline">{stock.symbol}</div>
              <div className="text-gray-400 text-xs truncate hover:text-gray-300">{stock.name}</div>
            </a>
            <div className="text-right ml-1">
              <div className="text-white text-xs font-mono">${stock.price.toFixed(2)}</div>
              <div className={`text-xs ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
              </div>
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
}