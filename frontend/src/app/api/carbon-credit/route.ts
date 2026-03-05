import { NextResponse } from 'next/server';

interface CarbonMarket {
  name: string;
  region: string;
  type: 'Compliance' | 'Voluntary';
  price: number; // €/tonne CO2 or $/tonne CO2
  currency: string;
  change: number;
  percentChange: number;
  volume: number; // million tonnes traded
  marketCap: number; // billion currency units
  vintage: string; // e.g., "2024", "2025-2030"
  lastUpdated: string;
}

interface CarbonProject {
  id: string;
  name: string;
  type: 'Renewable Energy' | 'Forest' | 'Methane Capture' | 'Direct Air Capture' | 'Blue Carbon' | 'Soil Carbon';
  country: string;
  creditsIssued: number; // tonnes CO2e
  priceRange: { min: number; max: number }; // $/tonne
  vintage: string;
  standard: string; // VCS, Gold Standard, etc.
  status: 'Active' | 'Under Development' | 'Completed';
  lastUpdated: string;
}

interface CarbonCreditData {
  markets: CarbonMarket[];
  projects: CarbonProject[];
  marketSummary: {
    totalMarketValue: number; // billion USD
    globalVolume: number; // million tonnes
    avgPrice: number; // $/tonne weighted average
    complianceShare: number; // percentage of total market
    voluntaryShare: number; // percentage of total market
  };
  trends: {
    demandGrowth: number; // YoY percentage
    priceVolatility: number; // 30-day volatility
    corporateCommitments: number; // number of net-zero commitments
  };
  lastUpdated: string;
}

// Cache for 4 hours (carbon credit data changes but not super frequently)
let cache: { data: CarbonCreditData; ts: number } | null = null;
const CACHE_MS = 4 * 60 * 60 * 1000;

