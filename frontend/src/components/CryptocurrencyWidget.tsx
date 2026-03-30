'use client';

import { useState, useEffect } from 'react';

interface CryptoCurrency {
  symbol: string;
  name: string;
  price: number;
  changePercent24h: number;
  marketCap: number;
  rank: number;
  sparklineData?: number[];
}

export default function CryptocurrencyWidget() {
  const [cryptos, setCryptos] = useState<CryptoCurrency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCryptos = async () => {
      try {
        const response = await fetch('/api/cryptocurrency');
        const data = await response.json();
        
        // Filter to show the top 4: BTC, ETH, USDT, SOL
        const targetCryptos = ['BTC', 'ETH', 'USDT', 'SOL'];
        const filteredCryptos = targetCryptos.map(symbol => 
          data.find((crypto: CryptoCurrency) => crypto.symbol === symbol)
        ).filter(Boolean);
        
        // Add mock sparkline data for each crypto
        const cryptosWithSparklines = filteredCryptos.map(crypto => ({
          ...crypto,
          sparklineData: generateMockSparklineData(crypto.changePercent24h)
        }));
        
        setCryptos(cryptosWithSparklines);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch cryptocurrency data:', error);
        
        // Fallback data for the 4 main cryptos with sparklines
        const fallbackData: CryptoCurrency[] = [
          { symbol: 'BTC', name: 'Bitcoin', price: 68234.00, changePercent24h: 0.69, marketCap: 1350000000000, rank: 1 },
          { symbol: 'ETH', name: 'Ethereum', price: 1975.06, changePercent24h: 1.41, marketCap: 240000000000, rank: 2 },
          { symbol: 'USDT', name: 'Tether', price: 1.00, changePercent24h: 0.02, marketCap: 140000000000, rank: 3 },
          { symbol: 'SOL', name: 'Solana', price: 145.82, changePercent24h: 2.34, marketCap: 68000000000, rank: 5 }
        ].map(crypto => ({
          ...crypto,
          sparklineData: generateMockSparklineData(crypto.changePercent24h)
        }));
        
        setCryptos(fallbackData);
        setLoading(false);
      }
    };

    fetchCryptos();
    const interval = setInterval(fetchCryptos, 5 * 60 * 1000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const generateMockSparklineData = (changePercent: number): number[] => {
    // Generate 24 data points representing hourly changes
    const baseValue = 100;
    const points: number[] = [baseValue];
    
    // Create trend based on overall change
    const trend = changePercent / 24; // Distribute change over 24 hours
    const volatility = Math.abs(changePercent) * 0.3; // Add some volatility
    
    for (let i = 1; i < 24; i++) {
      const randomVariation = (Math.random() - 0.5) * volatility;
      const trendValue = baseValue + (trend * i);
      const newValue = trendValue + randomVariation;
      points.push(newValue);
    }
    
    return points;
  };

  const createSparklinePath = (data: number[]) => {
    if (!data || data.length === 0) return '';
    
    const width = 80;
    const height = 30;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;
    
    if (range === 0) {
      // If no change, draw flat line
      return `M 0,${height/2} L ${width},${height/2}`;
    }
    
    const step = width / (data.length - 1);
    
    let path = `M 0,${height - ((data[0] - min) / range) * height}`;
    
    for (let i = 1; i < data.length; i++) {
      const x = step * i;
      const y = height - ((data[i] - min) / range) * height;
      path += ` L ${x},${y}`;
    }
    
    return path;
  };

  const formatPrice = (price: number) => {
    if (price < 1) {
      return price.toFixed(4);
    } else if (price < 100) {
      return price.toFixed(2);
    } else {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black border border-gray-700 h-full">
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
    <div className="w-full flex flex-col bg-black border border-gray-700 h-full">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>CRYPTOCURRENCY</h3>
      </div>
      
      <div className="flex-1 bg-black p-3">
        {/* 2x2 Grid of crypto squares */}
        <div className="grid grid-cols-2 grid-rows-2 gap-3 h-full">
          {cryptos.slice(0, 4).map((crypto) => (
            <div
              key={crypto.symbol}
              className="bg-gray-900 rounded-lg p-4 flex flex-col justify-between border border-gray-700 hover:border-gray-600 transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.8) 0%, rgba(17, 24, 39, 0.9) 100%)'
              }}
            >
              {/* Top section: Symbol */}
              <div className="flex justify-between items-start mb-2">
                <div className="text-white font-bold text-base">
                  {crypto.symbol}
                </div>
                <div className={`text-xs font-medium ${
                  crypto.changePercent24h >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {crypto.changePercent24h >= 0 ? '+' : ''}{crypto.changePercent24h.toFixed(2)}%
                </div>
              </div>
              
              {/* Middle section: Sparkline Chart */}
              <div className="flex-1 flex items-center justify-center mb-2">
                <svg width="80" height="30" className="overflow-visible">
                  <path
                    d={createSparklinePath(crypto.sparklineData || [])}
                    stroke={crypto.changePercent24h >= 0 ? '#10B981' : '#EF4444'}
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              
              {/* Bottom section: Price */}
              <div className="text-white font-mono font-bold text-base">
                ${formatPrice(crypto.price)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}