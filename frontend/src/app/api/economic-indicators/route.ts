import { NextResponse } from 'next/server';

interface EconomicIndicator {
  name: string;
  value: string;
  change: number;
  unit: string;
  period: string;
}

interface FREDSeries {
  seriesId: string;
  name: string;
  unit: string;
  formatValue: (value: number) => string;
  isPercentage: boolean;
}

// FRED API series configuration
const FRED_SERIES: FREDSeries[] = [
  {
    seriesId: 'GDP',
    name: 'GDP',
    unit: 'USD Billions',
    formatValue: (val) => `$${(val / 1000).toFixed(1)}T`,
    isPercentage: false
  },
  {
    seriesId: 'UNRATE',
    name: 'Unemployment',
    unit: 'Percentage',
    formatValue: (val) => `${val.toFixed(1)}%`,
    isPercentage: true
  },
  {
    seriesId: 'CPIAUCSL',
    name: 'CPI Index',
    unit: 'Index 1982-84=100',
    formatValue: (val) => val.toFixed(1),
    isPercentage: false
  },
  {
    seriesId: 'FEDFUNDS',
    name: 'Fed Funds Rate',
    unit: 'Percentage',
    formatValue: (val) => `${val.toFixed(2)}%`,
    isPercentage: true
  },
  {
    seriesId: 'DGS10',
    name: '10-Year Treasury',
    unit: 'Percentage',
    formatValue: (val) => `${val.toFixed(2)}%`,
    isPercentage: true
  },
  {
    seriesId: 'DGS30',
    name: '30-Year Treasury',
    unit: 'Percentage',
    formatValue: (val) => `${val.toFixed(2)}%`,
    isPercentage: true
  },
  {
    seriesId: 'GFDEBTN',
    name: 'National Debt',
    unit: 'USD Millions',
    formatValue: (val) => `$${(val / 1000000).toFixed(1)}T`,
    isPercentage: false
  }
];

// Cache for 4 hours (economic data updates infrequently)
let cache: { data: EconomicIndicator[]; ts: number } | null = null;
const CACHE_MS = 4 * 60 * 60 * 1000;

