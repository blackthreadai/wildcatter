import { NextResponse } from 'next/server';

export const maxDuration = 30;

let cache: { data: unknown; ts: number } | null = null;
const CACHE_MS = 4 * 60 * 60 * 1000;

const EIA_BASE = 'https://api.eia.gov/v2';

const PADD_NAMES: Record<string, string> = {
  'R10': 'East Coast (PADD 1)',
  'R20': 'Midwest (PADD 2)',
  'R30': 'Gulf Coast (PADD 3)',
  'R40': 'Rocky Mountain (PADD 4)',
  'R50': 'West Coast (PADD 5)',
  'NUS': 'United States',
};

async function fetchEIAData(apiKey: string) {
  // Fetch all regions in one call - get 200 rows to cover 2 weeks of all regions
  const url = `${EIA_BASE}/petroleum/pnp/wiup/data/?api_key=${apiKey}&frequency=weekly&data[0]=value&facets[duoarea][]=NUS&facets[duoarea][]=R10&facets[duoarea][]=R20&facets[duoarea][]=R30&facets[duoarea][]=R40&facets[duoarea][]=R50&sort[0][column]=period&sort[0][direction]=desc&length=200`;

  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
    signal: AbortSignal.timeout(10000),
  });

  if (!resp.ok) throw new Error(`EIA API: ${resp.status}`);
  const json = await resp.json();
  if (json.error) throw new Error(json.error.message || 'EIA API error');
  return json.response?.data || [];
}

function processData(rows: Record<string, string>[]) {
  // Key process codes:
  // YUP = Percent Utilization
  // YIY + product EPXXX2 = Gross Inputs (thousand bbl/day)
  // YRL = Operable Capacity (thousand bbl/calendar day)
  // YIY + product EPC0 = Crude Oil Net Input

  // Group by area -> process type -> sorted by period desc
  const areas = ['NUS', 'R10', 'R20', 'R30', 'R40', 'R50'];

  interface AreaData {
    utilizationPct: number;
    prevUtilizationPct: number;
    grossInputs: number;
    prevGrossInputs: number;
    operableCapacity: number;
    crudeInputs: number;
    period: string;
  }

  const result: Record<string, AreaData> = {};

  for (const area of areas) {
    const areaRows = rows.filter(r => r.duoarea === area);

    // Utilization % (process = YUP)
    const utilRows = areaRows
      .filter(r => r.process === 'YUP')
      .sort((a, b) => b.period.localeCompare(a.period));

    // Gross inputs (process = YIY, product = EPXXX2)
    const inputRows = areaRows
      .filter(r => r.process === 'YIY' && r.product === 'EPXXX2')
      .sort((a, b) => b.period.localeCompare(a.period));

    // Operable capacity (process = YRL)
    const capRows = areaRows
      .filter(r => r.process === 'YRL')
      .sort((a, b) => b.period.localeCompare(a.period));

    // Crude oil input (process = YIY, product = EPC0)
    const crudeRows = areaRows
      .filter(r => r.process === 'YIY' && r.product === 'EPC0')
      .sort((a, b) => b.period.localeCompare(a.period));

    result[area] = {
      utilizationPct: parseFloat(utilRows[0]?.value) || 0,
      prevUtilizationPct: parseFloat(utilRows[1]?.value) || 0,
      grossInputs: Math.round(parseFloat(inputRows[0]?.value) || 0),
      prevGrossInputs: Math.round(parseFloat(inputRows[1]?.value) || 0),
      operableCapacity: Math.round(parseFloat(capRows[0]?.value) || 0),
      crudeInputs: Math.round(parseFloat(crudeRows[0]?.value) || 0),
      period: utilRows[0]?.period || inputRows[0]?.period || '',
    };
  }

  const national = result['NUS'] || {} as AreaData;
  const offlineCapacity = national.operableCapacity > 0 && national.utilizationPct > 0
    ? Math.round(national.operableCapacity * (1 - national.utilizationPct / 100))
    : 0;

  const regions = areas
    .filter(a => a !== 'NUS')
    .map(a => ({
      region: PADD_NAMES[a] || a,
      paddId: a,
      ...result[a],
    }));

  // Detect utilization drops > 2% WoW as potential outage signals
  const alerts = regions
    .filter(r => r.utilizationPct > 0 && r.prevUtilizationPct > 0)
    .filter(r => r.prevUtilizationPct - r.utilizationPct > 2)
    .map(r => ({
      region: r.region,
      drop: Math.round((r.prevUtilizationPct - r.utilizationPct) * 10) / 10,
      currentUtil: r.utilizationPct,
      estimatedOffline: Math.round(r.operableCapacity * (r.prevUtilizationPct - r.utilizationPct) / 100),
    }));

  return {
    national: {
      utilizationPct: national.utilizationPct,
      prevUtilizationPct: national.prevUtilizationPct,
      grossInputs: national.grossInputs,
      crudeInputs: national.crudeInputs,
      operableCapacity: national.operableCapacity,
      estimatedOfflineCapacity: offlineCapacity,
      period: national.period,
    },
    regions,
    alerts,
    reportPeriod: national.period,
  };
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    const apiKey = process.env.EIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'EIA API key not configured' }, { status: 502 });
    }

    const raw = await fetchEIAData(apiKey);
    if (!raw || raw.length === 0) {
      return NextResponse.json({ error: 'No refinery data returned from EIA' }, { status: 502 });
    }

    const processed = processData(raw);

    if (processed.national.utilizationPct === 0) {
      return NextResponse.json({ error: 'Failed to parse refinery utilization data' }, { status: 502 });
    }

    const data = {
      ...processed,
      lastUpdated: new Date().toISOString(),
      source: 'EIA Weekly Petroleum Status Report',
    };

    cache = { data, ts: Date.now() };
    return NextResponse.json(data);

  } catch (error) {
    console.error('Refinery outages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch refinery data: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 502 },
    );
  }
}
