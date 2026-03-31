import { NextResponse } from 'next/server';

export const maxDuration = 20;

let cache: { data: unknown; ts: number } | null = null;
const CACHE_MS = 6 * 60 * 60 * 1000;

const FRED_KEY = process.env.FRED_API_KEY || '61cf53e2891a727efe4e48f18f6545f2';

// ── EIA: US Product Supplied (demand proxy) by product ──────────────
async function fetchUSProductSupplied(apiKey: string) {
  try {
    // Weekly US product supplied - key series for demand
    const url = `https://api.eia.gov/v2/petroleum/sum/sndw/data/?api_key=${apiKey}&frequency=weekly&data[0]=value&facets[duoarea][]=NUS&sort[0][column]=period&sort[0][direction]=desc&length=50`;
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
  // Key product codes for demand sectors
  const productMap: Record<string, { sector: string; fuelType: string }> = {
    'EPJK': { sector: 'Aviation', fuelType: 'Jet Fuel' },
    'EPD2DXL0': { sector: 'Trucking', fuelType: 'Diesel' },
    'EPM0F': { sector: 'Shipping', fuelType: 'Residual Fuel Oil' },
    'EPMRU': { sector: 'Gasoline Demand', fuelType: 'Motor Gasoline' },
    'EPPK': { sector: 'Propane Demand', fuelType: 'Propane' },
    'EPLLPZ': { sector: 'NGL Demand', fuelType: 'NGL/LPG' },
  };

  // Also look for total product supplied
  const sectors: Record<string, { current: number; prev: number; unit: string; sector: string; fuelType: string }> = {};

  const latestPeriod = rows[0]?.period || '';
  const periods = [...new Set(rows.map(r => r.period))].sort().reverse();

  for (const row of rows) {
    const product = row.product || '';
    const desc = (row['series-description'] || '').toLowerCase();
    const val = parseFloat(row.value) || 0;
    if (val <= 0) continue;

    let key = '';
    let sector = '';
    let fuelType = '';

    if (desc.includes('kerosene-type jet fuel') && desc.includes('product supplied')) {
      key = 'jet'; sector = 'Aviation'; fuelType = 'Jet Fuel';
    } else if (desc.includes('distillate fuel oil') && desc.includes('product supplied')) {
      key = 'diesel'; sector = 'Trucking/Heating'; fuelType = 'Distillate';
    } else if (desc.includes('residual fuel oil') && desc.includes('product supplied')) {
      key = 'resid'; sector = 'Shipping/Industrial'; fuelType = 'Residual Fuel Oil';
    } else if (desc.includes('total motor gasoline') && desc.includes('product supplied')) {
      key = 'gas'; sector = 'Road Transport'; fuelType = 'Motor Gasoline';
    } else if (desc.includes('total petroleum') && desc.includes('product supplied') && !desc.includes('excluding')) {
      key = 'total'; sector = 'Total Petroleum'; fuelType = 'All Products';
    } else if (desc.includes('propane') && desc.includes('product supplied')) {
      key = 'propane'; sector = 'Petrochemical/Heating'; fuelType = 'Propane';
    }

    if (!key) continue;

    if (row.period === latestPeriod) {
      if (!sectors[key]) sectors[key] = { current: 0, prev: 0, unit: 'kbd', sector, fuelType };
      sectors[key].current = val;
    } else if (periods.length >= 2 && row.period === periods[1]) {
      if (!sectors[key]) sectors[key] = { current: 0, prev: 0, unit: 'kbd', sector, fuelType };
      sectors[key].prev = val;
    }
  }

  return { sectors, period: latestPeriod };
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
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    const eiaKey = process.env.EIA_API_KEY;

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
    const sectorOrder = ['total', 'gas', 'diesel', 'jet', 'propane', 'resid'];
    const sectorIcons: Record<string, string> = {
      total: '🛢️', gas: '🚗', diesel: '🚛', jet: '✈️', propane: '🏭', resid: '🚢',
    };

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
          icon: sectorIcons[k] || '⚪',
          region: 'United States',
        };
      });

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

    // Market summary
    const totalUS = usData.sectors['total']?.current || 0;
    const prevTotalUS = usData.sectors['total']?.prev || 0;
    const usChange = prevTotalUS > 0 ? Math.round(((totalUS - prevTotalUS) / prevTotalUS) * 1000) / 10 : 0;

    const strongestSector = sectorDemand.filter(s => s.sector !== 'Total Petroleum').reduce(
      (max, s) => s.change > max.change ? s : max, { sector: '', change: -999, fuelType: '', currentDemand: 0, unit: '', icon: '', region: '' }
    );
    const weakestSector = sectorDemand.filter(s => s.sector !== 'Total Petroleum').reduce(
      (min, s) => s.change < min.change ? s : min, { sector: '', change: 999, fuelType: '', currentDemand: 0, unit: '', icon: '', region: '' }
    );

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

    cache = { data, ts: Date.now() };
    return NextResponse.json(data);

  } catch (error) {
    console.error('Global fuel demand error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fuel demand data: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 502 },
    );
  }
}
