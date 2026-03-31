import { NextResponse } from 'next/server';

export const maxDuration = 20;

let cache: { data: unknown; ts: number } | null = null;
const CACHE_MS = 60 * 60 * 1000; // 1 hour

// Yahoo Finance symbols for LNG-related benchmarks
const PRICE_SYMBOLS: Record<string, { name: string; region: string; unit: string }> = {
  'NG=F': { name: 'Henry Hub', region: 'US', unit: '$/MMBtu' },
  'TTF=F': { name: 'TTF (Dutch)', region: 'Europe', unit: '$/MMBtu' },
  'JKM=F': { name: 'JKM (Platts)', region: 'Asia', unit: '$/MMBtu' },
};

async function fetchYahooPrice(symbol: string): Promise<{ price: number; prevClose: number }> {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d&includePrePost=false`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(6000),
  });
  if (!resp.ok) return { price: 0, prevClose: 0 };
  const json = await resp.json();
  const result = json.chart?.result?.[0];
  if (!result) return { price: 0, prevClose: 0 };

  const meta = result.meta || {};
  return {
    price: meta.regularMarketPrice || 0,
    prevClose: meta.chartPreviousClose || meta.previousClose || 0,
  };
}

async function fetchLNGExports(apiKey: string) {
  // EIA US LNG exports by terminal/destination
  try {
    const url = `https://api.eia.gov/v2/natural-gas/move/expc/data/?api_key=${apiKey}&frequency=monthly&data[0]=value&facets[process][]=ENG&sort[0][column]=period&sort[0][direction]=desc&length=200`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const json = await resp.json();
    return json.response?.data || [];
  } catch {
    return [];
  }
}

async function fetchLNGImports(apiKey: string) {
  // EIA US LNG imports
  try {
    const url = `https://api.eia.gov/v2/natural-gas/move/impc/data/?api_key=${apiKey}&frequency=monthly&data[0]=value&facets[process][]=IRP&sort[0][column]=period&sort[0][direction]=desc&length=20`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const json = await resp.json();
    return json.response?.data || [];
  } catch {
    return [];
  }
}

function processExports(rows: Record<string, string>[]) {
  // Group by destination country, get latest month totals
  if (rows.length === 0) return { byCountry: [], totalMcf: 0, period: '' };

  const latestPeriod = rows[0]?.period || '';
  const latestRows = rows.filter(r => r.period === latestPeriod);

  const byCountry: Record<string, number> = {};
  let totalMcf = 0;

  for (const row of latestRows) {
    // duoarea format: "NUS-NJA" means US to Japan. Extract destination.
    const area = row.duoarea || '';
    const areaName = row['area-name'] || row['duoarea-name'] || '';
    // Skip the total row (Z00 = world)
    if (area.includes('Z00')) continue;
    const country = areaName || area;
    const val = parseFloat(row.value) || 0;
    if (val > 0) {
      byCountry[country] = (byCountry[country] || 0) + val;
      totalMcf += val;
    }
  }

  const sorted = Object.entries(byCountry)
    .map(([country, mcf]) => ({ country, mcf: Math.round(mcf), pct: 0 }))
    .sort((a, b) => b.mcf - a.mcf);

  sorted.forEach(s => { s.pct = totalMcf > 0 ? Math.round((s.mcf / totalMcf) * 1000) / 10 : 0; });

  // Get previous month for comparison
  const periods = [...new Set(rows.map(r => r.period))].sort().reverse();
  let prevTotalMcf = 0;
  if (periods.length >= 2) {
    const prevRows = rows.filter(r => r.period === periods[1]);
    for (const row of prevRows) {
      const val = parseFloat(row.value) || 0;
      if (val > 0) prevTotalMcf += val;
    }
  }

  return {
    byCountry: sorted.slice(0, 10),
    totalMcf: Math.round(totalMcf),
    prevTotalMcf: Math.round(prevTotalMcf),
    period: latestPeriod,
  };
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    const apiKey = process.env.EIA_API_KEY;

    // Fetch prices and EIA data in parallel
    const [hh, ttf, jkm, exports, imports] = await Promise.all([
      fetchYahooPrice('NG=F'),
      fetchYahooPrice('TTF=F'),
      fetchYahooPrice('JKM=F'),
      apiKey ? fetchLNGExports(apiKey) : Promise.resolve([]),
      apiKey ? fetchLNGImports(apiKey) : Promise.resolve([]),
    ]);

    if (!hh.price && !ttf.price && !jkm.price) {
      return NextResponse.json({ error: 'Failed to fetch LNG price data' }, { status: 502 });
    }

    const makePriceEntry = (sym: string, data: { price: number; prevClose: number }) => {
      const info = PRICE_SYMBOLS[sym];
      const change = Math.round((data.price - data.prevClose) * 1000) / 1000;
      const pctChange = data.prevClose ? Math.round(((data.price - data.prevClose) / data.prevClose) * 1000) / 10 : 0;
      return {
        benchmark: info.name,
        region: info.region,
        price: Math.round(data.price * 1000) / 1000,
        change,
        percentChange: pctChange,
        unit: info.unit,
      };
    };

    const spotPrices = [
      makePriceEntry('NG=F', hh),
      makePriceEntry('TTF=F', ttf),
      makePriceEntry('JKM=F', jkm),
    ].filter(p => p.price > 0);

    // Regional premiums
    const premiums = [];
    if (jkm.price > 0 && hh.price > 0) {
      premiums.push({ name: 'Asia Premium (JKM-HH)', value: Math.round((jkm.price - hh.price) * 100) / 100 });
    }
    if (ttf.price > 0 && hh.price > 0) {
      premiums.push({ name: 'Europe Premium (TTF-HH)', value: Math.round((ttf.price - hh.price) * 100) / 100 });
    }
    if (jkm.price > 0 && ttf.price > 0) {
      premiums.push({ name: 'Asia vs Europe (JKM-TTF)', value: Math.round((jkm.price - ttf.price) * 100) / 100 });
    }

    const exportData = processExports(exports);

    // Process imports
    let totalImportMcf = 0;
    let importPeriod = '';
    if (imports.length > 0) {
      importPeriod = imports[0]?.period || '';
      const latestImports = imports.filter((r: Record<string, string>) => r.period === importPeriod);
      for (const row of latestImports) {
        const val = parseFloat(row.value) || 0;
        if (val > 0) totalImportMcf += val;
      }
    }

    const data = {
      spotPrices,
      premiums,
      usExports: {
        totalMcf: exportData.totalMcf,
        prevTotalMcf: exportData.prevTotalMcf,
        topDestinations: exportData.byCountry,
        period: exportData.period,
      },
      usImports: {
        totalMcf: Math.round(totalImportMcf),
        period: importPeriod,
      },
      lastUpdated: new Date().toISOString(),
      source: 'Yahoo Finance, EIA',
    };

    cache = { data, ts: Date.now() };
    return NextResponse.json(data);

  } catch (error) {
    console.error('Global LNG error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LNG data: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 502 },
    );
  }
}
