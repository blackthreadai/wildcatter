#!/usr/bin/env npx ts-node
/**
 * Texas RRC Data Ingestion Pipeline
 *
 * Orchestrates: Download → Parse → Load for TX RRC data.
 *
 * Usage:
 *   npx ts-node src/ingestion/texas/index.ts [--download] [--parse-only] [--year-from YYYY] [--year-to YYYY] [--limit N] [--data-dir DIR] [--pdq-file FILE]
 *
 * Modes:
 *   --download       Download fresh data from TX RRC (default: use existing files)
 *   --parse-only     Parse files but don't load to database
 *   --pdq-file FILE  Use a specific PDQ dump file instead of downloading
 *   --year-from YYYY Only load production data from this year onwards
 *   --year-to YYYY   Only load production data up to this year
 *   --limit N        Limit number of records to process
 *   --data-dir DIR   Data directory (default: ./data)
 *   --stream         Use streaming mode for large files (lower memory)
 */

import * as path from 'path';
import * as fs from 'fs';
import { pool } from '../../db/pool';
import {
  downloadPDQDump,
  downloadP5Organization,
  extractZip,
  DownloaderOptions,
} from './downloader';
import {
  parsePDQDumpFile,
  parsePDQDump,
  parseP5Organization,
  p5ToOperator,
  normalizeOperatorName,
} from './parser';
import { loadTexasData, streamLoadPDQ, LoadResult } from './loader';

// ── CLI argument parsing ──────────────────────────────

interface CliOptions {
  download: boolean;
  parseOnly: boolean;
  stream: boolean;
  pdqFile: string | null;
  yearFrom: number;
  yearTo: number;
  limit: number;
  dataDir: string;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = {
    download: false,
    parseOnly: false,
    stream: false,
    pdqFile: null,
    yearFrom: 0,
    yearTo: 9999,
    limit: Infinity,
    dataDir: path.resolve(process.cwd(), 'data'),
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--download':
        opts.download = true;
        break;
      case '--parse-only':
        opts.parseOnly = true;
        break;
      case '--stream':
        opts.stream = true;
        break;
      case '--pdq-file':
        opts.pdqFile = args[++i];
        break;
      case '--year-from':
        opts.yearFrom = parseInt(args[++i]);
        break;
      case '--year-to':
        opts.yearTo = parseInt(args[++i]);
        break;
      case '--limit':
        opts.limit = parseInt(args[++i]);
        break;
      case '--data-dir':
        opts.dataDir = path.resolve(args[++i]);
        break;
      default:
        console.warn(`Unknown option: ${args[i]}`);
    }
  }

  return opts;
}

// ── Find existing data files ──────────────────────────

