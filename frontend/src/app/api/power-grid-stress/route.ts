import { NextResponse } from 'next/server';

// Cache for 15 minutes (grid data is hourly)
let cache: { data: unknown; ts: number } | null = null;
const CACHE_MS = 15 * 60 * 1000;

// Major US ISOs/RTOs with approximate peak capacity (MW)
const GRID_REGIONS = [
  { id: 'ERCO', name: 'ERCOT (Texas)', peakCapacity: 85000 },
  { id: 'PJM', name: 'PJM (Mid-Atlantic)', peakCapacity: 165000 },
  { id: 'MISO', name: 'MISO (Midwest)', peakCapacity: 127000 },
  { id: 'CISO', name: 'CAISO (California)', peakCapacity: 52000 },
  { id: 'NYIS', name: 'NYISO (New York)', peakCapacity: 33000 },
  { id: 'ISNE', name: 'ISO-NE (New England)', peakCapacity: 26000 },
  { id: 'SWPP', name: 'SPP (South Central)', peakCapacity: 54000 },
];

function getStatus(utilization: number): 'Normal' | 'Watch' | 'Warning' | 'Emergency' {
  if (utilization >= 90) return 'Emergency';
  if (utilization >= 80) return 'Warning';
  if (utilization >= 70) return 'Watch';
  return 'Normal';
}

async function fetchGridData(apiKey: string) {
  const respondentFacets = GRID_REGIONS.map(r => `&facets[respondent][]=${r.id}`).join('');

  // Fetch demand (D), demand forecast (DF), and net generation (NG)
  const url = `https://api.eia.gov/v2/electricity/rto/region-data/data/?api_key=${apiKey}&frequency=hourly&data[0]=value${respondentFacets}&sort[0][column]=period&sort[0][direction]=desc&length=100`;

  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
    signal: AbortSignal.timeout(12000),
  });

  if (!resp.ok) throw new Error(`EIA RTO API returned ${resp.status}`);
  const json = await resp.json();
  const rows = json?.response?.data || [];

  if (rows.length === 0) throw new Error('No grid data returned from EIA');

  // Group by respondent, get latest D, DF, NG for each
  const latest: Record<string, { D?: number; DF?: number; NG?: number; period?: string }> = {};

  for (const row of rows) {
    const resp = row.respondent;
    const type = row.type; // D, DF, NG
    const value = parseFloat(row.value);
    if (isNaN(value)) continue;

    if (!latest[resp]) latest[resp] = {};
    // Only take the first (most recent) of each type
    if (!latest[resp][type as 'D' | 'DF' | 'NG']) {
      latest[resp][type as 'D' | 'DF' | 'NG'] = value;
      if (!latest[resp].period || row.period > latest[resp].period!) {
        latest[resp].period = row.period;
      }
    }
  }

  const grids = [];
  const alerts = [];

  for (const region of GRID_REGIONS) {
    const data = latest[region.id];
    if (!data) continue;

    // Use actual demand if available, otherwise forecast
    const currentLoad = data.D || data.DF || 0;
    if (currentLoad === 0) continue;

    const netGen = data.NG || 0;
    const utilization = (currentLoad / region.peakCapacity) * 100;
    const reserves = netGen > 0 ? netGen - currentLoad : region.peakCapacity - currentLoad;
    const status = getStatus(utilization);

    grids.push({
      region: region.name,
      currentLoad: Math.round(currentLoad),
      peakCapacity: region.peakCapacity,
      utilizationRate: Math.round(utilization * 10) / 10,
      status,
      reserves: Math.round(reserves),
      netGeneration: netGen > 0 ? Math.round(netGen) : undefined,
      forecast: data.DF ? Math.round(data.DF) : undefined,
      lastUpdated: data.period || '',
      dataType: data.D ? 'actual' : 'forecast',
    });

    // Generate alerts for stressed grids
    if (status === 'Emergency') {
      alerts.push({
        region: region.name,
        severity: 'Critical' as const,
        message: `Grid utilization at ${utilization.toFixed(1)}% - emergency conditions`,
        timestamp: data.period || '',
      });
    } else if (status === 'Warning') {
      alerts.push({
        region: region.name,
        severity: 'High' as const,
        message: `Grid utilization at ${utilization.toFixed(1)}% - conservation may be needed`,
        timestamp: data.period || '',
      });
    }
  }

  // Sort by utilization (highest stress first)
  grids.sort((a, b) => b.utilizationRate - a.utilizationRate);

  return { grids, alerts };
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    let eiaApiKey: string | undefined;
    try { eiaApiKey = process.env.EIA_API_KEY || 'VhDcsSa1FuMvhz8ZAG5yWQEnGy5xXadKrUOP2qYj'; } catch { /* */ }

    if (!eiaApiKey) {
      return NextResponse.json({ error: 'EIA API key not configured' }, { status: 502 });
    }

    const { grids, alerts } = await fetchGridData(eiaApiKey);

    if (grids.length === 0) {
      return NextResponse.json({ error: 'No grid data available' }, { status: 502 });
    }

    const data = {
      grids,
      alerts,
      lastUpdated: new Date().toISOString(),
      source: 'EIA Electricity Grid Monitor (Hourly)',
    };

    cache = { data, ts: Date.now() };
    return NextResponse.json(data);

  } catch (error) {
    console.error('Power grid stress API error:', error);
    return NextResponse.json({ error: 'Failed to fetch power grid data' }, { status: 502 });
  }
}
