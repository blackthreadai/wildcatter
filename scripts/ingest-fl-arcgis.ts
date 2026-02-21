#!/usr/bin/env npx tsx
/**
 * Ingest FL well data from DEP ArcGIS (OIL_WELLS)
 * ~1,477 permitted oil and gas wells.
 */

import { Client } from 'pg';
import { randomUUID, createHash } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_ID8o0kGRjUba@ep-blue-sunset-ai79p0wt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

const BASE_URL = 'https://ca.dep.state.fl.us/arcgis/rest/services/OpenData/OIL_WELLS/MapServer/0/query';
const BATCH_SIZE = 1000;
const FIELDS = 'API_NO,PERMITNO,WELL_NAME,COMPANY,COUNTY,OIL_FIELD,CURRENT_STATUS,LATITUDE,LONGITUDE,SPUD_DATE,TVD,MD';

function deterministicUUID(namespace: string, key: string): string {
  const hash = createHash('sha256').update(`${namespace}:${key}`).digest('hex');
  return [
    hash.slice(0, 8), hash.slice(8, 12),
    '4' + hash.slice(13, 16),
    ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join('-');
}

// Florida basins by county
const BASIN_MAP: Record<string, string> = {
  'Collier': 'South Florida (Sunniland)', 'Hendry': 'South Florida (Sunniland)',
  'Lee': 'South Florida (Sunniland)', 'Dade': 'South Florida (Sunniland)',
  'Monroe': 'South Florida (Sunniland)', 'Broward': 'South Florida (Sunniland)',
  'Palm Beach': 'South Florida (Sunniland)', 'Glades': 'South Florida (Sunniland)',
  'Charlotte': 'South Florida (Sunniland)', 'Highlands': 'South Florida (Sunniland)',
  'Desoto': 'South Florida (Sunniland)', 'Hardee': 'South Florida (Sunniland)',
  'Polk': 'South Florida (Sunniland)', 'Okeechobee': 'South Florida (Sunniland)',
  'St. Lucie': 'South Florida (Sunniland)', 'Martin': 'South Florida (Sunniland)',
  'Indian River': 'South Florida (Sunniland)',
  'Santa Rosa': 'Jay Field (NW Florida)', 'Escambia': 'Jay Field (NW Florida)',
  'Okaloosa': 'Jay Field (NW Florida)',
  'Columbia': 'North Florida', 'Baker': 'North Florida',
  'Bradford': 'North Florida', 'Union': 'North Florida',
  'Alachua': 'North Florida', 'Suwannee': 'North Florida',
};

const STATUS_MAP: Record<string, string> = {
  'Producing': 'active', 'Active': 'active', 'Drilling': 'active',
  'Completed': 'active', 'Permitted': 'active',
  'Shut In': 'shut-in', 'Shut-In': 'shut-in', 'SI': 'shut-in',
  'TA': 'shut-in', 'Temporarily Abandoned': 'shut-in',
  'Plugged': 'inactive', 'Plugged & Abandoned': 'inactive',
  'P&A': 'inactive', 'PA': 'inactive', 'Dry Hole': 'inactive',
  'Abandoned': 'inactive', 'Cancelled': 'inactive', 'Expired': 'inactive',
  'Never Drilled': 'inactive',
};

function mapStatus(s: string): string {
  if (!s) return 'inactive';
  const mapped = STATUS_MAP[s] || STATUS_MAP[s.trim()];
  if (mapped) return mapped;
  const lower = s.toLowerCase();
  if (lower.includes('produc') || lower.includes('active') || lower.includes('drill')) return 'active';
  if (lower.includes('shut') || lower.includes('temp')) return 'shut-in';
  return 'inactive';
}

function titleCase(s: string): string {
  if (!s) return '';
  return s.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

async function main() {
  console.log('FL ArcGIS Well Ingestion');
  console.log('========================\n');

  // Fetch all wells
  let allWells: any[] = [];
  let offset = 0;
  
  while (true) {
    const params = new URLSearchParams({
      where: '1=1',
      outFields: FIELDS,
      f: 'json',
      resultOffset: String(offset),
      resultRecordCount: String(BATCH_SIZE),
      orderByFields: 'OBJECTID ASC',
    });
    
    const resp = await fetch(`${BASE_URL}?${params}`);
    const data = await resp.json();
    const features = (data.features || []).map((f: any) => f.attributes);
    
    if (features.length === 0) break;
    allWells.push(...features);
    offset += features.length;
    console.log(`  Fetched ${offset} wells...`);
    
    if (!data.exceededTransferLimit && features.length < BATCH_SIZE) break;
  }
  
  console.log(`Total fetched: ${allWells.length} wells\n`);

  // Collect operators
  const operatorMap = new Map<string, string>();
  for (const w of allWells) {
    if (w.COMPANY) {
      const key = w.COMPANY.trim().toUpperCase();
      if (!operatorMap.has(key)) operatorMap.set(key, titleCase(w.COMPANY));
    }
  }
  console.log(`Unique operators: ${operatorMap.size}`);

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to database\n');

  try {
    // Upsert operators
    console.log(`Upserting ${operatorMap.size} operators...`);
    let opCount = 0;
    for (const [key, name] of operatorMap) {
      const opId = deterministicUUID('fl_operator', key);
      await client.query(`
        INSERT INTO operators (id, legal_name, hq_state, active_asset_count)
        VALUES ($1, $2, 'FL', 0)
        ON CONFLICT (id) DO UPDATE SET legal_name = EXCLUDED.legal_name
      `, [opId, name]);
      opCount++;
    }
    console.log(`  ✓ ${opCount} operators\n`);

    // Insert wells
    console.log(`Inserting ${allWells.length} wells...`);
    let inserted = 0;
    let skipped = 0;
    const CHUNK = 50;

    for (let i = 0; i < allWells.length; i += CHUNK) {
      const chunk = allWells.slice(i, i + CHUNK);
      const values: string[] = [];
      const params: any[] = [];
      let pi = 1;

      for (const w of chunk) {
        const permitNo = w.PERMITNO || w.API_NO || '';
        if (!permitNo) { skipped++; continue; }

        const assetId = deterministicUUID('fl_well', permitNo);
        const wellName = w.WELL_NAME ? titleCase(w.WELL_NAME) : `FL Well ${permitNo}`;
        const county = titleCase(w.COUNTY || '');
        const basin = BASIN_MAP[county] || (county ? `Florida (${county})` : null);
        const opKey = w.COMPANY ? w.COMPANY.trim().toUpperCase() : null;
        const opId = opKey ? deterministicUUID('fl_operator', opKey) : null;
        const status = mapStatus(w.CURRENT_STATUS || '');
        const lat = w.LATITUDE || 0;
        const lng = w.LONGITUDE || 0;
        const depth = w.TVD || w.MD || null;
        const spudDate = w.SPUD_DATE ? new Date(w.SPUD_DATE).toISOString().split('T')[0] : null;

        values.push(`($${pi}, $${pi+1}, $${pi+2}, $${pi+3}, $${pi+4}, $${pi+5}, $${pi+6}, $${pi+7}, $${pi+8}, $${pi+9}, $${pi+10}, $${pi+11}, $${pi+12})`);
        params.push(assetId, 'oil', wellName, 'FL', county, lat, lng, basin, opId, status, spudDate, depth, 'crude oil');
        pi += 13;
      }

      if (values.length > 0) {
        await client.query(`
          INSERT INTO assets (id, asset_type, name, state, county, latitude, longitude, basin, operator_id, status, spud_date, depth_ft, commodity)
          VALUES ${values.join(',')}
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name, status = EXCLUDED.status, operator_id = EXCLUDED.operator_id,
            latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, basin = EXCLUDED.basin, depth_ft = EXCLUDED.depth_ft
        `, params);
        inserted += values.length;
      }
    }

    console.log(`  ✓ ${inserted} wells inserted (${skipped} skipped)\n`);

    // Update operator counts
    await client.query(`
      UPDATE operators SET active_asset_count = sub.cnt
      FROM (SELECT operator_id, count(*)::int AS cnt FROM assets WHERE state = 'FL' AND status = 'active' GROUP BY operator_id) sub
      WHERE operators.id = sub.operator_id
    `);

    // Provenance
    await client.query(`
      INSERT INTO data_provenance (id, source_name, source_url, record_count, status, notes)
      VALUES ($1, 'FL_DEP_ARCGIS', $2, $3, 'success', $4)
    `, [
      randomUUID(),
      'https://ca.dep.state.fl.us/arcgis/rest/services/OpenData/OIL_WELLS/MapServer/0',
      inserted + opCount,
      `Ingested ${inserted} wells and ${opCount} operators from FL DEP ArcGIS`
    ]);

    // Stats
    const { rows: [stats] } = await client.query(`
      SELECT count(*) AS total,
             count(*) FILTER (WHERE status = 'active') AS active,
             count(*) FILTER (WHERE status = 'shut-in') AS shutin,
             count(*) FILTER (WHERE status = 'inactive') AS inactive
      FROM assets WHERE state = 'FL'
    `);
    console.log(`=== FL Well Stats ===`);
    console.log(`  Total: ${stats.total}`);
    console.log(`  Active: ${stats.active}`);
    console.log(`  Shut-in: ${stats.shutin}`);
    console.log(`  Inactive: ${stats.inactive}`);

    const { rows: byCounty } = await client.query(`
      SELECT county, count(*) AS cnt FROM assets WHERE state = 'FL' GROUP BY county ORDER BY cnt DESC LIMIT 10
    `);
    console.log(`\nTop counties:`);
    for (const r of byCounty) console.log(`  ${r.county}: ${r.cnt}`);

    // Overall platform stats
    const { rows: overall } = await client.query(`SELECT state, count(*)::int AS cnt FROM assets GROUP BY state ORDER BY cnt DESC`);
    console.log(`\n=== Platform Totals ===`);
    for (const r of overall) console.log(`  ${r.state}: ${r.cnt.toLocaleString()}`);

    console.log('\n✅ FL ingestion complete!');
  } finally {
    await client.end();
  }
}

main().catch(err => { console.error('Failed:', err); process.exit(1); });
