import { NextResponse } from 'next/server';

interface LNGSpotPrice {
  region: string;
  price: number; // $/MMBtu
  change: number;
  percentChange: number;
  benchmark: string; // JKM, TTF, etc.
  lastUpdated: string;
}

interface LNGTerminal {
  name: string;
  country: string;
  type: 'Export' | 'Import' | 'Both';
  capacity: number; // MTPA (Million Tonnes Per Annum)
  utilization: number; // percentage
  status: 'Operating' | 'Under Construction' | 'Planned' | 'Maintenance';
  throughput: number; // current MTPA
  lastUpdated: string;
}

interface CargoFlow {
  route: string;
  volume: number; // MTPA
  change: number; // vs previous period
  utilization: number; // percentage of route capacity
  avgPrice: number; // $/MMBtu
  transitTime: number; // days
}

interface GlobalLNGData {
  spotPrices: LNGSpotPrice[];
  terminals: LNGTerminal[];
  cargoFlows: CargoFlow[];
  marketSummary: {
    globalCapacity: number; // MTPA
    globalUtilization: number; // percentage
    totalExports: number; // MTPA
    totalImports: number; // MTPA
    averageSpotPrice: number; // $/MMBtu
    fleetUtilization: number; // percentage
  };
  lastUpdated: string;
}

// Cache for 2 hours (LNG data changes but not extremely frequently)
let cache: { data: GlobalLNGData; ts: number } | null = null;
const CACHE_MS = 2 * 60 * 60 * 1000;

