import { NextResponse } from 'next/server';

interface SectorDemand {
  sector: 'Aviation' | 'Trucking' | 'Shipping' | 'Rail' | 'Industrial' | 'Power Generation';
  fuelType: 'Jet Fuel' | 'Diesel' | 'Heavy Fuel Oil' | 'Natural Gas' | 'Coal' | 'Gasoline';
  currentDemand: number; // million barrels per day or equivalent
  unit: string;
  change: number; // percentage change vs previous period
  forecast: {
    nextMonth: number;
    nextQuarter: number;
    yearEnd: number;
  };
  region: string;
  lastUpdated: string;
}

interface EconomicIndicator {
  name: string;
  value: number;
  change: number;
  impact: 'Positive' | 'Negative' | 'Neutral';
  description: string;
  lastUpdated: string;
}

interface GlobalFuelDemandData {
  sectorDemand: SectorDemand[];
  economicIndicators: EconomicIndicator[];
  regionalSummary: {
    region: string;
    totalDemand: number; // million bpd oil equivalent
    change: number;
    majorDrivers: string[];
  }[];
  marketSummary: {
    globalDemand: number; // million bpd oil equivalent
    quarterlyGrowth: number; // percentage
    yearOverYear: number; // percentage
    strongestSector: string;
    weakestSector: string;
  };
  lastUpdated: string;
}

// Cache for 6 hours (fuel demand data changes but not extremely frequently)
let cache: { data: GlobalFuelDemandData; ts: number } | null = null;
const CACHE_MS = 6 * 60 * 60 * 1000;

