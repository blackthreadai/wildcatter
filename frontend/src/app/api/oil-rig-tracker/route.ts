import { NextResponse } from 'next/server';

// Cache for 12 hours (Baker Hughes updates weekly on Fridays)
let cache: { data: unknown; ts: number } | null = null;
const CACHE_MS = 12 * 60 * 60 * 1000;

// ── EIA Drilling Productivity Report - Rig Counts by Basin ──────────
async function fetchDPRRigCounts(apiKey: string): Promise<{ basins: { basin: string; rigs: number; change: number; percentage: number; period: string }[]; totalRigs: number; totalChange: number; period: string }> {
  // EIA DPR provides monthly rig counts per shale play
  const basins = [
    { id: 'Permian Region', label: 'Permian' },
    { id: 'Eagle Ford Region', label: 'Eagle Ford' },
    { id: 'Bakken Region', label: 'Bakken' },
    { id: 'Niobrara Region', label: 'DJ-Niobrara' },
    { id: 'Anadarko Region', label: 'Anadarko' },
    { id: 'Appalachia Region', label: 'Appalachia' },
    { id: 'Haynesville Region', label: 'Haynesville' },
  ];

  try {
    // DPR data: petroleum/dril/dpr/data with facets
    const url = `https://api.eia.gov/v2/petroleum/dril/dpr/data/?api_key=${apiKey}&frequency=monthly&data[0]=value&facets[unit][]=rigs&sort[0][column]=period&sort[0][direction]=desc&length=100`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    const json = await resp.json();
    const rows = json?.response?.data || [];

    if (rows.length === 0) return { basins: [], totalRigs: 0, totalChange: 0, period: '' };

    // Group by region, get latest + previous month
    const grouped: Record<string, { value: number; period: string }[]> = {};
    for (const row of rows) {
      const region = row['series-description'] || row.duoarea || '';
      if (!grouped[region]) grouped[region] = [];
      grouped[region].push({ value: parseFloat(row.value), period: row.period });
    }

    const results = [];
    let totalRigs = 0;
    let totalChange = 0;

    for (const { id, label } of basins) {
      // Find matching region in grouped data
      const regionKey = Object.keys(grouped).find(k => k.includes(id) || k.includes(label));
      if (!regionKey) continue;

      const entries = grouped[regionKey];
      if (entries.length === 0) continue;

      const current = entries[0].value;
      const prev = entries.length > 1 ? entries[1].value : current;
      const change = Math.round(current - prev);

      totalRigs += current;
      totalChange += change;

      results.push({
        basin: label,
        rigs: Math.round(current),
        change,
        period: entries[0].period,
      });
    }

    // Calculate percentages
    const withPct = results.map(r => ({
      ...r,
      percentage: totalRigs > 0 ? Math.round((r.rigs / totalRigs) * 1000) / 10 : 0,
    }));

    // Sort by rig count descending
    withPct.sort((a, b) => b.rigs - a.rigs);

    return { basins: withPct, totalRigs: Math.round(totalRigs), totalChange, period: results[0]?.period || '' };
  } catch (err) {
    console.error('EIA DPR fetch error:', err);
    return { basins: [], totalRigs: 0, totalChange: 0, period: '' };
  }
}

// ── EIA Weekly US Crude Oil + Natural Gas Rotary Rig Counts ─────────
async function fetchWeeklyRigCount(apiKey: string) {
  try {
    // Try petroleum summary/rotary rig counts
    const url = `https://api.eia.gov/v2/petroleum/dril/rig-count/data/?api_key=${apiKey}&frequency=weekly&data[0]=value&sort[0][column]=period&sort[0][direction]=desc&length=20`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    const json = await resp.json();
    const rows = json?.response?.data || [];

    if (rows.length === 0) return null;

    // Parse out oil vs gas vs total
    const latest: Record<string, { value: number; period: string }> = {};
    const previous: Record<string, { value: number; period: string }> = {};

    for (const row of rows) {
      const series = row.series || '';
      const desc = (row['series-description'] || '').toLowerCase();
      let key = 'unknown';
      if (desc.includes('oil') && !desc.includes('gas')) key = 'oil';
      else if (desc.includes('gas') && !desc.includes('oil')) key = 'gas';
      else if (desc.includes('total')) key = 'total';

      if (!latest[key]) {
        latest[key] = { value: parseFloat(row.value), period: row.period };
      } else if (!previous[key]) {
        previous[key] = { value: parseFloat(row.value), period: row.period };
      }
    }

    return {
      oil: latest.oil?.value || 0,
      gas: latest.gas?.value || 0,
      total: latest.total?.value || (latest.oil?.value || 0) + (latest.gas?.value || 0),
      weeklyChange: latest.total && previous.total
        ? Math.round(latest.total.value - previous.total.value)
        : 0,
      period: latest.total?.period || latest.oil?.period || '',
    };
  } catch (err) {
    console.error('EIA weekly rig count fetch error:', err);
    return null;
  }
}

// ── International Rig Count from EIA ────────────────────────────────
async function fetchInternationalRigs(apiKey: string) {
  try {
    // EIA international petroleum data for rig counts
    const url = `https://api.eia.gov/v2/international/data/?api_key=${apiKey}&frequency=monthly&data[0]=value&facets[productId][]=RIG&sort[0][column]=period&sort[0][direction]=desc&length=50`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    const json = await resp.json();
    const rows = json?.response?.data || [];

    if (rows.length === 0) return [];

    // Get latest per country
    const latest: Record<string, { value: number; period: string; name: string }> = {};
    for (const row of rows) {
      const id = row.countryRegionId;
      if (!id || latest[id]) continue;
      latest[id] = {
        value: parseFloat(row.value),
        period: row.period,
        name: row.countryRegionName || id,
      };
    }

    return Object.values(latest)
      .filter(r => r.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map(r => ({
        region: r.name,
        total: Math.round(r.value),
        period: r.period,
      }));
  } catch (err) {
    console.error('EIA international rig count fetch error:', err);
    return [];
  }
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    let eiaApiKey: string | undefined;
    try { eiaApiKey = process.env.EIA_API_KEY; } catch { /* */ }

    if (!eiaApiKey) {
      return NextResponse.json({ error: 'EIA API key not configured' }, { status: 502 });
    }

    const [dpr, weekly, international] = await Promise.all([
      fetchDPRRigCounts(eiaApiKey),
      fetchWeeklyRigCount(eiaApiKey),
      fetchInternationalRigs(eiaApiKey),
    ]);

    // Need at least some data to be useful
    if ((!dpr || dpr.basins.length === 0) && !weekly) {
      return NextResponse.json({ error: 'Failed to fetch rig count data from EIA' }, { status: 502 });
    }

    const data = {
      usTotals: weekly || {
        oil: 0,
        gas: 0,
        total: dpr?.totalRigs || 0,
        weeklyChange: 0,
        period: dpr?.period || '',
      },
      basins: dpr?.basins || [],
      international,
      lastUpdated: new Date().toISOString(),
      source: 'EIA Drilling Productivity Report / Baker Hughes',
    };

    cache = { data, ts: Date.now() };
    return NextResponse.json(data);

  } catch (error) {
    console.error('Oil rig tracker API error:', error);
    return NextResponse.json({ error: 'Failed to fetch rig count data' }, { status: 502 });
  }
}
