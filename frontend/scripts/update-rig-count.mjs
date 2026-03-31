#!/usr/bin/env node
// Downloads the latest Baker Hughes NA Rig Count Report and extracts JSON
// Run weekly (Fridays after 1pm ET) to keep data fresh
// Usage: node scripts/update-rig-count.mjs

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function main() {
  console.log('Fetching BH page...');
  const page = await fetch('https://rigcount.bakerhughes.com/na-rig-count', {
    headers: { 'User-Agent': UA },
  });
  const html = await page.text();

  const uuids = [...new Set([...html.matchAll(/static-files\/([a-f0-9-]+)/g)].map(m => m[1]))];
  console.log(`Found ${uuids.length} static files`);

  // Find the weekly report
  let reportUUID = '';
  await Promise.all(uuids.map(async (uuid) => {
    try {
      const r = await fetch(`https://rigcount.bakerhughes.com/static-files/${uuid}`, {
        method: 'HEAD', headers: { 'User-Agent': UA },
      });
      const d = r.headers.get('content-disposition') || '';
      if (d.includes('Rig_Count') && d.includes('Report') && d.includes('.xlsx')) {
        console.log(`Found report: ${d}`);
        reportUUID = uuid;
      }
    } catch { /* */ }
  }));

  if (!reportUUID) throw new Error('No weekly report found');

  console.log('Downloading report...');
  const resp = await fetch(`https://rigcount.bakerhughes.com/static-files/${reportUUID}`, {
    headers: { 'User-Agent': UA },
  });
  const buffer = await resp.arrayBuffer();
  console.log(`Downloaded ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB`);

  const XLSX = await import('xlsx');
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });

  // Parse Summary
  const summary = XLSX.utils.sheet_to_json(wb.Sheets['NAM Summary'], { header: 1 });
  let usTotal = 0, usOil = 0, usGas = 0, usChange = 0, caTotal = 0, caChange = 0;
  for (const row of summary) {
    if (!row?.[0]) continue;
    const l = String(row[0]).trim(), v = Number(row[2]) || 0, c = Number(row[3]) || 0;
    if (l === 'United States Total') { usTotal = v; usChange = c; }
    else if (l === 'Canada') { caTotal = v; caChange = c; }
    else if (l === 'Oil' && !usOil) usOil = v;
    else if (l === 'Gas' && !usGas) usGas = v;
  }

  // Parse Breakdown
  const bd = XLSX.utils.sheet_to_json(wb.Sheets['NAM Breakdown'], { header: 1 });
  const basins = [], states = [];
  let section = '', reportDate = '';

  for (const row of bd) {
    if (!row) continue;
    const label = String(row[1] ?? '').trim();
    if (label === 'Location' || label === 'Basin') {
      const ds = String(row[2] ?? '');
      if (ds.includes('/')) {
        const p = ds.split('/');
        if (p.length === 3) {
          const mo = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
          reportDate = `${p[2].length === 2 ? '20' + p[2] : p[2]}-${mo[p[1]] || '01'}-${p[0].padStart(2, '0')}`;
        }
      }
    }
    if (label === 'Basin') { section = 'basin'; continue; }
    if (label === 'State') { section = 'state'; continue; }
    if (['Location','DrillFor','Trajectory','Country'].includes(label)) { section = ''; continue; }
    if (['United States','North America','Canada',''].includes(label)) continue;

    const rigs = Number(row[2]) || 0, change = Math.round(Number(row[5]) || 0);
    if (section === 'basin' && label !== 'Other' && rigs > 0) basins.push({ basin: label, rigs, change, percentage: 0 });
    else if (section === 'state' && rigs > 0) states.push({ state: label, rigs, change });
  }

  const totalBasin = basins.reduce((s, b) => s + b.rigs, 0);
  basins.forEach(b => { b.percentage = totalBasin > 0 ? Math.round(b.rigs / totalBasin * 1000) / 10 : 0; });
  basins.sort((a, b) => b.rigs - a.rigs);
  states.sort((a, b) => b.rigs - a.rigs);

  const data = {
    usTotals: { total: usTotal, oil: usOil, gas: usGas, weeklyChange: usChange, period: reportDate },
    canada: { total: caTotal, weeklyChange: caChange },
    basins,
    topStates: states.slice(0, 8),
    reportDate,
    lastUpdated: new Date().toISOString(),
    source: 'Baker Hughes Weekly Rig Count',
  };

  const outDir = join(__dirname, '..', 'public', 'data');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'rig-count.json');
  writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`\nWrote ${outPath}`);
  console.log(`US: ${usTotal} rigs (Oil: ${usOil}, Gas: ${usGas}, ${usChange >= 0 ? '+' : ''}${usChange} WoW)`);
  console.log(`Canada: ${caTotal} (${caChange >= 0 ? '+' : ''}${caChange})`);
  console.log(`Report date: ${reportDate}`);
  console.log(`Basins: ${basins.length}, States: ${states.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
