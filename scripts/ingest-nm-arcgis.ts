#!/usr/bin/env npx tsx
/**
 * Ingest NM well data from OCD ArcGIS FeatureServer (Wells_Public)
 * 139k+ wells available with no auth required.
 */

import { Client } from 'pg';
import { randomUUID, createHash } from 'crypto';

// Deterministic UUID from a namespace + key
function deterministicUUID(namespace: string, key: string): string {
  const hash = createHash('sha256').update(`${namespace}:${key}`).digest('hex');
  // Format as UUID v4-like (set version nibble to 4, variant to 8-b)
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16),
    ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join('-');
}

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_ID8o0kGRjUba@ep-blue-sunset-ai79p0wt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

const BASE_URL = 'https://gis.emnrd.nm.gov/arcgis/rest/services/OCDView/Wells_Public/FeatureServer/0/query';
const BATCH_SIZE = 2000; // ArcGIS max return
const FIELDS = 'id,name,type,status,ogrid,ogrid_name,county,latitude,longitude,year_spudded,measured_vertical_depth,true_vertical_depth,last_production_date,lease_type,district';

// Basin mapping by county name
const BASIN_MAP: Record<string, string> = {
  'Eddy': 'Permian (Delaware)', 'Lea': 'Permian (Delaware)',
  'Chaves': 'Permian (Delaware)', 'Roosevelt': 'Permian',
  'San Juan': 'San Juan', 'Rio Arriba': 'San Juan',
  'Sandoval': 'San Juan', 'McKinley': 'San Juan',
  'Colfax': 'Raton', 'Union': 'Raton', 'Mora': 'Raton',
  'Quay': 'Tucumcari', 'Guadalupe': 'Tucumcari',
  'San Miguel': 'Tucumcari', 'Harding': 'Tucumcari',
  'Torrance': 'Estancia',
  'Hidalgo': 'Pedregosa', 'Grant': 'Pedregosa', 'Luna': 'Pedregosa',
  'Otero': 'Otero Mesa', 'Lincoln': 'Permian', 'De Baca': 'Permian',
};

const STATUS_MAP: Record<string, string> = {
  'Active': 'active', 'New': 'active', 'Drilling': 'active',
  'Producing': 'active', 'Completed': 'active',
  'Shut-in': 'shut-in', 'Shut In': 'shut-in', 'SI': 'shut-in',
  'TA': 'shut-in', 'Temporarily Abandoned': 'shut-in',
  'Plugged': 'inactive', 'Plugged & Abandoned': 'inactive',
  'PA': 'inactive', 'P&A': 'inactive', 'Cancelled': 'inactive',
  'Expired': 'inactive', 'Dry Hole': 'inactive', 'Inactive': 'inactive',
  'Location': 'inactive', 'Unknown': 'inactive',
};

function mapStatus(s: string): string {
  if (!s) return 'inactive';
  return STATUS_MAP[s] || STATUS_MAP[s.trim()] || 
    (s.toLowerCase().includes('active') || s.toLowerCase().includes('produc') ? 'active' :
     s.toLowerCase().includes('shut') || s.toLowerCase().includes('temp') ? 'shut-in' : 'inactive');
}

function mapType(t: string): string {
  if (!t) return 'oil';
  const lower = t.toLowerCase();
  if (lower.includes('gas') || lower.includes('cbm') || lower.includes('co2')) return 'gas';
  return 'oil';
}

function titleCase(s: string): string {
  if (!s) return '';
  return s.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

async function fetchBatch(offset: number): Promise<any[]> {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: FIELDS,
    f: 'json',
    resultOffset: String(offset),
    resultRecordCount: String(BATCH_SIZE),
    orderByFields: 'OBJECTID ASC',
  });
  
  const resp = await fetch(`${BASE_URL}?${params}`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  return (data.features || []).map((f: any) => f.attributes);
}

