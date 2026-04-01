import { NextResponse } from 'next/server';

export const maxDuration = 30;

// Cache for 2 hours
let cache: { data: unknown; ts: number; ver: number } | null = null;
const CACHE_MS = 2 * 60 * 60 * 1000;
const CACHE_VER = 2;
const EIA_KEY = process.env.EIA_API_KEY || 'VhDcsSa1FuMvhz8ZAG5yWQEnGy5xXadKrUOP2qYj';

// ── EIA Weekly Storage ──────────────────────────────────────────────
async function fetchEIAStorage(apiKey: string) {
  // Lower 48 total working gas in underground storage (BCF)
  const seriesIds = [
    { series: 'NW2_EPG0_SWO_R48_BCF', region: 'US Lower 48' },
    { series: 'NW2_EPG0_SWO_R31_BCF', region: 'East' },
    { series: 'NW2_EPG0_SWO_R32_BCF', region: 'Midwest' },
    { series: 'NW2_EPG0_SWO_R35_BCF', region: 'South Central' },
    { series: 'NW2_EPG0_SWO_R34_BCF', region: 'Mountain' },
    { series: 'NW2_EPG0_SWO_R33_BCF', region: 'Pacific' },
  ];

  const capacityMap: Record<string, number> = {
    'US Lower 48': 4900,
    'East': 1028,
    'Midwest': 1143,
    'South Central': 1472,
    'Mountain': 174,
    'Pacific': 83,
  };

  // Fetch all regions in parallel instead of sequentially
  const results = await Promise.all(seriesIds.map(async ({ series, region }) => {
    try {
      const url = `https://api.eia.gov/v2/natural-gas/stor/wkly/data/?api_key=${apiKey}&frequency=weekly&data[0]=value&facets[process][]=SWO&facets[series][]=${series}&sort[0][column]=period&sort[0][direction]=desc&length=60`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
        signal: AbortSignal.timeout(15000),
      });
      const json = await resp.json();
      const rows = json?.response?.data || [];

      if (rows.length === 0) return null;

      const current = parseFloat(rows[0].value);
      const currentPeriod = rows[0].period;
      const prevWeek = rows.length > 1 ? parseFloat(rows[1].value) : null;
      const weeklyChange = prevWeek !== null ? current - prevWeek : 0;
      const yearAgoRow = rows.find((_: unknown, i: number) => i >= 50 && i <= 54);
      const yearAgoLevel = yearAgoRow ? parseFloat(yearAgoRow.value) : current;
      const fiveYearValues = rows.filter((_: unknown, i: number) => i >= 50 && i <= 55).map((r: { value: string }) => parseFloat(r.value));
      const fiveYearAvg = fiveYearValues.length > 0
        ? fiveYearValues.reduce((a: number, b: number) => a + b, 0) / fiveYearValues.length
        : current;
      const capacity = capacityMap[region] || 4900;
      const utilizationRate = (current / capacity) * 100;

      return {
        region,
        current: Math.round(current),
        capacity,
        utilizationRate: Math.round(utilizationRate * 10) / 10,
        weeklyChange: Math.round(weeklyChange),
        yearAgoLevel: Math.round(yearAgoLevel),
        fiveYearAvg: Math.round(fiveYearAvg),
        unit: 'BCF',
        lastUpdated: currentPeriod,
      };
    } catch (err) {
      console.error(`EIA storage fetch error for ${region}:`, err);
      return null;
    }
  }));

  return results.filter((r): r is NonNullable<typeof r> => r !== null);
}

// ── EU Storage from AGSI (GIE) ─────────────────────────────────────
async function fetchEUStorage() {
  try {
    const resp = await fetch('https://agsi.gie.eu/api?type=eu', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)',
        'x-key': '', // AGSI is public for aggregate EU data
      },
      signal: AbortSignal.timeout(15000),
    });
    const json = await resp.json();

    if (json && Array.isArray(json) && json.length > 0) {
      const latest = json[0];
      return {
        region: 'EU Aggregate',
        current: Math.round(parseFloat(latest.gasInStorage || '0')),
        capacity: Math.round(parseFloat(latest.workingGasVolume || '0')),
        utilizationRate: parseFloat(latest.full || '0'),
        weeklyChange: 0, // would need previous week
        yearAgoLevel: 0,
        fiveYearAvg: 0,
        unit: 'TWh',
        lastUpdated: latest.gasDayStart || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error('AGSI EU storage fetch error:', err);
  }
  return null;
}

