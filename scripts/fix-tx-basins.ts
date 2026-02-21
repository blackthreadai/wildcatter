#!/usr/bin/env npx tsx
import { Client } from 'pg';

const DATABASE_URL = 'postgresql://neondb_owner:npg_ID8o0kGRjUba@ep-blue-sunset-ai79p0wt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

const BASINS: [string, number, number, number, number][] = [
  // [name, minLat, maxLat, minLon, maxLon]
  ['Midland Basin',    31.2, 32.8, -102.5, -100.8],
  ['Delaware Basin',   30.5, 32.5, -104.5, -102.5],
  ['Eagle Ford',       27.8, 29.8, -100.0, -96.5],
  ['Barnett Shale',    32.2, 33.5, -98.5, -96.8],
  ['Anadarko Basin',   35.0, 36.6, -103.0, -99.5],
  ['Haynesville',      31.5, 33.0, -95.5, -93.5],
  ['East Texas Basin', 31.0, 33.0, -96.5, -94.5],
  ['Gulf Coast',       26.0, 31.0, -98.0, -93.5],
  ['Permian Basin',    30.0, 33.5, -104.5, -99.5],
  ['Bend Arch',        31.5, 33.5, -99.5, -97.5],
  ['Hardeman Basin',   33.5, 34.5, -100.0, -98.5],
  ['Palo Duro Basin',  33.5, 35.5, -102.5, -99.5],
  ['Val Verde Basin',  29.0, 31.0, -102.0, -100.0],
];

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  
  // Clear existing TX basins first
  console.log('Clearing TX basins...');
  await client.query("UPDATE assets SET basin = NULL WHERE state = 'TX'");
  
  for (const [name, minLat, maxLat, minLon, maxLon] of BASINS) {
    const { rowCount } = await client.query(
      `UPDATE assets SET basin = $1 
       WHERE state = 'TX' AND basin IS NULL 
       AND latitude BETWEEN $2 AND $3 
       AND longitude BETWEEN $4 AND $5`,
      [name, minLat, maxLat, minLon, maxLon]
    );
    console.log(`${name}: ${rowCount?.toLocaleString()}`);
  }

  // Stats
  const { rows } = await client.query(
    "SELECT basin, count(*)::int AS cnt FROM assets WHERE state = 'TX' GROUP BY basin ORDER BY cnt DESC"
  );
  console.log('\nTX Basin Summary:');
  let mapped = 0, unmapped = 0;
  for (const r of rows) {
    console.log(`  ${r.basin || '(unmapped)'}: ${r.cnt.toLocaleString()}`);
    if (r.basin) mapped += r.cnt; else unmapped += r.cnt;
  }
  console.log(`\nMapped: ${mapped.toLocaleString()} | Unmapped: ${unmapped.toLocaleString()}`);
  
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
