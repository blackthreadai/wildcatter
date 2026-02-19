/**
 * Wildcatter Seed Script
 * Populates the Neon database with realistic oil & gas well data
 * for TX, OK, and NM across major basins.
 */
import { Client } from 'pg';
import { randomUUID } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_ID8o0kGRjUba@ep-blue-sunset-ai79p0wt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

// ── Helpers ──────────────────────────────────────────

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function randInt(min: number, max: number) { return Math.floor(rand(min, max + 1)); }
function pick<T>(arr: T[]): T { return arr[randInt(0, arr.length - 1)]; }
function randDate(startYear: number, endYear: number): string {
  const y = randInt(startYear, endYear);
  const m = randInt(1, 12);
  const d = randInt(1, 28);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ── Operators ────────────────────────────────────────

const OPERATORS = [
  { name: 'Pioneer Natural Resources', state: 'TX', city: 'Irving' },
  { name: 'Devon Energy', state: 'OK', city: 'Oklahoma City' },
  { name: 'Continental Resources', state: 'OK', city: 'Oklahoma City' },
  { name: 'Diamondback Energy', state: 'TX', city: 'Midland' },
  { name: 'EOG Resources', state: 'TX', city: 'Houston' },
  { name: 'Cimarex Energy', state: 'OK', city: 'Tulsa' },
  { name: 'Mewbourne Oil Company', state: 'TX', city: 'Tyler' },
  { name: 'XTO Energy', state: 'TX', city: 'Fort Worth' },
  { name: 'Occidental Petroleum', state: 'TX', city: 'Houston' },
  { name: 'Apache Corporation', state: 'TX', city: 'Houston' },
  { name: 'Marathon Oil', state: 'TX', city: 'Houston' },
  { name: 'Chesapeake Energy', state: 'OK', city: 'Oklahoma City' },
  { name: 'ConocoPhillips', state: 'TX', city: 'Houston' },
  { name: 'Chevron USA', state: 'TX', city: 'Houston' },
  { name: 'ExxonMobil', state: 'TX', city: 'Irving' },
  { name: 'Ovintiv USA', state: 'OK', city: 'Oklahoma City' },
  { name: 'Laredo Petroleum', state: 'TX', city: 'Austin' },
  { name: 'Callon Petroleum', state: 'TX', city: 'Houston' },
  { name: 'Centennial Resource Development', state: 'TX', city: 'Denver' },
  { name: 'Jagged Peak Energy', state: 'TX', city: 'Denver' },
  { name: 'Parsley Energy', state: 'TX', city: 'Austin' },
  { name: 'Cimarron Energy', state: 'OK', city: 'Tulsa' },
  { name: 'Sandridge Energy', state: 'OK', city: 'Oklahoma City' },
  { name: 'Unit Corporation', state: 'OK', city: 'Tulsa' },
  { name: 'Chaparral Energy', state: 'OK', city: 'Oklahoma City' },
  { name: 'Gulfport Energy', state: 'OK', city: 'Oklahoma City' },
  { name: 'Newpark Resources', state: 'TX', city: 'Houston' },
  { name: 'Permian Resources', state: 'TX', city: 'Midland' },
  { name: 'Fasken Oil and Ranch', state: 'TX', city: 'Midland' },
  { name: 'Henry Resources', state: 'TX', city: 'Midland' },
  { name: 'COG Operating', state: 'TX', city: 'Dallas' },
  { name: 'Concho Resources', state: 'TX', city: 'Midland' },
  { name: 'WPX Energy', state: 'NM', city: 'Tulsa' },
  { name: 'Matador Resources', state: 'TX', city: 'Dallas' },
  { name: 'Oxy USA', state: 'TX', city: 'Houston' },
  { name: 'Yates Petroleum', state: 'NM', city: 'Artesia' },
  { name: 'DCP Midstream', state: 'TX', city: 'Denver' },
  { name: 'Harvest Natural Resources', state: 'TX', city: 'Houston' },
  { name: 'Endeavor Energy Resources', state: 'TX', city: 'Midland' },
  { name: 'SM Energy', state: 'TX', city: 'Denver' },
  { name: 'Caza Oil & Gas', state: 'TX', city: 'Houston' },
  { name: 'Ring Energy', state: 'TX', city: 'Midland' },
  { name: 'Lilis Energy', state: 'TX', city: 'Fort Worth' },
  { name: 'Tap Rock Operating', state: 'NM', city: 'Carlsbad' },
  { name: 'Logos Operating', state: 'NM', city: 'Carlsbad' },
  { name: 'XCL Resources', state: 'NM', city: 'Artesia' },
  { name: 'Bravo Natural Resources', state: 'NM', city: 'Farmington' },
  { name: 'Hilcorp Energy', state: 'NM', city: 'Houston' },
  { name: 'Spur Energy Partners', state: 'TX', city: 'Houston' },
  { name: 'Vital Energy', state: 'TX', city: 'Midland' },
  { name: 'Coterra Energy', state: 'TX', city: 'Houston' },
  { name: 'Civitas Resources', state: 'NM', city: 'Denver' },
  { name: 'Repsol E&P USA', state: 'NM', city: 'The Woodlands' },
];

// ── Basin definitions with realistic coordinates ─────

interface BasinDef {
  name: string;
  state: string;
  counties: string[];
  latRange: [number, number];
  lngRange: [number, number];
}

const BASINS: BasinDef[] = [
  // Texas - Permian / Midland Basin
  { name: 'Midland Basin', state: 'TX', counties: ['Midland', 'Martin', 'Howard', 'Glasscock', 'Reagan', 'Upton', 'Crane', 'Ector'], latRange: [31.5, 32.5], lngRange: [-102.5, -101.2] },
  // Texas - Delaware Basin
  { name: 'Delaware Basin', state: 'TX', counties: ['Reeves', 'Loving', 'Ward', 'Pecos', 'Culberson', 'Jeff Davis'], latRange: [31.0, 32.2], lngRange: [-104.2, -103.0] },
  // New Mexico - Permian/Delaware
  { name: 'Delaware Basin', state: 'NM', counties: ['Lea', 'Eddy', 'Chaves'], latRange: [32.0, 33.0], lngRange: [-104.5, -103.2] },
  // New Mexico - San Juan Basin
  { name: 'San Juan Basin', state: 'NM', counties: ['San Juan', 'Rio Arriba', 'Sandoval', 'McKinley'], latRange: [36.0, 37.0], lngRange: [-108.5, -107.0] },
  // Oklahoma - Anadarko Basin
  { name: 'Anadarko Basin', state: 'OK', counties: ['Canadian', 'Caddo', 'Blaine', 'Custer', 'Washita', 'Grady', 'Beckham', 'Roger Mills'], latRange: [35.0, 36.0], lngRange: [-99.5, -97.8] },
  // Oklahoma - SCOOP/STACK
  { name: 'SCOOP', state: 'OK', counties: ['Garvin', 'Grady', 'Stephens', 'Carter', 'McClain'], latRange: [34.4, 35.2], lngRange: [-98.0, -97.0] },
  { name: 'STACK', state: 'OK', counties: ['Kingfisher', 'Canadian', 'Blaine', 'Major'], latRange: [35.5, 36.2], lngRange: [-98.5, -97.5] },
];

const FIELDS = ['North', 'South', 'East', 'West', 'Central', 'Upper', 'Lower', 'Deep', 'Shallow'];
const FIELD_NAMES = ['Wolfcamp', 'Spraberry', 'Bone Spring', 'Avalon', 'Woodford', 'Mississippian', 'Meramec', 'Morrow', 'Chester', 'Devonian', 'Clearfork', 'San Andres', 'Yeso', 'Abo', 'Pictured Cliffs', 'Mancos', 'Gallup', 'Dakota'];
const STATUSES = ['active', 'active', 'active', 'active', 'inactive', 'shut-in']; // weighted toward active
const COMMODITIES = ['oil', 'oil', 'oil', 'natural gas', 'natural gas', 'condensate'];

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to database');

  try {
    // Clear existing data (in dependency order)
    console.log('Clearing existing data...');
    await client.query('DELETE FROM financial_estimates');
    await client.query('DELETE FROM production_records');
    await client.query('DELETE FROM assets');
    await client.query('DELETE FROM operators');
    await client.query('DELETE FROM data_provenance');

    // ── 1. Insert Operators ──────────────────────────
    console.log('Inserting operators...');
    const operatorIds: string[] = [];
    for (const op of OPERATORS) {
      const id = randomUUID();
      operatorIds.push(id);
      await client.query(
        `INSERT INTO operators (id, legal_name, hq_state, hq_city, active_asset_count) VALUES ($1, $2, $3, $4, 0)`,
        [id, op.name, op.state, op.city]
      );
    }
    console.log(`  Inserted ${operatorIds.length} operators`);

    // ── 2. Insert Assets (Wells) ─────────────────────
    console.log('Inserting wells...');
    const WELL_COUNT = 600;
    const wells: { id: string; basin: BasinDef; commodity: string; spudDate: string; status: string; operatorIdx: number }[] = [];

    // Batch insert wells
    let wellValues: string[] = [];
    let wellParams: any[] = [];
    let pi = 1;

    for (let i = 0; i < WELL_COUNT; i++) {
      const basin = pick(BASINS);
      const operatorIdx = randInt(0, operatorIds.length - 1);
      const operator = OPERATORS[operatorIdx];
      const field = `${pick(FIELDS)} ${pick(FIELD_NAMES)}`;
      const wellNum = randInt(1, 99);
      const wellName = `${operator.name.split(' ')[0]} ${field} #${wellNum}${String.fromCharCode(65 + randInt(0, 7))}`;
      const lat = rand(basin.latRange[0], basin.latRange[1]);
      const lng = rand(basin.lngRange[0], basin.lngRange[1]);
      const county = pick(basin.counties);
      const status = pick(STATUSES);
      const commodity = pick(COMMODITIES);
      const spudDate = randDate(2005, 2024);
      const depth = randInt(5000, 15000);
      const declineRate = rand(0.02, 0.12);
      const remainingLife = randInt(12, 240);
      const assetType = commodity === 'natural gas' ? 'gas' : 'oil';
      const id = randomUUID();

      wells.push({ id, basin, commodity, spudDate, status, operatorIdx });

      wellValues.push(`($${pi}, $${pi+1}, $${pi+2}, $${pi+3}, $${pi+4}, $${pi+5}, $${pi+6}, $${pi+7}, $${pi+8}, $${pi+9}, $${pi+10}, $${pi+11}, $${pi+12}, $${pi+13}, $${pi+14})`);
      wellParams.push(id, assetType, wellName, basin.state, county, lat, lng, basin.name, operatorIds[operatorIdx], status, spudDate, depth, commodity, declineRate, remainingLife);
      pi += 15;

      // Batch every 50
      if (wellValues.length >= 50 || i === WELL_COUNT - 1) {
        await client.query(
          `INSERT INTO assets (id, asset_type, name, state, county, latitude, longitude, basin, operator_id, status, spud_date, depth_ft, commodity, decline_rate, estimated_remaining_life_months) VALUES ${wellValues.join(',')}`,
          wellParams
        );
        wellValues = [];
        wellParams = [];
        pi = 1;
      }
    }
    console.log(`  Inserted ${WELL_COUNT} wells`);

    // Update operator active_asset_count
    await client.query(`UPDATE operators SET active_asset_count = (SELECT COUNT(*) FROM assets WHERE assets.operator_id = operators.id AND assets.status = 'active')`);

    // ── 3. Insert Production Records ─────────────────
    console.log('Inserting production records...');
    let prodCount = 0;
    let prodValues: string[] = [];
    let prodParams: any[] = [];
    let ppi = 1;

    for (const well of wells) {
      if (well.status === 'inactive' && Math.random() < 0.3) continue; // some inactive wells have no production

      const months = randInt(12, 60);
      const spudYear = parseInt(well.spudDate.split('-')[0]);
      const spudMonth = parseInt(well.spudDate.split('-')[1]);

      // Initial production rates
      const isOil = well.commodity !== 'natural gas';
      const initialOil = isOil ? rand(50, 2000) : rand(5, 100);
      const initialGas = isOil ? rand(50, 1000) : rand(100, 5000);
      const declineRate = rand(0.03, 0.10); // monthly equivalent of annual decline
      const waterCutBase = rand(5, 30);

      for (let m = 0; m < months; m++) {
        const year = spudYear + Math.floor((spudMonth + m - 1) / 12);
        const month = ((spudMonth + m - 1) % 12) + 1;
        if (year > 2025) break;

        const decay = Math.exp(-declineRate * m / 12);
        const noise = rand(0.8, 1.2);
        const oil = Math.max(0, initialOil * decay * noise);
        const gas = Math.max(0, initialGas * decay * noise);
        const waterCut = Math.min(60, waterCutBase + m * rand(0.1, 0.5));
        const downtime = Math.random() < 0.1 ? rand(1, 10) : 0;

        const monthStr = `${year}-${String(month).padStart(2, '0')}-01`;

        prodValues.push(`($${ppi}, $${ppi+1}, $${ppi+2}, $${ppi+3}, $${ppi+4}, $${ppi+5}, $${ppi+6})`);
        prodParams.push(randomUUID(), well.id, monthStr, oil.toFixed(2), gas.toFixed(2), waterCut.toFixed(2), downtime.toFixed(2));
        ppi += 7;
        prodCount++;

        if (prodValues.length >= 200) {
          await client.query(
            `INSERT INTO production_records (id, asset_id, month, oil_volume_bbl, gas_volume_mcf, water_cut_pct, downtime_days) VALUES ${prodValues.join(',')} ON CONFLICT (asset_id, month) DO NOTHING`,
            prodParams
          );
          prodValues = [];
          prodParams = [];
          ppi = 1;
        }
      }
    }
    // flush remaining
    if (prodValues.length > 0) {
      await client.query(
        `INSERT INTO production_records (id, asset_id, month, oil_volume_bbl, gas_volume_mcf, water_cut_pct, downtime_days) VALUES ${prodValues.join(',')} ON CONFLICT (asset_id, month) DO NOTHING`,
        prodParams
      );
    }
    console.log(`  Inserted ~${prodCount} production records`);

    // ── 4. Insert Financial Estimates ─────────────────
    console.log('Inserting financial estimates...');
    let finCount = 0;
    let finValues: string[] = [];
    let finParams: any[] = [];
    let fpi = 1;

    for (const well of wells) {
      // Get total production for this well
      const prodResult = await client.query(
        `SELECT COALESCE(SUM(oil_volume_bbl), 0) as total_oil, COALESCE(SUM(gas_volume_mcf), 0) as total_gas FROM production_records WHERE asset_id = $1`,
        [well.id]
      );
      const totalOil = parseFloat(prodResult.rows[0].total_oil);
      const totalGas = parseFloat(prodResult.rows[0].total_gas);

      const oilPrice = 70;
      const gasPrice = 3;
      const revenue = totalOil * oilPrice + totalGas * gasPrice;
      const opCostPerBoe = rand(15, 25);
      const boe = totalOil + totalGas / 6; // 6 mcf ≈ 1 boe
      const opCost = boe * opCostPerBoe;
      const netCashFlow = revenue - opCost;
      const breakeven = boe > 0 ? opCost / boe : 0;
      const priceSensitivity = rand(0.5, 2.0);

      finValues.push(`($${fpi}, $${fpi+1}, $${fpi+2}, $${fpi+3}, $${fpi+4}, $${fpi+5}, $${fpi+6}, $${fpi+7})`);
      finParams.push(randomUUID(), well.id, revenue.toFixed(2), opCost.toFixed(2), netCashFlow.toFixed(2), breakeven.toFixed(2), priceSensitivity.toFixed(4), '2025-02-01');
      fpi += 8;
      finCount++;

      if (finValues.length >= 100) {
        await client.query(
          `INSERT INTO financial_estimates (id, asset_id, estimated_revenue, estimated_operating_cost, estimated_net_cash_flow, breakeven_price, price_sensitivity, as_of_date) VALUES ${finValues.join(',')}`,
          finParams
        );
        finValues = [];
        finParams = [];
        fpi = 1;
      }
    }
    if (finValues.length > 0) {
      await client.query(
        `INSERT INTO financial_estimates (id, asset_id, estimated_revenue, estimated_operating_cost, estimated_net_cash_flow, breakeven_price, price_sensitivity, as_of_date) VALUES ${finValues.join(',')}`,
        finParams
      );
    }
    console.log(`  Inserted ${finCount} financial estimates`);

    // ── 5. Data Provenance ───────────────────────────
    await client.query(
      `INSERT INTO data_provenance (id, source_name, source_url, record_count, status, notes) VALUES ($1, $2, $3, $4, $5, $6)`,
      [randomUUID(), 'seed-script', 'src/ingestion/seed.ts', prodCount + finCount + WELL_COUNT, 'success', `Seeded ${OPERATORS.length} operators, ${WELL_COUNT} wells, ~${prodCount} production records, ${finCount} financial estimates`]
    );
    console.log('  Logged provenance record');

    // ── Verify ───────────────────────────────────────
    console.log('\n=== Verification ===');
    const counts = await client.query(`
      SELECT 'operators' as tbl, COUNT(*) as cnt FROM operators
      UNION ALL SELECT 'assets', COUNT(*) FROM assets
      UNION ALL SELECT 'production_records', COUNT(*) FROM production_records
      UNION ALL SELECT 'financial_estimates', COUNT(*) FROM financial_estimates
      UNION ALL SELECT 'data_provenance', COUNT(*) FROM data_provenance
    `);
    for (const row of counts.rows) {
      console.log(`  ${row.tbl}: ${row.cnt}`);
    }

    const stateCounts = await client.query(`SELECT state, COUNT(*) as cnt FROM assets GROUP BY state ORDER BY state`);
    console.log('\nWells by state:');
    for (const row of stateCounts.rows) {
      console.log(`  ${row.state}: ${row.cnt}`);
    }

    const basinCounts = await client.query(`SELECT basin, COUNT(*) as cnt FROM assets GROUP BY basin ORDER BY cnt DESC`);
    console.log('\nWells by basin:');
    for (const row of basinCounts.rows) {
      console.log(`  ${row.basin}: ${row.cnt}`);
    }

    console.log('\n✅ Seed complete!');
  } finally {
    await client.end();
  }
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
