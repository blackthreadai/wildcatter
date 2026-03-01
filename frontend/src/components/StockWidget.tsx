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
        // Mock energy stocks data - in production, this would fetch from a real stock API
        const mockStocks: Stock[] = [
          { symbol: 'XOM', name: 'Exxon Mobil', price: 118.45, change: 2.3 },
          { symbol: 'CVX', name: 'Chevron Corp', price: 162.87, change: 1.8 },
          { symbol: 'COP', name: 'ConocoPhillips', price: 134.22, change: -0.5 },
          { symbol: 'SLB', name: 'Schlumberger', price: 63.91, change: 3.2 },
          { symbol: 'EOG', name: 'EOG Resources', price: 129.76, change: 1.4 },
          { symbol: 'PXD', name: 'Pioneer Natural', price: 267.34, change: -1.2 },
          { symbol: 'VLO', name: 'Valero Energy', price: 147.89, change: 2.7 },
          { symbol: 'MPC', name: 'Marathon Petrol', price: 186.45, change: 1.9 },
          { symbol: 'PSX', name: 'Phillips 66', price: 134.56, change: -0.3 },
          { symbol: 'KMI', name: 'Kinder Morgan', price: 21.87, change: 0.8 },
          { symbol: 'OKE', name: 'ONEOK Inc', price: 98.23, change: 2.1 },
          { symbol: 'WMB', name: 'Williams Cos', price: 42.67, change: 1.5 },
          { symbol: 'ET', name: 'Energy Transfer', price: 16.89, change: -0.7 },
          { symbol: 'EPD', name: 'Enterprise Prod', price: 30.12, change: 0.9 },
          { symbol: 'HAL', name: 'Halliburton', price: 41.78, change: 4.1 },
          { symbol: 'BKR', name: 'Baker Hughes', price: 39.45, change: 2.8 },
          { symbol: 'DVN', name: 'Devon Energy', price: 52.34, change: -1.8 },
          { symbol: 'FANG', name: 'Diamondback', price: 198.67, change: 1.3 },
          { symbol: 'MRO', name: 'Marathon Oil', price: 29.89, change: 0.6 },
          { symbol: 'APA', name: 'APA Corp', price: 41.23, change: -2.1 }
        ];

        // Randomize the changes slightly for demo
        const randomizedStocks = mockStocks.map(stock => ({
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
      <div className="h-full flex flex-col bg-black">
        <div className="bg-gray-800 p-2">
          <h3 className="text-white text-xs font-semibold tracking-wider">US MARKETS</h3>
        </div>
        <div className="flex-1 p-2 flex items-center justify-center bg-black">
          <div className="text-gray-500 text-xs">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black">
      <div className="bg-gray-800 p-2">
        <h3 className="text-white text-xs font-semibold tracking-wider">US MARKETS</h3>
      </div>
      
      <div className="flex-1 bg-black overflow-hidden">
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600">
          <div className="p-1 space-y-1">
            {stocks.map((stock, i) => (
              <div key={stock.symbol} className="border-b border-gray-700 pb-1 last:border-b-0">
                <div className="flex items-center justify-between">
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
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}