async function fetchGlobalFuelDemandData(): Promise<GlobalFuelDemandData> {
  try {
    // In production, this would fetch from IEA, EIA, IMF, regional transport authorities
    // For now, return realistic mock data based on current global fuel consumption patterns
    
    const mockSectorDemand: SectorDemand[] = [
      {
        sector: 'Aviation',
        fuelType: 'Jet Fuel',
        currentDemand: 6.2,
        unit: 'million bpd',
        change: 8.5,
        forecast: {
          nextMonth: 6.4,
          nextQuarter: 6.8,
          yearEnd: 7.1
        },
        region: 'Global',
        lastUpdated: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      },
      {
        sector: 'Trucking',
        fuelType: 'Diesel',
        currentDemand: 18.4,
        unit: 'million bpd',
        change: 2.1,
        forecast: {
          nextMonth: 18.6,
          nextQuarter: 19.1,
          yearEnd: 19.8
        },
        region: 'Global',
        lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        sector: 'Shipping',
        fuelType: 'Heavy Fuel Oil',
        currentDemand: 4.1,
        unit: 'million bpd',
        change: -1.8,
        forecast: {
          nextMonth: 4.0,
          nextQuarter: 3.9,
          yearEnd: 3.7
        },
        region: 'Global',
        lastUpdated: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      },
      {
        sector: 'Rail',
        fuelType: 'Diesel',
        currentDemand: 0.8,
        unit: 'million bpd',
        change: 1.4,
        forecast: {
          nextMonth: 0.81,
          nextQuarter: 0.83,
          yearEnd: 0.85
        },
        region: 'Global',
        lastUpdated: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
      },
      {
        sector: 'Industrial',
        fuelType: 'Natural Gas',
        currentDemand: 45.2,
        unit: 'BCF/day',
        change: -2.4,
        forecast: {
          nextMonth: 44.8,
          nextQuarter: 43.9,
          yearEnd: 43.2
        },
        region: 'Global',
        lastUpdated: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      },
      {
        sector: 'Power Generation',
        fuelType: 'Natural Gas',
        currentDemand: 62.8,
        unit: 'BCF/day',
        change: 3.2,
        forecast: {
          nextMonth: 64.1,
          nextQuarter: 65.8,
          yearEnd: 67.2
        },
        region: 'Global',
        lastUpdated: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString()
      }
    ];

    const mockEconomicIndicators: EconomicIndicator[] = [
      {
        name: 'US Manufacturing PMI',
        value: 52.3,
        change: 1.8,
        impact: 'Positive',
        description: 'Above 50 indicates expansion, driving fuel demand',
        lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        name: 'China Manufacturing PMI',
        value: 48.7,
        change: -2.1,
        impact: 'Negative',
        description: 'Below 50 indicates contraction, reducing demand',
        lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        name: 'Baltic Dry Index',
        value: 1847,
        change: 12.5,
        impact: 'Positive',
        description: 'Rising shipping rates indicate strong cargo demand',
        lastUpdated: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      },
      {
        name: 'Global Air Traffic',
        value: 94.2,
        change: 6.8,
        impact: 'Positive',
        description: '% of pre-pandemic levels, driving jet fuel demand',
        lastUpdated: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      },
      {
        name: 'EU Industrial Production',
        value: -1.4,
        change: -0.8,
        impact: 'Negative',
        description: 'YoY decline reducing industrial fuel consumption',
        lastUpdated: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      }
    ];

    const mockRegionalSummary = [
      {
        region: 'North America',
        totalDemand: 20.8,
        change: 1.8,
        majorDrivers: ['Strong aviation recovery', 'Trucking activity', 'Industrial growth']
      },
      {
        region: 'Asia Pacific',
        totalDemand: 35.2,
        change: -0.5,
        majorDrivers: ['China slowdown', 'India growth', 'Shipping headwinds']
      },
      {
        region: 'Europe',
        totalDemand: 12.4,
        change: -2.1,
        majorDrivers: ['Industrial decline', 'Energy crisis', 'Transport efficiency']
      },
      {
        region: 'Middle East',
        totalDemand: 8.9,
        change: 2.4,
        majorDrivers: ['Power generation', 'Petrochemical activity', 'Aviation hub growth']
      },
      {
        region: 'Latin America',
        totalDemand: 6.1,
        change: 1.2,
        majorDrivers: ['Economic recovery', 'Mining activity', 'Agricultural transport']
      }
    ];

    const totalGlobalDemand = mockRegionalSummary.reduce((sum, region) => sum + region.totalDemand, 0);
    const strongestSector = mockSectorDemand.reduce((max, sector) => 
      sector.change > max.change ? sector : max
    ).sector;
    const weakestSector = mockSectorDemand.reduce((min, sector) => 
      sector.change < min.change ? sector : min
    ).sector;

    const mockData: GlobalFuelDemandData = {
      sectorDemand: mockSectorDemand,
      economicIndicators: mockEconomicIndicators,
      regionalSummary: mockRegionalSummary,
      marketSummary: {
        globalDemand: totalGlobalDemand,
        quarterlyGrowth: 0.8,
        yearOverYear: 2.1,
        strongestSector,
        weakestSector
      },
      lastUpdated: new Date().toISOString()
    };

    return mockData;
    
  } catch (error) {
    console.error('Global fuel demand data fetch error:', error);
    
    // Fallback data
    return {
      sectorDemand: [
        {
          sector: 'Aviation',
          fuelType: 'Jet Fuel',
          currentDemand: 6.2,
          unit: 'million bpd',
          change: 8.5,
          forecast: {
            nextMonth: 6.4,
            nextQuarter: 6.8,
            yearEnd: 7.1
          },
          region: 'Global',
          lastUpdated: new Date().toISOString()
        }
      ],
      economicIndicators: [
        {
          name: 'US Manufacturing PMI',
          value: 52.3,
          change: 1.8,
          impact: 'Positive',
          description: 'Above 50 indicates expansion, driving fuel demand',
          lastUpdated: new Date().toISOString()
        }
      ],
      regionalSummary: [
        {
          region: 'North America',
          totalDemand: 20.8,
          change: 1.8,
          majorDrivers: ['Strong aviation recovery', 'Trucking activity']
        }
      ],
      marketSummary: {
        globalDemand: 83.4,
        quarterlyGrowth: 0.8,
        yearOverYear: 2.1,
        strongestSector: 'Aviation',
        weakestSector: 'Shipping'
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
    const data = await fetchGlobalFuelDemandData();
    
    // Cache the results
    cache = { data, ts: Date.now() };
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Global fuel demand API error:', error);
    
    // Ultimate fallback
    return NextResponse.json({
      sectorDemand: [],
      economicIndicators: [],
      regionalSummary: [],
      marketSummary: {
        globalDemand: 0,
        quarterlyGrowth: 0,
        yearOverYear: 0,
        strongestSector: '',
        weakestSector: ''
      },
      lastUpdated: new Date().toISOString()
    });
  }
}