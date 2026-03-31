import { NextResponse } from 'next/server';

interface CryptoCurrency {
  symbol: string;
  name: string;
  price: number;
  changePercent24h: number;
  marketCap: number;
  rank: number;
}

let cache: { data: CryptoCurrency[]; ts: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

const CRYPTOS = [
  { id: 'bitcoin', symbol: 'BTC', yahoo: 'BTC-USD' },
  { id: 'ethereum', symbol: 'ETH', yahoo: 'ETH-USD' },
  { id: 'solana', symbol: 'SOL', yahoo: 'SOL-USD' },
  { id: 'ripple', symbol: 'XRP', yahoo: 'XRP-USD' },
];

async function fetchYahooPrice(symbol: string) {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return null;
    const json = await resp.json();
    const meta = json.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose || meta.previousClose || price;
    const change = prev > 0 ? ((price - prev) / prev) * 100 : 0;
    return { price, changePercent24h: Math.round(change * 100) / 100 };
  } catch { return null; }
}

async function fetchCoinGecko(): Promise<CryptoCurrency[]> {
  try {
    const ids = CRYPTOS.map(c => c.id).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    
    return CRYPTOS.map((c, i) => {
      const d = data[c.id];
      if (!d?.usd) return null;
      return {
        symbol: c.symbol,
        name: c.id.charAt(0).toUpperCase() + c.id.slice(1),
        price: parseFloat((d.usd as number).toFixed(d.usd < 1 ? 6 : 2)),
        changePercent24h: parseFloat(((d.usd_24h_change as number) || 0).toFixed(2)),
        marketCap: (d.usd_market_cap as number) || 0,
        rank: i + 1,
      };
    }).filter((c): c is CryptoCurrency => c !== null);
  } catch { return []; }
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    // Try CoinGecko first
    let cryptos = await fetchCoinGecko();

    // Fallback to Yahoo Finance if CoinGecko fails
    if (cryptos.length === 0) {
      const results = await Promise.all(CRYPTOS.map(c => fetchYahooPrice(c.yahoo)));
      cryptos = CRYPTOS.map((c, i) => {
        const r = results[i];
        if (!r) return null;
        return {
          symbol: c.symbol,
          name: c.id.charAt(0).toUpperCase() + c.id.slice(1),
          price: Math.round(r.price * 100) / 100,
          changePercent24h: r.changePercent24h,
          marketCap: 0,
          rank: i + 1,
        };
      }).filter((c): c is CryptoCurrency => c !== null);
    }

    if (cryptos.length === 0) {
      return NextResponse.json({ error: 'Failed to fetch cryptocurrency data' }, { status: 502 });
    }

    cache = { data: cryptos, ts: Date.now() };
    return NextResponse.json(cryptos);
  } catch (error) {
    console.error('Cryptocurrency API error:', error);
    return NextResponse.json({ error: 'Failed to fetch cryptocurrency data' }, { status: 502 });
  }
}
