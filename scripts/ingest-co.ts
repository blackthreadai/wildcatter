#!/usr/bin/env npx tsx
import { Client } from 'pg';
import { randomUUID, createHash } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_ID8o0kGRjUba@ep-blue-sunset-ai79p0wt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';
const BASE_URL = 'https://services.arcgis.com/jDGuO8tYggdCCnUJ/arcgis/rest/services/co_wells_011217/FeatureServer/0/query';
const BATCH = 2000;

function dUUID(ns: string, key: string): string {
  const h = createHash('sha256').update(`${ns}:${key}`).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-${((parseInt(h[16],16)&0x3)|0x8).toString(16)}${h.slice(17,20)}-${h.slice(20,32)}`;
}

// CO basins by county (approximate)
const DENVER_JULESBURG = ['WELD','ADAMS','ARAPAHOE','BOULDER','BROOMFIELD','DENVER','DOUGLAS','ELBERT','KIT CARSON','LARIMER','LINCOLN','LOGAN','MORGAN','PHILLIPS','SEDGWICK','WASHINGTON','YUMA'];
const PICEANCE = ['GARFIELD','RIO BLANCO','MESA','MOFFAT','ROUTT'];
const SAN_JUAN = ['LA PLATA','ARCHULETA','MONTEZUMA','DOLORES','SAN MIGUEL','SAN JUAN'];
const RATON = ['LAS ANIMAS','HUERFANO'];

function getBasin(county: string): string {
  const c = (county || '').toUpperCase();
  if (DENVER_JULESBURG.includes(c)) return 'Denver-Julesburg Basin';
  if (PICEANCE.includes(c)) return 'Piceance Basin';
  if (SAN_JUAN.includes(c)) return 'San Juan Basin';
  if (RATON.includes(c)) return 'Raton Basin';
  return 'Denver-Julesburg Basin'; // default - DJ is ~80% of CO production
}

// COGCC status codes
function mapStatus(s: string): string {
  if (!s) return 'inactive';
  const code = s.trim().toUpperCase();
  if (['PR','AC','DG','WO','IJ'].includes(code)) return 'active';
  if (['SI','TA'].includes(code)) return 'shut-in';
  return 'inactive'; // DA=Dry/Abandoned, AL=Abandoned Location, XX=misc, DM
}

function mapType(t: string): string {
  if (!t) return 'oil';
  const lower = (t || '').toLowerCase();
  if (lower.includes('gas') || lower === 'gw' || lower === 'g') return 'gas';
  if (lower.includes('inject') || lower === 'iw' || lower === 'ij') return 'injection';
  return 'oil';
}

function titleCase(s: string): string {
  if (!s) return '';
  return s.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// COGCC county codes
const CO_COUNTIES: Record<string, string> = {
  '001':'Adams','003':'Alamosa','005':'Arapahoe','007':'Archuleta','009':'Baca','011':'Bent','013':'Boulder',
  '014':'Broomfield','015':'Chaffee','017':'Cheyenne','019':'Clear Creek','021':'Conejos','023':'Costilla',
  '025':'Crowley','027':'Custer','029':'Delta','031':'Denver','033':'Dolores','035':'Douglas','037':'Eagle',
  '039':'Elbert','041':'El Paso','043':'Fremont','045':'Garfield','047':'Gilpin','049':'Grand','051':'Gunnison',
  '053':'Hinsdale','055':'Huerfano','057':'Jackson','059':'Jefferson','061':'Kiowa','063':'Kit Carson',
  '065':'Lake','067':'La Plata','069':'Larimer','071':'Las Animas','073':'Lincoln','075':'Logan','077':'Mesa',
  '079':'Mineral','081':'Moffat','083':'Montezuma','085':'Montrose','087':'Morgan','089':'Otero','091':'Ouray',
  '093':'Park','095':'Phillips','097':'Pitkin','099':'Prowers','101':'Pueblo','103':'Rio Blanco',
  '105':'Rio Grande','107':'Routt','109':'Saguache','111':'San Juan','113':'San Miguel','115':'Sedgwick',
  '117':'Summit','119':'Teller','121':'Washington','123':'Weld','125':'Yuma',
};

async function main() {
  console.log('CO Well Ingestion (FracTracker/COGCC)\n');

  let allWells: any[] = [];
  let offset = 0;
  while (true) {
    const params = new URLSearchParams({
      where: '1=1', outFields: 'API,Operator,Well_Name,API_County,Latitude,Longitude,Facil_Stat,Facil_Type,Field_Name,Max_MD,Max_TVD',
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
      await client.query(`INSERT INTO operators (id, legal_name, hq_state, active_asset_count) VALUES ($1,$2,'CO',0) ON CONFLICT (id) DO UPDATE SET legal_name=EXCLUDED.legal_name`,
        [dUUID('co_operator', key), name]);
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
        const api = w.API ? String(w.API) : '';
        if (!api) { skipped++; continue; }
        const id = dUUID('co_well', api);
        if (seen.has(id)) { skipped++; continue; }
        seen.add(id);

        const countyCode = w.API_County ? String(w.API_County).padStart(3,'0') : '';
        const county = CO_COUNTIES[countyCode] || '';
        const basin = getBasin(county);
        const opKey = w.Operator ? w.Operator.trim().toUpperCase() : null;
        const opId = opKey ? dUUID('co_operator', opKey) : null;
        const status = mapStatus(w.Facil_Stat || '');
        const type = mapType(w.Facil_Type || '');
        const name = w.Well_Name ? titleCase(w.Well_Name) : `CO Well ${api}`;
        const depth = w.Max_TVD ? parseInt(w.Max_TVD) || (w.Max_MD ? parseInt(w.Max_MD) || null : null) : (w.Max_MD ? parseInt(w.Max_MD) || null : null);

        vals.push(`($${pi},$${pi+1},$${pi+2},$${pi+3},$${pi+4},$${pi+5},$${pi+6},$${pi+7},$${pi+8},$${pi+9},$${pi+10},$${pi+11})`);
        params.push(id, type, name, 'CO', county, w.Latitude||0, w.Longitude||0, basin, opId, status, type==='gas'?'natural gas':'crude oil', depth);
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

    await client.query(`UPDATE operators SET active_asset_count=sub.cnt FROM (SELECT operator_id,count(*)::int AS cnt FROM assets WHERE state='CO' AND status='active' GROUP BY operator_id) sub WHERE operators.id=sub.operator_id`);

    await client.query(`INSERT INTO data_provenance (id,source_name,source_url,record_count,status,notes) VALUES ($1,'CO_FRACTRACKER',$2,$3,'success',$4)`,
      [randomUUID(), BASE_URL, inserted, `${inserted} wells from FracTracker CO dataset`]);

    const { rows: [s] } = await client.query(`SELECT count(*) AS t, count(*) FILTER (WHERE status='active') AS a, count(*) FILTER (WHERE status='shut-in') AS si FROM assets WHERE state='CO'`);
    console.log(`\nCO: ${s.t} total, ${s.a} active, ${s.si} shut-in`);

    const { rows: ov } = await client.query(`SELECT state,count(*)::int AS c FROM assets GROUP BY state ORDER BY c DESC`);
    let tot = 0;
    console.log('\n=== Platform ===');
    ov.forEach((r:any) => { console.log(`  ${r.state}: ${r.c.toLocaleString()}`); tot += r.c; });
    console.log(`  TOTAL: ${tot.toLocaleString()}`);
    console.log('\n✅ Done!');
  } finally { await client.end(); }
}

main().catch(e => { console.error('Failed:', e); process.exit(1); });
