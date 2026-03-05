import { NextResponse } from 'next/server';

interface OPECCountryData {
  country: string;
  quota: number; // thousands bpd
  production: number; // thousands bpd
  compliance: number; // percentage
  spareCapacity: number; // thousands bpd
  lastUpdated: string;
}

interface OPECTotals {
  totalQuota: number;
  totalProduction: number;
  avgCompliance: number;
  totalSpareCapacity: number;
}

interface OPECData {
  countries: OPECCountryData[];
  totals: OPECTotals;
  lastMeeting: string;
  nextMeeting: string;
}

// Cache for 12 hours (OPEC data changes monthly)
let cache: { data: OPECData; ts: number } | null = null;
const CACHE_MS = 12 * 60 * 60 * 1000;

async function fetchOPECData(): Promise<OPECData> {
  try {
    // In production, this would fetch from OPEC official sources or oil market APIs
    // For now, return realistic mock data based on current OPEC+ status
    
    const mockCountries: OPECCountryData[] = [
      {
        country: 'Saudi Arabia',
        quota: 11000,
        production: 10800,
        compliance: 98.2,
        spareCapacity: 2500,
        lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        country: 'Russia',
        quota: 11500,
        production: 11200,
        compliance: 97.4,
        spareCapacity: 500,
        lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        country: 'Iraq',
        quota: 4651,
        production: 4580,
        compliance: 98.5,
        spareCapacity: 400,
        lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        country: 'UAE',
        quota: 3168,
        production: 3150,
        compliance: 99.4,
        spareCapacity: 800,
        lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        country: 'Kuwait',
        quota: 2809,
        production: 2750,
        compliance: 97.9,
        spareCapacity: 600,
        lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        country: 'Iran',
        quota: 3596,
        production: 3200,
        compliance: 89.0,
        spareCapacity: 300,
        lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        country: 'Nigeria',
        quota: 1742,
        production: 1650,
        compliance: 94.7,
        spareCapacity: 200,
        lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        country: 'Venezuela',
        quota: 1020,
        production: 800,
        compliance: 78.4,
        spareCapacity: 100,
        lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    const totalQuota = mockCountries.reduce((sum, country) => sum + country.quota, 0);
    const totalProduction = mockCountries.reduce((sum, country) => sum + country.production, 0);
    const avgCompliance = totalProduction / totalQuota * 100;
    const totalSpareCapacity = mockCountries.reduce((sum, country) => sum + country.spareCapacity, 0);

    const mockData: OPECData = {
      countries: mockCountries,
      totals: {
        totalQuota,
        totalProduction,
        avgCompliance,
        totalSpareCapacity
      },
      lastMeeting: '2026-02-01',
      nextMeeting: '2026-04-01'
    };

    return mockData;
    
  } catch (error) {
    console.error('OPEC data fetch error:', error);
    
    // Fallback minimal data
    return {
      countries: [
        {
          country: 'Saudi Arabia',
          quota: 11000,
          production: 10800,
          compliance: 98.2,
          spareCapacity: 2500,
          lastUpdated: new Date().toISOString()
        }
      ],
      totals: {
        totalQuota: 11000,
        totalProduction: 10800,
        avgCompliance: 98.2,
        totalSpareCapacity: 2500
      },
      lastMeeting: '2026-02-01',
      nextMeeting: '2026-04-01'
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
    const data = await fetchOPECData();
    
    // Cache the results
    cache = { data, ts: Date.now() };
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('OPEC API error:', error);
    
    // Ultimate fallback
    return NextResponse.json({
      countries: [
        {
          country: 'Saudi Arabia',
          quota: 11000,
          production: 10800,
          compliance: 98.2,
          spareCapacity: 2500,
          lastUpdated: new Date().toISOString()
        }
      ],
      totals: {
        totalQuota: 11000,
        totalProduction: 10800,
        avgCompliance: 98.2,
        totalSpareCapacity: 2500
      },
      lastMeeting: '2026-02-01',
      nextMeeting: '2026-04-01'
    });
  }
}