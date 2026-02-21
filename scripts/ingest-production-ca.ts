#!/usr/bin/env npx tsx
/**
 * CA Production Data (FracTracker California_Daily_Oil_Production_2022_WFL1)
 * Temp table + LATERAL spatial join approach
 */
import { Client } from 'pg';
import { randomUUID, createHash } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_ID8o0kGRjUba@ep-blue-sunset-ai79p0wt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';
const BASE_URL = 'https://services.arcgis.com/jDGuO8tYggdCCnUJ/arcgis/rest/services/California_Daily_Oil_Production_2022_WFL1/FeatureServer/0/query';
const BATCH = 2000;

async function main() {
  console.log('CA Production Ingestion (FracTracker 2022)\n');

  let allRecords: any[] = [];
  let offset = 0;
  while (true) {
    const params = new URLSearchParams({
      where: '1=1',
      outFields: 'API,OilorCondensateProduced2022,GasProduced2022,Latitude,Longitude',
      f: 'json', resultOffset: String(offset), resultRecordCount: String(BATCH),
      orderByFields: 'OBJECTID ASC',
    });
    let data: any;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const resp = await fetch(`${BASE_URL}?${params}`, { signal: AbortSignal.timeout(30000) });
        data = await resp.json();
        break;
      } catch (err) {
        if (attempt === 5) throw err;
        await new Promise(r => setTimeout(r, 3000 * attempt));
      }
    }
    const features = (data.features || []).map((f: any) => f.attributes);
    if (features.length === 0) break;
    allRecords.push(...features);
    offset += features.length;
    if (offset % 10000 < BATCH) console.log(`  ${offset.toLocaleString()}...`);
    if (!data.exceededTransferLimit && features.length < BATCH) break;
  }
  console.log(`Total: ${allRecords.length.toLocaleString()}\n`);

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await client.query(`DELETE FROM production_records WHERE asset_id IN (SELECT id FROM assets WHERE state = 'CA')`);
    await client.query(`CREATE TEMP TABLE ca_prod_staging (api TEXT, lat NUMERIC, lon NUMERIC, oil NUMERIC, gas NUMERIC)`);

    const CHUNK = 200;
    let loaded = 0;
    for (let i = 0; i < allRecords.length; i += CHUNK) {
      const chunk = allRecords.slice(i, i + CHUNK);
      const vals: string[] = []; const params: any[] = []; let pi = 1;
      for (const r of chunk) {
        const oil = r.OilorCondensateProduced2022 != null ? Number(r.OilorCondensateProduced2022) : 0;
        const gas = r.GasProduced2022 != null ? Number(r.GasProduced2022) : 0;
        if (oil === 0 && gas === 0) continue;
        if (!r.Latitude || !r.Longitude) continue;
        vals.push(`($${pi},$${pi+1},$${pi+2},$${pi+3},$${pi+4})`);
        params.push(String(r.API || `${r.Latitude}-${r.Longitude}`), r.Latitude, r.Longitude, oil, gas);
        pi += 5;
      }
      if (vals.length > 0) {
        await client.query(`INSERT INTO ca_prod_staging VALUES ${vals.join(',')}`, params);
        loaded += vals.length;
      }
    }
    console.log(`Staged ${loaded} records`);

    const { rowCount: inserted } = await client.query(`
      INSERT INTO production_records (id, asset_id, month, oil_volume_bbl, gas_volume_mcf)
      SELECT md5(s.api || '-ca-2022')::uuid, nearest.id, '2022-07-01'::timestamptz, NULLIF(s.oil,0), NULLIF(s.gas,0)
      FROM ca_prod_staging s
      CROSS JOIN LATERAL (
        SELECT a.id FROM assets a
        WHERE a.state = 'CA'
          AND a.latitude::numeric BETWEEN s.lat - 0.002 AND s.lat + 0.002
          AND a.longitude::numeric BETWEEN s.lon - 0.002 AND s.lon + 0.002
        ORDER BY (a.latitude::numeric - s.lat)^2 + (a.longitude::numeric - s.lon)^2
        LIMIT 1
      ) nearest
      ON CONFLICT DO NOTHING
    `);

    console.log(`\n✓ ${(inserted||0).toLocaleString()} production records`);

    await client.query(`INSERT INTO data_provenance (id,source_name,source_url,record_count,status,notes) VALUES ($1,$2,$3,$4,'success',$5)`,
      [randomUUID(), 'CA_PRODUCTION_2022', BASE_URL, inserted||0, `CA 2022 annual production`]);

    const { rows: [s] } = await client.query(`
      SELECT count(DISTINCT asset_id) AS wells,
             coalesce(round(sum(oil_volume_bbl)::numeric),0) AS total_oil,
             coalesce(round(sum(gas_volume_mcf)::numeric),0) AS total_gas
      FROM production_records pr JOIN assets a ON a.id = pr.asset_id WHERE a.state = 'CA'
    `);
    console.log(`CA: ${s.wells} wells, ${Number(s.total_oil).toLocaleString()} bbl oil, ${Number(s.total_gas).toLocaleString()} Mcf gas`);

    await client.query(`DROP TABLE IF EXISTS ca_prod_staging`);
    console.log('✅ Done!');
  } finally { await client.end(); }
}

main().catch(e => { console.error('Failed:', e); process.exit(1); });
