import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// Cache for 12 hours (Baker Hughes updates weekly on Fridays)
let cache: { data: unknown; ts: number } | null = null;
const CACHE_MS = 12 * 60 * 60 * 1000;

const REGIONS = ['Permian', 'Eagle Ford', 'Bakken', 'Niobrara', 'Anadarko', 'Appalachia', 'Haynesville'];

// ── Download and parse EIA DPR Excel ────────────────────────────────
async function fetchDPRData() {
  const resp = await fetch('https://www.eia.gov/petroleum/drilling/xls/dpr-data.xlsx', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) throw new Error(`DPR download failed: ${resp.status}`);

  const buffer = await resp.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const basins: { basin: string; rigs: number; change: number; percentage: number; period: string }[] = [];
  let totalRigs = 0;

  for (const region of REGIONS) {
    const sheetName = wb.SheetNames.find(s => s.includes(region));
    if (!sheetName) continue;

    const ws = wb.Sheets[sheetName];
    const rows: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // Column B (index 1) is "Rig count", Column A (index 0) is date
    // Find the header row to confirm
    let rigColIdx = 1; // default
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const row = rows[i];
      if (row) {
        for (let j = 0; j < row.length; j++) {
          if (String(row[j]).toLowerCase().includes('rig count')) {
            rigColIdx = j;
            break;
          }
        }
      }
    }

    // Find the last row with a rig count value
    let latestRigs = 0;
    let prevRigs = 0;
    let latestPeriod = '';

    for (let i = rows.length - 1; i >= 2; i--) {
      const row = rows[i];
      if (!row) continue;
      const rigVal = row[rigColIdx];
      if (rigVal !== null && rigVal !== undefined && rigVal !== '' && !isNaN(Number(rigVal))) {
        if (latestRigs === 0) {
          latestRigs = Number(rigVal);
          // Parse date from column A
          const dateVal = row[0];
          if (dateVal) {
            if (typeof dateVal === 'number') {
              // Excel serial date
              const d = XLSX.SSF.parse_date_code(dateVal);
              latestPeriod = `${d.y}-${String(d.m).padStart(2, '0')}`;
            } else {
              const d = new Date(String(dateVal));
              if (!isNaN(d.getTime())) {
                latestPeriod = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              }
            }
          }
        } else {
          prevRigs = Number(rigVal);
          break;
        }
      }
    }

    if (latestRigs > 0) {
      basins.push({
        basin: region,
        rigs: Math.round(latestRigs),
        change: Math.round(latestRigs - prevRigs),
        percentage: 0,
        period: latestPeriod,
      });
      totalRigs += latestRigs;
    }
  }

  // Calculate percentages
  for (const b of basins) {
    b.percentage = totalRigs > 0 ? Math.round((b.rigs / totalRigs) * 1000) / 10 : 0;
  }
  basins.sort((a, b) => b.rigs - a.rigs);

  return { basins, totalRigs: Math.round(totalRigs) };
}

// ── International Rig Count from EIA ────────────────────────────────
async function fetchInternationalRigs(apiKey: string) {
  try {
    const url = `https://api.eia.gov/v2/international/data/?api_key=${apiKey}&frequency=monthly&data[0]=value&facets[productId][]=RIG&sort[0][column]=period&sort[0][direction]=desc&length=50`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    const json = await resp.json();
    const rows = json?.response?.data || [];

    if (rows.length === 0) return [];

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
  } catch {
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

    const [dpr, international] = await Promise.all([
      fetchDPRData(),
      eiaApiKey ? fetchInternationalRigs(eiaApiKey) : Promise.resolve([]),
    ]);

    if (dpr.basins.length === 0) {
      return NextResponse.json({ error: 'Failed to fetch rig count data' }, { status: 502 });
    }

    const data = {
      usTotals: {
        total: dpr.totalRigs,
        oil: 0,
        gas: 0,
        weeklyChange: 0,
        period: dpr.basins[0]?.period || '',
      },
      basins: dpr.basins,
      international,
      lastUpdated: new Date().toISOString(),
      source: 'EIA Drilling Productivity Report',
    };

    cache = { data, ts: Date.now() };
    return NextResponse.json(data);

  } catch (error) {
    console.error('Oil rig tracker API error:', error);
    return NextResponse.json({ error: 'Failed to fetch rig count data' }, { status: 502 });
  }
}
