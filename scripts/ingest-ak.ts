#!/usr/bin/env npx tsx
import { Client } from 'pg';
import { randomUUID, createHash } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_ID8o0kGRjUba@ep-blue-sunset-ai79p0wt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';
const BASE_URL = 'https://services.arcgis.com/jDGuO8tYggdCCnUJ/arcgis/rest/services/ak_wells_013017/FeatureServer/0/query';
const BATCH = 2000;

function dUUID(ns: string, key: string): string {
  const h = createHash('sha256').update(`${ns}:${key}`).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-${((parseInt(h[16],16)&0x3)|0x8).toString(16)}${h.slice(17,20)}-${h.slice(20,32)}`;
}

// AOGCC status codes
function mapStatus(s: string): string {
  if (!s) return 'inactive';
  const code = s.trim().toUpperCase();
  if (['1-OIL','2-OIL','1-GAS','2-GAS','3-GAS','1G-GS','2G-GS','NGL','1GINJ','1WINJ','2WINJ','1WIN2S','WDSP1','WDSP2','GEOTH','GSTOR','1G-WD','OBSW','WTRSP','WSTOIL','CO-2O','CO-3O'].includes(code)) return 'active';
  if (['SI','SUSP'].includes(code)) return 'shut-in';
  return 'inactive'; // WAGIN=abandoned, EXPIR, CANC, ADMA, SPLUG, SQZED, INFO, UNK
}

function mapType(s: string): string {
  if (!s) return 'oil';
  const code = s.trim().toUpperCase();
  if (code.includes('GAS') || code.includes('NGL') || code === '1G-GS' || code === '2G-GS' || code === '1G-WD') return 'gas';
  if (code.includes('INJ') || code.includes('DSP') || code.includes('WTRSP')) return 'oil'; // injection wells mapped as oil type
  return 'oil';
}

function titleCase(s: string): string {
  if (!s) return '';
  return s.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// AK is basically all North Slope / Cook Inlet
function getBasin(lat: number): string {
  if (lat > 68) return 'North Slope';
  if (lat > 59 && lat < 62) return 'Cook Inlet Basin';
  if (lat > 62) return 'North Slope'; // interior
  return 'Cook Inlet Basin';
}

async function main() {
  console.log('AK Well Ingestion (AOGCC/FracTracker)\n');

  let allWells: any[] = [];
  let offset = 0;
  while (true) {
    const params = new URLSearchParams({
      where: '1=1', outFields: 'API_WellNo,WellName,OpNo,CurrentSta,CurrentCla,Wh_Lat,Wh_Long,Wh_GeoArea,DTD,TVD',
      f: 'json', resultOffset: String(offset), resultRecordCount: String(BATCH), orderByFields: 'OBJECTID ASC',
    });
    let data: any;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const resp = await fetch(`${BASE_URL}?${params}`, { signal: AbortSignal.timeout(30000) });
        data = await resp.json();
        break;
      } catch (err) {
        console.warn(`  Retry ${attempt}/5 at offset ${offset}`);
        if (attempt === 5) throw err;
        await new Promise(r => setTimeout(r, 3000 * attempt));
      }
    }
    const features = (data.features || []).map((f: any) => f.attributes);
    if (features.length === 0) break;
    allWells.push(...features);
    offset += features.length;
    console.log(`  ${offset.toLocaleString()} wells...`);
    if (!data.exceededTransferLimit && features.length < BATCH) break;
  }
  console.log(`Total: ${allWells.length.toLocaleString()}\n`);

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    console.log(`Inserting ${allWells.length.toLocaleString()} wells...`);
    let inserted = 0, skipped = 0;
    const CHUNK = 100;
    const seen = new Set<string>();

    for (let i = 0; i < allWells.length; i += CHUNK) {
      const chunk = allWells.slice(i, i + CHUNK);
      const vals: string[] = [], params: any[] = [];
      let pi = 1;

      for (const w of chunk) {
        const api = w.API_WellNo ? String(w.API_WellNo) : '';
        if (!api) { skipped++; continue; }
        const id = dUUID('ak_well', api);
        if (seen.has(id)) { skipped++; continue; }
        seen.add(id);

        const lat = w.Wh_Lat || 0;
        const lon = w.Wh_Long || 0;
        const basin = getBasin(lat);
        const status = mapStatus(w.CurrentSta || '');
        const type = mapType(w.CurrentSta || '');
        const name = w.WellName ? titleCase(w.WellName) : `AK Well ${api}`;
        const depth = w.TVD && w.TVD > 0 ? w.TVD : (w.DTD && w.DTD > 0 ? w.DTD : null);

        vals.push(`($${pi},$${pi+1},$${pi+2},$${pi+3},$${pi+4},$${pi+5},$${pi+6},$${pi+7},$${pi+8},$${pi+9},$${pi+10})`);
        params.push(id, type, name, 'AK', '', lat, lon, basin, status, type==='gas'?'natural gas':'crude oil', depth);
        pi += 11;
      }

      if (vals.length > 0) {
        await client.query(`
          INSERT INTO assets (id,asset_type,name,state,county,latitude,longitude,basin,status,commodity,depth_ft)
          VALUES ${vals.join(',')}
          ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,status=EXCLUDED.status,basin=EXCLUDED.basin
        `, params);
        inserted += vals.length;
      }
    }

    console.log(`\n✓ ${inserted.toLocaleString()} wells (${skipped} skipped)`);

    await client.query(`INSERT INTO data_provenance (id,source_name,source_url,record_count,status,notes) VALUES ($1,'AK_FRACTRACKER',$2,$3,'success',$4)`,
      [randomUUID(), BASE_URL, inserted, `${inserted} wells from FracTracker AK dataset (no operator names - only OpNo codes)`]);

    const { rows: [s] } = await client.query(`SELECT count(*) AS t, count(*) FILTER (WHERE status='active') AS a, count(*) FILTER (WHERE status='shut-in') AS si FROM assets WHERE state='AK'`);
    console.log(`\nAK: ${s.t} total, ${s.a} active, ${s.si} shut-in`);

    const { rows: ov } = await client.query(`SELECT state,count(*)::int AS c FROM assets GROUP BY state ORDER BY c DESC`);
    let tot = 0;
    console.log('\n=== Platform ===');
    ov.forEach((r:any) => { console.log(`  ${r.state}: ${r.c.toLocaleString()}`); tot += r.c; });
    console.log(`  TOTAL: ${tot.toLocaleString()}`);
    console.log('\n✅ Done!');
  } finally { await client.end(); }
}

main().catch(e => { console.error('Failed:', e); process.exit(1); });
