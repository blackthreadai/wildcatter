import { NextResponse } from 'next/server';

interface CrackSpread {
  name: string;
  description: string;
  value: number; // $/barrel
  change: number;
  percentChange: number;
  unit: string;
  components: {
    crude: number;
    refined: number;
    ratio: string;
  };
  lastUpdated: string;
}

interface RefineryMargins {
  region: string;
  grossMargin: number; // $/barrel
  netMargin: number; // $/barrel
  utilization: number; // percentage
  throughput: number; // thousand bpd
  marginChange: number;
}

interface CrackSpreadData {
  spreads: CrackSpread[];
  refineryMargins: RefineryMargins[];
  marketConditions: {
    refiningDemand: 'Weak' | 'Moderate' | 'Strong' | 'Very Strong';
    seasonalFactor: 'Low Season' | 'Building' | 'Peak Season' | 'Declining';
    inventoryStatus: 'Low' | 'Normal' | 'High' | 'Very High';
  };
  lastUpdated: string;
}

// Cache for 30 minutes (crack spreads change with commodity prices)
let cache: { data: CrackSpreadData; ts: number } | null = null;
const CACHE_MS = 30 * 60 * 1000;

async function fetchCrackSpreadData(): Promise<CrackSpreadData> {
  try {
    // In production, this would calculate from live WTI, RBOB, ULSD prices
    // For now, return realistic mock data based on typical refining margins
    
    const mockSpreads: CrackSpread[] = [
      {
        name: '3:2:1 Crack Spread',
        description: '3 barrels crude → 2 barrels gasoline + 1 barrel distillate',
        value: 28.45,
        change: 1.23,
        percentChange: 4.5,
        unit: '$/barrel',
        components: {
          crude: 73.45, // WTI price
          refined: (2.12 * 42) + (2.34 * 42), // RBOB + ULSD prices * gallons/barrel
          ratio: '3:2:1'
        },
        lastUpdated: new Date(Date.now() - 15 * 60 * 1000).toISOString()
      },
      {
        name: '2:1:1 Crack Spread',
        description: '2 barrels crude → 1 barrel gasoline + 1 barrel distillate',
        value: 31.20,
        change: 0.85,
        percentChange: 2.8,
        unit: '$/barrel',
        components: {
          crude: 73.45,
          refined: (2.12 * 42) + (2.34 * 42),
          ratio: '2:1:1'
        },
        lastUpdated: new Date(Date.now() - 18 * 60 * 1000).toISOString()
      },
      {
        name: 'Gasoline Crack',
        description: 'WTI crude to RBOB gasoline spread',
        value: 15.67,
        change: 0.45,
        percentChange: 3.0,
        unit: '$/barrel',
        components: {
          crude: 73.45,
          refined: 2.12 * 42, // RBOB * gallons per barrel
          ratio: '1:1'
        },
        lastUpdated: new Date(Date.now() - 12 * 60 * 1000).toISOString()
      },
      {
        name: 'Diesel Crack',
        description: 'WTI crude to ULSD diesel spread',
        value: 18.23,
        change: -0.32,
        percentChange: -1.7,
        unit: '$/barrel',
        components: {
          crude: 73.45,
          refined: 2.34 * 42, // ULSD * gallons per barrel
          ratio: '1:1'
        },
        lastUpdated: new Date(Date.now() - 20 * 60 * 1000).toISOString()
      },
      {
        name: 'Heating Oil Crack',
        description: 'WTI crude to heating oil spread',
        value: 19.85,
        change: 0.67,
        percentChange: 3.5,
        unit: '$/barrel',
        components: {
          crude: 73.45,
          refined: 2.38 * 42,
          ratio: '1:1'
        },
        lastUpdated: new Date(Date.now() - 25 * 60 * 1000).toISOString()
      },
      {
        name: 'Jet Fuel Crack',
        description: 'WTI crude to jet fuel spread',
        value: 16.42,
        change: -0.18,
        percentChange: -1.1,
        unit: '$/barrel',
        components: {
          crude: 73.45,
          refined: 2.26 * 42,
          ratio: '1:1'
        },
        lastUpdated: new Date(Date.now() - 10 * 60 * 1000).toISOString()
      }
    ];

    const mockRefineryMargins: RefineryMargins[] = [
      {
        region: 'US Gulf Coast',
        grossMargin: 32.50,
        netMargin: 18.75,
        utilization: 89.2,
        throughput: 8420,
        marginChange: 1.85
      },
      {
        region: 'US West Coast',
        grossMargin: 45.30,
        netMargin: 28.90,
        utilization: 85.6,
        throughput: 2180,
        marginChange: 2.45
      },
      {
        region: 'US Midwest',
        grossMargin: 28.90,
        netMargin: 16.40,
        utilization: 87.1,
        throughput: 3760,
        marginChange: 0.95
      },
      {
        region: 'Europe',
        grossMargin: 12.80,
        netMargin: 3.20,
        utilization: 82.4,
        throughput: 10200,
        marginChange: -0.85
      },
      {
        region: 'Asia Pacific',
        grossMargin: 8.45,
        netMargin: -1.20,
        utilization: 78.9,
        throughput: 15600,
        marginChange: -1.45
      }
    ];

    const mockData: CrackSpreadData = {
      spreads: mockSpreads,
      refineryMargins: mockRefineryMargins,
      marketConditions: {
        refiningDemand: 'Strong',
        seasonalFactor: 'Building',
        inventoryStatus: 'Normal'
      },
      lastUpdated: new Date().toISOString()
    };

    return mockData;
    
  } catch (error) {
    console.error('Crack spread data fetch error:', error);
    
    // Fallback data
    return {
      spreads: [
        {
          name: '3:2:1 Crack Spread',
          description: '3 barrels crude → 2 barrels gasoline + 1 barrel distillate',
          value: 28.45,
          change: 1.23,
          percentChange: 4.5,
          unit: '$/barrel',
          components: {
            crude: 73.45,
            refined: 187.32,
            ratio: '3:2:1'
          },
          lastUpdated: new Date().toISOString()
        }
      ],
      refineryMargins: [
        {
          region: 'US Gulf Coast',
          grossMargin: 32.50,
          netMargin: 18.75,
          utilization: 89.2,
          throughput: 8420,
          marginChange: 1.85
        }
      ],
      marketConditions: {
        refiningDemand: 'Strong',
        seasonalFactor: 'Building',
        inventoryStatus: 'Normal'
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
    const data = await fetchCrackSpreadData();
    
    // Cache the results
    cache = { data, ts: Date.now() };
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Crack spread API error:', error);
    
    // Ultimate fallback
    return NextResponse.json({
      spreads: [],
      refineryMargins: [],
      marketConditions: {
        refiningDemand: 'Moderate',
        seasonalFactor: 'Building',
        inventoryStatus: 'Normal'
      },
      lastUpdated: new Date().toISOString()
    });
  }
}