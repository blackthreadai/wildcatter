import { NextResponse } from 'next/server';

interface PositionData {
  instrument: string;
  category: 'Crude Oil' | 'Natural Gas' | 'Refined Products' | 'Renewable Energy';
  longPositions: number; // contracts or notional
  shortPositions: number; // contracts or notional
  netPositions: number; // net long/short
  openInterest: number; // total open interest
  positionChange: number; // weekly change in net positions
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  unit: string;
  lastUpdated: string;
}

interface TraderClass {
  name: string;
  description: string;
  longPositions: number;
  shortPositions: number;
  netPositions: number;
  weeklyChange: number;
  marketShare: number; // percentage of total OI
}

interface SentimentIndicator {
  name: string;
  value: number; // 0-100 scale
  interpretation: string;
  trend: 'Rising' | 'Falling' | 'Stable';
  lastUpdated: string;
}

interface PositionMonitorData {
  positions: PositionData[];
  traderClasses: {
    instrument: string;
    classes: TraderClass[];
  }[];
  sentimentIndicators: SentimentIndicator[];
  marketSummary: {
    overallSentiment: 'Risk On' | 'Risk Off' | 'Mixed';
    specNetLong: number; // speculators net long percentage
    commercialNetShort: number; // commercials net short percentage
    extremePositions: string[]; // list of instruments at extreme levels
  };
  lastUpdated: string;
}

// Cache for 1 hour (COT data weekly but sentiment changes more frequently)
let cache: { data: PositionMonitorData; ts: number } | null = null;
const CACHE_MS = 60 * 60 * 1000;

async function fetchPositionMonitorData(): Promise<PositionMonitorData> {
  try {
    // In production, this would fetch from CFTC COT reports, prime brokerage data, sentiment APIs
    // For now, return realistic mock data based on typical positioning patterns
    
    const mockPositions: PositionData[] = [
      {
        instrument: 'WTI Crude Oil',
        category: 'Crude Oil',
        longPositions: 485000,
        shortPositions: 398000,
        netPositions: 87000,
        openInterest: 2150000,
        positionChange: 15000,
        sentiment: 'Bullish',
        unit: 'contracts',
        lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // COT is weekly
      },
      {
        instrument: 'Brent Crude Oil',
        category: 'Crude Oil',
        longPositions: 287000,
        shortPositions: 325000,
        netPositions: -38000,
        openInterest: 1450000,
        positionChange: -8000,
        sentiment: 'Bearish',
        unit: 'contracts',
        lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        instrument: 'Natural Gas',
        category: 'Natural Gas',
        longPositions: 125000,
        shortPositions: 180000,
        netPositions: -55000,
        openInterest: 850000,
        positionChange: -12000,
        sentiment: 'Bearish',
        unit: 'contracts',
        lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        instrument: 'RBOB Gasoline',
        category: 'Refined Products',
        longPositions: 98000,
        shortPositions: 85000,
        netPositions: 13000,
        openInterest: 420000,
        positionChange: 5000,
        sentiment: 'Bullish',
        unit: 'contracts',
        lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        instrument: 'Heating Oil',
        category: 'Refined Products',
        longPositions: 76000,
        shortPositions: 92000,
        netPositions: -16000,
        openInterest: 280000,
        positionChange: -3000,
        sentiment: 'Neutral',
        unit: 'contracts',
        lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    const mockTraderClasses = [
      {
        instrument: 'WTI Crude Oil',
        classes: [
          {
            name: 'Non-Commercial (Speculators)',
            description: 'Hedge funds, investment funds, and other large speculators',
            longPositions: 485000,
            shortPositions: 398000,
            netPositions: 87000,
            weeklyChange: 15000,
            marketShare: 41.2
          },
          {
            name: 'Commercial (Hedgers)',
            description: 'Oil companies, refiners, airlines and other commercial hedgers',
            longPositions: 780000,
            shortPositions: 925000,
            netPositions: -145000,
            weeklyChange: -8000,
            marketShare: 79.3
          },
          {
            name: 'Non-Reportable',
            description: 'Small traders below reporting thresholds',
            longPositions: 185000,
            shortPositions: 127000,
            netPositions: 58000,
            weeklyChange: 3000,
            marketShare: 14.5
          }
        ]
      }
    ];

    const mockSentimentIndicators: SentimentIndicator[] = [
      {
        name: 'Fear & Greed Index (Energy)',
        value: 65,
        interpretation: 'Greed - Bullish sentiment dominating',
        trend: 'Rising',
        lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        name: 'VIX Energy ETF',
        value: 28,
        interpretation: 'Moderate volatility - Some uncertainty',
        trend: 'Falling',
        lastUpdated: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      },
      {
        name: 'Oil Options Skew',
        value: 42,
        interpretation: 'Slight put skew - Modest downside hedging',
        trend: 'Stable',
        lastUpdated: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      },
      {
        name: 'COT Speculative Ratio',
        value: 73,
        interpretation: 'High spec positioning - Potential reversal risk',
        trend: 'Rising',
        lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    // Calculate aggregate metrics
    const totalSpecNet = mockPositions.reduce((sum, pos) => 
      pos.category === 'Crude Oil' ? sum + pos.netPositions : sum, 0
    );
    const totalOI = mockPositions.reduce((sum, pos) => sum + pos.openInterest, 0);
    const specNetLong = (totalSpecNet / totalOI) * 100;

    const extremePositions = mockPositions
      .filter(pos => Math.abs(pos.netPositions / pos.openInterest) > 0.15)
      .map(pos => pos.instrument);

    const mockData: PositionMonitorData = {
      positions: mockPositions,
      traderClasses: mockTraderClasses,
      sentimentIndicators: mockSentimentIndicators,
      marketSummary: {
        overallSentiment: 'Mixed',
        specNetLong: Math.abs(specNetLong),
        commercialNetShort: 67.8,
        extremePositions
      },
      lastUpdated: new Date().toISOString()
    };

    return mockData;
    
  } catch (error) {
    console.error('Position monitor data fetch error:', error);
    
    // Fallback data
    return {
      positions: [
        {
          instrument: 'WTI Crude Oil',
          category: 'Crude Oil',
          longPositions: 485000,
          shortPositions: 398000,
          netPositions: 87000,
          openInterest: 2150000,
          positionChange: 15000,
          sentiment: 'Bullish',
          unit: 'contracts',
          lastUpdated: new Date().toISOString()
        }
      ],
      traderClasses: [],
      sentimentIndicators: [
        {
          name: 'Fear & Greed Index (Energy)',
          value: 65,
          interpretation: 'Greed - Bullish sentiment dominating',
          trend: 'Rising',
          lastUpdated: new Date().toISOString()
        }
      ],
      marketSummary: {
        overallSentiment: 'Mixed',
        specNetLong: 4.0,
        commercialNetShort: 67.8,
        extremePositions: []
      },
      lastUpdated: new Date().toISOString()
    };
  }
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    // Fetch fresh data
    const data = await fetchPositionMonitorData();
    
    // Cache the results
    cache = { data, ts: Date.now() };
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Position monitor API error:', error);
    
    // Ultimate fallback
    return NextResponse.json({
      positions: [],
      traderClasses: [],
      sentimentIndicators: [],
      marketSummary: {
        overallSentiment: 'Mixed',
        specNetLong: 0,
        commercialNetShort: 0,
        extremePositions: []
      },
      lastUpdated: new Date().toISOString()
    });
  }
}