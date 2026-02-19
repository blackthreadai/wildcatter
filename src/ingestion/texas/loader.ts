/**
 * Texas RRC data loader
 *
 * Inserts normalized data into PostgreSQL with:
 *   - Batch inserts for performance
 *   - Upsert (ON CONFLICT) for idempotency
 *   - Transaction safety
 *   - Provenance tracking
 */

import { Pool, PoolClient } from 'pg';
import { Asset, Operator, ProductionRecord, DataProvenance } from '../../types';

const BATCH_SIZE = 1000;
const SOURCE_NAME = 'TX_RRC';

export interface LoadResult {
  assetsUpserted: number;
  operatorsUpserted: number;
  productionInserted: number;
  provenanceId: string | null;
  duration: string;
  errors: string[];
}

/**
 * Insert or update assets in batch.
 * Upserts on a composite key of (state, asset_type, name) or a generated ID.
 */
async function upsertAssets(
  client: PoolClient,
  assets: Map<string, Omit<Asset, 'id' | 'created_at' | 'updated_at'>>,
): Promise<number> {
  let count = 0;
  const entries = Array.from(assets.entries());

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);

    // Build a multi-row INSERT ... ON CONFLICT statement
    const values: any[] = [];
    const placeholders: string[] = [];

    for (let j = 0; j < batch.length; j++) {
      const [assetId, a] = batch[j];
      const offset = j * 14;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, ` +
        `$${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, ` +
        `$${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, ` +
        `$${offset + 13}, $${offset + 14})`,
      );
      values.push(
        assetId,           // id
        a.asset_type,      // asset_type
        a.name,            // name
        a.state,           // state
        a.county,          // county
        a.latitude,        // latitude
        a.longitude,       // longitude
        a.basin,           // basin
        a.operator_id,     // operator_id
        a.status,          // status
        a.spud_date,       // spud_date
        a.depth_ft,        // depth_ft
        a.commodity,       // commodity
        a.decline_rate,    // decline_rate
      );
    }

    const query = `
      INSERT INTO assets (
        id, asset_type, name, state, county, latitude, longitude,
        basin, operator_id, status, spud_date, depth_ft, commodity, decline_rate
      ) VALUES ${placeholders.join(', ')}
      ON CONFLICT (id) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, assets.name),
        operator_id = COALESCE(EXCLUDED.operator_id, assets.operator_id),
        status = EXCLUDED.status,
        basin = COALESCE(EXCLUDED.basin, assets.basin),
        updated_at = NOW()
    `;

    await client.query(query, values);
    count += batch.length;
  }

  return count;
}

/**
 * Insert or update operators in batch.
 */
async function upsertOperators(
  client: PoolClient,
  operators: Array<{ id: string } & Omit<Operator, 'id' | 'created_at' | 'updated_at'>>,
): Promise<number> {
  let count = 0;

  for (let i = 0; i < operators.length; i += BATCH_SIZE) {
    const batch = operators.slice(i, i + BATCH_SIZE);
    const values: any[] = [];
    const placeholders: string[] = [];

    for (let j = 0; j < batch.length; j++) {
      const op = batch[j];
      const offset = j * 7;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, ` +
        `$${offset + 5}, $${offset + 6}, $${offset + 7})`,
      );
      values.push(
        op.id,
        op.legal_name,
        op.aliases,
        op.hq_state,
        op.hq_city,
        op.active_asset_count,
        op.risk_score,
      );
    }

    const query = `
      INSERT INTO operators (
        id, legal_name, aliases, hq_state, hq_city, active_asset_count, risk_score
      ) VALUES ${placeholders.join(', ')}
      ON CONFLICT (id) DO UPDATE SET
        legal_name = COALESCE(EXCLUDED.legal_name, operators.legal_name),
        aliases = EXCLUDED.aliases || operators.aliases,
        hq_state = COALESCE(EXCLUDED.hq_state, operators.hq_state),
        hq_city = COALESCE(EXCLUDED.hq_city, operators.hq_city),
        updated_at = NOW()
    `;

    await client.query(query, values);
    count += batch.length;
  }

  return count;
}

