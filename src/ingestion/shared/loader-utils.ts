/**
 * Shared batch insert / upsert helpers for all state loaders.
 */

import { PoolClient } from 'pg';
import { Asset, Operator, ProductionRecord } from '../../types';

export const DEFAULT_BATCH_SIZE = 1000;

/**
 * Batch upsert assets. Returns count of rows upserted.
 */
export async function upsertAssets(
  client: PoolClient,
  assets: Map<string, Omit<Asset, 'id' | 'created_at' | 'updated_at'>>,
  batchSize = DEFAULT_BATCH_SIZE,
): Promise<number> {
  let count = 0;
  const entries = Array.from(assets.entries());

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
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
        assetId, a.asset_type, a.name, a.state, a.county,
        a.latitude, a.longitude, a.basin, a.operator_id, a.status,
        a.spud_date, a.depth_ft, a.commodity, a.decline_rate,
      );
    }

    await client.query(
      `INSERT INTO assets (
        id, asset_type, name, state, county, latitude, longitude,
        basin, operator_id, status, spud_date, depth_ft, commodity, decline_rate
      ) VALUES ${placeholders.join(', ')}
      ON CONFLICT (id) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, assets.name),
        operator_id = COALESCE(EXCLUDED.operator_id, assets.operator_id),
        status = EXCLUDED.status,
        basin = COALESCE(EXCLUDED.basin, assets.basin),
        latitude = CASE WHEN EXCLUDED.latitude != 0 THEN EXCLUDED.latitude ELSE assets.latitude END,
        longitude = CASE WHEN EXCLUDED.longitude != 0 THEN EXCLUDED.longitude ELSE assets.longitude END,
        updated_at = NOW()`,
      values,
    );
    count += batch.length;
  }
  return count;
}

/**
 * Batch upsert operators. Returns count of rows upserted.
 */
export async function upsertOperators(
  client: PoolClient,
  operators: Array<{ id: string } & Omit<Operator, 'id' | 'created_at' | 'updated_at'>>,
  batchSize = DEFAULT_BATCH_SIZE,
): Promise<number> {
  let count = 0;

  for (let i = 0; i < operators.length; i += batchSize) {
    const batch = operators.slice(i, i + batchSize);
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
        op.id, op.legal_name, op.aliases, op.hq_state,
        op.hq_city, op.active_asset_count, op.risk_score,
      );
    }

    await client.query(
      `INSERT INTO operators (
        id, legal_name, aliases, hq_state, hq_city, active_asset_count, risk_score
      ) VALUES ${placeholders.join(', ')}
      ON CONFLICT (id) DO UPDATE SET
        legal_name = COALESCE(EXCLUDED.legal_name, operators.legal_name),
        aliases = EXCLUDED.aliases || operators.aliases,
        hq_state = COALESCE(EXCLUDED.hq_state, operators.hq_state),
        hq_city = COALESCE(EXCLUDED.hq_city, operators.hq_city),
        updated_at = NOW()`,
      values,
    );
    count += batch.length;
  }
  return count;
}

/**
 * Batch insert production records with upsert on (asset_id, month).
 */
export async function insertProduction(
  client: PoolClient,
  records: Omit<ProductionRecord, 'id' | 'created_at'>[],
  batchSize = DEFAULT_BATCH_SIZE,
): Promise<number> {
  let count = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
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
        r.asset_id, r.month, r.oil_volume_bbl,
        r.gas_volume_mcf, r.water_cut_pct, r.downtime_days,
      );
    }

    await client.query(
      `INSERT INTO production_records (
        asset_id, month, oil_volume_bbl, gas_volume_mcf, water_cut_pct, downtime_days
      ) VALUES ${placeholders.join(', ')}
      ON CONFLICT (asset_id, month) DO UPDATE SET
        oil_volume_bbl = COALESCE(EXCLUDED.oil_volume_bbl, production_records.oil_volume_bbl),
        gas_volume_mcf = COALESCE(EXCLUDED.gas_volume_mcf, production_records.gas_volume_mcf),
        water_cut_pct = COALESCE(EXCLUDED.water_cut_pct, production_records.water_cut_pct)`,
      values,
    );
    count += batch.length;
  }
  return count;
}

/**
 * Record data provenance.
 */
export async function recordProvenance(
  client: PoolClient,
  sourceName: string,
  sourceUrl: string | null,
  recordCount: number,
  status: 'success' | 'partial' | 'failed',
  notes: string | null,
): Promise<string | null> {
  const result = await client.query(
    `INSERT INTO data_provenance (source_name, source_url, record_count, status, notes, ingested_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING id`,
    [sourceName, sourceUrl, recordCount, status, notes],
  );
  return result.rows[0]?.id || null;
}
