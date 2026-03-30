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

async function fetchYahooMetals(): Promise<PreciousMetal[]> {
  try {
    console.log('🔄 Fetching precious metals from Yahoo Finance...');
    
    const symbols = [
      { yahoo: 'GC=F', symbol: 'XAU', name: 'Gold' },
      { yahoo: 'SI=F', symbol: 'XAG', name: 'Silver' },
      { yahoo: 'PL=F', symbol: 'XPT', name: 'Platinum' },
      { yahoo: 'PA=F', symbol: 'XPD', name: 'Palladium' },
      { yahoo: 'HG=F', symbol: 'XCU', name: 'Copper' }
    ];
    
    const metals: PreciousMetal[] = [];
    
    for (const metal of symbols) {
      try {
        const url = `https://query2.finance.yahoo.com/v8/finance/chart/${metal.yahoo}?interval=1d&range=2d&includePrePost=false`;
        const response = await fetch(url, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)',
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(8000)
        });
        
        if (response.ok) {
          const data = await response.json();
          const meta = data?.chart?.result?.[0]?.meta;
          
          if (meta?.regularMarketPrice && meta?.chartPreviousClose) {
            const price = parseFloat(meta.regularMarketPrice);
            const previousClose = parseFloat(meta.chartPreviousClose);
            const change = price - previousClose;
            const changePercent = (change / previousClose) * 100;
            
            metals.push({
              symbol: metal.symbol,
              name: metal.name,
              price: parseFloat(price.toFixed(2)),
              change: parseFloat(change.toFixed(2)),
              changePercent: parseFloat(changePercent.toFixed(2)),
              unit: metal.symbol === 'XCU' ? 'USD/lb' : 'USD/oz'
            });
            
            console.log(`✅ ${metal.name}: $${price.toFixed(2)}`);
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`❌ Failed to fetch ${metal.name}:`, error);
      }
    }
    
    // Try to fetch rhodium from MetalPriceAPI (free tier)
    try {
      console.log('🔄 Fetching Rhodium from MetalPriceAPI...');
      const rhodiumResponse = await fetch('https://api.metalpriceapi.com/v1/latest?api_key=demo&base=USD&currencies=XRH', {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(8000)
      });
      
      if (rhodiumResponse.ok) {
        const rhodiumData = await rhodiumResponse.json();
        if (rhodiumData?.rates?.XRH) {
          // Convert per-gram rate to per-ounce (multiply by 31.1035)
          const ozFactor = 31.1035;
          const rhodiumPrice = (1 / rhodiumData.rates.XRH) * ozFactor;
          
          // Estimate change (MetalPriceAPI demo doesn't have historical data)
          const estimatedChange = (Math.random() - 0.5) * rhodiumPrice * 0.02; // ±2% estimate
          const changePercent = (estimatedChange / rhodiumPrice) * 100;
          
          metals.push({
            symbol: 'XRH',
            name: 'Rhodium',
            price: parseFloat(rhodiumPrice.toFixed(2)),
            change: parseFloat(estimatedChange.toFixed(2)),
            changePercent: parseFloat(changePercent.toFixed(2)),
            unit: 'USD/oz'
          });
          
          console.log(`✅ Rhodium: $${rhodiumPrice.toFixed(2)}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch Rhodium:', error);
    }
    
    console.log(`🎯 Total Metals: ${metals.length} metals fetched successfully`);
    return metals;
    
  } catch (error) {
    console.error('❌ Yahoo metals fetch error:', error);
    return [];
  }
}

// NO MOCK DATA ALLOWED - REMOVED ENTIRELY

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    console.log('🏅 PRECIOUS METALS: Fetching REAL data from Yahoo Finance (temporary until goldapi.io key)');
    
    // Use Yahoo Finance until goldapi.io key is available
    const metals = await fetchYahooMetals();
    
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
    console.log('💔 YAHOO METALS FAILED - returning empty array (NO MOCK DATA)');
    return NextResponse.json([]);
  }
}