async function main() {
  console.log('NM ArcGIS Well Ingestion');
  console.log('========================\n');

  // Count
  const countResp = await fetch(`${BASE_URL}?where=1%3D1&returnCountOnly=true&f=json`);
  const { count } = await countResp.json();
  console.log(`Total wells available: ${count.toLocaleString()}`);

  // Only import non-plugged wells to keep it manageable
  const activeCountResp = await fetch(`${BASE_URL}?where=${encodeURIComponent("status NOT IN ('Plugged','Plugged & Abandoned','PA','Cancelled','Expired','Dry Hole','Location')")}&returnCountOnly=true&f=json`);
  const activeCount = (await activeCountResp.json()).count;
  console.log(`Non-plugged wells: ${activeCount.toLocaleString()}`);
  
  // Fetch all non-plugged wells
  const WHERE = "status NOT IN ('Plugged','Plugged & Abandoned','PA','Cancelled','Expired','Dry Hole','Location')";
  
  let allWells: any[] = [];
  let offset = 0;
  
  while (true) {
    const params = new URLSearchParams({
      where: WHERE,
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
    
    if (offset % 10000 < BATCH_SIZE) {
      console.log(`  Fetched ${offset.toLocaleString()} wells...`);
    }
    
    if (!data.exceededTransferLimit && features.length < BATCH_SIZE) break;
  }
  
  console.log(`\nTotal fetched: ${allWells.length.toLocaleString()} wells`);

  // Collect unique operators
  const operatorMap = new Map<string, { name: string; ogrid: number }>();
  for (const w of allWells) {
    if (w.ogrid && w.ogrid_name) {
      operatorMap.set(String(w.ogrid), { name: w.ogrid_name, ogrid: w.ogrid });
    }
  }
  console.log(`Unique operators: ${operatorMap.size}`);

  // Connect to DB
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('\nConnected to database');

  try {
    // Clean up NM seed data (delete NM assets that have production_records — those are seed data)
    // Real ArcGIS data won't have production records yet
    await client.query(`DELETE FROM financial_estimates WHERE asset_id IN (SELECT a.id FROM assets a JOIN production_records p ON p.asset_id = a.id WHERE a.state = 'NM' GROUP BY a.id)`);
    await client.query(`DELETE FROM production_records WHERE asset_id IN (SELECT id FROM assets WHERE state = 'NM')`);
    const { rowCount: deletedAssets } = await client.query(
      `DELETE FROM assets WHERE state = 'NM'`
    );
    // Also clean up NM seed operators that will be replaced
    await client.query(`DELETE FROM operators WHERE hq_state = 'NM' AND active_asset_count = 0`);
    console.log(`Cleaned ${deletedAssets} old NM assets`);

    // Upsert operators
    console.log(`\nUpserting ${operatorMap.size} operators...`);
    let opCount = 0;
    for (const [ogrid, op] of operatorMap) {
      const opId = deterministicUUID('nm_operator', ogrid);
      await client.query(`
        INSERT INTO operators (id, legal_name, hq_state, active_asset_count)
        VALUES ($1, $2, 'NM', 0)
        ON CONFLICT (id) DO UPDATE SET legal_name = EXCLUDED.legal_name
      `, [opId, titleCase(op.name)]);
      opCount++;
    }
    console.log(`  ✓ ${opCount} operators upserted`);

    // Batch insert wells
    console.log(`\nInserting ${allWells.length.toLocaleString()} wells...`);
    let inserted = 0;
    let skipped = 0;
    const CHUNK = 100;

    for (let i = 0; i < allWells.length; i += CHUNK) {
      const chunk = allWells.slice(i, i + CHUNK);
      const values: string[] = [];
      const params: any[] = [];
      let pi = 1;

      for (const w of chunk) {
        const apiNum = w.id || '';
        if (!apiNum) { skipped++; continue; }

        const assetId = deterministicUUID('nm_well', apiNum);
        const wellName = w.name || `Well ${apiNum}`;
        const county = titleCase(w.county || '');
        const basin = BASIN_MAP[county] || null;
        const opId = w.ogrid ? deterministicUUID('nm_operator', String(w.ogrid)) : null;
        const status = mapStatus(w.status || '');
        const assetType = mapType(w.type || '');
        const commodity = assetType === 'gas' ? 'natural gas' : 'crude oil';
        const lat = w.latitude || 0;
        const lng = w.longitude || 0;
        const depth = w.measured_vertical_depth || w.true_vertical_depth || null;
        const spudDate = w.year_spudded ? `${w.year_spudded}-01-01` : null;

        values.push(`($${pi}, $${pi+1}, $${pi+2}, $${pi+3}, $${pi+4}, $${pi+5}, $${pi+6}, $${pi+7}, $${pi+8}, $${pi+9}, $${pi+10}, $${pi+11}, $${pi+12})`);
        params.push(assetId, assetType, wellName, 'NM', county, lat, lng, basin, opId, status, spudDate, depth, commodity);
        pi += 13;
      }

      if (values.length > 0) {
        await client.query(`
          INSERT INTO assets (id, asset_type, name, state, county, latitude, longitude, basin, operator_id, status, spud_date, depth_ft, commodity)
          VALUES ${values.join(',')}
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            status = EXCLUDED.status,
            operator_id = EXCLUDED.operator_id,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            basin = EXCLUDED.basin,
            depth_ft = EXCLUDED.depth_ft
        `, params);
        inserted += values.length;
      }

      if (inserted % 5000 < CHUNK) {
        console.log(`  ... ${inserted.toLocaleString()} inserted`);
      }
    }

    console.log(`  ✓ ${inserted.toLocaleString()} wells inserted (${skipped} skipped)`);

    // Update operator active_asset_count for NM operators
    await client.query(`
      UPDATE operators SET active_asset_count = sub.cnt
      FROM (SELECT operator_id, count(*)::int AS cnt FROM assets WHERE state = 'NM' AND status = 'active' GROUP BY operator_id) sub
      WHERE operators.id = sub.operator_id
    `);
    console.log('  ✓ Operator asset counts updated');

    // Provenance
    await client.query(`
      INSERT INTO data_provenance (id, source_name, source_url, record_count, status, notes)
      VALUES ($1, 'NM_OCD_ARCGIS', $2, $3, 'success', $4)
    `, [
      randomUUID(),
      'https://gis.emnrd.nm.gov/arcgis/rest/services/OCDView/Wells_Public/FeatureServer/0',
      inserted + opCount,
      `Ingested ${inserted} wells and ${opCount} operators from NM OCD ArcGIS FeatureServer`
    ]);

    // Stats
    const { rows: [stats] } = await client.query(`
      SELECT count(*) AS total,
             count(*) FILTER (WHERE status = 'active') AS active,
             count(*) FILTER (WHERE status = 'shut-in') AS shutin,
             count(*) FILTER (WHERE status = 'inactive') AS inactive
      FROM assets WHERE state = 'NM'
    `);
    console.log(`\n=== NM Well Stats ===`);
    console.log(`  Total: ${stats.total}`);
    console.log(`  Active: ${stats.active}`);
    console.log(`  Shut-in: ${stats.shutin}`);
    console.log(`  Inactive: ${stats.inactive}`);

    const { rows: byCounty } = await client.query(`
      SELECT county, count(*) AS cnt FROM assets WHERE state = 'NM' GROUP BY county ORDER BY cnt DESC LIMIT 10
    `);
    console.log(`\nTop counties:`);
    for (const r of byCounty) console.log(`  ${r.county}: ${r.cnt}`);

    const { rows: byBasin } = await client.query(`
      SELECT basin, count(*) AS cnt FROM assets WHERE state = 'NM' AND basin IS NOT NULL GROUP BY basin ORDER BY cnt DESC
    `);
    console.log(`\nBy basin:`);
    for (const r of byBasin) console.log(`  ${r.basin}: ${r.cnt}`);

    console.log('\n✅ NM ingestion complete!');
  } finally {
    await client.end();
  }
}

main().catch(err => { console.error('Failed:', err); process.exit(1); });
