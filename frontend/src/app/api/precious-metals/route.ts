import { NextResponse } from 'next/server';

interface Metal {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  unit: string;
}

let cache: { data: Metal[]; ts: number } | null = null;
const CACHE_MS = 10 * 60 * 1000;

const METALS = [
  { yahoo: 'GC=F', symbol: 'XAU', name: 'Gold', unit: 'USD/oz' },
  { yahoo: 'SI=F', symbol: 'XAG', name: 'Silver', unit: 'USD/oz' },
  { yahoo: 'PL=F', symbol: 'XPT', name: 'Platinum', unit: 'USD/oz' },
  { yahoo: 'HG=F', symbol: 'XCU', name: 'Copper', unit: 'USD/lb' },
  { yahoo: 'SLX', symbol: 'SLX', name: 'Steel (ETF)', unit: 'USD' },
  { yahoo: 'ALI=F', symbol: 'ALI', name: 'Aluminum', unit: 'USD/t' },
];

async function fetchQuote(yahooSymbol: string) {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=2d&includePrePost=false`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice || !meta?.chartPreviousClose) return null;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose;
    return { price, change: price - prev, changePercent: ((price - prev) / prev) * 100 };
  } catch { return null; }
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    const results = await Promise.all(METALS.map(m => fetchQuote(m.yahoo)));
    const metals: Metal[] = [];

    for (let i = 0; i < METALS.length; i++) {
      const q = results[i];
      if (!q) continue;
      metals.push({
        symbol: METALS[i].symbol,
        name: METALS[i].name,
        price: Math.round(q.price * 100) / 100,
        change: Math.round(q.change * 100) / 100,
        changePercent: Math.round(q.changePercent * 100) / 100,
        unit: METALS[i].unit,
      });
    }

    if (metals.length === 0) {
      return NextResponse.json({ error: 'Failed to fetch metals data' }, { status: 502 });
    }

    cache = { data: metals, ts: Date.now() };
    return NextResponse.json(metals);
  } catch (error) {
    console.error('Metals API error:', error);
    return NextResponse.json({ error: 'Failed to fetch metals data' }, { status: 502 });
  }
}
