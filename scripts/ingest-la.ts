#!/usr/bin/env npx tsx
import { Client } from 'pg';
import { randomUUID, createHash } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_ID8o0kGRjUba@ep-blue-sunset-ai79p0wt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';
const BASE_URL = 'https://services.arcgis.com/jDGuO8tYggdCCnUJ/arcgis/rest/services/Louisiana_wells_2_24_22/FeatureServer/0/query';
const BATCH = 2000;

function dUUID(ns: string, key: string): string {
  const h = createHash('sha256').update(`${ns}:${key}`).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-${((parseInt(h[16],16)&0x3)|0x8).toString(16)}${h.slice(17,20)}-${h.slice(20,32)}`;
}

// LDNR/SONRIS status codes (numeric)
// 10=Producing, 9=Drilling, 1=Permitted, 2=Completed, 18=Workover
// 20=Shut-in, 22=Temp Abandoned, 23=Plugged, 33=Plugged & Abandoned
// 24=Orphaned, 26=SWD Active, 31=SWD Shut-in, 34=SWD P&A
function mapStatus(code: number): string {
  if ([10, 9, 1, 2, 18, 26, 17, 25, 37, 80, 82, 73, 90].includes(code)) return 'active';
  if ([20, 22, 31, 36].includes(code)) return 'shut-in';
  return 'inactive'; // 23, 33, 34, 24, 0, etc
}

// LDNR product type codes
// 10=Oil, 20=Gas, 30=Both
function mapType(pt: number): string {
  if (pt === 20) return 'gas';
  return 'oil';
}

function titleCase(s: string): string {
  if (!s) return '';
  return s.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// LA basins by parish (approximate)
const HAYNESVILLE = ['BOSSIER','CADDO','DE SOTO','RED RIVER','SABINE','NATCHITOCHES','WEBSTER','BIENVILLE','CLAIBORNE','LINCOLN','JACKSON','WINN','CALDWELL','UNION','MOREHOUSE','OUACHITA'];
const TUSCALOOSA_MARINE = ['EAST BATON ROUGE','WEST BATON ROUGE','POINTE COUPEE','EAST FELICIANA','WEST FELICIANA','ST. HELENA','LIVINGSTON','TANGIPAHOA','ST. TAMMANY','WASHINGTON'];
const SALT_BASIN = ['CAMERON','CALCASIEU','JEFFERSON DAVIS','ACADIA','VERMILION','IBERIA','ST. MARY','TERREBONNE','LAFOURCHE','ST. MARTIN','LAFAYETTE','EVANGELINE','ALLEN','BEAUREGARD'];

function getBasin(parish: string, lat: number): string {
  const p = (parish || '').toUpperCase();
  if (HAYNESVILLE.some(h => p.includes(h))) return 'Haynesville Shale';
  if (TUSCALOOSA_MARINE.some(t => p.includes(t))) return 'Tuscaloosa Marine Shale';
  if (SALT_BASIN.some(s => p.includes(s))) return 'Gulf Coast Basin';
  // North LA = mostly Haynesville/Cotton Valley; South = Gulf Coast
  if (lat > 31.5) return 'Haynesville Shale';
  return 'Gulf Coast Basin';
}

async function main() {
  console.log('LA Well Ingestion (LDNR/SONRIS via FracTracker)\n');

  let allWells: any[] = [];
  let offset = 0;
  while (true) {
    const params = new URLSearchParams({
      where: '1=1', outFields: 'API_NUM,WELL_NAME,ORG_OPER_N,WELL_STATU,PRODUCT_TY,PARISH_NAM,LAT,LONG,FIELD_NAME,MEASURED_D',
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
    if (offset % 10000 < BATCH) console.log(`  ${offset.toLocaleString()} wells...`);
    if (!data.exceededTransferLimit && features.length < BATCH) break;
  }
  console.log(`Total: ${allWells.length.toLocaleString()}\n`);

  const opMap = new Map<string, string>();
  for (const w of allWells) {
    if (w.ORG_OPER_N) {
      const key = w.ORG_OPER_N.trim().toUpperCase();
      if (!opMap.has(key)) opMap.set(key, titleCase(w.ORG_OPER_N));
    }
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    console.log(`Upserting ${opMap.size} operators...`);
    for (const [key, name] of opMap) {
      await client.query(`INSERT INTO operators (id, legal_name, hq_state, active_asset_count) VALUES ($1,$2,'LA',0) ON CONFLICT (id) DO UPDATE SET legal_name=EXCLUDED.legal_name`,
        [dUUID('la_operator', key), name]);
    }

    console.log(`Inserting ${allWells.length.toLocaleString()} wells...`);
    let inserted = 0, skipped = 0;
    const CHUNK = 100;
    const seen = new Set<string>();

    for (let i = 0; i < allWells.length; i += CHUNK) {
      const chunk = allWells.slice(i, i + CHUNK);
      const vals: string[] = [], params: any[] = [];
      let pi = 1;

      for (const w of chunk) {
        const api = w.API_NUM ? String(w.API_NUM) : '';
        if (!api) { skipped++; continue; }
        const id = dUUID('la_well', api);
        if (seen.has(id)) { skipped++; continue; }
        seen.add(id);

        const parish = titleCase(w.PARISH_NAM || '');
        const basin = getBasin(w.PARISH_NAM || '', w.LAT || 0);
        const opKey = w.ORG_OPER_N ? w.ORG_OPER_N.trim().toUpperCase() : null;
        const opId = opKey ? dUUID('la_operator', opKey) : null;
        const status = mapStatus(w.WELL_STATU || 0);
        const type = mapType(w.PRODUCT_TY || 0);
        const name = w.WELL_NAME ? titleCase(w.WELL_NAME.split(';')[0]) : `LA Well ${api}`;
        const depth = w.MEASURED_D && w.MEASURED_D > 0 ? w.MEASURED_D : null;

        vals.push(`($${pi},$${pi+1},$${pi+2},$${pi+3},$${pi+4},$${pi+5},$${pi+6},$${pi+7},$${pi+8},$${pi+9},$${pi+10},$${pi+11})`);
        params.push(id, type, name, 'LA', parish, w.LAT||0, w.LONG||0, basin, opId, status, type==='gas'?'natural gas':'crude oil', depth);
        pi += 12;
      }

      if (vals.length > 0) {
        await client.query(`
          INSERT INTO assets (id,asset_type,name,state,county,latitude,longitude,basin,operator_id,status,commodity,depth_ft)
          VALUES ${vals.join(',')}
          ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,status=EXCLUDED.status,operator_id=EXCLUDED.operator_id,basin=EXCLUDED.basin
        `, params);
        inserted += vals.length;
      }
      if (inserted % 10000 < CHUNK) console.log(`  ${inserted.toLocaleString()}...`);
    }

    console.log(`\n✓ ${inserted.toLocaleString()} wells (${skipped} skipped)`);

    await client.query(`UPDATE operators SET active_asset_count=sub.cnt FROM (SELECT operator_id,count(*)::int AS cnt FROM assets WHERE state='LA' AND status='active' GROUP BY operator_id) sub WHERE operators.id=sub.operator_id`);

    await client.query(`INSERT INTO data_provenance (id,source_name,source_url,record_count,status,notes) VALUES ($1,'LA_FRACTRACKER',$2,$3,'success',$4)`,
      [randomUUID(), BASE_URL, inserted, `${inserted} wells from FracTracker LA/LDNR dataset`]);

    const { rows: [s] } = await client.query(`SELECT count(*) AS t, count(*) FILTER (WHERE status='active') AS a, count(*) FILTER (WHERE status='shut-in') AS si FROM assets WHERE state='LA'`);
    console.log(`\nLA: ${s.t} total, ${s.a} active, ${s.si} shut-in`);

    const { rows: ov } = await client.query(`SELECT state,count(*)::int AS c FROM assets GROUP BY state ORDER BY c DESC`);
    let tot = 0;
    console.log('\n=== Platform ===');
    ov.forEach((r:any) => { console.log(`  ${r.state}: ${r.c.toLocaleString()}`); tot += r.c; });
    console.log(`  TOTAL: ${tot.toLocaleString()}`);
    console.log('\n✅ Done!');
  } finally { await client.end(); }
}

main().catch(e => { console.error('Failed:', e); process.exit(1); });
