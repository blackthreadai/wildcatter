import { NextResponse } from 'next/server';

const SYMBOLS = [
  { symbol: 'CL=F', label: 'WTI Crude', sub: '/bbl' },
  { symbol: 'BZ=F', label: 'Brent Crude', sub: '/bbl' },
  { symbol: 'NG=F', label: 'Henry Hub Gas', sub: '/mmbtu' },
  { symbol: 'RB=F', label: 'RBOB Gasoline', sub: '/gal' },
];

interface MarketItem {
  label: string;
  value: string;
  sub: string;
  change: number;
}

// Cache for 5 minutes (prices) and 1 hour (rig count — weekly data)
let cache: { data: MarketItem[]; ts: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

let rigCache: { data: MarketItem; ts: number } | null = null;
const RIG_CACHE_MS = 60 * 60 * 1000; // 1 hour

async function fetchQuote(symbol: string): Promise<{ price: number; change: number } | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d&includePrePost=false`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });
    const data = await resp.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice || !meta?.chartPreviousClose) return null;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose;
    const change = ((price - prev) / prev) * 100;
    return { price, change };
  } catch {
    return null;
  }
}

async function fetchRigCount(): Promise<MarketItem | null> {
  // Return cached rig data if fresh (weekly data, 1hr cache is plenty)
  if (rigCache && Date.now() - rigCache.ts < RIG_CACHE_MS) {
    return rigCache.data;
  }

  try {
    const resp = await fetch('https://ycharts.com/indicators/us_oil_rotary_rigs', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });
    const html = await resp.text();

    // Parse: "US Oil Rig Count is at a current level of 409.00, unchanged from 409.00 last week"
    // or: "US Oil Rig Count is at a current level of X, up from Y last week ... change of Z% from last week"
    const match = html.match(
      /Oil Rig Count is at a current level of ([\d,.]+).*?(?:unchanged from|(?:up|down) from) ([\d,.]+) last week.*?change of ([+-]?[\d.]+)% from last week/
    );

    if (match) {
      const current = parseFloat(match[1].replace(/,/g, ''));
      const changeWoW = parseFloat(match[3]);

      const item: MarketItem = {
        label: 'Oil Rig Count',
        value: current.toFixed(0),
        sub: 'rigs (wk)',
        change: changeWoW,
      };
      rigCache = { data: item, ts: Date.now() };
      return item;
    }

    // Fallback: try the JSON-LD snippet
    const jsonLdMatch = html.match(/"text":\s*"The latest US Oil Rig Count is ([\d.]+)/);
    if (jsonLdMatch) {
      const current = parseFloat(jsonLdMatch[1]);
      const item: MarketItem = {
        label: 'Oil Rig Count',
        value: current.toFixed(0),
        sub: 'rigs (wk)',
        change: 0,
      };
      rigCache = { data: item, ts: Date.now() };
      return item;
    }

    return null;
  } catch {
    return rigCache?.data ?? null; // Return stale cache on error
  }
}

export async function GET() {
  try {
    // Return cache if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    const [quotes, rigCount] = await Promise.all([
      Promise.all(SYMBOLS.map((s) => fetchQuote(s.symbol))),
      fetchRigCount(),
    ]);

    const results: MarketItem[] = [];

    for (let i = 0; i < SYMBOLS.length; i++) {
      const q = quotes[i];
      const s = SYMBOLS[i];
      if (q) {
        results.push({
          label: s.label,
          value: `$${q.price.toFixed(2)}`,
          sub: s.sub,
          change: parseFloat(q.change.toFixed(2)),
        });
      }
    }

    if (rigCount) {
      results.push(rigCount);
    }

    if (results.length > 0) {
      cache = { data: results, ts: Date.now() };
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error('Market data error:', err);
    return NextResponse.json([], { status: 500 });
  }
}