// ── Prices from Yahoo Finance ───────────────────────────────────────
async function fetchPrices() {
  const symbols = [
    { symbol: 'NG=F', name: 'henryHub' },
    { symbol: 'TTF=F', name: 'ttf' },
    { symbol: 'JKM=F', name: 'jkm' },
  ];

  const prices: Record<string, { price: number; change: number; prevClose: number }> = {};

  await Promise.all(symbols.map(async ({ symbol, name }) => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
        signal: AbortSignal.timeout(15000),
      });
      const json = await resp.json();
      const meta = json?.chart?.result?.[0]?.meta;
      const closes = json?.chart?.result?.[0]?.indicators?.adjclose?.[0]?.adjclose || [];

      if (meta) {
        // Filter out null closes
        const validCloses = closes.filter((c: number | null) => c !== null && c !== undefined);
        const currentPrice = meta.regularMarketPrice || (validCloses.length > 0 ? validCloses[validCloses.length - 1] : 0);
        const prevClose = meta.chartPreviousClose || (validCloses.length > 1 ? validCloses[validCloses.length - 2] : currentPrice);
        if (currentPrice > 0) {
          prices[name] = {
            price: currentPrice,
            change: currentPrice - prevClose,
            prevClose,
          };
        }
      }
    } catch (err) {
      console.error(`Yahoo price fetch error for ${symbol}:`, err);
    }
  }));

  return {
    henryHub: prices.henryHub?.price || 0,
    henryHubChange: prices.henryHub?.change || 0,
    ttf: prices.ttf?.price || 0,
    ttfChange: prices.ttf?.change || 0,
    jkm: prices.jkm?.price || 0,
    jkmChange: prices.jkm?.change || 0,
    currency: 'USD/MMBtu',
  };
}

// ── LNG from EIA ───────────────────────────────────────────────────
async function fetchLNG(apiKey: string) {
  try {
    // EIA natural gas exports (LNG) - monthly
    const url = `https://api.eia.gov/v2/natural-gas/move/expc/data/?api_key=${apiKey}&frequency=monthly&data[0]=value&facets[process][]=ENG&sort[0][column]=period&sort[0][direction]=desc&length=2`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
      signal: AbortSignal.timeout(15000),
    });
    const json = await resp.json();
    const rows = json?.response?.data || [];

    if (rows.length > 0) {
      const latestExportMMCF = parseFloat(rows[0].value) || 0;
      const period = rows[0].period; // e.g. "2025-12"
      const daysInMonth = new Date(parseInt(period.split('-')[0]), parseInt(period.split('-')[1]), 0).getDate();
      // Convert MMCF/month to BCF/day
      const dailyExportBCF = latestExportMMCF / daysInMonth / 1000;
      // US LNG export capacity ~20.4 Bcf/d as of early 2026 (Sabine Pass, Cameron, Freeport, Corpus Christi, Calcasieu Pass, Plaquemines)
      const capacity = 20.4;
      const utilization = (dailyExportBCF / capacity) * 100;

      return {
        utilization: Math.round(utilization * 10) / 10,
        exports: Math.round(dailyExportBCF * 10) / 10,
        imports: 0,
        capacity,
        unit: 'BCF/d',
        period,
      };
    }
  } catch (err) {
    console.error('EIA LNG fetch error:', err);
  }

  return {
    utilization: 0,
    exports: 0,
    imports: 0,
    capacity: 20.4,
    unit: 'BCF/d',
  };
}

// ── Main handler ────────────────────────────────────────────────────
export async function GET() {
  try {
    if (cache && cache.ver === CACHE_VER && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    const eiaApiKey = EIA_KEY;

    // Fetch all data in parallel
    const [storageUS, storageEU, prices, lng] = await Promise.all([
      eiaApiKey ? fetchEIAStorage(eiaApiKey) : Promise.resolve([]),
      fetchEUStorage(),
      fetchPrices(),
      eiaApiKey ? fetchLNG(eiaApiKey) : Promise.resolve({ utilization: 0, exports: 0, imports: 0, capacity: 20.4, unit: 'BCF/d' }),
    ]);

    // Combine storage: US regions + EU
    const storage = [
      ...storageUS,
      ...(storageEU ? [storageEU] : []),
    ];

    // If no EIA data, use only the first (Lower 48) to keep it clean
    // Show at most: Lower 48, East, South Central, EU
    const displayStorage = storage.length > 0
      ? storage.filter(s => ['US Lower 48', 'East', 'South Central', 'EU Aggregate'].includes(s.region))
      : [];

    const data = {
      storage: displayStorage.length > 0 ? displayStorage : storage,
      lng,
      prices,
      lastUpdated: new Date().toISOString(),
      source: 'EIA / Yahoo Finance / AGSI',
    };

    cache = { data, ts: Date.now(), ver: CACHE_VER };
    return NextResponse.json(data);

  } catch (error) {
    console.error('Natural gas API error:', error);
    return NextResponse.json({ error: 'Failed to fetch natural gas data' }, { status: 502 });
  }
}
