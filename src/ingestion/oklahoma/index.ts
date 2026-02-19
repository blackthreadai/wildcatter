#!/usr/bin/env npx ts-node
/**
 * Oklahoma OCC Data Ingestion Pipeline
 *
 * Orchestrates: Download → Parse → Load for OK OCC well data.
 *
 * Usage:
 *   npx ts-node src/ingestion/oklahoma/index.ts [options]
 *
 * Options:
 *   --download        Download fresh data from OCC (default: use existing files)
 *   --parse-only      Parse files but don't load to database
 *   --rbdms-file FILE Use a specific RBDMS CSV file instead of downloading
 *   --limit N         Limit number of records to process
 *   --data-dir DIR    Data directory (default: ./data)
 *   --active-only     Only import active/shut-in wells (skip plugged/abandoned)
 */

import * as path from 'path';
import * as fs from 'fs';
import { pool } from '../../db/pool';
import { downloadRBDMSWells, DownloaderOptions } from './downloader';
import { parseRBDMSFile } from './parser';
import { loadOklahomaData, LoadResult } from './loader';

// ── CLI argument parsing ──────────────────────────────

interface CliOptions {
  download: boolean;
  parseOnly: boolean;
  rbdmsFile: string | null;
  limit: number;
  dataDir: string;
  activeOnly: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = {
    download: false,
    parseOnly: false,
    rbdmsFile: null,
    limit: Infinity,
    dataDir: path.resolve(process.cwd(), 'data'),
    activeOnly: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--download':
        opts.download = true;
        break;
      case '--parse-only':
        opts.parseOnly = true;
        break;
      case '--rbdms-file':
        opts.rbdmsFile = args[++i];
        break;
      case '--limit':
        opts.limit = parseInt(args[++i]);
        break;
      case '--data-dir':
        opts.dataDir = path.resolve(args[++i]);
        break;
      case '--active-only':
        opts.activeOnly = true;
        break;
      default:
        console.warn(`Unknown option: ${args[i]}`);
    }
  }

  return opts;
}

// ── Find existing data files ──────────────────────────

function findLatestFile(dataDir: string, pattern: RegExp): string | null {
  const okDir = path.join(dataDir, 'ok_occ');
  if (!fs.existsSync(okDir)) return null;

  const dateDirs = fs.readdirSync(okDir)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse();

  for (const dateDir of dateDirs) {
    const fullDir = path.join(okDir, dateDir);
    const files = fs.readdirSync(fullDir);
    for (const file of files) {
      if (pattern.test(file)) {
        return path.join(fullDir, file);
      }
    }
  }

  return null;
}

// ── Main pipeline ─────────────────────────────────────

async function main(): Promise<void> {
  const opts = parseArgs();
  const startTime = Date.now();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Oklahoma Corporation Commission — Data Ingestion Pipeline');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Data directory: ${opts.dataDir}`);
  console.log(`  Download mode: ${opts.download ? 'YES' : 'NO (use existing files)'}`);
  console.log(`  Record limit: ${opts.limit === Infinity ? 'none' : opts.limit.toLocaleString()}`);
  console.log(`  Active only: ${opts.activeOnly}`);
  console.log(`  Parse only: ${opts.parseOnly}`);
  console.log('');

  const downloaderOpts: DownloaderOptions = {
    dataDir: opts.dataDir,
    maxRetries: 3,
    timeoutMs: 60_000,
  };

  // ── Phase 1: Download ──────────────────────────────

  let rbdmsFilePath = opts.rbdmsFile;

  if (opts.download) {
    console.log('── Phase 1: Download ──────────────────────────────────');

    try {
      const result = await downloadRBDMSWells(downloaderOpts);
      rbdmsFilePath = result.filePath;
      console.log(`  RBDMS Wells: ${result.filePath}`);
    } catch (err) {
      console.error(`  ✗ RBDMS download failed: ${(err as Error).message}`);
    }

    console.log('');
  } else {
    if (!rbdmsFilePath) {
      rbdmsFilePath = findLatestFile(opts.dataDir, /rbdms.*\.csv$/i);
    }
  }

  // ── Phase 2: Parse ────────────────────────────────

  console.log('── Phase 2: Parse ────────────────────────────────────');

  if (!rbdmsFilePath || !fs.existsSync(rbdmsFilePath)) {
    console.error('  ✗ No RBDMS well data file available.');
    console.error('    Either download with --download or provide with --rbdms-file <path>');
    console.error('    You can manually download from:');
    console.error('    https://oklahoma.gov/content/dam/ok/en/occ/documents/og/ogdatafiles/rbdms-wells.csv');
    process.exit(1);
  }

  console.log(`  RBDMS file: ${rbdmsFilePath}`);
  console.log('  Parsing RBDMS well data...');

  const statusFilter = opts.activeOnly ? ['active' as const, 'shut-in' as const] : undefined;

  const parseResult = await parseRBDMSFile(rbdmsFilePath, {
    limit: opts.limit,
    statusFilter,
  });

  console.log(`  ✓ Parsed ${parseResult.stats.parsedRows.toLocaleString()} wells`);
  console.log(`    Assets:    ${parseResult.assets.size.toLocaleString()}`);
  console.log(`    Operators: ${parseResult.operators.size.toLocaleString()}`);
  console.log(`    Errors:    ${parseResult.stats.errorRows.toLocaleString()}`);
  console.log(`    Duration:  ${parseResult.stats.duration}`);
  console.log('');

  if (opts.parseOnly) {
    console.log('  --parse-only mode: skipping database load.');
    console.log('');
    console.log('  ℹ Note: Oklahoma production data is maintained by the');
    console.log('    Oklahoma Tax Commission, not OCC. See:');
    console.log('    https://oklahoma.gov/tax/businesses/oil-gas-gross-production.html');
    printSummary(startTime);
    return;
  }

  // ── Phase 3: Load ─────────────────────────────────

  console.log('── Phase 3: Load ─────────────────────────────────────');

  const loadResult = await loadOklahomaData(pool, {
    assets: parseResult.assets,
    operators: Array.from(parseResult.operators.values()),
  });

  printLoadResult(loadResult);
  printSummary(startTime, loadResult);

  await pool.end();
}

function printLoadResult(result: LoadResult): void {
  console.log(`  ✓ Assets upserted:      ${result.assetsUpserted.toLocaleString()}`);
  console.log(`  ✓ Operators upserted:   ${result.operatorsUpserted.toLocaleString()}`);
  console.log(`  ✓ Production inserted:  ${result.productionInserted.toLocaleString()} (N/A — see OK Tax Commission)`);
  console.log(`  ✓ Provenance ID:        ${result.provenanceId || 'N/A'}`);
  console.log(`  ✓ Load duration:        ${result.duration}`);
  if (result.errors.length > 0) {
    console.log(`  ⚠ Errors (${result.errors.length}):`);
    for (const err of result.errors) {
      console.log(`    - ${err}`);
    }
  }
}

function printSummary(startTime: number, loadResult?: LoadResult): void {
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Pipeline Complete');
  console.log(`  Total duration: ${totalDuration}s`);
  if (loadResult) {
    const totalRecords = loadResult.assetsUpserted + loadResult.operatorsUpserted;
    console.log(`  Total records: ${totalRecords.toLocaleString()}`);
    console.log(`  Status: ${loadResult.errors.length === 0 ? '✓ SUCCESS' : '⚠ PARTIAL'}`);
  }
  console.log('═══════════════════════════════════════════════════════════');
}

// ── Run ───────────────────────────────────────────────

main().catch((err) => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