async function fetchGlobalLNGData(): Promise<GlobalLNGData> {
  try {
    // In production, this would fetch from Platts, ICIS, S&P Global, ship tracking APIs
    // For now, return realistic mock data based on current global LNG flows
    
    const mockSpotPrices: LNGSpotPrice[] = [
      {
        region: 'Northeast Asia',
        price: 11.80,
        change: -0.45,
        percentChange: -3.7,
        benchmark: 'JKM',
        lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        region: 'Europe',
        price: 28.45,
        change: 1.23,
        percentChange: 4.5,
        benchmark: 'TTF',
        lastUpdated: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      },
      {
        region: 'South America',
        price: 13.20,
        change: 0.15,
        percentChange: 1.2,
        benchmark: 'Brazil DES',
        lastUpdated: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      },
      {
        region: 'India',
        price: 12.15,
        change: -0.25,
        percentChange: -2.0,
        benchmark: 'India DES',
        lastUpdated: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      }
    ];

    const mockTerminals: LNGTerminal[] = [
      {
        name: 'Sabine Pass LNG',
        country: 'USA',
        type: 'Export',
        capacity: 30.0,
        utilization: 95.2,
        status: 'Operating',
        throughput: 28.6,
        lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        name: 'Yamal LNG',
        country: 'Russia',
        type: 'Export',
        capacity: 16.5,
        utilization: 0.0,
        status: 'Maintenance',
        throughput: 0.0,
        lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        name: 'Qatar North Field',
        country: 'Qatar',
        type: 'Export',
        capacity: 77.0,
        utilization: 98.5,
        status: 'Operating',
        throughput: 75.8,
        lastUpdated: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      },
      {
        name: 'FSRU Höegh Esperanza',
        country: 'Germany',
        type: 'Import',
        capacity: 5.0,
        utilization: 87.4,
        status: 'Operating',
        throughput: 4.4,
        lastUpdated: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      },
      {
        name: 'Dahej LNG Terminal',
        country: 'India',
        type: 'Import',
        capacity: 17.5,
        utilization: 82.1,
        status: 'Operating',
        throughput: 14.4,
        lastUpdated: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      },
      {
        name: 'Guangdong Dapeng',
        country: 'China',
        type: 'Import',
        capacity: 3.5,
        utilization: 91.2,
        status: 'Operating',
        throughput: 3.2,
        lastUpdated: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      }
    ];

    const mockCargoFlows: CargoFlow[] = [
      {
        route: 'US Gulf → Europe',
        volume: 45.2,
        change: 12.5,
        utilization: 78.3,
        avgPrice: 26.80,
        transitTime: 12
      },
      {
        route: 'Qatar → Asia',
        volume: 52.8,
        change: -3.2,
        utilization: 91.4,
        avgPrice: 11.90,
        transitTime: 8
      },
      {
        route: 'Australia → Asia',
        volume: 38.6,
        change: 2.1,
        utilization: 84.7,
        avgPrice: 12.10,
        transitTime: 6
      },
      {
        route: 'US → Asia',
        volume: 28.4,
        change: 8.9,
        utilization: 72.1,
        avgPrice: 12.50,
        transitTime: 18
      },
      {
        route: 'Russia → Europe',
        volume: 8.2,
        change: -45.8,
        utilization: 15.2,
        avgPrice: 25.40,
        transitTime: 4
      }
    ];

    const totalExportCapacity = mockTerminals.filter(t => t.type === 'Export' || t.type === 'Both')
      .reduce((sum, terminal) => sum + terminal.capacity, 0);
    const totalImportCapacity = mockTerminals.filter(t => t.type === 'Import' || t.type === 'Both')
      .reduce((sum, terminal) => sum + terminal.capacity, 0);
    const totalCapacity = totalExportCapacity + totalImportCapacity;
    const totalThroughput = mockTerminals.reduce((sum, terminal) => sum + terminal.throughput, 0);
    const avgUtilization = totalThroughput / totalCapacity * 100;

    const mockSummary = {
      globalCapacity: totalCapacity,
      globalUtilization: avgUtilization,
      totalExports: mockTerminals.filter(t => t.type === 'Export' || t.type === 'Both')
        .reduce((sum, t) => sum + t.throughput, 0),
      totalImports: mockTerminals.filter(t => t.type === 'Import' || t.type === 'Both')
        .reduce((sum, t) => sum + t.throughput, 0),
      averageSpotPrice: mockSpotPrices.reduce((sum, p) => sum + p.price, 0) / mockSpotPrices.length,
      fleetUtilization: 84.2
    };

    const mockData: GlobalLNGData = {
      spotPrices: mockSpotPrices,
      terminals: mockTerminals,
      cargoFlows: mockCargoFlows,
      marketSummary: mockSummary,
      lastUpdated: new Date().toISOString()
    };

    return mockData;
    
  } catch (error) {
    console.error('Global LNG data fetch error:', error);
    
    // Fallback data
    return {
      spotPrices: [
        {
          region: 'Northeast Asia',
          price: 11.80,
          change: -0.45,
          percentChange: -3.7,
          benchmark: 'JKM',
          lastUpdated: new Date().toISOString()
        }
      ],
      terminals: [
        {
          name: 'Sabine Pass LNG',
          country: 'USA',
          type: 'Export',
          capacity: 30.0,
          utilization: 95.2,
          status: 'Operating',
          throughput: 28.6,
          lastUpdated: new Date().toISOString()
        }
      ],
      cargoFlows: [
        {
          route: 'US Gulf → Europe',
          volume: 45.2,
          change: 12.5,
          utilization: 78.3,
          avgPrice: 26.80,
          transitTime: 12
        }
      ],
      marketSummary: {
        globalCapacity: 150.0,
        globalUtilization: 82.5,
        totalExports: 75.0,
        totalImports: 75.0,
        averageSpotPrice: 15.85,
        fleetUtilization: 84.2
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
    const data = await fetchGlobalLNGData();
    
    // Cache the results
    cache = { data, ts: Date.now() };
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Global LNG API error:', error);
    
    // Ultimate fallback
    return NextResponse.json({
      spotPrices: [],
      terminals: [],
      cargoFlows: [],
      marketSummary: {
        globalCapacity: 0,
        globalUtilization: 0,
        totalExports: 0,
        totalImports: 0,
        averageSpotPrice: 0,
        fleetUtilization: 0
      },
      lastUpdated: new Date().toISOString()
    });
  }
}