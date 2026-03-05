import { NextResponse } from 'next/server';

interface OilStorageData {
  location: string;
  current: number;
  capacity: number;
  utilizationRate: number;
  weeklyChange: number;
  unit: string;
  lastUpdated: string;
}

interface OECDData {
  region: string;
  stocks: number;
  daysOfSupply: number;
  change: number;
  unit: string;
}

// Cache for 6 hours (EIA data updates weekly)
let cache: { data: { storage: OilStorageData[]; oecd: OECDData[] }; ts: number } | null = null;
const CACHE_MS = 6 * 60 * 60 * 1000;

async function fetchEIAData(): Promise<{ storage: OilStorageData[]; oecd: OECDData[] }> {
  try {
    // Try to fetch from EIA API (would need API key in production)
    // For now, return realistic mock data based on actual storage patterns
    
    const mockStorageData: OilStorageData[] = [
      {
        location: 'Cushing, OK',
        current: 28.5,
        capacity: 91.0,
        utilizationRate: 31.3,
        weeklyChange: -2.1,
        unit: 'MMB',
        lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        location: 'US Commercial',
        current: 421.8,
        capacity: 653.0,
        utilizationRate: 64.6,
        weeklyChange: -1.8,
        unit: 'MMB',
        lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        location: 'US Strategic',
        current: 372.4,
        capacity: 714.0,
        utilizationRate: 52.2,
        weeklyChange: -0.5,
        unit: 'MMB',
        lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    const mockOECDData: OECDData[] = [
      {
        region: 'OECD Total',
        stocks: 2847,
        daysOfSupply: 61.2,
        change: -12.5,
        unit: 'MMB'
      },
      {
        region: 'OECD Americas',
        stocks: 1543,
        daysOfSupply: 58.7,
        change: -8.1,
        unit: 'MMB'
      },
      {
        region: 'OECD Europe',
        stocks: 892,
        daysOfSupply: 65.1,
        change: -2.8,
        unit: 'MMB'
      },
      {
        region: 'OECD Asia Pacific',
        stocks: 412,
        daysOfSupply: 62.9,
        change: -1.6,
        unit: 'MMB'
      }
    ];

    return { storage: mockStorageData, oecd: mockOECDData };
    
  } catch (error) {
    console.error('EIA data fetch error:', error);
    
    // Fallback data
    return {
      storage: [
        {
          location: 'Cushing, OK',
          current: 28.5,
          capacity: 91.0,
          utilizationRate: 31.3,
          weeklyChange: -2.1,
          unit: 'MMB',
          lastUpdated: new Date().toISOString()
        }
      ],
      oecd: [
        {
          region: 'OECD Total',
          stocks: 2847,
          daysOfSupply: 61.2,
          change: -12.5,
          unit: 'MMB'
        }
      ]
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
    const data = await fetchEIAData();
    
    // Cache the results
    cache = { data, ts: Date.now() };
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Global oil tracker API error:', error);
    
    // Ultimate fallback
    return NextResponse.json({
      storage: [
        {
          location: 'Cushing, OK',
          current: 28.5,
          capacity: 91.0,
          utilizationRate: 31.3,
          weeklyChange: -2.1,
          unit: 'MMB',
          lastUpdated: new Date().toISOString()
        }
      ],
      oecd: [
        {
          region: 'OECD Total',
          stocks: 2847,
          daysOfSupply: 61.2,
          change: -12.5,
          unit: 'MMB'
        }
      ]
    });
  }
}