#!/usr/bin/env npx tsx
/**
 * WV Production Data (FracTracker WV Oil + Gas 2002-2018)
 * Monthly fields Y{year}M{month}. Take latest year (2018) totals.
 * Temp table + LATERAL spatial join.
 */
import { Client } from 'pg';
import { randomUUID } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_ID8o0kGRjUba@ep-blue-sunset-ai79p0wt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';
const OIL_URL = 'https://services.arcgis.com/jDGuO8tYggdCCnUJ/arcgis/rest/services/West_Virginia_Oil_Production_by_Well_from_2002_to_2018/FeatureServer/0/query';
const GAS_URL = 'https://services.arcgis.com/jDGuO8tYggdCCnUJ/arcgis/rest/services/West_Virginia_Natural_Gas_Production_by_Well_from_2002_to_2018/FeatureServer/0/query';
const BATCH = 2000;

async function fetchAll(url: string): Promise<any[]> {
  let all: any[] = []; let offset = 0;
  while (true) {
    const params = new URLSearchParams({ where: '1=1', outFields: '*', f: 'json', resultOffset: String(offset), resultRecordCount: String(BATCH), orderByFields: 'FID ASC' });
    const resp = await fetch(`${url}?${params}`, { signal: AbortSignal.timeout(30000) });
    const data: any = await resp.json();
    const features = (data.features || []).map((f: any) => f.attributes);
    if (features.length === 0) break;
    all.push(...features);
    offset += features.length;
    if (!data.exceededTransferLimit && features.length < BATCH) break;
  }
  return all;
}

async function main() {
  console.log('WV Production Ingestion (FracTracker 2002-2018)\n');

  console.log('Fetching oil...');
  const oilRecords = await fetchAll(OIL_URL);
  console.log(`  ${oilRecords.length} oil records`);

  console.log('Fetching gas...');
  const gasRecords = await fetchAll(GAS_URL);
  console.log(`  ${gasRecords.length} gas records`);

  // Index gas by API
  const gasMap = new Map<string, any>();
  for (const r of gasRecords) {
    if (r.API) gasMap.set(String(Math.round(r.API)), r);
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await client.query(`DELETE FROM production_records WHERE asset_id IN (SELECT id FROM assets WHERE state = 'WV')`);
    await client.query(`CREATE TEMP TABLE wv_prod_staging (api TEXT, lat NUMERIC, lon NUMERIC, oil NUMERIC, gas NUMERIC)`);

    const vals: string[] = []; const params: any[] = []; let pi = 1;
    const months = ['01','02','03','04','05','06','07','08','10','11','12'];

    for (const r of oilRecords) {
      if (!r.Surf_Lat || !r.Surf_Long) continue;
      const api = r.API ? String(Math.round(r.API)) : `${r.Surf_Lat}-${r.Surf_Long}`;
      const gasData = gasMap.get(api);

      // Sum 2018 monthly values for annual total
      let totalOil = 0, totalGas = 0;
      for (const m of months) {
        const oilVal = r[`Y2018M${m}`];
        const gasVal = gasData?.[`Y2018M${m}`];
        if (oilVal) totalOil += parseFloat(String(oilVal).replace(/,/g, '')) || 0;
        if (gasVal) totalGas += parseFloat(String(gasVal).replace(/,/g, '')) || 0;
      }
      if (totalOil === 0 && totalGas === 0) continue;

      vals.push(`($${pi},$${pi+1},$${pi+2},$${pi+3},$${pi+4})`);
      params.push(api, r.Surf_Lat, r.Surf_Long, totalOil, totalGas);
      pi += 5;
    }

    if (vals.length > 0) {
      await client.query(`INSERT INTO wv_prod_staging VALUES ${vals.join(',')}`, params);
    }
    console.log(`Staged ${vals.length} records`);

    const { rowCount: inserted } = await client.query(`
      INSERT INTO production_records (id, asset_id, month, oil_volume_bbl, gas_volume_mcf)
      SELECT md5(s.api || '-wv-2018')::uuid, nearest.id, '2018-07-01'::timestamptz, NULLIF(s.oil,0), NULLIF(s.gas,0)
      FROM wv_prod_staging s
      CROSS JOIN LATERAL (
        SELECT a.id FROM assets a
        WHERE a.state = 'WV'
          AND a.latitude::numeric BETWEEN s.lat - 0.005 AND s.lat + 0.005
          AND a.longitude::numeric BETWEEN s.lon - 0.005 AND s.lon + 0.005
        ORDER BY (a.latitude::numeric - s.lat)^2 + (a.longitude::numeric - s.lon)^2
        LIMIT 1
      ) nearest
      ON CONFLICT DO NOTHING
    `);

    console.log(`\n✓ ${(inserted||0).toLocaleString()} production records`);

    await client.query(`INSERT INTO data_provenance (id,source_name,source_url,record_count,status,notes) VALUES ($1,$2,$3,$4,'success',$5)`,
      [randomUUID(), 'WV_PRODUCTION_2018', OIL_URL, inserted||0, `WV 2018 annual production`]);

    const { rows: [s] } = await client.query(`
      SELECT count(DISTINCT asset_id) AS wells,
             coalesce(round(sum(oil_volume_bbl)::numeric),0) AS total_oil,
             coalesce(round(sum(gas_volume_mcf)::numeric),0) AS total_gas
      FROM production_records pr JOIN assets a ON a.id = pr.asset_id WHERE a.state = 'WV'
    `);
    console.log(`WV: ${s.wells} wells, ${Number(s.total_oil).toLocaleString()} bbl oil, ${Number(s.total_gas).toLocaleString()} Mcf gas`);

    await client.query(`DROP TABLE IF EXISTS wv_prod_staging`);
    console.log('✅ Done!');
  } finally { await client.end(); }
}

main().catch(e => { console.error('Failed:', e); process.exit(1); });
