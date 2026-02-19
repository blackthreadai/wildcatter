/**
 * Asset ↔ Operator Cross-State Linker
 *
 * After all 3 state pipelines run, links assets to canonical operators
 * by matching operator names/aliases across TX, OK, NM.
 */

import { Pool, PoolClient } from 'pg';

export interface LinkerResult {
  operatorsScanned: number;
  assetsLinked: number;
  assetsAlreadyLinked: number;
  assetsUnlinked: number;
  crossStateMatches: number;
  duration: string;
  details: string[];
}

interface OperatorRow {
  id: string;
  legal_name: string;
  aliases: string[];
  hq_state: string | null;
}

/**
 * Normalize an operator name for matching (same logic as dedup).
 */
function normalizeForMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|llp|lp|ltd|co|corp|company|corporation)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build a lookup from all normalized name variants → canonical operator ID.
 */
function buildNameIndex(operators: OperatorRow[]): Map<string, string> {
  const index = new Map<string, string>();

  for (const op of operators) {
    const names = [op.legal_name, ...(op.aliases || [])];
    for (const name of names) {
      const normalized = normalizeForMatch(name);
      if (normalized && !index.has(normalized)) {
        index.set(normalized, op.id);
      }
    }
  }

  return index;
}

/**
 * Run the cross-state asset↔operator linker.
 *
 * For each asset with a NULL operator_id, attempt to find a matching
 * canonical operator by checking the asset's original operator name
 * (stored in data_provenance or as part of the asset name convention)
 * against the full operator name index.
 *
 * Also re-checks assets that have an operator_id to see if a better
 * canonical match exists (e.g., after dedup merged operators).
 */
export async function runLinker(pool: Pool): Promise<LinkerResult> {
  const start = Date.now();
  const details: string[] = [];

  console.log('[Linker] Starting cross-state asset↔operator linking...');

  const client = await pool.connect();
  let operatorsScanned = 0;
  let assetsLinked = 0;
  let assetsAlreadyLinked = 0;
  let assetsUnlinked = 0;
  let crossStateMatches = 0;

  try {
    // Load all operators
    const { rows: operators } = await client.query<OperatorRow>(
      'SELECT id, legal_name, aliases, hq_state FROM operators ORDER BY legal_name',
    );
    operatorsScanned = operators.length;
    console.log(`  Loaded ${operatorsScanned} operators`);

    // Build name→id index
    const nameIndex = buildNameIndex(operators);
    console.log(`  Name index: ${nameIndex.size} normalized variants`);

    // Build operator id→state map for cross-state detection
    const opStateMap = new Map<string, string | null>();
    for (const op of operators) {
      opStateMap.set(op.id, op.hq_state);
    }

    await client.query('BEGIN');

    // Find assets without operator_id that have operator info embedded in name
    // Convention: assets may have operator name in their name field
    // Also check assets whose operator_id points to a now-deleted (merged) operator
    const { rows: assets } = await client.query<{
      id: string;
      name: string;
      state: string;
      operator_id: string | null;
    }>('SELECT id, name, state, operator_id FROM assets');

    console.log(`  Scanning ${assets.length} assets...`);

    // Verify existing links still valid (operator may have been merged/deleted)
    const validOperatorIds = new Set(operators.map(o => o.id));

    for (const asset of assets) {
      if (asset.operator_id && validOperatorIds.has(asset.operator_id)) {
        assetsAlreadyLinked++;
        continue;
      }

      // Asset has no operator_id or points to deleted operator — try to link
      // Try matching asset name parts against operator index
      // Many asset names contain the operator: "OPERATOR NAME - WELL #1"
      const nameParts = asset.name.split(/\s*[-–—#]\s*/);
      let matched = false;

      for (const part of nameParts) {
        const normalized = normalizeForMatch(part);
        if (!normalized) continue;

        const canonicalId = nameIndex.get(normalized);
        if (canonicalId) {
          await client.query(
            'UPDATE assets SET operator_id = $1, updated_at = NOW() WHERE id = $2',
            [canonicalId, asset.id],
          );
          assetsLinked++;
          matched = true;

          // Detect cross-state linking
          const opState = opStateMap.get(canonicalId);
          if (opState && opState !== asset.state) {
            crossStateMatches++;
            details.push(
              `Cross-state: asset "${asset.name}" (${asset.state}) → operator ${canonicalId} (${opState})`,
            );
          }
          break;
        }
      }

      if (!matched) {
        assetsUnlinked++;
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const duration = `${((Date.now() - start) / 1000).toFixed(1)}s`;

  console.log(`  ✓ Operators scanned:    ${operatorsScanned}`);
  console.log(`  ✓ Assets already linked: ${assetsAlreadyLinked}`);
  console.log(`  ✓ Assets newly linked:  ${assetsLinked}`);
  console.log(`  ✓ Assets unlinked:      ${assetsUnlinked}`);
  console.log(`  ✓ Cross-state matches:  ${crossStateMatches}`);
  console.log(`  Duration: ${duration}`);

  return {
    operatorsScanned,
    assetsLinked,
    assetsAlreadyLinked,
    assetsUnlinked,
    crossStateMatches,
    duration,
    details,
  };
}
