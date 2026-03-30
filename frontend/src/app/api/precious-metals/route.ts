import { NextResponse } from 'next/server';

interface PreciousMetal {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  unit: string;
}

// Cache for 10 minutes (metals prices don't change as frequently as stocks)
let cache: { data: PreciousMetal[]; ts: number } | null = null;
const CACHE_MS = 10 * 60 * 1000;

async function fetchGoldAPIMetals(): Promise<PreciousMetal[]> {
  try {
    console.log('🔄 Fetching from goldapi.io...');
    
    // GoldAPI.io requires an API key - check for it
    const apiKey = process.env.GOLDAPI_KEY;
    
    if (!apiKey || apiKey === 'your_goldapi_key_here') {
      console.log('❌ No GoldAPI.io API key configured');
      return [];
    }
    
    const url = 'https://www.goldapi.io/api/XAU,XAG,XPT,XPD/USD';
    
    const response = await fetch(url, {
      headers: { 
        'x-access-token': apiKey,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`❌ GoldAPI.io failed: HTTP ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const metals: PreciousMetal[] = [];
    
    // GoldAPI.io returns data for each metal
    if (data) {
      const metalSymbols = ['XAU', 'XAG', 'XPT', 'XPD'];
      const metalNames = ['Gold', 'Silver', 'Platinum', 'Palladium'];
      
      for (let i = 0; i < metalSymbols.length; i++) {
        const symbol = metalSymbols[i];
        const metalData = data[symbol];
        
        if (metalData && metalData.price && metalData.prev_close_price) {
          const price = parseFloat(metalData.price);
          const prevClose = parseFloat(metalData.prev_close_price);
          const change = price - prevClose;
          const changePercent = (change / prevClose) * 100;
          
          metals.push({
            symbol: symbol,
            name: metalNames[i],
            price: parseFloat(price.toFixed(2)),
            change: parseFloat(change.toFixed(2)),
            changePercent: parseFloat(changePercent.toFixed(2)),
            unit: 'USD/oz'
          });
        }
      }
    }
    
    console.log(`✅ GoldAPI.io: Found ${metals.length} metals with real prices`);
    return metals;
    
  } catch (error) {
    console.error('❌ GoldAPI.io fetch error:', error);
    return [];
  }
}

async function fetchMetalFromYahoo(symbol: string): Promise<PreciousMetal | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d&includePrePost=false`;
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(8000)
    }).catch(() => null);
    
    if (!response || !response.ok) {
      throw new Error(`HTTP ${response?.status || 'Network Error'}`);
    }
    
    const data = await response.json().catch(() => null);
    const meta = data?.chart?.result?.[0]?.meta;
    
    if (!meta?.regularMarketPrice || !meta?.chartPreviousClose || 
        isNaN(meta.regularMarketPrice) || isNaN(meta.chartPreviousClose)) {
      throw new Error('Invalid or missing data structure');
    }
    
    const price = parseFloat(meta.regularMarketPrice);
    const previousClose = parseFloat(meta.chartPreviousClose);
    const change = price - previousClose;
    const changePercent = (change / previousClose) * 100;
    
    // Map Yahoo symbols to metal info
    let name = 'Unknown';
    let metalSymbol = symbol;
    
    switch (symbol) {
      case 'GC=F':
        name = 'Gold';
        metalSymbol = 'XAU';
        break;
      case 'SI=F':
        name = 'Silver';
        metalSymbol = 'XAG';
        break;
      case 'PL=F':
        name = 'Platinum';
        metalSymbol = 'XPT';
        break;
      case 'PA=F':
        name = 'Palladium';
        metalSymbol = 'XPD';
        break;
      case 'HG=F':
        name = 'Copper';
        metalSymbol = 'XCU';
        break;
    }
    
    return {
      symbol: metalSymbol,
      name,
      price: parseFloat(price.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      unit: 'USD/oz'
    };
    
  } catch (error) {
    console.error(`Failed to fetch ${symbol}:`, error);
    return null;
  }
}

// NO MOCK DATA ALLOWED - REMOVED ENTIRELY

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    console.log('🏅 PRECIOUS METALS: Fetching REAL data from goldapi.io only');
    
    // ONLY fetch real data from goldapi.io - NO MOCK DATA
    const metals = await fetchGoldAPIMetals();
    
    console.log(`🎯 PRECIOUS METALS: ${metals.length} REAL metals found`);
    
    if (metals.length === 0) {
      console.log('🚫 NO REAL PRECIOUS METALS DATA AVAILABLE - returning empty array');
      return NextResponse.json([]);
    }
    
    // Cache ONLY the real results
    cache = { data: metals, ts: Date.now() };
    
    return NextResponse.json(metals);
    
  } catch (error) {
    console.error('Precious metals API error:', error);
    
    // NO FALLBACK TO MOCK DATA - return empty array
    console.log('💔 GOLDAPI.IO FAILED - returning empty array (NO MOCK DATA)');
    return NextResponse.json([]);
  }
}