import { NextResponse } from 'next/server';

interface FuturesContract {
  symbol: string;
  expiry: string;
  price: number;
  change: number;
  volume: number;
  openInterest: number;
  lastUpdated: string;
}

interface FuturesCurve {
  commodity: string;
  unit: string;
  contracts: FuturesContract[];
  contango: boolean;
  curveSlope: number;
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

let cache: { data: EnergyFuturesData; ts: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

const MONTH_CODES = ['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function fetchYahooContract(symbol: string): Promise<{
  price: number; prevClose: number; change: number; volume: number;
} | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d&includePrePost=false`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(6000),
    });
    const data = await resp.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose || price;
    const change = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
    const volume = meta.regularMarketVolume || 0;
    return { price, prevClose, change, volume };
  } catch {
    return null;
  }
}

interface CommodityConfig {
  name: string;
  unit: string;
  root: string;       // NYMEX root symbol (CL, BZ, RB, HO, NG)
  numContracts: number;
}

const COMMODITIES: CommodityConfig[] = [
  { name: 'WTI Crude', unit: '$/barrel', root: 'CL', numContracts: 8 },
  { name: 'Brent Crude', unit: '$/barrel', root: 'BZ', numContracts: 6 },
  { name: 'RBOB Gasoline', unit: '$/gallon', root: 'RB', numContracts: 6 },
  { name: 'Heating Oil', unit: '$/gallon', root: 'HO', numContracts: 6 },
  { name: 'Natural Gas', unit: '$/MMBtu', root: 'NG', numContracts: 8 },
];

function getContractSymbols(root: string, count: number): { yahoo: string; label: string; expiry: string }[] {
  const now = new Date();
  let month = now.getMonth(); // 0-indexed
  let year = now.getFullYear();
  const results: { yahoo: string; label: string; expiry: string }[] = [];

  for (let i = 0; i < count + 4 && results.length < count; i++) {
    const code = MONTH_CODES[month];
    const yr2 = year.toString().slice(-2);
    results.push({
      yahoo: `${root}${code}${yr2}.NYM`,
      label: `${MONTH_NAMES[month]} ${yr2}`,
      expiry: `${year}-${(month + 1).toString().padStart(2, '0')}`,
    });
    month++;
    if (month >= 12) { month = 0; year++; }
  }
  return results;
}

async function fetchCurve(config: CommodityConfig): Promise<FuturesCurve | null> {
  const symbols = getContractSymbols(config.root, config.numContracts);
  const contracts: FuturesContract[] = [];
  const now = new Date();

  // Fetch all contracts in parallel
  const promises = symbols.map(s => fetchYahooContract(s.yahoo));
  const results = await Promise.all(promises);

  for (let i = 0; i < symbols.length; i++) {
    const q = results[i];
    if (q && q.price > 0) {
      contracts.push({
        symbol: symbols[i].label,
        expiry: symbols[i].expiry,
        price: q.price,
        change: q.change,
        volume: q.volume,
        openInterest: 0,
        lastUpdated: now.toISOString(),
      });
    }
  }

  if (contracts.length === 0) {
    console.log(`❌ No real contracts for ${config.name}`);
    return null;
  }

  const slope = contracts.length >= 2
    ? contracts[contracts.length - 1].price - contracts[0].price
    : 0;

  console.log(`✅ ${config.name}: ${contracts.length} real contracts | Front: $${contracts[0].price.toFixed(2)} | Back: $${contracts[contracts.length - 1].price.toFixed(2)} | Slope: ${slope >= 0 ? '+' : ''}${slope.toFixed(2)} (${slope > 0 ? 'Contango' : 'Backwardation'})`);

  return {
    commodity: config.name,
    unit: config.unit,
    contracts,
    contango: slope > 0,
    curveSlope: slope,
    lastUpdated: now.toISOString(),
  };
}

async function fetchFuturesData(): Promise<EnergyFuturesData> {
  console.log('📊 ENERGY FUTURES: Fetching ALL real contract data from Yahoo Finance');

  const curves: FuturesCurve[] = [];

  // Fetch all commodities in parallel
  const curvePromises = COMMODITIES.map(c => fetchCurve(c));
  const curveResults = await Promise.all(curvePromises);

  for (const curve of curveResults) {
    if (curve) curves.push(curve);
  }

  // Sentiment from real prices
  let oilSentiment: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
  let gasSentiment: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
  let refinedSentiment: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';

  const wti = curves.find(c => c.commodity === 'WTI Crude');
  if (wti?.contracts.length) {
    const p = wti.contracts[0].price;
    oilSentiment = p > 90 ? 'Bullish' : p < 65 ? 'Bearish' : 'Neutral';
  }

  const ng = curves.find(c => c.commodity === 'Natural Gas');
  if (ng?.contracts.length) {
    const p = ng.contracts[0].price;
    gasSentiment = p > 4 ? 'Bullish' : p < 2.5 ? 'Bearish' : 'Neutral';
  }

  const gasoline = curves.find(c => c.commodity === 'RBOB Gasoline');
  if (gasoline?.contracts.length && wti?.contracts.length) {
    const crack = gasoline.contracts[0].price * 42 - wti.contracts[0].price;
    refinedSentiment = crack > 20 ? 'Bullish' : crack < 10 ? 'Bearish' : 'Neutral';
  }

  console.log(`✅ Energy Futures: ${curves.length} curves, ALL from real Yahoo Finance contract data`);

  return {
    curves,
    marketSentiment: { oilSentiment, gasSentiment, refinedSentiment },
    lastUpdated: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }
    const data = await fetchFuturesData();
    cache = { data, ts: Date.now() };
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Energy futures API error:', error);
    return NextResponse.json({
      curves: [],
      marketSentiment: { oilSentiment: 'Neutral', gasSentiment: 'Neutral', refinedSentiment: 'Neutral' },
      lastUpdated: new Date().toISOString(),
    });
  }
}
