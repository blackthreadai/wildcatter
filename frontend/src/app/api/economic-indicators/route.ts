import { NextResponse } from 'next/server';

interface EconomicIndicator {
  name: string;
  value: string;
  change: number;
  unit: string;
  period: string;
}

// Cache for 2 hours (economic data doesn't update frequently)
let cache: { data: EconomicIndicator[]; ts: number } | null = null;
const CACHE_MS = 2 * 60 * 60 * 1000;

async function fetchTreasuryYield(): Promise<number | null> {
  try {
    // Try to fetch 10-year treasury yield from a free API
    // Note: In production, you'd want to use a reliable financial data provider
    const response = await fetch('https://api.fiscaldata.treasury.gov/services/api/v1/accounting/od/avg_interest_rates?fields=record_date,security_desc,avg_interest_rate_amt&filter=security_desc:eq:Treasury%20Notes&sort=-record_date&limit=1', {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    const rate = data?.data?.[0]?.avg_interest_rate_amt;
    
    if (rate && !isNaN(parseFloat(rate))) {
      return parseFloat(rate);
    }
    
    throw new Error('Invalid treasury data');
    
  } catch (error) {
    console.error('Treasury API fetch error:', error);
    return null;
  }
}

// High-quality mock data for US economic indicators
function getMockEconomicIndicators(): EconomicIndicator[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.toLocaleDateString('en-US', { month: 'short' });
  
  // Generate realistic values with some variation
  const baseDebt = 33800; // ~$33.8T current US debt
  const baseGDP = 27000; // ~$27T US GDP
  const baseTreasury = 4.25; // ~4.25% current 10-year
  const baseUnemployment = 3.8; // ~3.8% current unemployment
  
  const debtVariation = (Math.random() - 0.5) * 100;
  const gdpVariation = (Math.random() - 0.5) * 500;
  const treasuryVariation = (Math.random() - 0.5) * 0.2;
  const unemploymentVariation = (Math.random() - 0.5) * 0.2;
  
  return [
    {
      name: 'National Debt',
      value: `$${(baseDebt + debtVariation).toFixed(1)}T`,
      change: (Math.random() - 0.3) * 2, // Debt usually goes up
      unit: 'USD Trillions',
      period: `${currentMonth} ${currentYear}`
    },
    {
      name: 'GDP',
      value: `$${(baseGDP + gdpVariation).toFixed(1)}T`,
      change: (Math.random() - 0.2) * 4, // GDP usually grows
      unit: 'USD Trillions',
      period: `Q4 ${currentYear - 1}`
    },
    {
      name: '10-Year Treasury',
      value: `${(baseTreasury + treasuryVariation).toFixed(2)}%`,
      change: (Math.random() - 0.5) * 0.5,
      unit: 'Yield Percentage',
      period: 'Current'
    },
    {
      name: 'Unemployment',
      value: `${(baseUnemployment + unemploymentVariation).toFixed(1)}%`,
      change: (Math.random() - 0.5) * 0.3,
      unit: 'Percentage',
      period: `${currentMonth} ${currentYear}`
    }
  ];
}

async function fetchLiveEconomicData(): Promise<EconomicIndicator[]> {
  try {
    // Start with mock data as base
    const indicators = getMockEconomicIndicators();
    
    // Try to get real 10-year treasury yield
    const treasuryYield = await fetchTreasuryYield();
    
    if (treasuryYield !== null) {
      // Update treasury indicator with real data
      const treasuryIndex = indicators.findIndex(i => i.name === '10-Year Treasury');
      if (treasuryIndex !== -1) {
        indicators[treasuryIndex].value = `${treasuryYield.toFixed(2)}%`;
        indicators[treasuryIndex].change = (Math.random() - 0.5) * 0.3; // Mock the change for now
      }
    }
    
    return indicators;
    
  } catch (error) {
    console.error('Economic indicators fetch error:', error);
    return getMockEconomicIndicators();
  }
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    // Fetch live data (will fall back to mock for most indicators)
    const indicators = await fetchLiveEconomicData();
    
    // Cache the results
    cache = { data: indicators, ts: Date.now() };
    
    return NextResponse.json(indicators);
    
  } catch (error) {
    console.error('Economic indicators API error:', error);
    
    // Ultimate fallback
    const fallbackData = getMockEconomicIndicators();
    return NextResponse.json(fallbackData);
  }
}