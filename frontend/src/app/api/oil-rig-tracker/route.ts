import { NextResponse } from 'next/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Cache for 12 hours
let cache: { data: unknown; ts: number } | null = null;
const CACHE_MS = 12 * 60 * 60 * 1000;

const BH_URL = 'https://rigcount.bakerhughes.com/na-rig-count';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchBHData() {
  // Step 1: Find the latest weekly report UUID from the BH page
  const pageResp = await fetch(BH_URL, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(8000),
  });
  if (!pageResp.ok) throw new Error(`Page: ${pageResp.status}`);
  const html = await pageResp.text();

  // Find the report link with most recent date
  // Pattern: /static-files/UUID with nearby date text like "03/27/26"
  const uuids = [...html.matchAll(/static-files\/([a-f0-9-]+)/g)].map(m => m[1]);
  const unique = [...new Set(uuids)];

  // HEAD all in parallel to find "Rig_Count Report"
  const results = await Promise.all(unique.map(async (uuid) => {
    try {
      const r = await fetch(`https://rigcount.bakerhughes.com/static-files/${uuid}`, {
        method: 'HEAD', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(3000),
      });
      const disp = r.headers.get('content-disposition') || '';
      if (disp.includes('Rig_Count') && disp.includes('Report') && disp.includes('.xlsx')) {
        return { uuid, disp };
      }
    } catch { /* */ }
    return null;
  }));

  const found = results.filter(Boolean);
  if (found.length === 0) throw new Error('No weekly report found');

  const uuid = found[0]!.uuid;

  // Step 2: Download and parse
  const fileResp = await fetch(`https://rigcount.bakerhughes.com/static-files/${uuid}`, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(30000),
  });
  if (!fileResp.ok) throw new Error(`Download: ${fileResp.status}`);

  const buffer = await fileResp.arrayBuffer();

  // Dynamic import xlsx to avoid bundling issues
  const XLSX = await import('xlsx');
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });

  // Parse NAM Summary
  const summary: unknown[][] = wb.Sheets['NAM Summary']
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

  // Parse NAM Breakdown for basins + states
  const bd: unknown[][] = wb.Sheets['NAM Breakdown']
    ? XLSX.utils.sheet_to_json(wb.Sheets['NAM Breakdown'], { header: 1 }) : [];

  interface BasinEntry { basin: string; rigs: number; change: number; percentage: number }
  interface StateEntry { state: string; rigs: number; change: number }

  const basins: BasinEntry[] = [];
  const states: StateEntry[] = [];
  let section = '';
  let reportDate = '';

  for (const row of bd) {
    if (!row) continue;
    const label = String(row[1 as keyof typeof row] ?? '').trim();

    // Extract date from headers
    if (label === 'Location' || label === 'Basin') {
      const ds = String(row[2 as keyof typeof row] ?? '');
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
    if (['Location','DrillFor','Trajectory','Country'].includes(label)) { section = ''; continue; }
    if (['United States','North America','Canada',''].includes(label)) continue;

    const rigs = Number(row[2 as keyof typeof row]) || 0;
    const change = Math.round(Number(row[5 as keyof typeof row]) || 0);

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

    const parsed = await fetchBHData();

    if (parsed.usTotals.total === 0) {
      return NextResponse.json({ error: 'Failed to parse rig count data' }, { status: 502 });
    }

    const data = { ...parsed, lastUpdated: new Date().toISOString(), source: 'Baker Hughes Weekly Rig Count' };
    cache = { data, ts: Date.now() };
    return NextResponse.json(data);

  } catch (error) {
    console.error('Oil rig tracker error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rig count data: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 502 },
    );
  }
}
