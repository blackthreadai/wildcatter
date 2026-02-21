#!/usr/bin/env npx tsx
import { Client } from 'pg';

const DATABASE_URL = 'postgresql://neondb_owner:npg_ID8o0kGRjUba@ep-blue-sunset-ai79p0wt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const c = new Client({ connectionString: DATABASE_URL });
  await c.connect();
  
  // Sample PA assets
  const { rows: pa } = await c.query(`SELECT latitude, longitude FROM assets WHERE state = 'PA' AND latitude != 0 LIMIT 5`);
  console.log('PA assets (sample lat/lon):', pa);
  
  // Count PA assets with valid coords
  const { rows: [cnt] } = await c.query(`SELECT count(*) as total, count(*) FILTER (WHERE latitude != 0) as with_coords FROM assets WHERE state = 'PA'`);
  console.log('PA totals:', cnt);
  
  // Sample production API lat/lon from FracTracker
  const resp = await fetch('https://services.arcgis.com/jDGuO8tYggdCCnUJ/arcgis/rest/services/PA_Production_2023/FeatureServer/0/query?where=1=1&outFields=API,LATITUDE,LONGITUDE&f=json&resultRecordCount=5');
  const data: any = await resp.json();
  console.log('\nPA production (sample lat/lon):');
  for (const f of data.features) {
    console.log(`  API=${f.attributes.API} lat=${f.attributes.LATITUDE} lon=${f.attributes.LONGITUDE}`);
  }
  
  // Try to find a match manually
  if (pa.length > 0 && data.features.length > 0) {
    const a = pa[0];
    const p = data.features[0].attributes;
    const dist = Math.sqrt(Math.pow(a.latitude - p.LATITUDE, 2) + Math.pow(a.longitude - p.LONGITUDE, 2));
    console.log(`\nDistance between first asset (${a.latitude}, ${a.longitude}) and first prod (${p.LATITUDE}, ${p.LONGITUDE}): ${dist}`);
  }
  
  // Check lat/lon ranges
  const { rows: [ranges] } = await c.query(`SELECT min(latitude) as min_lat, max(latitude) as max_lat, min(longitude) as min_lon, max(longitude) as max_lon FROM assets WHERE state = 'PA' AND latitude != 0`);
  console.log('\nPA asset lat/lon ranges:', ranges);
  
  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