async function fetchCarbonCreditData(): Promise<CarbonCreditData> {
  try {
    // In production, this would fetch from ICE, EEX, registry APIs, etc.
    // For now, return realistic mock data based on current carbon markets
    
    const mockMarkets: CarbonMarket[] = [
      {
        name: 'EU Emissions Trading System',
        region: 'European Union',
        type: 'Compliance',
        price: 85.42,
        currency: 'EUR',
        change: 2.15,
        percentChange: 2.6,
        volume: 1847.3,
        marketCap: 157.8,
        vintage: '2024',
        lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        name: 'California Cap-and-Trade',
        region: 'California, USA',
        type: 'Compliance',
        price: 28.75,
        currency: 'USD',
        change: -0.45,
        percentChange: -1.5,
        volume: 324.8,
        marketCap: 9.3,
        vintage: '2024',
        lastUpdated: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      },
      {
        name: 'RGGI (Northeast US)',
        region: 'Northeast US',
        type: 'Compliance',
        price: 13.20,
        currency: 'USD',
        change: 0.85,
        percentChange: 6.9,
        volume: 89.7,
        marketCap: 1.2,
        vintage: '2024',
        lastUpdated: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      },
      {
        name: 'Voluntary Carbon Market',
        region: 'Global',
        type: 'Voluntary',
        price: 12.80,
        currency: 'USD',
        change: 1.25,
        percentChange: 10.8,
        volume: 298.4,
        marketCap: 3.8,
        vintage: '2024',
        lastUpdated: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      },
      {
        name: 'China ETS',
        region: 'China',
        type: 'Compliance',
        price: 7.45,
        currency: 'USD',
        change: -0.15,
        percentChange: -2.0,
        volume: 432.1,
        marketCap: 3.2,
        vintage: '2024',
        lastUpdated: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      },
      {
        name: 'UK ETS',
        region: 'United Kingdom',
        type: 'Compliance',
        price: 45.60,
        currency: 'GBP',
        change: 1.80,
        percentChange: 4.1,
        volume: 156.2,
        marketCap: 7.1,
        vintage: '2024',
        lastUpdated: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString()
      }
    ];

    const mockProjects: CarbonProject[] = [
      {
        id: 'VCS-1875',
        name: 'Amazon Forest Conservation',
        type: 'Forest',
        country: 'Brazil',
        creditsIssued: 2450000,
        priceRange: { min: 8.50, max: 15.20 },
        vintage: '2024',
        standard: 'VCS',
        status: 'Active',
        lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'GS-2341',
        name: 'India Solar Farm Project',
        type: 'Renewable Energy',
        country: 'India',
        creditsIssued: 1850000,
        priceRange: { min: 6.80, max: 12.50 },
        vintage: '2024-2030',
        standard: 'Gold Standard',
        status: 'Active',
        lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'VCS-3142',
        name: 'Dairy Methane Capture',
        type: 'Methane Capture',
        country: 'USA',
        creditsIssued: 895000,
        priceRange: { min: 15.00, max: 25.00 },
        vintage: '2024',
        standard: 'VCS',
        status: 'Active',
        lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'GS-2897',
        name: 'Mangrove Restoration',
        type: 'Blue Carbon',
        country: 'Philippines',
        creditsIssued: 320000,
        priceRange: { min: 18.50, max: 35.00 },
        vintage: '2024-2035',
        standard: 'Gold Standard',
        status: 'Under Development',
        lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    const totalVolume = mockMarkets.reduce((sum, market) => sum + market.volume, 0);
    const totalValue = mockMarkets.reduce((sum, market) => sum + market.marketCap, 0);
    const complianceVolume = mockMarkets.filter(m => m.type === 'Compliance').reduce((sum, m) => sum + m.volume, 0);
    const voluntaryVolume = mockMarkets.filter(m => m.type === 'Voluntary').reduce((sum, m) => sum + m.volume, 0);
    
    const mockSummary = {
      totalMarketValue: totalValue,
      globalVolume: totalVolume,
      avgPrice: mockMarkets.reduce((sum, market, _, arr) => sum + market.price / arr.length, 0),
      complianceShare: (complianceVolume / totalVolume) * 100,
      voluntaryShare: (voluntaryVolume / totalVolume) * 100
    };

    const mockData: CarbonCreditData = {
      markets: mockMarkets,
      projects: mockProjects,
      marketSummary: mockSummary,
      trends: {
        demandGrowth: 18.5,
        priceVolatility: 12.3,
        corporateCommitments: 4287
      },
      lastUpdated: new Date().toISOString()
    };

    return mockData;
    
  } catch (error) {
    console.error('Carbon credit data fetch error:', error);
    
    // Fallback data
    return {
      markets: [
        {
          name: 'EU Emissions Trading System',
          region: 'European Union',
          type: 'Compliance',
          price: 85.42,
          currency: 'EUR',
          change: 2.15,
          percentChange: 2.6,
          volume: 1847.3,
          marketCap: 157.8,
          vintage: '2024',
          lastUpdated: new Date().toISOString()
        }
      ],
      projects: [],
      marketSummary: {
        totalMarketValue: 157.8,
        globalVolume: 1847.3,
        avgPrice: 85.42,
        complianceShare: 100,
        voluntaryShare: 0
      },
      trends: {
        demandGrowth: 18.5,
        priceVolatility: 12.3,
        corporateCommitments: 4287
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
    const data = await fetchCarbonCreditData();
    
    // Cache the results
    cache = { data, ts: Date.now() };
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Carbon credit API error:', error);
    
    // Ultimate fallback
    return NextResponse.json({
      markets: [],
      projects: [],
      marketSummary: {
        totalMarketValue: 0,
        globalVolume: 0,
        avgPrice: 0,
        complianceShare: 0,
        voluntaryShare: 0
      },
      trends: {
        demandGrowth: 0,
        priceVolatility: 0,
        corporateCommitments: 0
      },
      lastUpdated: new Date().toISOString()
    });
  }
}