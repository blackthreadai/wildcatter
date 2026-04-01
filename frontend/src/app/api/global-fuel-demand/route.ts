import { NextResponse } from 'next/server';

export const maxDuration = 20;

let cache: { data: unknown; ts: number; ver: number } | null = null;
const CACHE_MS = 6 * 60 * 60 * 1000;
const CACHE_VER = 4; // bump to bust cache on deploy

const FRED_KEY = process.env.FRED_API_KEY || '61cf53e2891a727efe4e48f18f6545f2';
const EIA_KEY = process.env.EIA_API_KEY || 'VhDcsSa1FuMvhz8ZAG5yWQEnGy5xXadKrUOP2qYj';

// ── EIA: US Product Supplied (demand proxy) by product ──────────────
async function fetchUSProductSupplied(apiKey: string) {
  try {
    // Weekly US product supplied - key series for demand
    const url = `https://api.eia.gov/v2/petroleum/sum/sndw/data/?api_key=${apiKey}&frequency=weekly&data[0]=value&facets[duoarea][]=NUS&sort[0][column]=period&sort[0][direction]=desc&length=120`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return [];
    const json = await resp.json();
    return json.response?.data || [];
  } catch { return []; }
}

// ── EIA: International petroleum consumption ────────────────────────
async function fetchIntlConsumption(apiKey: string) {
  try {
    const url = `https://api.eia.gov/v2/international/data/?api_key=${apiKey}&frequency=monthly&data[0]=value&facets[productId][]=PETC&sort[0][column]=period&sort[0][direction]=desc&length=50`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return [];
    const json = await resp.json();
    return json.response?.data || [];
  } catch { return []; }
}

