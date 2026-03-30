import { NextResponse } from 'next/server';

interface SPRDataPoint {
  date: string;
  value: number; // millions of barrels
}

interface SPRResponse {
  current: number;
  historical: SPRDataPoint[];
  lastUpdated: string;
}

// Cache for 24 hours (SPR data updates weekly/monthly)
let cache: { data: SPRResponse; ts: number } | null = null;
const CACHE_MS = 24 * 60 * 60 * 1000;

async function fetchEIASPRData(): Promise<SPRResponse | null> {
  try {
    console.log('🔄 Fetching REAL SPR data from EIA.gov...');
    
    // EIA API endpoint for Strategic Petroleum Reserve data
    // Series: WCRSTUS1 (Weekly U.S. Ending Stocks of Crude Oil in SPR)
    const eiaApiKey = process.env.EIA_API_KEY;
    
    console.log('🔑 EIA API Key available:', !!eiaApiKey);
    
    if (!eiaApiKey || eiaApiKey === 'your_eia_key_here') {
      console.log('❌ No valid EIA API key configured');
      return null;
    }
    
    const url = `https://api.eia.gov/v2/petroleum/stoc/wstk/data/?api_key=${eiaApiKey}&frequency=weekly&data[0]=value&facets[series][]=WCRSTUS1&sort[0][column]=period&sort[0][direction]=desc&length=300`;
    
    console.log('🌐 Calling EIA API:', url.replace(eiaApiKey, '[REDACTED]'));
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)'
      },
      signal: AbortSignal.timeout(15000)
    });
    
    console.log('📡 EIA Response Status:', response.status);
    
    if (!response.ok) {
      console.log('❌ EIA API failed:', response.status, response.statusText);
      return null;
    }
    
    const data = await response.json();
    console.log('📊 EIA Data received, data points:', data?.response?.data?.length || 0);
    
    const rawData = data?.response?.data || [];
    
    if (rawData.length === 0) {
      console.log('❌ No SPR data in EIA response');
      return null;
    }
    
    // Convert EIA data to our format (weekly to monthly sampling)
    const historical: SPRDataPoint[] = [];
    for (let i = 0; i < rawData.length; i += 4) { // Sample every 4th week (monthly)
      const point = rawData[i];
      if (point && point.period && point.value) {
        historical.push({
          date: point.period,
          value: Math.round(point.value) // Already in millions of barrels
        });
      }
    }
    
    // Reverse to get chronological order and take last 5-6 years
    historical.reverse();
    const recentData = historical.slice(-72); // Last 72 months (6 years)
    
    const currentLevel = rawData[0]?.value || 0;
    
    console.log(`✅ EIA SPR DATA: Current level ${currentLevel}M bbls, ${recentData.length} historical points`);
    
    return {
      current: currentLevel,
      historical: recentData,
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ EIA SPR fetch error:', error);
    return null;
  }
}

// NO MOCK DATA GENERATION - REMOVED ENTIRELY

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    console.log('🏛️ SPR DATA: Fetching REAL data from EIA.gov only');
    
    // ONLY fetch real EIA data - NO FALLBACK TO MOCK DATA
    const sprData = await fetchEIASPRData();
    
    if (!sprData) {
      console.log('🚫 NO REAL SPR DATA AVAILABLE - returning empty response');
      return NextResponse.json({ 
        current: 0, 
        historical: [], 
        lastUpdated: new Date().toISOString(),
        error: 'EIA API unavailable' 
      });
    }
    
    console.log(`🎯 SPR SUCCESS: Current ${sprData.current}M bbls with ${sprData.historical.length} data points`);
    
    // Cache ONLY the real results
    cache = { data: sprData, ts: Date.now() };
    
    return NextResponse.json(sprData);
    
  } catch (error) {
    console.error('SPR data API error:', error);
    
    // NO FALLBACK TO MOCK DATA - return error state
    console.log('💔 SPR API FAILED - returning error response (NO MOCK DATA)');
    return NextResponse.json({ 
      current: 0, 
      historical: [], 
      lastUpdated: new Date().toISOString(),
      error: 'API Error' 
    });
  }
}