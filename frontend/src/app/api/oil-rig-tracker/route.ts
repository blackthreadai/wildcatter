import { NextResponse } from 'next/server';

interface RigCount {
  region: string;
  oil: number;
  gas: number;
  total: number;
  weeklyChange: number;
  yearAgoCount: number;
  lastUpdated: string;
}

interface BasinData {
  basin: string;
  rigs: number;
  change: number;
  percentage: number;
}

interface OilRigData {
  usTotals: RigCount;
  international: RigCount[];
  basins: BasinData[];
  historical: {
    date: string;
    count: number;
  }[];
  lastUpdated: string;
}

// Cache for 24 hours (Baker Hughes updates weekly on Fridays)
let cache: { data: OilRigData; ts: number } | null = null;
const CACHE_MS = 24 * 60 * 60 * 1000;

async function fetchRigData(): Promise<OilRigData> {
  try {
    // In production, this would fetch from Baker Hughes API or similar
    // For now, return realistic mock data based on recent trends
    
    const mockUSTotals: RigCount = {
      region: 'United States',
      oil: 506,
      gas: 98,
      total: 604,
      weeklyChange: -3,
      yearAgoCount: 627,
      lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    };

    const mockInternational: RigCount[] = [
      {
        region: 'Canada',
        oil: 89,
        gas: 45,
        total: 134,
        weeklyChange: 2,
        yearAgoCount: 118,
        lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        region: 'Saudi Arabia',
        oil: 42,
        gas: 8,
        total: 50,
        weeklyChange: 0,
        yearAgoCount: 48,
        lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        region: 'Iraq',
        oil: 34,
        gas: 2,
        total: 36,
        weeklyChange: 1,
        yearAgoCount: 31,
        lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        region: 'UAE',
        oil: 28,
        gas: 5,
        total: 33,
        weeklyChange: -1,
        yearAgoCount: 35,
        lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    const mockBasins: BasinData[] = [
      {
        basin: 'Permian',
        rigs: 312,
        change: -2,
        percentage: 61.7
      },
      {
        basin: 'Eagle Ford',
        rigs: 62,
        change: 0,
        percentage: 12.3
      },
      {
        basin: 'Bakken',
        rigs: 35,
        change: -1,
        percentage: 6.9
      },
      {
        basin: 'DJ-Niobrara',
        rigs: 18,
        change: 0,
        percentage: 3.6
      },
      {
        basin: 'Anadarko',
        rigs: 15,
        change: 1,
        percentage: 3.0
      }
    ];

    // Generate historical data (last 12 weeks)
    const mockHistorical = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7));
      mockHistorical.push({
        date: date.toISOString().split('T')[0],
        count: 604 + (Math.random() - 0.5) * 20 + i * 0.5
      });
    }

    const mockData: OilRigData = {
      usTotals: mockUSTotals,
      international: mockInternational,
      basins: mockBasins,
      historical: mockHistorical,
      lastUpdated: new Date().toISOString()
    };

    return mockData;
    
  } catch (error) {
    console.error('Oil rig data fetch error:', error);
    
    // Fallback data
    return {
      usTotals: {
        region: 'United States',
        oil: 506,
        gas: 98,
        total: 604,
        weeklyChange: -3,
        yearAgoCount: 627,
        lastUpdated: new Date().toISOString()
      },
      international: [
        {
          region: 'Canada',
          oil: 89,
          gas: 45,
          total: 134,
          weeklyChange: 2,
          yearAgoCount: 118,
          lastUpdated: new Date().toISOString()
        }
      ],
      basins: [
        {
          basin: 'Permian',
          rigs: 312,
          change: -2,
          percentage: 61.7
        }
      ],
      historical: [
        {
          date: new Date().toISOString().split('T')[0],
          count: 604
        }
      ],
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
    const data = await fetchRigData();
    
    // Cache the results
    cache = { data, ts: Date.now() };
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Oil rig tracker API error:', error);
    
    // Ultimate fallback
    return NextResponse.json({
      usTotals: {
        region: 'United States',
        oil: 506,
        gas: 98,
        total: 604,
        weeklyChange: -3,
        yearAgoCount: 627,
        lastUpdated: new Date().toISOString()
      },
      international: [],
      basins: [],
      historical: [],
      lastUpdated: new Date().toISOString()
    });
  }
}