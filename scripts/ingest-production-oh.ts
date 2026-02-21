#!/usr/bin/env npx tsx
/**
 * OH Utica/Marcellus Quarterly Production (FracTracker 2010-Q3 2020)
 * Data uses numbered fields: Year{N}, Quarter{N}, Oil{N}, Gas{N}
 * We take the latest quarter with data per well.
 */
import { Client } from 'pg';
import { randomUUID } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_ID8o0kGRjUba@ep-blue-sunset-ai79p0wt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';
const BASE_URL = 'https://services.arcgis.com/jDGuO8tYggdCCnUJ/arcgis/rest/services/Quarterly_production_of_Fracked_Oil_Gas_and_Brine_from_2010_to_Q3_2020/FeatureServer/0/query';

async function main() {
  console.log('OH Production Ingestion (FracTracker Utica Quarterly)\n');

  // Fetch all records with ALL fields
  const params = new URLSearchParams({
    where: '1=1', outFields: '*', f: 'json',
    resultOffset: '0', resultRecordCount: '5000',
    orderByFields: 'FID ASC',
  });
  const resp = await fetch(`${BASE_URL}?${params}`, { signal: AbortSignal.timeout(60000) });
  const data: any = await resp.json();
  const allRecords = data.features.map((f: any) => f.attributes);
  console.log(`Total: ${allRecords.length}\n`);

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await client.query(`DELETE FROM production_records WHERE asset_id IN (SELECT id FROM assets WHERE state = 'OH')`);
    await client.query(`CREATE TEMP TABLE oh_prod_staging (api TEXT, lat NUMERIC, lon NUMERIC, oil NUMERIC, gas NUMERIC, month DATE)`);

    let loaded = 0;
    const vals: string[] = []; const params2: any[] = []; let pi = 1;

    for (const r of allRecords) {
      if (!r.SurfLat || !r.SurfLon) continue;
      const api = r.API ? String(Math.round(r.API)) : `${r.SurfLat}-${r.SurfLon}`;

      // Find the latest quarter with oil or gas data
      // Fields go up to Year32/Quarter30/Gas32/Oil32
      let bestOil = 0, bestGas = 0, bestYear = 0, bestQ = 0;
      for (let n = 32; n >= 0; n--) {
        const suffix = n === 0 ? '' : String(n);
        const yearKey = n === 0 ? 'Year' : `Year${n}`;
        const qKey = n === 0 ? 'Quarter' : `Quarter${n > 3 ? n - 3 : ''}`;
        const oilKey = `Oil${suffix}`;
        const gasKey = `Gas${suffix}`;
        const oil = Number(r[oilKey] || 0);
        const gas = Number(r[gasKey] || 0);
        if (oil > 0 || gas > 0) {
          bestOil = oil; bestGas = gas;
          bestYear = Number(r[yearKey] || 0);
          // Quarter fields are offset weirdly - just use the year
          bestQ = 3; // default to Q3
          break;
        }
      }

      if (bestOil === 0 && bestGas === 0) continue;
      if (!bestYear) bestYear = 2020;

      const month = `${bestYear}-07-01`; // mid-year approximation
      vals.push(`($${pi},$${pi+1},$${pi+2},$${pi+3},$${pi+4},$${pi+5})`);
      params2.push(api, r.SurfLat, r.SurfLon, bestOil, bestGas, month);
      pi += 6;
      loaded++;
    }

    if (vals.length > 0) {
      await client.query(`INSERT INTO oh_prod_staging VALUES ${vals.join(',')}`, params2);
    }
    console.log(`Staged ${loaded} records`);

    const { rowCount: inserted } = await client.query(`
      INSERT INTO production_records (id, asset_id, month, oil_volume_bbl, gas_volume_mcf)
      SELECT md5(s.api || '-oh-' || s.month::text)::uuid, nearest.id, s.month::timestamptz, NULLIF(s.oil,0), NULLIF(s.gas,0)
      FROM oh_prod_staging s
      CROSS JOIN LATERAL (
        SELECT a.id FROM assets a
        WHERE a.state = 'OH'
          AND a.latitude::numeric BETWEEN s.lat - 0.005 AND s.lat + 0.005
          AND a.longitude::numeric BETWEEN s.lon - 0.005 AND s.lon + 0.005
        ORDER BY (a.latitude::numeric - s.lat)^2 + (a.longitude::numeric - s.lon)^2
        LIMIT 1
      ) nearest
      ON CONFLICT DO NOTHING
    `);

    console.log(`\n✓ ${(inserted||0).toLocaleString()} production records`);

    await client.query(`INSERT INTO data_provenance (id,source_name,source_url,record_count,status,notes) VALUES ($1,$2,$3,$4,'success',$5)`,
      [randomUUID(), 'OH_PRODUCTION_UTICA', BASE_URL, inserted||0, `OH Utica quarterly production`]);

    const { rows: [s] } = await client.query(`
      SELECT count(DISTINCT asset_id) AS wells,
             coalesce(round(sum(oil_volume_bbl)::numeric),0) AS total_oil,
             coalesce(round(sum(gas_volume_mcf)::numeric),0) AS total_gas
      FROM production_records pr JOIN assets a ON a.id = pr.asset_id WHERE a.state = 'OH'
    `);
    console.log(`OH: ${s.wells} wells, ${Number(s.total_oil).toLocaleString()} bbl oil, ${Number(s.total_gas).toLocaleString()} Mcf gas`);

    await client.query(`DROP TABLE IF EXISTS oh_prod_staging`);
    console.log('✅ Done!');
  } finally { await client.end(); }
}

main().catch(e => { console.error('Failed:', e); process.exit(1); });