/**
 * Insert production records in batch.
 * Uses ON CONFLICT on (asset_id, month) to avoid duplicates.
 */
async function insertProduction(
  client: PoolClient,
  records: Omit<ProductionRecord, 'id' | 'created_at'>[],
): Promise<number> {
  let count = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const values: any[] = [];
    const placeholders: string[] = [];

    for (let j = 0; j < batch.length; j++) {
      const r = batch[j];
      const offset = j * 6;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, ` +
        `$${offset + 4}, $${offset + 5}, $${offset + 6})`,
      );
      values.push(
        r.asset_id,
        r.month,
        r.oil_volume_bbl,
        r.gas_volume_mcf,
        r.water_cut_pct,
        r.downtime_days,
      );
    }

    const query = `
      INSERT INTO production_records (
        asset_id, month, oil_volume_bbl, gas_volume_mcf, water_cut_pct, downtime_days
      ) VALUES ${placeholders.join(', ')}
      ON CONFLICT (asset_id, month) DO UPDATE SET
        oil_volume_bbl = COALESCE(EXCLUDED.oil_volume_bbl, production_records.oil_volume_bbl),
        gas_volume_mcf = COALESCE(EXCLUDED.gas_volume_mcf, production_records.gas_volume_mcf),
        water_cut_pct = COALESCE(EXCLUDED.water_cut_pct, production_records.water_cut_pct)
    `;

    await client.query(query, values);
    count += batch.length;
  }

  return count;
}

/**
 * Record data provenance for audit trail.
 */
async function recordProvenance(
  client: PoolClient,
  source: string,
  recordCount: number,
  status: 'success' | 'partial' | 'failed',
  notes: string | null,
): Promise<string | null> {
  const result = await client.query(
    `INSERT INTO data_provenance (source_name, source_url, record_count, status, notes, ingested_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING id`,
    [SOURCE_NAME, source, recordCount, status, notes],
  );
  return result.rows[0]?.id || null;
}

/**
 * Main load function: inserts all parsed TX RRC data into Postgres.
 * Wraps everything in a transaction.
 */
export async function loadTexasData(
  pool: Pool,
  data: {
    assets: Map<string, Omit<Asset, 'id' | 'created_at' | 'updated_at'>>;
    operators: Array<{ id: string } & Omit<Operator, 'id' | 'created_at' | 'updated_at'>>;
    productions: Omit<ProductionRecord, 'id' | 'created_at'>[];
  },
  sourceUrl?: string,
): Promise<LoadResult> {
  const start = Date.now();
  const errors: string[] = [];
  const result: LoadResult = {
    assetsUpserted: 0,
    operatorsUpserted: 0,
    productionInserted: 0,
    provenanceId: null,
    duration: '',
    errors: [],
  };

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Upsert operators first (assets reference them)
    if (data.operators.length > 0) {
      console.log(`  Loading ${data.operators.length} operators...`);
      try {
        result.operatorsUpserted = await upsertOperators(client, data.operators);
      } catch (err) {
        const msg = `Operator upsert error: ${(err as Error).message}`;
        console.error(`  ✗ ${msg}`);
        errors.push(msg);
      }
    }

    // 2. Upsert assets
    if (data.assets.size > 0) {
      console.log(`  Loading ${data.assets.size} assets...`);
      try {
        result.assetsUpserted = await upsertAssets(client, data.assets);
      } catch (err) {
        const msg = `Asset upsert error: ${(err as Error).message}`;
        console.error(`  ✗ ${msg}`);
        errors.push(msg);
      }
    }

    // 3. Insert production records
    if (data.productions.length > 0) {
      console.log(`  Loading ${data.productions.length} production records...`);
      try {
        result.productionInserted = await insertProduction(client, data.productions);
      } catch (err) {
        const msg = `Production insert error: ${(err as Error).message}`;
        console.error(`  ✗ ${msg}`);
        errors.push(msg);
      }
    }

    // 4. Record provenance
    const totalRecords =
      result.assetsUpserted + result.operatorsUpserted + result.productionInserted;
    const status = errors.length === 0 ? 'success' : totalRecords > 0 ? 'partial' : 'failed';

    result.provenanceId = await recordProvenance(
      client,
      sourceUrl || 'TX RRC Bulk Download',
      totalRecords,
      status,
      errors.length > 0 ? errors.join('; ') : null,
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    const msg = `Transaction failed: ${(err as Error).message}`;
    console.error(`  ✗ ${msg}`);
    errors.push(msg);
  } finally {
    client.release();
  }

  result.duration = `${((Date.now() - start) / 1000).toFixed(1)}s`;
  result.errors = errors;

  return result;
}

/**
 * Stream-load production data from a PDQ dump file directly into Postgres.
 * This is more memory-efficient for the full 3+ GB dump.
 */
export async function streamLoadPDQ(
  pool: Pool,
  parsedProductions: AsyncGenerator<import('./parser').ParsedProduction>,
  options?: { batchSize?: number; yearFrom?: number; yearTo?: number },
): Promise<LoadResult> {
  const start = Date.now();
  const errors: string[] = [];
  const batchSize = options?.batchSize || BATCH_SIZE;
  const yearFrom = options?.yearFrom || 0;
  const yearTo = options?.yearTo || 9999;

  let assetsUpserted = 0;
  let productionInserted = 0;
  let operatorsUpserted = 0;

  let productionBatch: Omit<ProductionRecord, 'id' | 'created_at'>[] = [];
  const assetBatch = new Map<string, Omit<Asset, 'id' | 'created_at' | 'updated_at'>>();
  const operatorsSeen = new Set<string>();

  const { pdqToProductionRecord, pdqToAsset, buildAssetId, normalizeOperatorName } = await import('./parser');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for await (const record of parsedProductions) {
      const year = record.month.getFullYear();
      if (year < yearFrom || year > yearTo) continue;

      // Accumulate production
      productionBatch.push(pdqToProductionRecord(record));

      // Accumulate assets
      const assetId = buildAssetId(record.district, record.leaseNumber, record.oilOrGas);
      if (!assetBatch.has(assetId)) {
        assetBatch.set(assetId, pdqToAsset(record));
      }

      // Track operators
      if (record.operatorNumber && !operatorsSeen.has(record.operatorNumber)) {
        operatorsSeen.add(record.operatorNumber);
      }

      // Flush when batch is full
      if (productionBatch.length >= batchSize) {
        try {
          productionInserted += await insertProduction(client, productionBatch);
        } catch (err) {
          errors.push(`Batch insert error: ${(err as Error).message}`);
        }
        productionBatch = [];

        if (assetBatch.size >= batchSize) {
          try {
            assetsUpserted += await upsertAssets(client, assetBatch);
          } catch (err) {
            errors.push(`Asset upsert error: ${(err as Error).message}`);
          }
          assetBatch.clear();
        }

        // Progress logging
        if (productionInserted % 100_000 === 0 && productionInserted > 0) {
          console.log(`  ... ${productionInserted.toLocaleString()} production records loaded`);
        }
      }
    }

    // Flush remaining
    if (productionBatch.length > 0) {
      try {
        productionInserted += await insertProduction(client, productionBatch);
      } catch (err) {
        errors.push(`Final batch insert error: ${(err as Error).message}`);
      }
    }
    if (assetBatch.size > 0) {
      try {
        assetsUpserted += await upsertAssets(client, assetBatch);
      } catch (err) {
        errors.push(`Final asset upsert error: ${(err as Error).message}`);
      }
    }

    // Provenance
    const totalRecords = assetsUpserted + productionInserted;
    const status = errors.length === 0 ? 'success' : totalRecords > 0 ? 'partial' : 'failed';

    const provenanceId = await recordProvenance(
      client,
      'TX RRC PDQ Dump (stream)',
      totalRecords,
      status,
      errors.length > 0 ? errors.join('; ') : null,
    );

    await client.query('COMMIT');

    return {
      assetsUpserted,
      operatorsUpserted,
      productionInserted,
      provenanceId,
      duration: `${((Date.now() - start) / 1000).toFixed(1)}s`,
      errors,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
