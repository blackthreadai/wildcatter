'use client';

import { useState, useEffect } from 'react';

interface CryptoCurrency {
  symbol: string;
  name: string;
  price: number;
  changePercent24h: number;
  marketCap: number;
  rank: number;
}

export default function CryptocurrencyWidget() {
  const [cryptos, setCryptos] = useState<CryptoCurrency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCryptos = async () => {
      try {
        const response = await fetch('/api/cryptocurrency');
        const data = await response.json();
        setCryptos(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch cryptocurrency data:', error);
        
        // Fallback data
        const fallbackData: CryptoCurrency[] = [
          { symbol: 'BTC', name: 'Bitcoin', price: 43250.50, changePercent24h: 0.69, marketCap: 850000000000, rank: 1 },
          { symbol: 'ETH', name: 'Ethereum', price: 2890.75, changePercent24h: 1.41, marketCap: 350000000000, rank: 2 },
          { symbol: 'USDT', name: 'Tether', price: 1.00, changePercent24h: 0.0, marketCap: 95000000000, rank: 3 },
          { symbol: 'BNB', name: 'BNB', price: 315.25, changePercent24h: 1.3, marketCap: 47000000000, rank: 4 },
          { symbol: 'SOL', name: 'Solana', price: 98.45, changePercent24h: -2.5, marketCap: 45000000000, rank: 5 },
        ];
        
        setCryptos(fallbackData);
        setLoading(false);
      }
    };

    fetchCryptos();
    const interval = setInterval(fetchCryptos, 5 * 60 * 1000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const getTileColor = (change: number) => {
    if (change > 0) {
      return 'bg-green-500'; // Green for positive
    } else if (change < 0) {
      return 'bg-red-500'; // Red for negative  
    } else {
      return 'bg-gray-600'; // Neutral gray
    }
  };

  const getTileSize = (rank: number) => {
    // Define grid spans based on crypto rank/importance
    switch (rank) {
      case 1: // BTC - largest tile
        return 'col-span-2 row-span-2';
      case 2: // ETH - large tile  
        return 'col-span-2 row-span-1';
      case 3: // USDT - medium tile
        return 'col-span-1 row-span-2';
      case 4: // BNB - medium tile
      case 5: // SOL - medium tile
        return 'col-span-1 row-span-1';
      default: // All others - small tiles
        return 'col-span-1 row-span-1';
    }
  };

  const getFontSize = (rank: number) => {
    // Adjust font size based on tile size
    switch (rank) {
      case 1: return 'text-2xl'; // BTC largest
      case 2: return 'text-lg';  // ETH large
      case 3: return 'text-base'; // USDT medium
      default: return 'text-sm'; // Others small
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col bg-black">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>CRYPTOCURRENCY</h3>
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
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>CRYPTOCURRENCY</h3>
      </div>
      
      <div className="flex-1 bg-black p-2">
        {/* Treemap-style grid layout */}
        <div className="grid grid-cols-4 grid-rows-4 gap-1 h-full">
          {cryptos.slice(0, 12).map((crypto, index) => (
            <div
              key={crypto.symbol}
              className={`
                ${getTileColor(crypto.changePercent24h)}
                ${getTileSize(crypto.rank)}
                rounded-sm
                flex flex-col items-center justify-center
                p-1
                transition-all duration-300 hover:brightness-110
              `}
            >
              {/* Crypto symbol */}
              <div className={`text-white font-bold ${getFontSize(crypto.rank)} mb-1`}>
                {crypto.symbol}
              </div>
              
              {/* Percentage change */}
              <div className={`text-white font-mono ${
                crypto.rank === 1 ? 'text-base' : 
                crypto.rank <= 3 ? 'text-sm' : 'text-xs'
              }`}>
                {crypto.changePercent24h >= 0 ? '+' : ''}{crypto.changePercent24h.toFixed(2)}%
              </div>
              
              {/* Price for major cryptos */}
              {crypto.rank <= 5 && (
                <div className={`text-white font-mono text-xs opacity-75 ${
                  crypto.rank === 1 ? 'block' : 'hidden sm:block'
                }`}>
                  ${crypto.price < 1 ? crypto.price.toFixed(4) : crypto.price.toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}