function findLatestFile(dataDir: string, pattern: RegExp): string | null {
  const txDir = path.join(dataDir, 'tx_rrc');
  if (!fs.existsSync(txDir)) return null;

  // Look in date-stamped subdirectories (newest first)
  const dateDirs = fs.readdirSync(txDir)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse();

  for (const dateDir of dateDirs) {
    const fullDir = path.join(txDir, dateDir);
    const files = fs.readdirSync(fullDir, { recursive: true }) as string[];
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
  console.log('  Texas Railroad Commission — Data Ingestion Pipeline');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Data directory: ${opts.dataDir}`);
  console.log(`  Download mode: ${opts.download ? 'YES' : 'NO (use existing files)'}`);
  console.log(`  Year range: ${opts.yearFrom || 'all'} - ${opts.yearTo === 9999 ? 'present' : opts.yearTo}`);
  console.log(`  Record limit: ${opts.limit === Infinity ? 'none' : opts.limit.toLocaleString()}`);
  console.log(`  Parse only: ${opts.parseOnly}`);
  console.log(`  Stream mode: ${opts.stream}`);
  console.log('');

  const downloaderOpts: DownloaderOptions = {
    dataDir: opts.dataDir,
    maxRetries: 3,
    timeoutMs: 60_000,
  };

  // ── Phase 1: Download ──────────────────────────────

  let pdqFilePath = opts.pdqFile;
  let p5FilePath: string | null = null;

  if (opts.download) {
    console.log('── Phase 1: Download ──────────────────────────────────');

    try {
      const pdqResult = await downloadPDQDump(downloaderOpts);
      console.log(`  PDQ Dump: ${pdqResult.filePath}`);

      // Extract
      const extractDir = await extractZip(pdqResult.filePath);
      // Find the CSV/DSV file inside
      const extracted = fs.readdirSync(extractDir);
      const dsvFile = extracted.find((f) => /\.(csv|dsv|txt)$/i.test(f));
      pdqFilePath = dsvFile ? path.join(extractDir, dsvFile) : null;
    } catch (err) {
      console.error(`  ✗ PDQ download failed: ${(err as Error).message}`);
    }

    try {
      const p5Result = await downloadP5Organization(downloaderOpts);
      const extractDir = await extractZip(p5Result.filePath);
      const extracted = fs.readdirSync(extractDir);
      const p5File = extracted.find((f) => /p5/i.test(f));
      p5FilePath = p5File ? path.join(extractDir, p5File) : null;
    } catch (err) {
      console.error(`  ✗ P5 download failed: ${(err as Error).message}`);
    }

    console.log('');
  } else {
    // Try to find existing files
    if (!pdqFilePath) {
      pdqFilePath = findLatestFile(opts.dataDir, /PDQ.*\.(csv|dsv|txt)$/i);
    }
    p5FilePath = findLatestFile(opts.dataDir, /p5.*\.(txt|dat|ascii)$/i);
  }

  // ── Phase 2: Parse ────────────────────────────────

  console.log('── Phase 2: Parse ────────────────────────────────────');

  if (!pdqFilePath || !fs.existsSync(pdqFilePath)) {
    console.error('  ✗ No PDQ dump file available.');
    console.error('    Either download with --download or provide with --pdq-file <path>');
    console.error('    You can manually download from:');
    console.error('    https://mft.rrc.texas.gov/link/1f5ddb8d-329a-4459-b7f8-177b4f5ee60d');
    process.exit(1);
  }

  console.log(`  PDQ file: ${pdqFilePath}`);

  // If stream mode, we'll parse+load in one pass (Phase 2 + 3 combined)
  if (opts.stream && !opts.parseOnly) {
    console.log('  Using streaming mode (parse + load combined)...');
    console.log('');
    console.log('── Phase 2+3: Stream Parse & Load ─────────────────────');

    const generator = parsePDQDump(pdqFilePath);
    const result = await streamLoadPDQ(pool, generator, {
      yearFrom: opts.yearFrom,
      yearTo: opts.yearTo,
    });

    printLoadResult(result);
    printSummary(startTime, result);
    await pool.end();
    return;
  }

  // Batch mode: parse everything into memory first
  console.log('  Parsing PDQ dump (batch mode)...');
  const parseResult = await parsePDQDumpFile(pdqFilePath, {
    limit: opts.limit,
    yearFrom: opts.yearFrom,
    yearTo: opts.yearTo,
  });

  console.log(`  ✓ Parsed ${parseResult.stats.parsedRows.toLocaleString()} production records`);
  console.log(`    Assets:    ${parseResult.assets.size.toLocaleString()}`);
  console.log(`    Operators: ${parseResult.operators.size.toLocaleString()}`);
  console.log(`    Errors:    ${parseResult.stats.errorRows.toLocaleString()}`);
  console.log(`    Duration:  ${parseResult.stats.duration}`);

  // Parse P5 operators if available
  let p5Operators: Array<{ id: string } & Omit<import('../../types').Operator, 'id' | 'created_at' | 'updated_at'>> = [];
  if (p5FilePath && fs.existsSync(p5FilePath)) {
    console.log(`  Parsing P5 organization file: ${p5FilePath}`);
    let opCount = 0;
    for await (const op of parseP5Organization(p5FilePath)) {
      if (op.operatorNumber && op.operatorName) {
        p5Operators.push({
          id: op.operatorNumber,
          ...p5ToOperator(op),
        });
        opCount++;
      }
    }
    console.log(`  ✓ Parsed ${opCount.toLocaleString()} operators from P5`);
  } else {
    // Build operator list from PDQ data
    console.log('  No P5 file; building operators from PDQ data...');
    for (const [num, { name }] of parseResult.operators) {
      p5Operators.push({
        id: num,
        legal_name: normalizeOperatorName(name),
        aliases: [name],
        hq_state: 'TX',
        hq_city: null,
        active_asset_count: 0,
        compliance_flags: [],
        risk_score: null,
      });
    }
    console.log(`  ✓ Built ${p5Operators.length.toLocaleString()} operators from PDQ data`);
  }

  console.log('');

  if (opts.parseOnly) {
    console.log('  --parse-only mode: skipping database load.');
    printSummary(startTime);
    return;
  }

  // ── Phase 3: Load ─────────────────────────────────

  console.log('── Phase 3: Load ─────────────────────────────────────');

  const loadResult = await loadTexasData(pool, {
    assets: parseResult.assets,
    operators: p5Operators,
    productions: parseResult.productions,
  });

  printLoadResult(loadResult);
  printSummary(startTime, loadResult);

  await pool.end();
}

function printLoadResult(result: LoadResult): void {
  console.log(`  ✓ Assets upserted:      ${result.assetsUpserted.toLocaleString()}`);
  console.log(`  ✓ Operators upserted:   ${result.operatorsUpserted.toLocaleString()}`);
  console.log(`  ✓ Production inserted:  ${result.productionInserted.toLocaleString()}`);
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
    const totalRecords =
      loadResult.assetsUpserted + loadResult.operatorsUpserted + loadResult.productionInserted;
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
