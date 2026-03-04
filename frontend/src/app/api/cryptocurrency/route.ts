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

// Top 20 cryptocurrencies for the treemap display
const TOP_CRYPTOS = [
  'bitcoin', 'ethereum', 'tether', 'bnb', 'solana', 'xrp', 'dogecoin', 'cardano',
  'avalanche-2', 'chainlink', 'polkadot', 'polygon', 'litecoin', 'near', 'uniswap',
  'ethereum-classic', 'stellar', 'filecoin', 'cosmos', 'monero'
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
    
    // Map CoinGecko IDs to symbols
    const symbolMap: Record<string, string> = {
      'bitcoin': 'BTC',
      'ethereum': 'ETH', 
      'tether': 'USDT',
      'bnb': 'BNB',
      'solana': 'SOL',
      'xrp': 'XRP',
      'dogecoin': 'DOGE',
      'cardano': 'ADA',
      'avalanche-2': 'AVAX',
      'chainlink': 'LINK',
      'polkadot': 'DOT',
      'polygon': 'MATIC',
      'litecoin': 'LTC',
      'near': 'NEAR',
      'uniswap': 'UNI',
      'ethereum-classic': 'ETC',
      'stellar': 'XLM',
      'filecoin': 'FIL',
      'cosmos': 'ATOM',
      'monero': 'XMR'
    };
    
    let rank = 1;
    for (const [id, priceData] of Object.entries(data)) {
      if (typeof priceData === 'object' && priceData !== null) {
        const price = (priceData as any).usd || 0;
        const change = (priceData as any).usd_24h_change || 0;
        const marketCap = (priceData as any).usd_market_cap || 0;
        
        cryptos.push({
          symbol: symbolMap[id] || id.toUpperCase(),
          name: id.replace('-', ' '),
          price: parseFloat(price.toFixed(price < 1 ? 6 : 2)),
          changePercent24h: parseFloat(change.toFixed(2)),
          marketCap,
          rank: rank++
        });
      }
    }
    
    // Sort by market cap (descending)
    cryptos.sort((a, b) => b.marketCap - a.marketCap);
    
    return cryptos;
    
  } catch (error) {
    console.error('CoinGecko API error:', error);
    return [];
  }
}

// Realistic mock data for major cryptocurrencies
function getMockCryptoData(): CryptoCurrency[] {
  return [
    { symbol: 'BTC', name: 'Bitcoin', price: 43250.50, changePercent24h: 0.69, marketCap: 850000000000, rank: 1 },
    { symbol: 'ETH', name: 'Ethereum', price: 2890.75, changePercent24h: 1.41, marketCap: 350000000000, rank: 2 },
    { symbol: 'USDT', name: 'Tether', price: 1.00, changePercent24h: 0.0, marketCap: 95000000000, rank: 3 },
    { symbol: 'BNB', name: 'BNB', price: 315.25, changePercent24h: 1.3, marketCap: 47000000000, rank: 4 },
    { symbol: 'SOL', name: 'Solana', price: 98.45, changePercent24h: -2.5, marketCap: 45000000000, rank: 5 },
    { symbol: 'XRP', name: 'XRP', price: 0.52, changePercent24h: -1.2, marketCap: 28000000000, rank: 6 },
    { symbol: 'DOGE', name: 'Dogecoin', price: 0.085, changePercent24h: 3.4, marketCap: 12000000000, rank: 7 },
    { symbol: 'ADA', name: 'Cardano', price: 0.48, changePercent24h: -0.8, marketCap: 17000000000, rank: 8 },
    { symbol: 'AVAX', name: 'Avalanche', price: 36.75, changePercent24h: 2.1, marketCap: 15000000000, rank: 9 },
    { symbol: 'LINK', name: 'Chainlink', price: 14.25, changePercent24h: -1.5, marketCap: 8500000000, rank: 10 },
    { symbol: 'DOT', name: 'Polkadot', price: 6.85, changePercent24h: 0.7, marketCap: 9200000000, rank: 11 },
    { symbol: 'MATIC', name: 'Polygon', price: 0.92, changePercent24h: -2.1, marketCap: 8800000000, rank: 12 },
    { symbol: 'LTC', name: 'Litecoin', price: 72.50, changePercent24h: 1.8, marketCap: 5400000000, rank: 13 },
    { symbol: 'NEAR', name: 'NEAR Protocol', price: 3.25, changePercent24h: -0.5, marketCap: 3600000000, rank: 14 },
    { symbol: 'UNI', name: 'Uniswap', price: 7.45, changePercent24h: 0.9, marketCap: 5600000000, rank: 15 },
    { symbol: 'ETC', name: 'Ethereum Classic', price: 28.50, changePercent24h: -3.2, marketCap: 4200000000, rank: 16 }
  ].map(crypto => ({
    ...crypto,
    // Add some randomization for demo purposes
    changePercent24h: crypto.changePercent24h + (Math.random() - 0.5) * 2
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
    
    // Ensure we have at least top 16 cryptos for the treemap
    const minCryptos = Math.min(16, cryptos.length);
    const displayCryptos = cryptos.slice(0, minCryptos);
    
    // Cache the results
    cache = { data: displayCryptos, ts: Date.now() };
    
    return NextResponse.json(displayCryptos);
    
  } catch (error) {
    console.error('Cryptocurrency API error:', error);
    
    // Ultimate fallback
    const fallbackData = getMockCryptoData();
    return NextResponse.json(fallbackData.slice(0, 16));
  }
}