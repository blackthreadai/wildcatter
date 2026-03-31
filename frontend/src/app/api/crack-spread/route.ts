import { NextResponse } from 'next/server';

// Cache for 15 minutes (commodity prices move during trading hours)
let cache: { data: unknown; ts: number } | null = null;
const CACHE_MS = 15 * 60 * 1000;

// Yahoo Finance symbols
// CL=F: WTI Crude Oil ($/barrel)
// BZ=F: Brent Crude Oil ($/barrel)
// RB=F: RBOB Gasoline ($/gallon)
// HO=F: Heating Oil / ULSD ($/gallon)

const SYMBOLS = ['CL=F', 'BZ=F', 'RB=F', 'HO=F'];
const GALLONS_PER_BARREL = 42;

async function fetchPrice(symbol: string): Promise<{ price: number; prevClose: number }> {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d&includePrePost=false`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(6000),
  });
  if (!resp.ok) throw new Error(`Yahoo ${symbol}: ${resp.status}`);
  const json = await resp.json();
  const result = json.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${symbol}`);

  const meta = result.meta || {};
  const price = meta.regularMarketPrice || 0;
  const prevClose = meta.chartPreviousClose || meta.previousClose || 0;
  return { price, prevClose };
}

async function fetchPrices(): Promise<Record<string, { price: number; prevClose: number }>> {
  const results = await Promise.all(
    SYMBOLS.map(async (sym) => {
      try {
        return { sym, data: await fetchPrice(sym) };
      } catch {
        return { sym, data: { price: 0, prevClose: 0 } };
      }
    })
  );
  const prices: Record<string, { price: number; prevClose: number }> = {};
  for (const r of results) prices[r.sym] = r.data;
  return prices;
}

function calculateSpreads(prices: Record<string, { price: number; prevClose: number }>) {
  const wti = prices['CL=F']?.price || 0;
  const wtiPrev = prices['CL=F']?.prevClose || 0;
  const brent = prices['BZ=F']?.price || 0;
  const brentPrev = prices['BZ=F']?.prevClose || 0;
  const rbob = prices['RB=F']?.price || 0; // $/gallon
  const rbobPrev = prices['RB=F']?.prevClose || 0;
  const ho = prices['HO=F']?.price || 0; // $/gallon
  const hoPrev = prices['HO=F']?.prevClose || 0;

  if (!wti || !rbob || !ho) throw new Error('Missing price data');

  // Convert product prices to $/barrel
  const rbobBbl = rbob * GALLONS_PER_BARREL;
  const rbobBblPrev = rbobPrev * GALLONS_PER_BARREL;
  const hoBbl = ho * GALLONS_PER_BARREL;
  const hoBblPrev = hoPrev * GALLONS_PER_BARREL;

  // 3:2:1 Crack Spread: (2 * RBOB_bbl + 1 * HO_bbl - 3 * WTI) / 3
  const crack321 = (2 * rbobBbl + 1 * hoBbl - 3 * wti) / 3;
  const crack321Prev = (2 * rbobBblPrev + 1 * hoBblPrev - 3 * wtiPrev) / 3;

  // 2:1:1 Crack Spread: (1 * RBOB_bbl + 1 * HO_bbl - 2 * WTI) / 2
  const crack211 = (1 * rbobBbl + 1 * hoBbl - 2 * wti) / 2;
  const crack211Prev = (1 * rbobBblPrev + 1 * hoBblPrev - 2 * wtiPrev) / 2;

  // Simple gasoline crack: RBOB_bbl - WTI
  const gasCrack = rbobBbl - wti;
  const gasCrackPrev = rbobBblPrev - wtiPrev;

  // Simple diesel/heating oil crack: HO_bbl - WTI
  const dieselCrack = hoBbl - wti;
  const dieselCrackPrev = hoBblPrev - wtiPrev;

  // Brent-WTI spread
  const brentWti = brent - wti;
  const brentWtiPrev = brentPrev - wtiPrev;

  const makeSpread = (name: string, desc: string, value: number, prev: number, ratio: string) => ({
    name,
    description: desc,
    value: Math.round(value * 100) / 100,
    change: Math.round((value - prev) * 100) / 100,
    percentChange: prev !== 0 ? Math.round(((value - prev) / Math.abs(prev)) * 1000) / 10 : 0,
    unit: '$/barrel',
    ratio,
  });

  return {
    spreads: [
      makeSpread('3:2:1 Crack Spread', '3 bbl crude to 2 bbl gasoline + 1 bbl diesel', crack321, crack321Prev, '3:2:1'),
      makeSpread('2:1:1 Crack Spread', '2 bbl crude to 1 bbl gasoline + 1 bbl diesel', crack211, crack211Prev, '2:1:1'),
      makeSpread('Gasoline Crack', 'RBOB gasoline vs WTI crude', gasCrack, gasCrackPrev, '1:1'),
      makeSpread('Diesel Crack', 'ULSD heating oil vs WTI crude', dieselCrack, dieselCrackPrev, '1:1'),
      makeSpread('Brent-WTI Spread', 'Brent crude premium over WTI', brentWti, brentWtiPrev, 'N/A'),
    ],
    components: {
      wti: { price: Math.round(wti * 100) / 100, change: Math.round((wti - wtiPrev) * 100) / 100 },
      brent: { price: Math.round(brent * 100) / 100, change: Math.round((brent - brentPrev) * 100) / 100 },
      rbob: { price: Math.round(rbob * 10000) / 10000, bbl: Math.round(rbobBbl * 100) / 100, change: Math.round((rbob - rbobPrev) * 10000) / 10000 },
      ho: { price: Math.round(ho * 10000) / 10000, bbl: Math.round(hoBbl * 100) / 100, change: Math.round((ho - hoPrev) * 10000) / 10000 },
    },
  };
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    const prices = await fetchPrices();
    const calculated = calculateSpreads(prices);

    const data = {
      ...calculated,
      lastUpdated: new Date().toISOString(),
      source: 'Yahoo Finance (calculated)',
    };

    cache = { data, ts: Date.now() };
    return NextResponse.json(data);

  } catch (error) {
    console.error('Crack spread error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crack spread data: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 502 },
    );
  }
}
