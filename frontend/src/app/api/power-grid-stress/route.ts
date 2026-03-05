import { NextResponse } from 'next/server';

interface GridData {
  region: string;
  currentLoad: number; // MW
  peakCapacity: number; // MW
  utilizationRate: number; // percentage
  status: 'Normal' | 'Watch' | 'Warning' | 'Emergency';
  reserves: number; // MW
  temperature: number; // Celsius
  demandForecast: string;
  lastUpdated: string;
}

interface PowerGridData {
  grids: GridData[];
  alerts: {
    region: string;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    message: string;
    timestamp: string;
  }[];
  lastUpdated: string;
}

// Cache for 30 minutes (grid data changes frequently)
let cache: { data: PowerGridData; ts: number } | null = null;
const CACHE_MS = 30 * 60 * 1000;

async function fetchPowerGridData(): Promise<PowerGridData> {
  try {
    // In production, this would fetch from ERCOT, ENTSO-E, and Chinese grid APIs
    // For now, return realistic mock data based on actual grid stress patterns
    
    const mockGrids: GridData[] = [
      {
        region: 'ERCOT (Texas)',
        currentLoad: 68420,
        peakCapacity: 85000,
        utilizationRate: 80.5,
        status: 'Warning',
        reserves: 6580,
        temperature: 38.5,
        demandForecast: 'High',
        lastUpdated: new Date(Date.now() - 15 * 60 * 1000).toISOString()
      },
      {
        region: 'European Grid',
        currentLoad: 387200,
        peakCapacity: 720000,
        utilizationRate: 53.8,
        status: 'Normal',
        reserves: 142800,
        temperature: 12.4,
        demandForecast: 'Moderate',
        lastUpdated: new Date(Date.now() - 20 * 60 * 1000).toISOString()
      },
      {
        region: 'China Southern',
        currentLoad: 156800,
        peakCapacity: 280000,
        utilizationRate: 56.0,
        status: 'Watch',
        reserves: 89200,
        temperature: 28.7,
        demandForecast: 'High',
        lastUpdated: new Date(Date.now() - 25 * 60 * 1000).toISOString()
      },
      {
        region: 'China Eastern',
        currentLoad: 198400,
        peakCapacity: 320000,
        utilizationRate: 62.0,
        status: 'Watch',
        reserves: 76600,
        temperature: 31.2,
        demandForecast: 'Very High',
        lastUpdated: new Date(Date.now() - 18 * 60 * 1000).toISOString()
      },
      {
        region: 'Germany',
        currentLoad: 58200,
        peakCapacity: 89000,
        utilizationRate: 65.4,
        status: 'Normal',
        reserves: 18800,
        temperature: 8.9,
        demandForecast: 'Moderate',
        lastUpdated: new Date(Date.now() - 22 * 60 * 1000).toISOString()
      }
    ];

    const mockAlerts = [
      {
        region: 'ERCOT (Texas)',
        severity: 'High' as const,
        message: 'High temperatures driving exceptional demand - conservation notice issued',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      },
      {
        region: 'China Eastern',
        severity: 'Medium' as const,
        message: 'Industrial demand surge in Shanghai region - monitoring reserves',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString()
      },
      {
        region: 'European Grid',
        severity: 'Low' as const,
        message: 'Wind generation below forecast - gas plants compensating',
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString()
      }
    ];

    const mockData: PowerGridData = {
      grids: mockGrids,
      alerts: mockAlerts,
      lastUpdated: new Date().toISOString()
    };

    return mockData;
    
  } catch (error) {
    console.error('Power grid data fetch error:', error);
    
    // Fallback data
    return {
      grids: [
        {
          region: 'ERCOT (Texas)',
          currentLoad: 68420,
          peakCapacity: 85000,
          utilizationRate: 80.5,
          status: 'Warning',
          reserves: 6580,
          temperature: 38.5,
          demandForecast: 'High',
          lastUpdated: new Date().toISOString()
        }
      ],
      alerts: [
        {
          region: 'ERCOT (Texas)',
          severity: 'High',
          message: 'High temperatures driving exceptional demand',
          timestamp: new Date().toISOString()
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
    const data = await fetchPowerGridData();
    
    // Cache the results
    cache = { data, ts: Date.now() };
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Power grid stress API error:', error);
    
    // Ultimate fallback
    return NextResponse.json({
      grids: [
        {
          region: 'ERCOT (Texas)',
          currentLoad: 68420,
          peakCapacity: 85000,
          utilizationRate: 80.5,
          status: 'Warning',
          reserves: 6580,
          temperature: 38.5,
          demandForecast: 'High',
          lastUpdated: new Date().toISOString()
        }
      ],
      alerts: [],
      lastUpdated: new Date().toISOString()
    });
  }
}