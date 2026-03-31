import { NextResponse } from 'next/server';

export const maxDuration = 30;

// Cache for 4 hours
let cache: { data: unknown; ts: number } | null = null;
const CACHE_MS = 4 * 60 * 60 * 1000;

const EIA_BASE = 'https://api.eia.gov/v2';

interface PADDData {
  region: string;
  paddId: string;
  utilizationPct: number;
  prevUtilizationPct: number;
  grossInputs: number; // thousand bbl/day
  prevGrossInputs: number;
  operableCapacity: number;
  period: string;
}

// PADD regions and their approximate operable capacities (EIA Jan 2026 data, thousand bbl/day)
const PADD_INFO: Record<string, { name: string; capacity: number }> = {
  'R10': { name: 'East Coast (PADD 1)', capacity: 1179 },
  'R20': { name: 'Midwest (PADD 2)', capacity: 4159 },
  'R30': { name: 'Gulf Coast (PADD 3)', capacity: 10262 },
  'R40': { name: 'Rocky Mountain (PADD 4)', capacity: 696 },
  'R50': { name: 'West Coast (PADD 5)', capacity: 2630 },
};

async function fetchEIAData(apiKey: string) {
  // Fetch weekly refinery utilization and inputs by PADD
  // EIA series: petroleum/pnp/wiup/data
  // Facets: duoarea (NUS=National, R10-R50=PADD regions)
  // Products: utilization % and gross inputs

  const url = `${EIA_BASE}/petroleum/pnp/wiup/data/?api_key=${apiKey}&frequency=weekly&data[0]=value&facets[duoarea][]=NUS&facets[duoarea][]=R10&facets[duoarea][]=R20&facets[duoarea][]=R30&facets[duoarea][]=R40&facets[duoarea][]=R50&sort[0][column]=period&sort[0][direction]=desc&length=100`;

  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
    signal: AbortSignal.timeout(10000),
  });

  if (!resp.ok) throw new Error(`EIA API: ${resp.status}`);
  const json = await resp.json();

  if (json.error) throw new Error(json.error.message || 'EIA API error');

  return json.response?.data || [];
}

