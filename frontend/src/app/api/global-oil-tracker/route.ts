import { NextResponse } from 'next/server';

// Cache for 4 hours
let cache: { data: unknown; ts: number } | null = null;
const CACHE_MS = 4 * 60 * 60 * 1000;

// ── EIA Weekly Petroleum Stocks ─────────────────────────────────────
async function fetchStorageData(apiKey: string) {
  const targets = [
    { series: 'W_EPC0_SAX_YCUOK_MBBL', label: 'Cushing, OK', capacity: 91000 },
    { series: 'WCESTUS1', label: 'US Commercial', capacity: 653000 },
    { series: 'WCSSTUS1', label: 'US Strategic (SPR)', capacity: 714000 },
  ];

  const results = [];

  for (const { series, label, capacity } of targets) {
    try {
      const url = `https://api.eia.gov/v2/petroleum/stoc/wstk/data/?api_key=${apiKey}&frequency=weekly&data[0]=value&facets[product][]=EPC0&facets[series][]=${series}&sort[0][column]=period&sort[0][direction]=desc&length=5`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
        signal: AbortSignal.timeout(8000),
      });
      const json = await resp.json();
      const rows = json?.response?.data || [];

      if (rows.length === 0) continue;

      const currentKB = parseFloat(rows[0].value);
      const prevKB = rows.length > 1 ? parseFloat(rows[1].value) : currentKB;
      const currentMMB = currentKB / 1000;
      const weeklyChangeMMB = (currentKB - prevKB) / 1000;
      const capacityMMB = capacity / 1000;
      const utilization = (currentMMB / capacityMMB) * 100;

      results.push({
        location: label,
        current: Math.round(currentMMB * 10) / 10,
        capacity: capacityMMB,
        utilizationRate: Math.round(utilization * 10) / 10,
        weeklyChange: Math.round(weeklyChangeMMB * 10) / 10,
        unit: 'MMB',
        lastUpdated: rows[0].period,
      });
    } catch (err) {
      console.error(`EIA storage fetch error for ${label}:`, err);
    }
  }

  return results;
}

// ── PADD Region Breakdown ───────────────────────────────────────────
async function fetchPADDData(apiKey: string) {
  const padds = [
    { series: 'WCESTP11', label: 'PADD 1 (East Coast)' },
    { series: 'WCESTP21', label: 'PADD 2 (Midwest)' },
    { series: 'WCESTP31', label: 'PADD 3 (Gulf Coast)' },
    { series: 'WCESTP41', label: 'PADD 4 (Rocky Mountain)' },
    { series: 'WCESTP51', label: 'PADD 5 (West Coast)' },
  ];

  const results = [];

  // Batch all PADDs in one call using multiple facets
  const seriesFacets = padds.map(p => `&facets[series][]=${p.series}`).join('');
  try {
    const url = `https://api.eia.gov/v2/petroleum/stoc/wstk/data/?api_key=${apiKey}&frequency=weekly&data[0]=value&facets[product][]=EPC0${seriesFacets}&sort[0][column]=period&sort[0][direction]=desc&length=20`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    const json = await resp.json();
    const rows = json?.response?.data || [];

    // Group by series
    const grouped: Record<string, { value: string; period: string }[]> = {};
    for (const row of rows) {
      const s = row.series;
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(row);
    }

    for (const { series, label } of padds) {
      const seriesRows = grouped[series] || [];
      if (seriesRows.length === 0) continue;
      const currentKB = parseFloat(seriesRows[0].value);
      const prevKB = seriesRows.length > 1 ? parseFloat(seriesRows[1].value) : currentKB;

      results.push({
        region: label,
        stocks: Math.round(currentKB / 1000 * 10) / 10,
        change: Math.round((currentKB - prevKB) / 1000 * 10) / 10,
        unit: 'MMB',
        period: seriesRows[0].period,
      });
    }
  } catch (err) {
    console.error('EIA PADD fetch error:', err);
  }

  return results;
}

// ── Crude Oil Prices from Yahoo Finance ─────────────────────────────
async function fetchOilPrices() {
  const symbols = [
    { symbol: 'CL=F', name: 'WTI Crude' },
    { symbol: 'BZ=F', name: 'Brent Crude' },
  ];

  const prices: { name: string; price: number; change: number; changePercent: number }[] = [];

  await Promise.all(symbols.map(async ({ symbol, name }) => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
        signal: AbortSignal.timeout(8000),
      });
      const json = await resp.json();
      const meta = json?.chart?.result?.[0]?.meta;
      const closes = (json?.chart?.result?.[0]?.indicators?.adjclose?.[0]?.adjclose || []).filter((c: number | null) => c !== null);

      if (meta) {
        const price = meta.regularMarketPrice || (closes.length > 0 ? closes[closes.length - 1] : 0);
        const prevClose = meta.chartPreviousClose || (closes.length > 1 ? closes[closes.length - 2] : price);
        if (price > 0) {
          const change = price - prevClose;
          prices.push({
            name,
            price: Math.round(price * 100) / 100,
            change: Math.round(change * 100) / 100,
            changePercent: Math.round((change / prevClose) * 10000) / 100,
          });
        }
      }
    } catch (err) {
      console.error(`Yahoo price fetch error for ${symbol}:`, err);
    }
  }));

  return prices;
}

// ── Main handler ────────────────────────────────────────────────────
export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    let eiaApiKey: string | undefined;
    try { eiaApiKey = process.env.EIA_API_KEY || 'VhDcsSa1FuMvhz8ZAG5yWQEnGy5xXadKrUOP2qYj'; } catch { /* */ }

    const [storage, padds, prices] = await Promise.all([
      eiaApiKey ? fetchStorageData(eiaApiKey) : Promise.resolve([]),
      eiaApiKey ? fetchPADDData(eiaApiKey) : Promise.resolve([]),
      fetchOilPrices(),
    ]);

    if (storage.length === 0 && prices.length === 0) {
      return NextResponse.json({ error: 'Failed to fetch oil tracker data' }, { status: 502 });
    }

    const data = {
      storage,
      padds,
      prices,
      lastUpdated: new Date().toISOString(),
      source: 'EIA / Yahoo Finance',
    };

    cache = { data, ts: Date.now() };
    return NextResponse.json(data);

  } catch (error) {
    console.error('Global oil tracker API error:', error);
    return NextResponse.json({ error: 'Failed to fetch oil tracker data' }, { status: 502 });
  }
}
