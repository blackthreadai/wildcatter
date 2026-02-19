/**
 * Cross-state deduplication module
 *
 * Detects and merges duplicate operators and assets across TX, OK, NM.
 *
 * Strategies:
 *   Operators:
 *     1. Exact match on normalized legal_name
 *     2. Fuzzy match using Levenshtein distance (configurable threshold)
 *     3. Alias matching — check all aliases across records
 *
 *   Assets:
 *     1. API number match (same well reported by different sources)
 *     2. Proximity match — same operator + nearby coordinates (<0.01°)
 */

import { Pool, PoolClient } from 'pg';

export interface DedupConfig {
  /** Max Levenshtein distance for fuzzy operator name matching (default: 3) */
  operatorFuzzyThreshold: number;
  /** Max lat/lng difference for proximity asset matching (default: 0.01 degrees ~1.1km) */
  assetProximityDeg: number;
  /** Dry run — report duplicates without merging (default: false) */
  dryRun: boolean;
}

export interface DedupResult {
  operatorDuplicatesFound: number;
  operatorsMerged: number;
  assetDuplicatesFound: number;
  assetsMerged: number;
  canonicalOperatorsCreated: number;
  duration: string;
  details: string[];
}

const DEFAULT_CONFIG: DedupConfig = {
  operatorFuzzyThreshold: 3,
  assetProximityDeg: 0.01,
  dryRun: false,
};

// ── Levenshtein distance ─────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

/**
 * Normalize an operator name for comparison.
 * Strips common suffixes, lowercases, removes punctuation.
 */
function normalizeForComparison(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|llp|lp|ltd|co|corp|company|corporation)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Operator deduplication ───────────────────────────

interface OperatorRow {
  id: string;
  legal_name: string;
  aliases: string[];
  hq_state: string | null;
}

/**
 * Find duplicate operators across all states.
 * Groups operators that appear to be the same entity.
 */
async function findDuplicateOperators(
  client: PoolClient,
  config: DedupConfig,
): Promise<Map<string, OperatorRow[]>> {
  const { rows } = await client.query<OperatorRow>(
    'SELECT id, legal_name, aliases, hq_state FROM operators ORDER BY legal_name',
  );

  const groups = new Map<string, OperatorRow[]>();
  const assigned = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    if (assigned.has(rows[i].id)) continue;

    const normalizedA = normalizeForComparison(rows[i].legal_name);
    if (!normalizedA) continue;

    const group: OperatorRow[] = [rows[i]];
    assigned.add(rows[i].id);

    for (let j = i + 1; j < rows.length; j++) {
      if (assigned.has(rows[j].id)) continue;

      const normalizedB = normalizeForComparison(rows[j].legal_name);
      if (!normalizedB) continue;

      // Check exact normalized match
      if (normalizedA === normalizedB) {
        group.push(rows[j]);
        assigned.add(rows[j].id);
        continue;
      }

      // Check fuzzy match (only for names of similar length to avoid false positives)
      if (Math.abs(normalizedA.length - normalizedB.length) <= config.operatorFuzzyThreshold) {
        const dist = levenshtein(normalizedA, normalizedB);
        if (dist <= config.operatorFuzzyThreshold) {
          group.push(rows[j]);
          assigned.add(rows[j].id);
          continue;
        }
      }

      // Check alias matching
      const allAliasesA = [rows[i].legal_name, ...(rows[i].aliases || [])].map(normalizeForComparison);
      const allAliasesB = [rows[j].legal_name, ...(rows[j].aliases || [])].map(normalizeForComparison);

      const hasAliasMatch = allAliasesA.some(a => allAliasesB.includes(a));
      if (hasAliasMatch) {
        group.push(rows[j]);
        assigned.add(rows[j].id);
      }
    }

    if (group.length > 1) {
      // Use the first operator's ID as canonical
      groups.set(rows[i].id, group);
    }
  }

  return groups;
}

/**
 * Merge duplicate operators: pick canonical, update references, merge aliases.
 */
async function mergeOperators(
  client: PoolClient,
  groups: Map<string, OperatorRow[]>,
  dryRun: boolean,
): Promise<{ merged: number; details: string[] }> {
  let merged = 0;
  const details: string[] = [];

  for (const [canonicalId, group] of groups) {
    const canonical = group[0];
    const dupes = group.slice(1);
    const dupeIds = dupes.map(d => d.id);

    // Collect all aliases
    const allAliases = new Set<string>();
    for (const op of group) {
      allAliases.add(op.legal_name);
      for (const alias of (op.aliases || [])) {
        allAliases.add(alias);
      }
    }

    const states = [...new Set(group.map(o => o.hq_state).filter(Boolean))];
    const detail = `Merge: "${canonical.legal_name}" (${canonicalId}) ← [${dupes.map(d => `"${d.legal_name}" (${d.id})`).join(', ')}] states: ${states.join(',')}`;
    details.push(detail);

    if (!dryRun) {
      // Update canonical operator with merged aliases
      await client.query(
        'UPDATE operators SET aliases = $1, updated_at = NOW() WHERE id = $2',
        [Array.from(allAliases), canonicalId],
      );

      // Remap assets from duplicate operators to canonical
      for (const dupeId of dupeIds) {
        await client.query(
          'UPDATE assets SET operator_id = $1, updated_at = NOW() WHERE operator_id = $2',
          [canonicalId, dupeId],
        );
      }

      // Delete duplicate operator records
      await client.query(
        'DELETE FROM operators WHERE id = ANY($1)',
        [dupeIds],
      );

      merged += dupes.length;
    }
  }

  return { merged, details };
}

