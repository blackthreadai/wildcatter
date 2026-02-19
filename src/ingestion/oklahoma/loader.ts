/**
 * Oklahoma OCC data loader
 *
 * Inserts normalized OCC data into PostgreSQL with:
 *   - Batch upserts for performance
 *   - Transaction safety
 *   - Provenance tracking
 *
 * Reuses shared loader utilities from src/ingestion/shared/.
 */

import { Pool } from 'pg';
import { Asset, Operator } from '../../types';
import {
  upsertAssets,
  upsertOperators,
  recordProvenance,
} from '../shared/loader-utils';

const SOURCE_NAME = 'OK_OCC';

export interface LoadResult {
  assetsUpserted: number;
  operatorsUpserted: number;
  productionInserted: number;
  provenanceId: string | null;
  duration: string;
  errors: string[];
}

/**
 * Main load function: inserts all parsed OK OCC data into Postgres.
 * Wraps everything in a transaction.
 *
 * Note: Production records are not available from OCC (they come from
 * the Oklahoma Tax Commission). This loader handles assets + operators only.
 */
export async function loadOklahomaData(
  pool: Pool,
  data: {
    assets: Map<string, Omit<Asset, 'id' | 'created_at' | 'updated_at'>>;
    operators: Array<{ id: string } & Omit<Operator, 'id' | 'created_at' | 'updated_at'>>;
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

    // 3. Record provenance
    const totalRecords = result.assetsUpserted + result.operatorsUpserted;
    const status = errors.length === 0 ? 'success' : totalRecords > 0 ? 'partial' : 'failed';

    result.provenanceId = await recordProvenance(
      client,
      SOURCE_NAME,
      sourceUrl || 'OK OCC RBDMS Well Data',
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
