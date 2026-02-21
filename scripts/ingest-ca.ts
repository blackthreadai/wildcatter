#!/usr/bin/env npx tsx
import { Client } from 'pg';
import { randomUUID, createHash } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_ID8o0kGRjUba@ep-blue-sunset-ai79p0wt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';
const BASE_URL = 'https://services.arcgis.com/jDGuO8tYggdCCnUJ/arcgis/rest/services/FracTrackerNationalWells_Part1_012022/FeatureServer/0/query';
const BATCH = 2000;

function dUUID(ns: string, key: string): string {
  const h = createHash('sha256').update(`${ns}:${key}`).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-${((parseInt(h[16],16)&0x3)|0x8).toString(16)}${h.slice(17,20)}-${h.slice(20,32)}`;
}

function mapStatus(s: string): string {
  if (!s) return 'inactive';
  const lower = s.toLowerCase();
  if (lower === 'active' || lower === 'new') return 'active';
  if (lower === 'idle') return 'shut-in';
  return 'inactive';
}

function titleCase(s: string): string {
  if (!s) return '';
  return s.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// CA basins by lat/lon
function getBasin(lat: number, lon: number): string {
  if (lat > 36.5) return 'San Joaquin Basin'; // Central Valley north
  if (lat > 34.5 && lon < -118.5) return 'Ventura Basin';
  if (lat > 33.5 && lon > -118.5) return 'Los Angeles Basin';
  if (lat <= 34.5 && lat > 33) return 'Los Angeles Basin';
  return 'San Joaquin Basin'; // default - biggest CA basin
}

async function main() {
  console.log('CA Well Ingestion (FracTracker National Wells Part1)\n');

  let allWells: any[] = [];
  let offset = 0;
  while (true) {
    const params = new URLSearchParams({
      where: "State='CA'", outFields: 'OBJECTID,API,Name,Operator,Status,Type,Lat,Long',
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
    if (w.Operator) {
      const key = w.Operator.trim().toUpperCase();
      if (!opMap.has(key)) opMap.set(key, titleCase(w.Operator));
    }
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    console.log(`Upserting ${opMap.size} operators...`);
    for (const [key, name] of opMap) {
      await client.query(`INSERT INTO operators (id, legal_name, hq_state, active_asset_count) VALUES ($1,$2,'CA',0) ON CONFLICT (id) DO UPDATE SET legal_name=EXCLUDED.legal_name`,
        [dUUID('ca_operator', key), name]);
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
        const key = w.API ? String(w.API) : `${w.OBJECTID}-${w.Name || ''}-${w.Lat}-${w.Long}`;
        const id = dUUID('ca_well', key);
        if (seen.has(id)) { skipped++; continue; }
        seen.add(id);

        const basin = getBasin(w.Lat || 0, w.Long || 0);
        const opKey = w.Operator ? w.Operator.trim().toUpperCase() : null;
        const opId = opKey ? dUUID('ca_operator', opKey) : null;
        const status = mapStatus(w.Status || '');
        const type = (w.Type || '').toLowerCase().includes('gas') && !(w.Type || '').toLowerCase().includes('oil') ? 'gas' : 'oil';
        const name = w.Name ? titleCase(w.Name) : `CA Well ${w.OBJECTID}`;

        vals.push(`($${pi},$${pi+1},$${pi+2},$${pi+3},$${pi+4},$${pi+5},$${pi+6},$${pi+7},$${pi+8},$${pi+9})`);
        params.push(id, type, name, 'CA', '', w.Lat||0, w.Long||0, basin, opId, status);
        pi += 10;
      }

      if (vals.length > 0) {
        await client.query(`
          INSERT INTO assets (id,asset_type,name,state,county,latitude,longitude,basin,operator_id,status)
          VALUES ${vals.join(',')}
          ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,status=EXCLUDED.status,operator_id=EXCLUDED.operator_id
        `, params);
        inserted += vals.length;
      }
      if (inserted % 10000 < CHUNK) console.log(`  ${inserted.toLocaleString()}...`);
    }

    console.log(`\n✓ ${inserted.toLocaleString()} wells (${skipped} skipped)`);

    await client.query(`UPDATE operators SET active_asset_count=sub.cnt FROM (SELECT operator_id,count(*)::int AS cnt FROM assets WHERE state='CA' AND status='active' GROUP BY operator_id) sub WHERE operators.id=sub.operator_id`);

    await client.query(`INSERT INTO data_provenance (id,source_name,source_url,record_count,status,notes) VALUES ($1,'CA_FRACTRACKER',$2,$3,'success',$4)`,
      [randomUUID(), BASE_URL, inserted, `${inserted} CA wells from FracTracker National Wells Part1`]);

    const { rows: [s] } = await client.query(`SELECT count(*) AS t, count(*) FILTER (WHERE status='active') AS a, count(*) FILTER (WHERE status='shut-in') AS si FROM assets WHERE state='CA'`);
    console.log(`\nCA: ${s.t} total, ${s.a} active, ${s.si} shut-in`);

    const { rows: ov } = await client.query(`SELECT state,count(*)::int AS c FROM assets GROUP BY state ORDER BY c DESC`);
    let tot = 0;
    console.log('\n=== Platform ===');
    ov.forEach((r:any) => { console.log(`  ${r.state}: ${r.c.toLocaleString()}`); tot += r.c; });
    console.log(`  TOTAL: ${tot.toLocaleString()}`);

    const dbSize = await client.query("SELECT pg_database_size(current_database()) as size");
    console.log(`\nDB: ${(dbSize.rows[0].size / 1024 / 1024).toFixed(0)} MB / 512 MB`);
    console.log('\n✅ Done!');
  } finally { await client.end(); }
}

main().catch(e => { console.error('Failed:', e); process.exit(1); });