async function fetchFREDSeries(seriesId: string, limit: number = 2): Promise<any[]> {
  try {
    let fredApiKey: string | undefined;
    
    try {
      fredApiKey = process.env.FRED_API_KEY || '61cf53e2891a727efe4e48f18f6545f2';
    } catch (envError) {
      console.error(`❌ Environment variable access error for ${seriesId}:`, envError);
      return [];
    }
    
    console.log(`🔑 FRED API Key available for ${seriesId}:`, !!fredApiKey);
    
    if (!fredApiKey || fredApiKey === 'your_fred_key_here' || fredApiKey === '') {
      console.log(`❌ No valid FRED API key configured for ${seriesId}`);
      return [];
    }
    
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${fredApiKey}&file_type=json&limit=${limit}&sort_order=desc`;
    
    console.log(`🌐 Calling FRED API for ${seriesId}:`, url.replace(fredApiKey, '[REDACTED]'));
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    console.log(`📡 FRED Response Status for ${seriesId}:`, response.status);
    
    if (!response.ok) {
      console.log(`❌ FRED API failed for ${seriesId}:`, response.status, response.statusText);
      return [];
    }
    
    const data = await response.json();
    
    if (data.error_code) {
      console.log(`❌ FRED API error for ${seriesId}:`, data.error_message);
      return [];
    }
    
    const observations = data?.observations || [];
    console.log(`📊 FRED data for ${seriesId}: ${observations.length} observations received`);
    
    // Filter out missing data points (marked with ".")
    const validObservations = observations.filter((obs: any) => obs.value && obs.value !== '.' && !isNaN(parseFloat(obs.value)));
    console.log(`✅ Valid data points for ${seriesId}: ${validObservations.length}`);
    
    return validObservations;
    
  } catch (error) {
    console.error(`❌ FRED API fetch error for ${seriesId}:`, error);
    return [];
  }
}

function calculateInflationRate(cpiCurrent: number, cpiYearAgo: number): number {
  if (!cpiYearAgo || cpiYearAgo === 0) return 0;
  return ((cpiCurrent - cpiYearAgo) / cpiYearAgo) * 100;
}

function formatPeriod(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    });
  } catch {
    return dateStr;
  }
}

// NO MOCK DATA - REMOVED ENTIRELY

async function fetchRealEconomicData(): Promise<EconomicIndicator[]> {
  console.log('📊 ECONOMIC INDICATORS: Fetching REAL data from FRED API only');
  
  const indicators: EconomicIndicator[] = [];
  let successCount = 0;
  
  for (const series of FRED_SERIES) {
    try {
      const observations = await fetchFREDSeries(series.seriesId, 2);
      
      if (observations.length === 0) {
        console.log(`❌ No data for ${series.name} (${series.seriesId})`);
        continue;
      }
      
      const latest = observations[0];
      const previous = observations[1] || observations[0];
      
      const currentValue = parseFloat(latest.value);
      const previousValue = parseFloat(previous.value);
      
      if (isNaN(currentValue)) {
        console.log(`❌ Invalid data for ${series.name}`);
        continue;
      }
      
      // Calculate change
      let change = 0;
      if (!isNaN(previousValue) && previousValue !== 0) {
        if (series.isPercentage) {
          // For percentages, show absolute change in basis points
          change = currentValue - previousValue;
        } else {
          // For other values, show percentage change
          change = ((currentValue - previousValue) / previousValue) * 100;
        }
      }
      
      // Special handling for CPI -> Inflation Rate
      if (series.seriesId === 'CPIAUCSL') {
        // Get 12-month-old data for YoY inflation calculation
        const yearAgoData = await fetchFREDSeries(series.seriesId, 15);
        let inflationRate = 0;
        
        if (yearAgoData.length >= 12) {
          const yearAgoValue = parseFloat(yearAgoData[11].value);
          if (!isNaN(yearAgoValue)) {
            inflationRate = calculateInflationRate(currentValue, yearAgoValue);
          }
        }
        
        indicators.push({
          name: 'Inflation Rate',
          value: `${inflationRate.toFixed(1)}%`,
          change: inflationRate - 3.2, // Compare to Fed target of ~3.2%
          unit: 'CPI Y/Y %',
          period: formatPeriod(latest.date)
        });
        
        successCount++;
        continue;
      }
      
      indicators.push({
        name: series.name,
        value: series.formatValue(currentValue),
        change: change,
        unit: series.unit,
        period: formatPeriod(latest.date)
      });
      
      console.log(`✅ ${series.name}: ${series.formatValue(currentValue)}`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ Failed to fetch ${series.name}:`, error);
    }
  }
  
  console.log(`🎯 FRED API SUCCESS: ${successCount} real indicators fetched out of ${FRED_SERIES.length}`);
  
  return indicators;
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    console.log('🏦 ECONOMIC INDICATORS: Fetching REAL data from Federal Reserve Economic Data (FRED)');
    
    // ONLY fetch real FRED data - NO FALLBACK TO MOCK DATA
    const indicators = await fetchRealEconomicData();
    
    if (indicators.length === 0) {
      console.log('🚫 NO REAL ECONOMIC DATA AVAILABLE - returning empty array');
      return NextResponse.json([]);
    }
    
    console.log(`🎯 Final result: ${indicators.length} REAL economic indicators (NO MOCK DATA)`);
    
    // Cache ONLY the real results
    cache = { data: indicators, ts: Date.now() };
    
    return NextResponse.json(indicators);
    
  } catch (error) {
    console.error('Economic indicators API error:', error);
    
    // NO FALLBACK TO MOCK DATA - return empty array
    console.log('💔 FRED API FAILED - returning empty array (NO MOCK DATA)');
    return NextResponse.json([]);
  }
}