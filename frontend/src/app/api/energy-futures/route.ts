import { NextResponse } from 'next/server';

interface FuturesContract {
  symbol: string;
  expiry: string; // YYYY-MM format
  price: number;
  change: number;
  volume: number;
  openInterest: number;
  lastUpdated: string;
}

interface FuturesCurve {
  commodity: 'WTI Crude' | 'Brent Crude' | 'RBOB Gasoline' | 'Heating Oil' | 'Natural Gas';
  unit: string;
  contracts: FuturesContract[];
  contango: boolean; // true if contango, false if backwardation
  curveSlope: number; // price difference between front and back month
  lastUpdated: string;
}

interface EnergyFuturesData {
  curves: FuturesCurve[];
  marketSentiment: {
    oilSentiment: 'Bullish' | 'Bearish' | 'Neutral';
    gasSentiment: 'Bullish' | 'Bearish' | 'Neutral';
    refinedSentiment: 'Bullish' | 'Bearish' | 'Neutral';
  };
  lastUpdated: string;
}

// Cache for 15 minutes (futures data changes frequently during trading)
let cache: { data: EnergyFuturesData; ts: number } | null = null;
const CACHE_MS = 15 * 60 * 1000;

async function fetchFuturesData(): Promise<EnergyFuturesData> {
  try {
    // In production, this would fetch from CME, ICE, NYMEX APIs
    // For now, return realistic mock data based on current futures patterns
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    const generateContracts = (basePrice: number, commodity: string): FuturesContract[] => {
      const contracts: FuturesContract[] = [];
      for (let i = 0; i < 12; i++) {
        const month = ((currentMonth - 1 + i) % 12) + 1;
        const year = currentYear + Math.floor((currentMonth - 1 + i) / 12);
        const expiry = `${year}-${month.toString().padStart(2, '0')}`;
        
        // Simulate realistic price curve
        let price = basePrice;
        if (commodity === 'WTI Crude' || commodity === 'Brent Crude') {
          // Oil often in contango (higher future prices)
          price = basePrice + (i * 0.5) + (Math.random() - 0.5) * 2;
        } else if (commodity === 'Natural Gas') {
          // Gas seasonal patterns
          const seasonalAdjust = Math.sin((month - 1) * Math.PI / 6) * 0.8;
          price = basePrice + seasonalAdjust + (i * 0.1);
        } else {
          // Refined products
          price = basePrice + (i * 0.3) + (Math.random() - 0.5) * 1.5;
        }
        
        contracts.push({
          symbol: `${commodity.split(' ')[0]}${month.toString().padStart(2, '0')}${year.toString().slice(-2)}`,
          expiry,
          price: Math.max(0, price),
          change: (Math.random() - 0.5) * 3,
          volume: Math.floor(Math.random() * 100000) + 10000,
          openInterest: Math.floor(Math.random() * 500000) + 50000,
          lastUpdated: new Date(Date.now() - Math.random() * 60 * 60 * 1000).toISOString()
        });
      }
      return contracts;
    };

    const wtiCurve: FuturesCurve = {
      commodity: 'WTI Crude',
      unit: '$/barrel',
      contracts: generateContracts(73.45, 'WTI Crude'),
      contango: true,
      curveSlope: 2.8,
      lastUpdated: new Date().toISOString()
    };

    const brentCurve: FuturesCurve = {
      commodity: 'Brent Crude',
      unit: '$/barrel',
      contracts: generateContracts(78.12, 'Brent Crude'),
      contango: true,
      curveSlope: 3.1,
      lastUpdated: new Date().toISOString()
    };

    const natGasCurve: FuturesCurve = {
      commodity: 'Natural Gas',
      unit: '$/MMBtu',
      contracts: generateContracts(2.84, 'Natural Gas'),
      contango: false,
      curveSlope: -0.4,
      lastUpdated: new Date().toISOString()
    };

    const gasolineCurve: FuturesCurve = {
      commodity: 'RBOB Gasoline',
      unit: '$/gallon',
      contracts: generateContracts(2.12, 'RBOB Gasoline'),
      contango: true,
      curveSlope: 0.15,
      lastUpdated: new Date().toISOString()
    };

    const heatingOilCurve: FuturesCurve = {
      commodity: 'Heating Oil',
      unit: '$/gallon',
      contracts: generateContracts(2.34, 'Heating Oil'),
      contango: true,
      curveSlope: 0.18,
      lastUpdated: new Date().toISOString()
    };

    const mockData: EnergyFuturesData = {
      curves: [wtiCurve, brentCurve, natGasCurve, gasolineCurve, heatingOilCurve],
      marketSentiment: {
        oilSentiment: 'Neutral',
        gasSentiment: 'Bearish',
        refinedSentiment: 'Bullish'
      },
      lastUpdated: new Date().toISOString()
    };

    return mockData;
    
  } catch (error) {
    console.error('Energy futures data fetch error:', error);
    
    // Fallback data
    return {
      curves: [
        {
          commodity: 'WTI Crude',
          unit: '$/barrel',
          contracts: [
            {
              symbol: 'WTI0326',
              expiry: '2026-03',
              price: 73.45,
              change: -0.85,
              volume: 150000,
              openInterest: 400000,
              lastUpdated: new Date().toISOString()
            }
          ],
          contango: true,
          curveSlope: 2.8,
          lastUpdated: new Date().toISOString()
        }
      ],
      marketSentiment: {
        oilSentiment: 'Neutral',
        gasSentiment: 'Bearish',
        refinedSentiment: 'Bullish'
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
    const data = await fetchFuturesData();
    
    // Cache the results
    cache = { data, ts: Date.now() };
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Energy futures API error:', error);
    
    // Ultimate fallback
    return NextResponse.json({
      curves: [],
      marketSentiment: {
        oilSentiment: 'Neutral',
        gasSentiment: 'Neutral',
        refinedSentiment: 'Neutral'
      },
      lastUpdated: new Date().toISOString()
    });
  }
}