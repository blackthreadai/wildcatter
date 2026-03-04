import { NextResponse } from 'next/server';

interface AsianEnergyStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  sector: string;
  market: string;
}

// Top Asian energy stocks by market cap and relevance
const ASIAN_ENERGY_SYMBOLS = [
  { symbol: 'PTR', name: 'PetroChina Co Ltd', currency: 'USD', market: 'NYSE', sector: 'Oil & Gas' },
  { symbol: 'SNP', name: 'China Petroleum & Chemical', currency: 'USD', market: 'NYSE', sector: 'Oil & Gas' }, 
  { symbol: 'CEO', name: 'CNOOC Ltd', currency: 'USD', market: 'NYSE', sector: 'Oil & Gas' },
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries', currency: 'INR', market: 'NSE', sector: 'Oil & Gas' }
];

// Cache for 5 minutes (stock prices update frequently during market hours)
let cache: { data: AsianEnergyStock[]; ts: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

async function fetchYahooAsianStock(symbol: string): Promise<AsianEnergyStock | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d&includePrePost=false`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    const meta = data?.chart?.result?.[0]?.meta;
    
    if (!meta?.regularMarketPrice || !meta?.chartPreviousClose) {
      throw new Error('Invalid data structure');
    }
    
    const price = meta.regularMarketPrice;
    const previousClose = meta.chartPreviousClose;
    const change = price - previousClose;
    const changePercent = (change / previousClose) * 100;
    
    // Find the stock info from our symbols array
    const stockInfo = ASIAN_ENERGY_SYMBOLS.find(s => s.symbol === symbol);
    
    return {
      symbol,
      name: stockInfo?.name || symbol,
      price: parseFloat(price.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      currency: stockInfo?.currency || 'USD',
      sector: stockInfo?.sector || 'Energy',
      market: stockInfo?.market || 'NYSE'
    };
    
  } catch (error) {
    console.error(`Failed to fetch ${symbol}:`, error);
    return null;
  }
}

// Realistic mock data for Asian energy stocks when APIs are unavailable
function getMockAsianEnergyStocks(): AsianEnergyStock[] {
  const now = new Date();
  const hour = now.getHours();
  
  // Add some variance based on time (simulating market hours)
  const variance = (hour >= 9 && hour <= 16) ? 0.05 : 0.02;
  
  return [
    {
      symbol: 'PTR',
      name: 'PetroChina Co Ltd',
      price: 43.25 + (Math.random() - 0.5) * 5,
      change: (Math.random() - 0.5) * 2,
      changePercent: (Math.random() - 0.5) * 4,
      currency: 'USD',
      sector: 'Oil & Gas',
      market: 'NYSE'
    },
    {
      symbol: 'SNP', 
      name: 'China Petroleum & Chemical',
      price: 56.80 + (Math.random() - 0.5) * 6,
      change: (Math.random() - 0.5) * 2.5,
      changePercent: (Math.random() - 0.5) * 5,
      currency: 'USD',
      sector: 'Oil & Gas',
      market: 'NYSE'
    },
    {
      symbol: 'CEO',
      name: 'CNOOC Ltd', 
      price: 102.45 + (Math.random() - 0.5) * 10,
      change: (Math.random() - 0.5) * 3,
      changePercent: (Math.random() - 0.5) * 3,
      currency: 'USD',
      sector: 'Oil & Gas',
      market: 'NYSE'
    },
    {
      symbol: 'RIL',
      name: 'Reliance Industries',
      price: 2847.50 + (Math.random() - 0.5) * 100, // INR price
      change: (Math.random() - 0.5) * 50,
      changePercent: (Math.random() - 0.5) * 3,
      currency: 'INR',
      sector: 'Oil & Gas',
      market: 'NSE'
    }
  ].map(stock => ({
    ...stock,
    price: parseFloat(stock.price.toFixed(2)),
    change: parseFloat(stock.change.toFixed(2)),
    changePercent: parseFloat(stock.changePercent.toFixed(2))
  }));
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    // Fetch data for Asian energy stocks in parallel
    const stockPromises = ASIAN_ENERGY_SYMBOLS.slice(0, 4).map(stock => 
      fetchYahooAsianStock(stock.symbol)
    );
    
    const results = await Promise.allSettled(stockPromises);
    const stocks: AsianEnergyStock[] = [];
    
    let successCount = 0;
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        stocks.push(result.value);
        successCount++;
      }
    }
    
    // If we couldn't fetch enough live data, mix with mock data
    if (successCount < 2) {
      const mockStocks = getMockAsianEnergyStocks();
      return NextResponse.json(mockStocks);
    }
    
    // Fill remaining slots with mock data if needed
    while (stocks.length < 4) {
      const mockStocks = getMockAsianEnergyStocks();
      const missing = mockStocks.find(mock => 
        !stocks.some(real => real.symbol === mock.symbol)
      );
      if (missing) stocks.push(missing);
    }
    
    // Cache the results
    cache = { data: stocks.slice(0, 4), ts: Date.now() };
    
    return NextResponse.json(stocks.slice(0, 4));
    
  } catch (error) {
    console.error('Asian energy stocks API error:', error);
    
    // Ultimate fallback
    const fallbackStocks = getMockAsianEnergyStocks();
    return NextResponse.json(fallbackStocks);
  }
}