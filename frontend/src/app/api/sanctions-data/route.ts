import { NextResponse } from 'next/server';

interface Sanction {
  target: string;
  country: string;
  sanctioningEntity: string;
  type: 'Oil Export' | 'Gas Export' | 'Equipment' | 'Technology' | 'Financial' | 'Shipping' | 'Insurance';
  severity: 'Light' | 'Moderate' | 'Heavy' | 'Comprehensive';
  status: 'Active' | 'Partial' | 'Under Review' | 'Suspended';
  implementedDate: string;
  description: string;
  impact: 'Low' | 'Medium' | 'High' | 'Critical';
  affectedVolume?: string; // e.g., "1.2M bpd", "50 BCM/yr"
  workarounds: string[];
  lastUpdated: string;
}

interface SanctionsSummary {
  totalSanctions: number;
  activeSanctions: number;
  criticalImpact: number;
  affectedCountries: number;
  majorTargets: string[];
}

interface SanctionsData {
  sanctions: Sanction[];
  summary: SanctionsSummary;
  lastUpdated: string;
}

// Cache for 8 hours (sanctions change but not super frequently)
let cache: { data: SanctionsData; ts: number } | null = null;
const CACHE_MS = 8 * 60 * 60 * 1000;

async function fetchSanctionsData(): Promise<SanctionsData> {
  try {
    // In production, this would fetch from government sanctions databases,
    // Treasury dept, EU sanctions database, UN Security Council, etc.
    // For now, return realistic mock data based on current energy sanctions
    
    const mockSanctions: Sanction[] = [
      {
        target: 'Russian Oil Exports',
        country: 'Russia',
        sanctioningEntity: 'EU, US, G7',
        type: 'Oil Export',
        severity: 'Heavy',
        status: 'Active',
        implementedDate: '2022-12-05',
        description: 'Price cap on Russian crude oil exports via tankers',
        impact: 'Critical',
        affectedVolume: '3.2M bpd',
        workarounds: ['Non-G7 tankers', 'Price cap compliance', 'Alternative buyers'],
        lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        target: 'Russian Petroleum Products',
        country: 'Russia',
        sanctioningEntity: 'EU, US, G7',
        type: 'Oil Export',
        severity: 'Heavy',
        status: 'Active',
        implementedDate: '2023-02-05',
        description: 'Price cap on Russian refined petroleum products',
        impact: 'High',
        affectedVolume: '1.1M bpd',
        workarounds: ['Middle Eastern refiners', 'Ship-to-ship transfers', 'Price adjustments'],
        lastUpdated: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      },
      {
        target: 'Iranian Oil Exports',
        country: 'Iran',
        sanctioningEntity: 'US Treasury (OFAC)',
        type: 'Oil Export',
        severity: 'Comprehensive',
        status: 'Active',
        implementedDate: '2018-11-05',
        description: 'Comprehensive sanctions on Iranian crude oil and condensate exports',
        impact: 'Critical',
        affectedVolume: '2.8M bpd potential',
        workarounds: ['Dark fleet tankers', 'Ship-to-ship transfers', 'Asian buyers'],
        lastUpdated: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      },
      {
        target: 'Venezuelan Oil Sector',
        country: 'Venezuela',
        sanctioningEntity: 'US Treasury (OFAC)',
        type: 'Oil Export',
        severity: 'Heavy',
        status: 'Partial',
        implementedDate: '2019-01-28',
        description: 'Sanctions on PDVSA and Venezuelan oil sector with limited exemptions',
        impact: 'High',
        affectedVolume: '800K bpd',
        workarounds: ['Chevron license', 'Debt repayment schemes', 'Asian refiners'],
        lastUpdated: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      },
      {
        target: 'Russian Gas Pipeline Equipment',
        country: 'Russia',
        sanctioningEntity: 'EU, US',
        type: 'Equipment',
        severity: 'Moderate',
        status: 'Active',
        implementedDate: '2022-04-08',
        description: 'Export ban on gas turbines, compressors, and pipeline equipment',
        impact: 'Medium',
        affectedVolume: '150 BCM/yr capacity',
        workarounds: ['Chinese equipment', 'Maintenance extensions', 'Alternative suppliers'],
        lastUpdated: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
      },
      {
        target: 'Iranian Gas Sector',
        country: 'Iran',
        sanctioningEntity: 'US Treasury (OFAC)',
        type: 'Gas Export',
        severity: 'Heavy',
        status: 'Active',
        implementedDate: '2020-10-26',
        description: 'Sanctions on Iranian natural gas and LNG projects',
        impact: 'Medium',
        affectedVolume: '45 BCM/yr potential',
        workarounds: ['Domestic consumption', 'Regional pipelines', 'Barter arrangements'],
        lastUpdated: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      },
      {
        target: 'Russian Shipping Insurance',
        country: 'Russia',
        sanctioningEntity: 'EU, UK Lloyd\'s',
        type: 'Insurance',
        severity: 'Heavy',
        status: 'Active',
        implementedDate: '2022-12-05',
        description: 'Maritime insurance ban on Russian oil tankers above price cap',
        impact: 'High',
        affectedVolume: 'Global fleet coverage',
        workarounds: ['Non-EU insurers', 'Self-insurance', 'Alternative coverage'],
        lastUpdated: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString()
      }
    ];

    const activeSanctions = mockSanctions.filter(s => s.status === 'Active').length;
    const criticalImpact = mockSanctions.filter(s => s.impact === 'Critical').length;
    const countries = [...new Set(mockSanctions.map(s => s.country))];
    const majorTargets = mockSanctions
      .filter(s => s.impact === 'Critical' || s.impact === 'High')
      .map(s => s.target)
      .slice(0, 4);

    const mockSummary: SanctionsSummary = {
      totalSanctions: mockSanctions.length,
      activeSanctions,
      criticalImpact,
      affectedCountries: countries.length,
      majorTargets
    };

    const mockData: SanctionsData = {
      sanctions: mockSanctions,
      summary: mockSummary,
      lastUpdated: new Date().toISOString()
    };

    return mockData;
    
  } catch (error) {
    console.error('Sanctions data fetch error:', error);
    
    // Fallback data
    return {
      sanctions: [
        {
          target: 'Russian Oil Exports',
          country: 'Russia',
          sanctioningEntity: 'EU, US, G7',
          type: 'Oil Export',
          severity: 'Heavy',
          status: 'Active',
          implementedDate: '2022-12-05',
          description: 'Price cap on Russian crude oil exports',
          impact: 'Critical',
          affectedVolume: '3.2M bpd',
          workarounds: ['Non-G7 tankers', 'Alternative buyers'],
          lastUpdated: new Date().toISOString()
        }
      ],
      summary: {
        totalSanctions: 1,
        activeSanctions: 1,
        criticalImpact: 1,
        affectedCountries: 1,
        majorTargets: ['Russian Oil Exports']
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
    const data = await fetchSanctionsData();
    
    // Cache the results
    cache = { data, ts: Date.now() };
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Sanctions API error:', error);
    
    // Ultimate fallback
    return NextResponse.json({
      sanctions: [],
      summary: {
        totalSanctions: 0,
        activeSanctions: 0,
        criticalImpact: 0,
        affectedCountries: 0,
        majorTargets: []
      },
      lastUpdated: new Date().toISOString()
    });
  }
}