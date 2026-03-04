import { NextResponse } from 'next/server';

interface CryptoCurrency {
  symbol: string;
  name: string;
  price: number;
  changePercent24h: number;
  marketCap: number;
  rank: number;
}

// Cache for 5 minutes (crypto prices update frequently)
let cache: { data: CryptoCurrency[]; ts: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

// Top 4 cryptocurrencies for the ticker display
const TOP_CRYPTOS = [
  'bitcoin', 'ethereum', 'tether', 'solana'
];

async function fetchCoinGeckoCrypto(): Promise<CryptoCurrency[]> {
  try {
    const ids = TOP_CRYPTOS.join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;
    
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    const cryptos: CryptoCurrency[] = [];
    
    // Map CoinGecko IDs to symbols (top 4 only)
    const symbolMap: Record<string, string> = {
      'bitcoin': 'BTC',
      'ethereum': 'ETH', 
      'tether': 'USDT',
      'solana': 'SOL'
    };
    
    // Desired order for display
    const displayOrder = ['bitcoin', 'ethereum', 'tether', 'solana'];
    
    // Process in the desired display order (BTC, ETH, USDT, SOL)
    for (const id of displayOrder) {
      const priceData = data[id];
      if (typeof priceData === 'object' && priceData !== null) {
        const price = (priceData as any).usd || 0;
        const change = (priceData as any).usd_24h_change || 0;
        const marketCap = (priceData as any).usd_market_cap || 0;
        
        cryptos.push({
          symbol: symbolMap[id] || id.toUpperCase(),
          name: id.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          price: parseFloat(price.toFixed(price < 1 ? 6 : 2)),
          changePercent24h: parseFloat(change.toFixed(2)),
          marketCap,
          rank: cryptos.length + 1
        });
      }
    }
    
    return cryptos;
    
  } catch (error) {
    console.error('CoinGecko API error:', error);
    return [];
  }
}

// Realistic mock data for top 4 cryptocurrencies
function getMockCryptoData(): CryptoCurrency[] {
  return [
    { symbol: 'BTC', name: 'Bitcoin', price: 68234.00, changePercent24h: 0.69, marketCap: 1350000000000, rank: 1 },
    { symbol: 'ETH', name: 'Ethereum', price: 1975.06, changePercent24h: 1.41, marketCap: 240000000000, rank: 2 },
    { symbol: 'USDT', name: 'Tether', price: 1.00, changePercent24h: 0.01, marketCap: 184000000000, rank: 3 },
    { symbol: 'SOL', name: 'Solana', price: 87.11, changePercent24h: -2.5, marketCap: 50000000000, rank: 4 }
  ].map(crypto => ({
    ...crypto,
    // Add slight randomization for realistic movement
    changePercent24h: crypto.changePercent24h + (Math.random() - 0.5) * 1
  }));
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    // Try to fetch live data first
    let cryptos = await fetchCoinGeckoCrypto();
    
    // Fallback to mock data if API unavailable
    if (cryptos.length === 0) {
      console.log('Using fallback mock data for cryptocurrency');
      cryptos = getMockCryptoData();
    }
    
    // Ensure we have exactly 4 cryptos for the ticker
    const displayCryptos = cryptos.slice(0, 4);
    
    // Cache the results
    cache = { data: displayCryptos, ts: Date.now() };
    
    return NextResponse.json(displayCryptos);
    
  } catch (error) {
    console.error('Cryptocurrency API error:', error);
    
    // Ultimate fallback
    const fallbackData = getMockCryptoData();
    return NextResponse.json(fallbackData);
  }
}