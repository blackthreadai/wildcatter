import { NextResponse } from 'next/server';

interface EnergyStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap?: number;
  sector: string;
}

// Top US energy stocks by market cap
const ENERGY_SYMBOLS = [
  { symbol: 'XOM', name: 'Exxon Mobil Corp', sector: 'Oil & Gas' },
  { symbol: 'CVX', name: 'Chevron Corp', sector: 'Oil & Gas' },
  { symbol: 'COP', name: 'ConocoPhillips', sector: 'Oil & Gas' },
  { symbol: 'EOG', name: 'EOG Resources Inc', sector: 'Oil & Gas' },
  { symbol: 'SLB', name: 'Schlumberger Ltd', sector: 'Oil Services' },
  { symbol: 'PXD', name: 'Pioneer Natural Resources', sector: 'Oil & Gas' },
  { symbol: 'KMI', name: 'Kinder Morgan Inc', sector: 'Pipeline' },
  { symbol: 'WMB', name: 'Williams Companies', sector: 'Pipeline' }
];

// Cache for 5 minutes (stock prices update frequently during market hours)
let cache: { data: EnergyStock[]; ts: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

async function fetchYahooStockData(symbol: string): Promise<EnergyStock | null> {
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
    const stockInfo = ENERGY_SYMBOLS.find(s => s.symbol === symbol);
    
    return {
      symbol,
      name: stockInfo?.name || symbol,
      price: parseFloat(price.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      marketCap: meta.marketCap || undefined,
      sector: stockInfo?.sector || 'Energy'
    };
    
  } catch (error) {
    console.error(`Failed to fetch ${symbol}:`, error);
    return null;
  }
}

// Market hours check (9:30 AM - 4:00 PM ET on weekdays)
function isMarketHours(): boolean {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const day = et.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = et.getHours();
  const minute = et.getMinutes();
  const timeInMinutes = hour * 60 + minute;
  
  // Weekend
  if (day === 0 || day === 6) return false;
  
  // Market hours: 9:30 AM (570) to 4:00 PM (960) ET
  return timeInMinutes >= 570 && timeInMinutes <= 960;
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    // Fetch data for top energy stocks in parallel
    const stockPromises = ENERGY_SYMBOLS.slice(0, 8).map(stock => 
      fetchYahooStockData(stock.symbol)
    );
    
    const results = await Promise.allSettled(stockPromises);
    const stocks: EnergyStock[] = [];
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        stocks.push(result.value);
      }
    }
    
    // If we couldn't fetch live data, provide fallback mock data
    if (stocks.length === 0) {
      const mockStocks: EnergyStock[] = [
        { symbol: 'XOM', name: 'Exxon Mobil Corp', price: 118.45, change: 2.15, changePercent: 1.85, sector: 'Oil & Gas' },
        { symbol: 'CVX', name: 'Chevron Corp', price: 162.87, change: -1.23, changePercent: -0.75, sector: 'Oil & Gas' },
        { symbol: 'COP', name: 'ConocoPhillips', price: 134.22, change: 3.44, changePercent: 2.63, sector: 'Oil & Gas' },
        { symbol: 'SLB', name: 'Schlumberger Ltd', price: 63.91, change: 1.87, changePercent: 3.02, sector: 'Oil Services' }
      ];
      
      return NextResponse.json(mockStocks);
    }
    
    // Sort by market cap/relevance (biggest companies first)
    const sortedStocks = stocks.sort((a, b) => {
      const order = ['XOM', 'CVX', 'COP', 'EOG', 'SLB', 'PXD', 'KMI', 'WMB'];
      return order.indexOf(a.symbol) - order.indexOf(b.symbol);
    });
    
    // Take top 4 for the widget
    const top4Stocks = sortedStocks.slice(0, 4);
    
    // Cache the results
    cache = { data: top4Stocks, ts: Date.now() };
    
    return NextResponse.json(top4Stocks);
    
  } catch (error) {
    console.error('Energy stocks API error:', error);
    
    // Ultimate fallback
    const fallbackStocks: EnergyStock[] = [
      { symbol: 'XOM', name: 'Exxon Mobil Corp', price: 118.45, change: 2.15, changePercent: 1.85, sector: 'Oil & Gas' },
      { symbol: 'CVX', name: 'Chevron Corp', price: 162.87, change: -1.23, changePercent: -0.75, sector: 'Oil & Gas' },
      { symbol: 'COP', name: 'ConocoPhillips', price: 134.22, change: 3.44, changePercent: 2.63, sector: 'Oil & Gas' },
      { symbol: 'SLB', name: 'Schlumberger Ltd', price: 63.91, change: 1.87, changePercent: 3.02, sector: 'Oil Services' }
    ];
    
    return NextResponse.json(fallbackStocks);
  }
}