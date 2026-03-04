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
        
        // Filter to only show the top 4: BTC, ETH, USDT, SOL
        const targetCryptos = ['BTC', 'ETH', 'USDT', 'SOL'];
        const filteredCryptos = targetCryptos.map(symbol => 
          data.find((crypto: CryptoCurrency) => crypto.symbol === symbol)
        ).filter(Boolean);
        
        setCryptos(filteredCryptos);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch cryptocurrency data:', error);
        
        // Fallback data for the 4 main cryptos
        const fallbackData: CryptoCurrency[] = [
          { symbol: 'BTC', name: 'Bitcoin', price: 68234.00, changePercent24h: 0.69, marketCap: 1350000000000, rank: 1 },
          { symbol: 'ETH', name: 'Ethereum', price: 1975.06, changePercent24h: 1.41, marketCap: 240000000000, rank: 2 },
          { symbol: 'USDT', name: 'Tether', price: 1.00, changePercent24h: 0.01, marketCap: 184000000000, rank: 3 },
          { symbol: 'SOL', name: 'Solana', price: 87.11, changePercent24h: -2.5, marketCap: 50000000000, rank: 4 },
        ];
        
        setCryptos(fallbackData);
        setLoading(false);
      }
    };

    fetchCryptos();
    const interval = setInterval(fetchCryptos, 5 * 60 * 1000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number) => {
    if (price < 1) {
      return price.toFixed(6); // For coins under $1, show more decimals
    } else if (price < 100) {
      return price.toFixed(2); // For coins under $100
    } else {
      return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); // For larger amounts
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
      
      <div className="flex-1 bg-black px-3 py-1">
        {/* Clean ticker-style layout for 4 cryptos */}
        {cryptos.slice(0, 4).map((crypto, i) => (
          <div key={crypto.symbol} className="flex items-center justify-between py-1 border-b border-gray-700 last:border-b-0">
            <div className="min-w-0 flex-1">
              <div className="text-[#DAA520] text-xs font-semibold">{crypto.symbol}</div>
              <div className="text-gray-400 text-xs truncate">{crypto.name}</div>
            </div>
            <div className="text-right ml-1">
              <div className="text-white text-xs font-mono">${formatPrice(crypto.price)}</div>
              <div className={`text-xs ${crypto.changePercent24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {crypto.changePercent24h >= 0 ? '+' : ''}{crypto.changePercent24h.toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}