async function fetchCapacityData(apiKey: string) {
  // Monthly operable capacity: petroleum/pnp/cap1/data
  try {
    const url = `${EIA_BASE}/petroleum/pnp/cap1/data/?api_key=${apiKey}&frequency=monthly&data[0]=value&facets[duoarea][]=NUS&facets[duoarea][]=R10&facets[duoarea][]=R20&facets[duoarea][]=R30&facets[duoarea][]=R40&facets[duoarea][]=R50&sort[0][column]=period&sort[0][direction]=desc&length=12`;

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

function processData(raw: Record<string, string>[], capacityRaw: Record<string, string>[]) {
  // Group by region and get latest 2 weeks
  const byRegion: Record<string, Record<string, string>[]> = {};
  for (const row of raw) {
    const area = row.duoarea;
    if (!byRegion[area]) byRegion[area] = [];
    byRegion[area].push(row);
  }

  // Get capacity data
  const capacityByRegion: Record<string, number> = {};
  for (const row of capacityRaw) {
    const area = row.duoarea;
    if (!capacityByRegion[area]) {
      capacityByRegion[area] = parseFloat(row.value) || 0;
    }
  }

  const padds: PADDData[] = [];
  let nationalUtil = 0, nationalPrevUtil = 0, nationalInputs = 0, nationalPrevInputs = 0;
  let nationalCapacity = 0;
  let reportPeriod = '';

  for (const [paddId, info] of Object.entries(PADD_INFO)) {
    const rows = byRegion[paddId] || [];

    // Separate utilization % rows from input rows
    const utilRows = rows.filter(r =>
      (r['series-description'] || r.process || '').toLowerCase().includes('utilization') ||
      (r.series || '').includes('WPUL')
    );
    const inputRows = rows.filter(r =>
      (r['series-description'] || r.process || '').toLowerCase().includes('input') ||
      (r.series || '').includes('_FPF_') || (r.series || '').includes('_YPT_')
    );

    // If we can't separate, try by value range (utilization is 0-100%, inputs are thousands)
    let latestUtil = 0, prevUtil = 0, latestInputs = 0, prevInputs = 0;

    if (utilRows.length >= 2) {
      latestUtil = parseFloat(utilRows[0].value) || 0;
      prevUtil = parseFloat(utilRows[1].value) || 0;
    } else if (rows.length >= 2) {
      // Heuristic: values < 110 are likely utilization %, values > 110 are inputs
      const vals = rows.map(r => ({ ...r, val: parseFloat(r.value) || 0 }));
      const utilLike = vals.filter(v => v.val > 0 && v.val <= 100);
      const inputLike = vals.filter(v => v.val > 100);

      if (utilLike.length >= 2) {
        latestUtil = utilLike[0].val;
        prevUtil = utilLike[1].val;
      }
      if (inputLike.length >= 2) {
        latestInputs = inputLike[0].val;
        prevInputs = inputLike[1].val;
      }
    }

    if (inputRows.length >= 2) {
      latestInputs = parseFloat(inputRows[0].value) || 0;
      prevInputs = parseFloat(inputRows[1].value) || 0;
    }

    if (!reportPeriod && rows.length > 0) {
      reportPeriod = rows[0].period;
    }

    const capacity = capacityByRegion[paddId] || info.capacity;

    padds.push({
      region: info.name,
      paddId,
      utilizationPct: Math.round(latestUtil * 10) / 10,
      prevUtilizationPct: Math.round(prevUtil * 10) / 10,
      grossInputs: Math.round(latestInputs),
      prevGrossInputs: Math.round(prevInputs),
      operableCapacity: capacity,
      period: rows[0]?.period || '',
    });
  }

  // National data
  const nusRows = byRegion['NUS'] || [];
  if (nusRows.length >= 2) {
    const vals = nusRows.map(r => parseFloat(r.value) || 0);
    const utilLike = vals.filter(v => v > 0 && v <= 100);
    const inputLike = vals.filter(v => v > 100);
    if (utilLike.length >= 2) { nationalUtil = utilLike[0]; nationalPrevUtil = utilLike[1]; }
    if (inputLike.length >= 2) { nationalInputs = inputLike[0]; nationalPrevInputs = inputLike[1]; }
  }
  nationalCapacity = capacityByRegion['NUS'] || Object.values(PADD_INFO).reduce((s, p) => s + p.capacity, 0);

  // Calculate estimated offline capacity
  const offlineCapacity = nationalCapacity > 0 && nationalUtil > 0
    ? Math.round(nationalCapacity * (1 - nationalUtil / 100))
    : 0;

  // Flag regions with significant utilization drops (potential outages)
  const alerts = padds
    .filter(p => p.utilizationPct > 0 && p.prevUtilizationPct > 0)
    .filter(p => p.prevUtilizationPct - p.utilizationPct > 2)
    .map(p => ({
      region: p.region,
      drop: Math.round((p.prevUtilizationPct - p.utilizationPct) * 10) / 10,
      currentUtil: p.utilizationPct,
      estimatedOffline: Math.round(p.operableCapacity * (p.prevUtilizationPct - p.utilizationPct) / 100),
    }));

  return {
    national: {
      utilizationPct: Math.round(nationalUtil * 10) / 10,
      prevUtilizationPct: Math.round(nationalPrevUtil * 10) / 10,
      grossInputs: Math.round(nationalInputs),
      operableCapacity: nationalCapacity,
      estimatedOfflineCapacity: offlineCapacity,
      period: reportPeriod,
    },
    regions: padds,
    alerts,
    reportPeriod,
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

    const [raw, capacityRaw] = await Promise.all([
      fetchEIAData(apiKey),
      fetchCapacityData(apiKey),
    ]);

    if (!raw || raw.length === 0) {
      return NextResponse.json({ error: 'No refinery data returned from EIA' }, { status: 502 });
    }

    const processed = processData(raw, capacityRaw);

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
