import { NextResponse } from 'next/server';

export const maxDuration = 30;

// Cache for 12 hours
let cache: { data: unknown; ts: number } | null = null;
const CACHE_MS = 12 * 60 * 60 * 1000;

// Known latest BH report UUID - updated when discovery runs
let knownUUID = '7569f402-d1c6-4b10-a66d-dba54a931178';
let uuidTs = 0;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ── Discover the latest report UUID ─────────────────────────────────
async function discoverUUID(): Promise<string> {
  // Only re-discover once per week
  if (uuidTs && Date.now() - uuidTs < 7 * 24 * 3600 * 1000) return knownUUID;

  try {
    const resp = await fetch('https://rigcount.bakerhughes.com/na-rig-count', {
      headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000),
    });
    const html = await resp.text();
    const uuids = [...new Set([...html.matchAll(/static-files\/([a-f0-9-]+)/g)].map(m => m[1]))];

    const heads = uuids.map(async (uuid) => {
      try {
        const r = await fetch(`https://rigcount.bakerhughes.com/static-files/${uuid}`, {
          method: 'HEAD', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(2500),
        });
        const d = r.headers.get('content-disposition') || '';
        if (d.includes('Rig_Count') && d.includes('Report') && d.includes('.xlsx')) return uuid;
      } catch { /* */ }
      return null;
    });

    const found = (await Promise.all(heads)).filter(Boolean);
    if (found[0]) {
      knownUUID = found[0] as string;
      uuidTs = Date.now();
    }
  } catch {
    // Use cached UUID
  }
  return knownUUID;
}

// ── Parse CSV-like data from the XLSX using xlsx package (dynamic import) ──
async function parseReport(buffer: ArrayBuffer) {
  // Dynamic import to avoid bundling issues
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buffer, { type: 'array' });

  // Parse NAM Summary
  const summary: (string | number | null)[][] = wb.Sheets['NAM Summary']
    ? XLSX.utils.sheet_to_json(wb.Sheets['NAM Summary'], { header: 1 }) : [];

  let usTotal = 0, usOil = 0, usGas = 0, usChange = 0;
  let caTotal = 0, caChange = 0;

  for (const row of summary) {
    if (!row?.[0]) continue;
    const label = String(row[0]).trim();
    const val = Number(row[2]) || 0;
    const chg = Number(row[3]) || 0;
    if (label === 'United States Total') { usTotal = val; usChange = chg; }
    else if (label === 'Canada') { caTotal = val; caChange = chg; }
    else if (label === 'Oil' && !usOil) { usOil = val; }
    else if (label === 'Gas' && !usGas) { usGas = val; }
  }

  // Parse NAM Breakdown
  const bd: (string | number | null)[][] = wb.Sheets['NAM Breakdown']
    ? XLSX.utils.sheet_to_json(wb.Sheets['NAM Breakdown'], { header: 1 }) : [];

  const basins: { basin: string; rigs: number; change: number; percentage: number }[] = [];
  const states: { state: string; rigs: number; change: number }[] = [];
  let section = '';
  let reportDate = '';

  for (const row of bd) {
    if (!row) continue;
    const label = String(row[1] || '').trim();

    if (label === 'Location' || label === 'Basin') {
      const ds = String(row[2] || '');
      if (ds.includes('/')) {
        const p = ds.split('/');
        if (p.length === 3) {
          const mo: Record<string, string> = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
          reportDate = `${p[2].length === 2 ? '20' + p[2] : p[2]}-${mo[p[1]] || '01'}-${p[0].padStart(2, '0')}`;
        }
      }
    }

    if (label === 'Basin') { section = 'basin'; continue; }
    if (label === 'State') { section = 'state'; continue; }
    if (['Location', 'DrillFor', 'Trajectory', 'Country'].includes(label)) { section = ''; continue; }
    if (['United States', 'North America', 'Canada', ''].includes(label)) continue;

    const rigs = Number(row[2]) || 0;
    const change = Math.round(Number(row[5]) || 0);

    if (section === 'basin' && label !== 'Other' && rigs > 0) {
      basins.push({ basin: label, rigs, change, percentage: 0 });
    } else if (section === 'state' && rigs > 0) {
      states.push({ state: label, rigs, change });
    }
  }

  const totalBasin = basins.reduce((s, b) => s + b.rigs, 0);
  basins.forEach(b => { b.percentage = totalBasin > 0 ? Math.round((b.rigs / totalBasin) * 1000) / 10 : 0; });
  basins.sort((a, b) => b.rigs - a.rigs);
  states.sort((a, b) => b.rigs - a.rigs);

  return {
    usTotals: { total: usTotal, oil: usOil, gas: usGas, weeklyChange: usChange, period: reportDate },
    canada: { total: caTotal, weeklyChange: caChange },
    basins,
    topStates: states.slice(0, 8),
    reportDate,
  };
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    const uuid = await discoverUUID();
    const resp = await fetch(`https://rigcount.bakerhughes.com/static-files/${uuid}`, {
      headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) throw new Error(`BH download failed: ${resp.status}`);

    const buffer = await resp.arrayBuffer();
    const parsed = await parseReport(buffer);

    if (parsed.usTotals.total === 0) {
      return NextResponse.json({ error: 'Failed to parse rig count data' }, { status: 502 });
    }

    const data = { ...parsed, lastUpdated: new Date().toISOString(), source: 'Baker Hughes Weekly Rig Count' };
    cache = { data, ts: Date.now() };
    return NextResponse.json(data);

  } catch (error) {
    console.error('Oil rig tracker error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rig count data: ' + (error instanceof Error ? error.message : 'unknown') },
      { status: 502 }
    );
  }
}
