/**
 * New Mexico OCD data loader
 *
 * Inserts normalized NM OCD data into PostgreSQL.
 * Reuses shared loader utilities from src/ingestion/shared/.
 */

import { Pool } from 'pg';
import { Asset, Operator, ProductionRecord } from '../../types';
import {
  upsertAssets,
  upsertOperators,
  insertProduction,
  recordProvenance,
} from '../shared/loader-utils';

const SOURCE_NAME = 'NM_OCD';

export interface LoadResult {
  assetsUpserted: number;
  operatorsUpserted: number;
  productionInserted: number;
  provenanceId: string | null;
  duration: string;
  errors: string[];
}

/**
 * Main load function: inserts all parsed NM OCD data into Postgres.
 * Wraps everything in a transaction.
 */
export async function loadNewMexicoData(
  pool: Pool,
  data: {
    assets: Map<string, Omit<Asset, 'id' | 'created_at' | 'updated_at'>>;
    operators: Array<{ id: string } & Omit<Operator, 'id' | 'created_at' | 'updated_at'>>;
    productions?: Omit<ProductionRecord, 'id' | 'created_at'>[];
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
      console.log(`  Loading ${data.operators.length.toLocaleString()} operators...`);
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
      console.log(`  Loading ${data.assets.size.toLocaleString()} assets...`);
      try {
        result.assetsUpserted = await upsertAssets(client, data.assets);
      } catch (err) {
        const msg = `Asset upsert error: ${(err as Error).message}`;
        console.error(`  ✗ ${msg}`);
        errors.push(msg);
      }
    }

    // 3. Insert production records (if available — WDA API mode only)
    if (data.productions && data.productions.length > 0) {
      console.log(`  Loading ${data.productions.length.toLocaleString()} production records...`);
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
      SOURCE_NAME,
      sourceUrl || 'NM OCD Data',
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
