#!/usr/bin/env npx tsx
import { Client } from 'pg';
import { randomUUID, createHash } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_ID8o0kGRjUba@ep-blue-sunset-ai79p0wt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';
const BASE_URL = 'https://services.arcgis.com/jDGuO8tYggdCCnUJ/arcgis/rest/services/ND_wells_3_10_22/FeatureServer/0/query';
const BATCH = 2000;

function dUUID(ns: string, key: string): string {
  const h = createHash('sha256').update(`${ns}:${key}`).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-${((parseInt(h[16],16)&0x3)|0x8).toString(16)}${h.slice(17,20)}-${h.slice(20,32)}`;
}

// All ND oil production is Williston Basin (Bakken/Three Forks)
// except minor eastern wells
const BASIN_MAP: Record<string, string> = {};
// Western ND counties are Williston Basin
const WILLISTON_COUNTIES = [
  'WILLIAMS','MCKENZIE','MOUNTRAIL','DUNN','STARK','BOWMAN','SLOPE','GOLDEN VALLEY',
  'BILLINGS','DIVIDE','BURKE','WARD','RENVILLE','BOTTINEAU','MCLEAN','MERCER',
  'OLIVER','MORTON','GRANT','HETTINGER','ADAMS','SIOUX','EMMONS','BURLEIGH',
  'SHERIDAN','KIDDER','STUTSMAN','WELLS','FOSTER','EDDY','BENSON','PIERCE',
  'ROLETTE','TOWNER','CAVALIER','RAMSEY','WALSH','PEMBINA','NELSON','GRAND FORKS',
  'TRAILL','STEELE','GRIGGS','BARNES','LAMOURE','LOGAN','MCINTOSH','DICKEY',
  'SARGENT','RANSOM','RICHLAND','CASS','MCHENRY',
];

function mapStatus(s: string): string {
  if (!s) return 'inactive';
  const code = s.trim().toUpperCase();
  // ND NDIC status codes
  if (['A','DRL','LOC','LOCR','CONFIDENTIAL','NCW','NC','PNS'].includes(code)) return 'active';
  if (['IA','TA','TAO','TASC','TATD','AB'].includes(code)) return 'shut-in';
  // PA=Plugged&Abandoned, DRY=Dry Hole, PNC=Plugged Not Completed, EXP=Expired
  return 'inactive';
}

function mapType(t: string): string {
  if (!t) return 'oil';
  const lower = t.toLowerCase();
  if (lower.includes('gas') || lower === 'g') return 'gas';
  return 'oil';
}

function titleCase(s: string): string {
  if (!s) return '';
  return s.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

async function main() {
  console.log('ND Well Ingestion (FracTracker)\n');

  let allWells: any[] = [];
  let offset = 0;
  while (true) {
    const params = new URLSearchParams({
      where: '1=1', outFields: 'api_no,operator,well_name,County,latitude,longitude,well_type,status,td,spud_date,field_name',
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
    for (const f of features) allWells.push(f);
    offset += features.length;
    if (offset % 10000 < BATCH) console.log(`  ${offset.toLocaleString()} wells...`);
    if (!data.exceededTransferLimit && features.length < BATCH) break;
  }
  console.log(`Total: ${allWells.length.toLocaleString()}\n`);

  // Operators
  const opMap = new Map<string, string>();
  for (const w of allWells) {
    if (w.operator) {
      const key = w.operator.trim().toUpperCase();
      if (!opMap.has(key)) opMap.set(key, titleCase(w.operator));
    }
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    console.log(`Upserting ${opMap.size} operators...`);
    for (const [key, name] of opMap) {
      await client.query(`INSERT INTO operators (id, legal_name, hq_state, active_asset_count) VALUES ($1,$2,'ND',0) ON CONFLICT (id) DO UPDATE SET legal_name=EXCLUDED.legal_name`,
        [dUUID('nd_operator', key), name]);
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
        const api = w.api_no || '';
        if (!api) { skipped++; continue; }
        const id = dUUID('nd_well', api);
        if (seen.has(id)) { skipped++; continue; }
        seen.add(id);

        const county = titleCase(w.County || '');
        const basin = county.toUpperCase() && WILLISTON_COUNTIES.includes((w.County || '').toUpperCase()) ? 'Williston Basin' : 'Williston Basin';
        const opKey = w.operator ? w.operator.trim().toUpperCase() : null;
        const opId = opKey ? dUUID('nd_operator', opKey) : null;
        const status = mapStatus(w.status || '');
        const type = mapType(w.well_type || '');
        const name = w.well_name ? titleCase(w.well_name) : `ND Well ${api}`;
        const depth = w.td ? parseInt(w.td) || null : null;

        vals.push(`($${pi},$${pi+1},$${pi+2},$${pi+3},$${pi+4},$${pi+5},$${pi+6},$${pi+7},$${pi+8},$${pi+9},$${pi+10},$${pi+11})`);
        params.push(id, type, name, 'ND', county, w.latitude||0, w.longitude||0, basin, opId, status, type==='gas'?'natural gas':'crude oil', depth);
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

    // Update operator counts
    await client.query(`UPDATE operators SET active_asset_count=sub.cnt FROM (SELECT operator_id,count(*)::int AS cnt FROM assets WHERE state='ND' AND status='active' GROUP BY operator_id) sub WHERE operators.id=sub.operator_id`);

    await client.query(`INSERT INTO data_provenance (id,source_name,source_url,record_count,status,notes) VALUES ($1,'ND_FRACTRACKER',$2,$3,'success',$4)`,
      [randomUUID(), BASE_URL, inserted, `${inserted} wells from FracTracker ND dataset`]);

    const { rows: [s] } = await client.query(`SELECT count(*) AS t, count(*) FILTER (WHERE status='active') AS a, count(*) FILTER (WHERE status='shut-in') AS si FROM assets WHERE state='ND'`);
    console.log(`\nND: ${s.t} total, ${s.a} active, ${s.si} shut-in`);

    const { rows: ov } = await client.query(`SELECT state,count(*)::int AS c FROM assets GROUP BY state ORDER BY c DESC`);
    let tot = 0;
    console.log('\n=== Platform ===');
    ov.forEach((r:any) => { console.log(`  ${r.state}: ${r.c.toLocaleString()}`); tot += r.c; });
    console.log(`  TOTAL: ${tot.toLocaleString()}`);
    console.log('\n✅ Done!');
  } finally { await client.end(); }
}

main().catch(e => { console.error('Failed:', e); process.exit(1); });
