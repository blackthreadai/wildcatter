import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// Cache for 12 hours (Baker Hughes updates weekly on Fridays)
let cache: { data: unknown; ts: number } | null = null;
const CACHE_MS = 12 * 60 * 60 * 1000;

// ── Find and download latest Baker Hughes NA Rig Count Excel ────────
async function findLatestBHFile(): Promise<ArrayBuffer> {
  // Step 1: Scrape the BH page for static file UUIDs
  const pageResp = await fetch('https://rigcount.bakerhughes.com/na-rig-count', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    signal: AbortSignal.timeout(6000),
  });
  if (!pageResp.ok) throw new Error(`BH page fetch failed: ${pageResp.status}`);
  const html = await pageResp.text();

  // Extract all static file UUIDs
  const uuidRegex = /static-files\/([a-f0-9-]+)/g;
  const uuids = new Set<string>();
  let match;
  while ((match = uuidRegex.exec(html)) !== null) {
    uuids.add(match[1]);
  }

  if (uuids.size === 0) throw new Error('No static files found on BH page');

  // Step 2: HEAD all files in parallel to find the weekly report
  const checks = Array.from(uuids).map(async (uuid) => {
    try {
      const resp = await fetch(`https://rigcount.bakerhughes.com/static-files/${uuid}`, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(3000),
      });
      const disp = resp.headers.get('content-disposition') || '';
      if (disp.includes('Rig_Count') && disp.includes('Report') && disp.includes('.xlsx')) {
        return { uuid, disp };
      }
    } catch { /* */ }
    return null;
  });

  const results = (await Promise.all(checks)).filter(Boolean) as { uuid: string; disp: string }[];
  if (results.length === 0) throw new Error('No weekly BH report found');

  // Pick the first match (there's usually only one current weekly report)
  // If multiple, pick by most recent date in filename
  const target = results[0];
  console.log(`Found BH report: ${target.disp}`);

  // Step 3: Download
  const fileResp = await fetch(`https://rigcount.bakerhughes.com/static-files/${target.uuid}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(8000),
  });
  if (!fileResp.ok) throw new Error(`BH download failed: ${fileResp.status}`);
  return fileResp.arrayBuffer();
}

// ── Parse Baker Hughes Excel ────────────────────────────────────────
function parseBHExcel(buffer: ArrayBuffer) {
  const wb = XLSX.read(buffer, { type: 'array' });

  // Parse NAM Summary for totals
  const summarySheet = wb.Sheets['NAM Summary'];
  const summaryData: (string | number | null)[][] = summarySheet
    ? XLSX.utils.sheet_to_json(summarySheet, { header: 1 })
    : [];

  let usTotalRigs = 0, usOil = 0, usGas = 0, usChange = 0;
  let canadaTotal = 0, canadaChange = 0;
  let reportDate = '';

  for (const row of summaryData) {
    if (!row || !row[0]) continue;
    const label = String(row[0]).trim();
    const thisWeek = Number(row[2]) || 0;
    const change = Number(row[3]) || 0;

    if (label === 'United States Total') { usTotalRigs = thisWeek; usChange = change; }
    if (label === 'Canada') { canadaTotal = thisWeek; canadaChange = change; }
    if (label === 'Oil' && usOil === 0) { usOil = thisWeek; }
    if (label === 'Gas' && usGas === 0) { usGas = thisWeek; }
  }

  // Get report date from header
  const headerRow = summaryData.find(r => r && r[2] && String(r[2]).includes('/'));
  if (!headerRow) {
    // Try numeric date
    const dateRow = summaryData.find(r => r && typeof r[2] === 'number' && r[2] > 40000);
    if (dateRow && typeof dateRow[2] === 'number') {
      const d = XLSX.SSF.parse_date_code(dateRow[2]);
      reportDate = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    }
  }

  // Parse NAM Breakdown for basins
  const breakdownSheet = wb.Sheets['NAM Breakdown'];
  const breakdownData: (string | number | null)[][] = breakdownSheet
    ? XLSX.utils.sheet_to_json(breakdownSheet, { header: 1 })
    : [];

  const basins: { basin: string; rigs: number; change: number; percentage: number }[] = [];
  let inBasinSection = false;

  for (const row of breakdownData) {
    if (!row) continue;
    const label = String(row[1] || '').trim();

    if (label === 'Basin') { inBasinSection = true; continue; }
    if (label === 'State' || label === 'Country') { inBasinSection = false; continue; }

    if (inBasinSection && label && label !== 'United States' && label !== 'North America') {
      const rigs = Number(row[2]) || 0;
      const change = Number(row[5]) || 0;
      if (rigs > 0 || label === 'Other') {
        basins.push({
          basin: label,
          rigs,
          change: Math.round(change),
          percentage: 0,
        });
      }
    }

    // Get date from breakdown header
    if (label === 'Location' || label === 'Basin') {
      const dateStr = String(row[2] || '');
      if (dateStr.includes('/')) {
        // Format: "27/Mar/26"
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const months: Record<string, string> = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' };
          const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          reportDate = `${year}-${months[parts[1]] || '01'}-${parts[0].padStart(2, '0')}`;
        }
      }
    }
  }

  // Calculate percentages
  const totalBasinRigs = basins.reduce((sum, b) => sum + b.rigs, 0);
  for (const b of basins) {
    b.percentage = totalBasinRigs > 0 ? Math.round((b.rigs / totalBasinRigs) * 1000) / 10 : 0;
  }

  // Sort by rigs descending, filter out "Other" if small
  basins.sort((a, b) => b.rigs - a.rigs);

  // States from breakdown
  const states: { state: string; rigs: number; change: number }[] = [];
  let inStateSection = false;

  for (const row of breakdownData) {
    if (!row) continue;
    const label = String(row[1] || '').trim();

    if (label === 'State') { inStateSection = true; continue; }
    if (inStateSection && (label === '' || label === 'United States')) {
      if (label === 'United States') inStateSection = false;
      continue;
    }

    if (inStateSection && label) {
      const rigs = Number(row[2]) || 0;
      const change = Number(row[5]) || 0;
      if (rigs > 0) {
        states.push({ state: label, rigs, change: Math.round(change) });
      }
    }
  }
  states.sort((a, b) => b.rigs - a.rigs);

  return {
    usTotals: {
      total: usTotalRigs,
      oil: usOil,
      gas: usGas,
      weeklyChange: usChange,
      period: reportDate,
    },
    canada: {
      total: canadaTotal,
      weeklyChange: canadaChange,
    },
    basins: basins.filter(b => b.basin !== 'Other').slice(0, 10),
    topStates: states.slice(0, 8),
    reportDate,
  };
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    const buffer = await findLatestBHFile();
    const parsed = parseBHExcel(buffer);

    if (parsed.usTotals.total === 0) {
      return NextResponse.json({ error: 'Failed to parse rig count data' }, { status: 502 });
    }

    const data = {
      ...parsed,
      lastUpdated: new Date().toISOString(),
      source: 'Baker Hughes Weekly Rig Count',
    };

    cache = { data, ts: Date.now() };
    return NextResponse.json(data);

  } catch (error) {
    console.error('Oil rig tracker API error:', error);
    return NextResponse.json({ error: 'Failed to fetch rig count data' }, { status: 502 });
  }
}
