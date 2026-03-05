'use client';

import { useState, useEffect } from 'react';

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  currency?: string;
}

export default function AsianStockWidget() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);

  const formatPrice = (price: number, currency: string = 'USD') => {
    if (currency === 'INR') {
      return `₹${price.toFixed(0)}`; // INR without decimals
    }
    return `$${price.toFixed(2)}`; // USD with decimals
  };

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const response = await fetch('/api/asian-energy-stocks');
        const data = await response.json();
        
        // Map the API response to our Stock interface
        const mappedStocks: Stock[] = data.map((stock: any) => ({
          symbol: stock.symbol,
          name: stock.name,
          price: stock.price,
          change: stock.changePercent, // Use percentage change for display
          currency: stock.currency
        }));
        
        setStocks(mappedStocks);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch Asian stock data:', error);
        
        // Fallback to mock data
        const fallbackStocks: Stock[] = [
          { symbol: 'PTR', name: 'PetroChina', price: 45.23, change: 1.7 },
          { symbol: 'SNP', name: 'Sinopec', price: 52.18, change: -0.8 },
          { symbol: 'CEO', name: 'CNOOC Ltd', price: 38.91, change: 2.4 },
          { symbol: 'RIL', name: 'Reliance Ind', price: 78.45, change: 0.9 }
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
          <h3 className="text-white text-xs font-semibold tracking-wider">ASIAN ENERGY MARKETS</h3>
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
        <h3 className="text-white text-xs font-semibold tracking-wider">ASIAN ENERGY MARKETS</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-1">
        {stocks.map((stock, i) => (
          <div key={stock.symbol} className="flex items-center justify-between py-1 border-b border-gray-700 last:border-b-0">
            <div className="min-w-0 flex-1">
              <div className="text-[#DAA520] text-xs font-semibold">{stock.symbol}</div>
              <div className="text-gray-400 text-xs truncate">{stock.name}</div>
            </div>
            <div className="text-right ml-1">
              <div className="text-white text-xs font-mono">{formatPrice(stock.price, stock.currency)}</div>
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