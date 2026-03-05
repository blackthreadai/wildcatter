import { NextResponse } from 'next/server';

interface StorageData {
  region: string;
  current: number;
  capacity: number;
  utilizationRate: number;
  weeklyChange: number;
  yearAgoLevel: number;
  fiveYearAvg: number;
  unit: string;
  lastUpdated: string;
}

interface LNGData {
  utilization: number;
  exports: number;
  imports: number;
  capacity: number;
  unit: string;
}

interface PriceData {
  henryHub: number;
  henryHubChange: number;
  ttf: number;
  ttfChange: number;
  jkm: number;
  jkmChange: number;
  currency: string;
}

interface NaturalGasData {
  storage: StorageData[];
  lng: LNGData;
  prices: PriceData;
  lastUpdated: string;
}

// Cache for 4 hours (gas data updates weekly but prices more frequently)
let cache: { data: NaturalGasData; ts: number } | null = null;
const CACHE_MS = 4 * 60 * 60 * 1000;

async function fetchNaturalGasData(): Promise<NaturalGasData> {
  try {
    // In production, this would fetch from EIA, GIE, and commodity price APIs
    // For now, return realistic mock data
    
    const mockStorage: StorageData[] = [
      {
        region: 'US Lower 48',
        current: 2847,
        capacity: 4693,
        utilizationRate: 60.7,
        weeklyChange: -156,
        yearAgoLevel: 2234,
        fiveYearAvg: 2456,
        unit: 'BCF',
        lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        region: 'EU Storage',
        current: 687,
        capacity: 1156,
        utilizationRate: 59.4,
        weeklyChange: -23,
        yearAgoLevel: 542,
        fiveYearAvg: 612,
        unit: 'TWh',
        lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        region: 'Germany',
        current: 152,
        capacity: 254,
        utilizationRate: 59.8,
        weeklyChange: -5.2,
        yearAgoLevel: 118,
        fiveYearAvg: 134,
        unit: 'TWh',
        lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    const mockLNG: LNGData = {
      utilization: 84.3,
      exports: 156.7,
      imports: 142.1,
      capacity: 185.9,
      unit: 'BCF/d'
    };

    const mockPrices: PriceData = {
      henryHub: 2.84,
      henryHubChange: -0.12,
      ttf: 28.45,
      ttfChange: 1.23,
      jkm: 11.80,
      jkmChange: -0.45,
      currency: 'USD/MMBtu'
    };

    const mockData: NaturalGasData = {
      storage: mockStorage,
      lng: mockLNG,
      prices: mockPrices,
      lastUpdated: new Date().toISOString()
    };

    return mockData;
    
  } catch (error) {
    console.error('Natural gas data fetch error:', error);
    
    // Fallback data
    return {
      storage: [
        {
          region: 'US Lower 48',
          current: 2847,
          capacity: 4693,
          utilizationRate: 60.7,
          weeklyChange: -156,
          yearAgoLevel: 2234,
          fiveYearAvg: 2456,
          unit: 'BCF',
          lastUpdated: new Date().toISOString()
        }
      ],
      lng: {
        utilization: 84.3,
        exports: 156.7,
        imports: 142.1,
        capacity: 185.9,
        unit: 'BCF/d'
      },
      prices: {
        henryHub: 2.84,
        henryHubChange: -0.12,
        ttf: 28.45,
        ttfChange: 1.23,
        jkm: 11.80,
        jkmChange: -0.45,
        currency: 'USD/MMBtu'
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
    const data = await fetchNaturalGasData();
    
    // Cache the results
    cache = { data, ts: Date.now() };
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Natural gas API error:', error);
    
    // Ultimate fallback
    return NextResponse.json({
      storage: [
        {
          region: 'US Lower 48',
          current: 2847,
          capacity: 4693,
          utilizationRate: 60.7,
          weeklyChange: -156,
          yearAgoLevel: 2234,
          fiveYearAvg: 2456,
          unit: 'BCF',
          lastUpdated: new Date().toISOString()
        }
      ],
      lng: {
        utilization: 84.3,
        exports: 156.7,
        imports: 142.1,
        capacity: 185.9,
        unit: 'BCF/d'
      },
      prices: {
        henryHub: 2.84,
        henryHubChange: -0.12,
        ttf: 28.45,
        ttfChange: 1.23,
        jkm: 11.80,
        jkmChange: -0.45,
        currency: 'USD/MMBtu'
      },
      lastUpdated: new Date().toISOString()
    });
  }
}