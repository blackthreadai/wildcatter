import { NextResponse } from 'next/server';

interface RefineryOutage {
  refinery: string;
  company: string;
  location: string;
  capacity: number; // barrels per day
  status: 'Planned' | 'Unplanned' | 'Extended' | 'Partial';
  startDate: string;
  expectedEnd?: string;
  affectedUnits: string[];
  reason: string;
  impactLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  lastUpdated: string;
}

interface RefinerySummary {
  totalOutages: number;
  affectedCapacity: number; // total bpd affected
  plannedOutages: number;
  unplannedOutages: number;
  criticalOutages: number;
}

interface RefineryOutageData {
  outages: RefineryOutage[];
  summary: RefinerySummary;
  lastUpdated: string;
}

// Cache for 4 hours (refinery data changes but not super frequently)
let cache: { data: RefineryOutageData; ts: number } | null = null;
const CACHE_MS = 4 * 60 * 60 * 1000;

async function fetchRefineryData(): Promise<RefineryOutageData> {
  try {
    // In production, this would fetch from energy intelligence services like
    // Energy Intelligence, OPIS, or direct refinery reporting
    // For now, return realistic mock data based on typical refinery outage patterns
    
    const mockOutages: RefineryOutage[] = [
      {
        refinery: 'Port Arthur Refinery',
        company: 'Motiva Enterprises',
        location: 'Texas, USA',
        capacity: 635000,
        status: 'Planned',
        startDate: '2026-02-15',
        expectedEnd: '2026-03-20',
        affectedUnits: ['Crude Distillation Unit 2', 'Catalytic Cracker'],
        reason: 'Scheduled turnaround maintenance',
        impactLevel: 'High',
        lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        refinery: 'Baytown Refinery',
        company: 'ExxonMobil',
        location: 'Texas, USA',
        capacity: 584000,
        status: 'Unplanned',
        startDate: '2026-03-01',
        expectedEnd: '2026-03-10',
        affectedUnits: ['Hydrocracker'],
        reason: 'Equipment failure - compressor malfunction',
        impactLevel: 'Medium',
        lastUpdated: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      },
      {
        refinery: 'Whiting Refinery',
        company: 'BP',
        location: 'Indiana, USA',
        capacity: 435000,
        status: 'Extended',
        startDate: '2026-02-08',
        expectedEnd: '2026-03-25',
        affectedUnits: ['Fluid Catalytic Cracker', 'Alkylation Unit'],
        reason: 'Extended maintenance - delayed parts delivery',
        impactLevel: 'High',
        lastUpdated: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      },
      {
        refinery: 'Richmond Refinery',
        company: 'Chevron',
        location: 'California, USA',
        capacity: 245000,
        status: 'Partial',
        startDate: '2026-02-28',
        expectedEnd: '2026-03-08',
        affectedUnits: ['Reformer'],
        reason: 'Catalyst replacement',
        impactLevel: 'Low',
        lastUpdated: new Date(Date.now() - 45 * 60 * 1000).toISOString()
      },
      {
        refinery: 'Wood River Refinery',
        company: 'Shell',
        location: 'Illinois, USA',
        capacity: 327000,
        status: 'Planned',
        startDate: '2026-03-10',
        expectedEnd: '2026-04-15',
        affectedUnits: ['Crude Distillation Unit 1'],
        reason: 'Major turnaround - every 4 years',
        impactLevel: 'Medium',
        lastUpdated: new Date(Date.now() - 20 * 60 * 1000).toISOString()
      },
      {
        refinery: 'Pembroke Refinery',
        company: 'Valero',
        location: 'Wales, UK',
        capacity: 270000,
        status: 'Unplanned',
        startDate: '2026-03-02',
        affectedUnits: ['Power Generation Unit'],
        reason: 'Electrical system failure',
        impactLevel: 'Critical',
        lastUpdated: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      }
    ];

    const plannedCount = mockOutages.filter(o => o.status === 'Planned').length;
    const unplannedCount = mockOutages.filter(o => o.status === 'Unplanned').length;
    const criticalCount = mockOutages.filter(o => o.impactLevel === 'Critical').length;
    const totalCapacity = mockOutages.reduce((sum, outage) => {
      const capacityImpact = outage.status === 'Partial' ? outage.capacity * 0.3 : outage.capacity;
      return sum + capacityImpact;
    }, 0);

    const mockSummary: RefinerySummary = {
      totalOutages: mockOutages.length,
      affectedCapacity: Math.round(totalCapacity),
      plannedOutages: plannedCount,
      unplannedOutages: unplannedCount,
      criticalOutages: criticalCount
    };

    const mockData: RefineryOutageData = {
      outages: mockOutages,
      summary: mockSummary,
      lastUpdated: new Date().toISOString()
    };

    return mockData;
    
  } catch (error) {
    console.error('Refinery outage data fetch error:', error);
    
    // Fallback data
    return {
      outages: [
        {
          refinery: 'Port Arthur Refinery',
          company: 'Motiva Enterprises',
          location: 'Texas, USA',
          capacity: 635000,
          status: 'Planned',
          startDate: '2026-02-15',
          expectedEnd: '2026-03-20',
          affectedUnits: ['Crude Distillation Unit 2'],
          reason: 'Scheduled turnaround maintenance',
          impactLevel: 'High',
          lastUpdated: new Date().toISOString()
        }
      ],
      summary: {
        totalOutages: 1,
        affectedCapacity: 635000,
        plannedOutages: 1,
        unplannedOutages: 0,
        criticalOutages: 0
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
    const data = await fetchRefineryData();
    
    // Cache the results
    cache = { data, ts: Date.now() };
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Refinery outages API error:', error);
    
    // Ultimate fallback
    return NextResponse.json({
      outages: [],
      summary: {
        totalOutages: 0,
        affectedCapacity: 0,
        plannedOutages: 0,
        unplannedOutages: 0,
        criticalOutages: 0
      },
      lastUpdated: new Date().toISOString()
    });
  }
}