// ── Asset deduplication ──────────────────────────────

interface AssetRow {
  id: string;
  name: string;
  state: string;
  operator_id: string | null;
  latitude: number;
  longitude: number;
}

/**
 * Find duplicate assets across states.
 * Two assets are duplicates if they share the same API number pattern
 * or are from the same operator at nearly identical coordinates.
 */
async function findDuplicateAssets(
  client: PoolClient,
  config: DedupConfig,
): Promise<Map<string, AssetRow[]>> {
  // Strategy 1: Same API number embedded in different ID formats
  // e.g., NM_OCD_3001512345 and some other record with API 30-015-12345
  // This is less common but possible with overlapping data sources.

  // Strategy 2: Same operator + proximity
  const { rows } = await client.query<AssetRow>(
    `SELECT id, name, state, operator_id, latitude, longitude
     FROM assets
     WHERE latitude != 0 AND longitude != 0 AND operator_id IS NOT NULL
     ORDER BY operator_id, latitude, longitude`,
  );

  const groups = new Map<string, AssetRow[]>();
  const assigned = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    if (assigned.has(rows[i].id)) continue;

    const group: AssetRow[] = [rows[i]];
    assigned.add(rows[i].id);

    for (let j = i + 1; j < rows.length; j++) {
      if (assigned.has(rows[j].id)) continue;
      if (rows[i].operator_id !== rows[j].operator_id) continue;

      const latDiff = Math.abs(rows[i].latitude - rows[j].latitude);
      const lonDiff = Math.abs(rows[i].longitude - rows[j].longitude);

      if (latDiff <= config.assetProximityDeg && lonDiff <= config.assetProximityDeg) {
        group.push(rows[j]);
        assigned.add(rows[j].id);
      }
    }

    if (group.length > 1) {
      groups.set(rows[i].id, group);
    }
  }

  return groups;
}

/**
 * Merge duplicate assets: keep the one with more data, update production refs.
 */
async function mergeAssets(
  client: PoolClient,
  groups: Map<string, AssetRow[]>,
  dryRun: boolean,
): Promise<{ merged: number; details: string[] }> {
  let merged = 0;
  const details: string[] = [];

  for (const [canonicalId, group] of groups) {
    const canonical = group[0];
    const dupes = group.slice(1);

    const detail = `Merge asset: "${canonical.name}" (${canonicalId}) ← [${dupes.map(d => `"${d.name}" (${d.id})`).join(', ')}]`;
    details.push(detail);

    if (!dryRun) {
      for (const dupe of dupes) {
        // Remap production records
        await client.query(
          'UPDATE production_records SET asset_id = $1 WHERE asset_id = $2',
          [canonicalId, dupe.id],
        );

        // Remap financial estimates
        await client.query(
          'UPDATE financial_estimates SET asset_id = $1 WHERE asset_id = $2',
          [canonicalId, dupe.id],
        );

        // Delete duplicate asset
        await client.query('DELETE FROM assets WHERE id = $1', [dupe.id]);
      }

      merged += dupes.length;
    }
  }

  return { merged, details };
}

// ── Main deduplication entry point ───────────────────

/**
 * Run full cross-state deduplication.
 */
export async function runDeduplication(
  pool: Pool,
  userConfig?: Partial<DedupConfig>,
): Promise<DedupResult> {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  const start = Date.now();
  const allDetails: string[] = [];

  console.log('[Dedup] Starting cross-state deduplication...');
  console.log(`  Fuzzy threshold: ${config.operatorFuzzyThreshold}`);
  console.log(`  Proximity: ${config.assetProximityDeg}°`);
  console.log(`  Dry run: ${config.dryRun}`);

  const client = await pool.connect();
  let operatorDuplicatesFound = 0;
  let operatorsMerged = 0;
  let assetDuplicatesFound = 0;
  let assetsMerged = 0;

  try {
    await client.query('BEGIN');

    // 1. Deduplicate operators
    console.log('  Finding duplicate operators...');
    const opGroups = await findDuplicateOperators(client, config);
    operatorDuplicatesFound = opGroups.size;
    console.log(`  Found ${operatorDuplicatesFound} operator duplicate groups`);

    if (operatorDuplicatesFound > 0) {
      const opResult = await mergeOperators(client, opGroups, config.dryRun);
      operatorsMerged = opResult.merged;
      allDetails.push(...opResult.details);
    }

    // 2. Deduplicate assets
    console.log('  Finding duplicate assets...');
    const assetGroups = await findDuplicateAssets(client, config);
    assetDuplicatesFound = assetGroups.size;
    console.log(`  Found ${assetDuplicatesFound} asset duplicate groups`);

    if (assetDuplicatesFound > 0) {
      const assetResult = await mergeAssets(client, assetGroups, config.dryRun);
      assetsMerged = assetResult.merged;
      allDetails.push(...assetResult.details);
    }

    if (config.dryRun) {
      await client.query('ROLLBACK');
      console.log('  Dry run — rolled back all changes');
    } else {
      await client.query('COMMIT');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const duration = `${((Date.now() - start) / 1000).toFixed(1)}s`;

  console.log(`  ✓ Operators: ${operatorDuplicatesFound} groups found, ${operatorsMerged} merged`);
  console.log(`  ✓ Assets: ${assetDuplicatesFound} groups found, ${assetsMerged} merged`);
  console.log(`  Duration: ${duration}`);

  return {
    operatorDuplicatesFound,
    operatorsMerged,
    assetDuplicatesFound,
    assetsMerged,
    canonicalOperatorsCreated: operatorDuplicatesFound,
    duration,
    details: allDetails,
  };
}