// ── FRED: Economic indicators ───────────────────────────────────────
async function fetchFREDSeries(seriesId: string): Promise<{ value: number; date: string } | null> {
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=2`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return null;
    const json = await resp.json();
    const obs = json.observations?.filter((o: { value: string }) => o.value !== '.');
    if (!obs?.length) return null;
    return { value: parseFloat(obs[0].value), date: obs[0].date };
  } catch { return null; }
}

// ── Yahoo Finance price ─────────────────────────────────────────────
async function fetchYahooPrice(symbol: string) {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return null;
    const json = await resp.json();
    const meta = json.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    return { price: meta.regularMarketPrice, prevClose: meta.chartPreviousClose || meta.previousClose || 0 };
  } catch { return null; }
}

function processProductSupplied(rows: Record<string, string>[]) {
  if (rows.length === 0) return { sectors: {}, period: '', extras: {} };

  const periods = [...new Set(rows.map(r => r.period))].sort().reverse();
  const latestPeriod = periods[0] || '';
  const prevPeriod = periods[1] || '';

  // We need to match by description since the product codes overlap
  interface SectorEntry { current: number; prev: number; unit: string; sector: string; fuelType: string; icon: string }
  const sectors: Record<string, SectorEntry> = {};
  const extras: Record<string, { current: number; prev: number }> = {};

  for (const row of rows) {
    const desc = row['series-description'] || '';
    const val = parseFloat(row.value) || 0;
    const isPeriodCurrent = row.period === latestPeriod;
    const isPeriodPrev = row.period === prevPeriod;

    if (!isPeriodCurrent && !isPeriodPrev) continue;

    // Product Supplied = demand proxy
    if (desc.includes('Product Supplied of Finished Motor Gasoline')) {
      if (!sectors['gas']) sectors['gas'] = { current: 0, prev: 0, unit: 'kbd', sector: 'Road Transport', fuelType: 'Motor Gasoline', icon: '🚗' };
      if (isPeriodCurrent) sectors['gas'].current = val;
      if (isPeriodPrev) sectors['gas'].prev = val;
    } else if (desc.includes('Product Supplied of Distillate Fuel Oil')) {
      if (!sectors['diesel']) sectors['diesel'] = { current: 0, prev: 0, unit: 'kbd', sector: 'Trucking/Heating', fuelType: 'Distillate Fuel Oil', icon: '🚛' };
      if (isPeriodCurrent) sectors['diesel'].current = val;
      if (isPeriodPrev) sectors['diesel'].prev = val;
    }

    // Refinery inputs = throughput indicator
    if (desc.includes('Gross Inputs into Refineries')) {
      if (!extras['refInputs']) extras['refInputs'] = { current: 0, prev: 0 };
      if (isPeriodCurrent) extras['refInputs'].current = val;
      if (isPeriodPrev) extras['refInputs'].prev = val;
    }
    // Crude production
    if (desc.includes('Field Production of Crude Oil')) {
      if (!extras['crudeProd']) extras['crudeProd'] = { current: 0, prev: 0 };
      if (isPeriodCurrent) extras['crudeProd'].current = val;
      if (isPeriodPrev) extras['crudeProd'].prev = val;
    }
  }

  return { sectors, period: latestPeriod, extras };
}

function processIntlConsumption(rows: Record<string, string>[]) {
  if (rows.length === 0) return [];

  const latestPeriod = rows[0]?.period || '';
  const latest = rows.filter(r => r.period === latestPeriod);
  
  // Get top consuming regions
  const regions = latest
    .filter(r => {
      const name = r.countryRegionName || '';
      return ['OECD', 'Non-OECD', 'World'].includes(name) === false && parseFloat(r.value) > 500;
    })
    .map(r => ({
      region: r.countryRegionName || r.countryRegionId || '',
      demand: Math.round(parseFloat(r.value) || 0),
      period: r.period,
    }))
    .sort((a, b) => b.demand - a.demand)
    .slice(0, 8);

  // Get world total
  const worldRow = latest.find(r => (r.countryRegionName || '').toLowerCase().includes('world'));
  const worldTotal = worldRow ? Math.round(parseFloat(worldRow.value) || 0) : 0;

  return { regions, worldTotal, period: latestPeriod };
}

export async function GET() {
  try {
    if (cache && cache.ver === CACHE_VER && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    const eiaKey = EIA_KEY;

    // Fetch all data in parallel
    const [usSupplied, intlData, usPMI, cnPMI, bdi, indProd] = await Promise.all([
      eiaKey ? fetchUSProductSupplied(eiaKey) : Promise.resolve([]),
      eiaKey ? fetchIntlConsumption(eiaKey) : Promise.resolve([]),
      fetchFREDSeries('MANEMP'),    // US Manufacturing Employment (proxy for PMI)
      fetchFREDSeries('BUSLOANS'),   // Business Loans (economic activity)
      fetchYahooPrice('BDIY.SI'),    // Baltic Dry Index (not on Yahoo - will try)
      fetchFREDSeries('INDPRO'),     // US Industrial Production
    ]);

    const usData = processProductSupplied(usSupplied);
    const intl = Array.isArray(intlData) ? processIntlConsumption(intlData) : { regions: [], worldTotal: 0, period: '' };

    // Build sector demand from US product supplied
    const sectorOrder = ['gas', 'diesel'];

    const sectorDemand = sectorOrder
      .filter(k => usData.sectors[k]?.current > 0)
      .map(k => {
        const s = usData.sectors[k];
        const change = s.prev > 0 ? Math.round(((s.current - s.prev) / s.prev) * 1000) / 10 : 0;
        return {
          sector: s.sector,
          fuelType: s.fuelType,
          currentDemand: Math.round(s.current),
          unit: 'kbd',
          change,
          icon: s.icon,
          region: 'United States',
        };
      });

    // Add refinery/production extras as additional indicators
    const ex = usData.extras;
    if (ex['refInputs']?.current) {
      sectorDemand.push({
        sector: 'Refinery Throughput', fuelType: 'Gross Inputs',
        currentDemand: Math.round(ex['refInputs'].current), unit: 'kbd',
        change: ex['refInputs'].prev > 0 ? Math.round(((ex['refInputs'].current - ex['refInputs'].prev) / ex['refInputs'].prev) * 1000) / 10 : 0,
        icon: '🏭', region: 'United States',
      });
    }
    if (ex['crudeProd']?.current) {
      sectorDemand.push({
        sector: 'Crude Production', fuelType: 'Field Production',
        currentDemand: Math.round(ex['crudeProd'].current), unit: 'kbd',
        change: ex['crudeProd'].prev > 0 ? Math.round(((ex['crudeProd'].current - ex['crudeProd'].prev) / ex['crudeProd'].prev) * 1000) / 10 : 0,
        icon: '🛢️', region: 'United States',
      });
    }

    // Economic indicators from FRED
    const economicIndicators = [];
    if (indProd) {
      const change = 0; // Would need previous value
      economicIndicators.push({
        name: 'US Industrial Production Index',
        value: Math.round(indProd.value * 10) / 10,
        change,
        impact: indProd.value > 100 ? 'Positive' : 'Negative',
        description: 'Index of real output for manufacturing, mining, utilities',
        date: indProd.date,
      });
    }

    // Build regional summary from international data
    const regionalSummary = Array.isArray(intl) ? [] : (intl.regions || []).map((r: { region: string; demand: number }) => ({
      region: r.region,
      totalDemand: r.demand,
      unit: 'kbd',
    }));

    // Market summary - sum gasoline + distillate for US demand
    const totalUS = (usData.sectors['gas']?.current || 0) + (usData.sectors['diesel']?.current || 0);
    const prevTotalUS = (usData.sectors['gas']?.prev || 0) + (usData.sectors['diesel']?.prev || 0);
    const usChange = prevTotalUS > 0 ? Math.round(((totalUS - prevTotalUS) / prevTotalUS) * 1000) / 10 : 0;

    const demandOnly = sectorDemand.filter(s => !['Refinery Throughput', 'Crude Production'].includes(s.sector));
    const strongestSector = demandOnly.length > 0 ? demandOnly.reduce(
      (max, s) => s.change > max.change ? s : max, demandOnly[0]
    ) : { sector: '' };
    const weakestSector = demandOnly.length > 1 ? demandOnly.reduce(
      (min, s) => s.change < min.change ? s : min, demandOnly[0]
    ) : { sector: '' };

    const data = {
      sectorDemand,
      economicIndicators,
      regionalSummary,
      marketSummary: {
        globalDemand: (intl && !Array.isArray(intl)) ? intl.worldTotal : 0,
        usDemand: totalUS,
        weeklyChange: usChange,
        strongestSector: strongestSector.sector || '',
        weakestSector: weakestSector.sector || '',
        period: usData.period,
        intlPeriod: (intl && !Array.isArray(intl)) ? intl.period : '',
      },
      lastUpdated: new Date().toISOString(),
      source: 'EIA Weekly Petroleum Status Report, FRED',
    };

    cache = { data, ts: Date.now(), ver: CACHE_VER };
    return NextResponse.json(data);

  } catch (error) {
    console.error('Global fuel demand error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fuel demand data: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 502 },
    );
  }
}
