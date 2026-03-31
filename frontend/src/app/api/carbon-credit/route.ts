import { NextResponse } from 'next/server';

let cache: { data: unknown; ts: number } | null = null;
const CACHE_MS = 30 * 60 * 1000; // 30 min

const SYMBOLS: Record<string, { name: string; type: string; region: string }> = {
  'ECF=F': { name: 'EU ETS (EUA Futures)', type: 'Compliance', region: 'EU' },
  'KRBN': { name: 'KraneShares Global Carbon ETF', type: 'ETF', region: 'Global' },
  'KEUA': { name: 'KraneShares EU Carbon ETF', type: 'ETF', region: 'EU' },
  'GRN': { name: 'iPath Carbon ETN', type: 'ETF', region: 'Global' },
};

async function fetchPrice(symbol: string) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d&includePrePost=false`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(6000),
  });
  if (!resp.ok) return null;
  const json = await resp.json();
  const result = json.chart?.result?.[0];
  if (!result) return null;

  const meta = result.meta || {};
  const price = meta.regularMarketPrice || 0;
  const prevClose = meta.chartPreviousClose || meta.previousClose || 0;
  const currency = meta.currency || 'USD';

  // Get 5-day history for sparkline
  const closes = result.indicators?.quote?.[0]?.close || [];
  const history = closes.filter((c: number | null) => c !== null).map((c: number) => Math.round(c * 100) / 100);

  return { price, prevClose, currency, history };
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    const results = await Promise.all(
      Object.entries(SYMBOLS).map(async ([sym, info]) => {
        const data = await fetchPrice(sym);
        if (!data || !data.price) return null;
        const change = Math.round((data.price - data.prevClose) * 100) / 100;
        const pctChange = data.prevClose ? Math.round(((data.price - data.prevClose) / data.prevClose) * 1000) / 10 : 0;
        return {
          symbol: sym,
          name: info.name,
          type: info.type,
          region: info.region,
          price: Math.round(data.price * 100) / 100,
          change,
          percentChange: pctChange,
          currency: data.currency,
          history: data.history,
        };
      })
    );

    const markets = results.filter(Boolean);

    if (markets.length === 0) {
      return NextResponse.json({ error: 'Failed to fetch carbon credit data' }, { status: 502 });
    }

    // Find the EU ETS price specifically for the headline
    const euEts = markets.find(m => m!.symbol === 'ECF=F');

    const data = {
      markets,
      headline: euEts ? {
        name: 'EU ETS (EUA)',
        price: euEts.price,
        change: euEts.change,
        percentChange: euEts.percentChange,
        currency: euEts.currency,
      } : null,
      lastUpdated: new Date().toISOString(),
      source: 'Yahoo Finance',
    };

    cache = { data, ts: Date.now() };
    return NextResponse.json(data);

  } catch (error) {
    console.error('Carbon credit error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch carbon credit data: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 502 },
    );
  }
}
