#!/usr/bin/env npx ts-node
/**
 * New Mexico OCD Data Ingestion Pipeline
 *
 * Orchestrates: Download → Parse → Load for NM OCD well & production data.
 *
 * Usage:
 *   npx ts-node src/ingestion/new-mexico/index.ts [options]
 *
 * Options:
 *   --download         Download fresh data from NM OCD
 *   --parse-only       Parse files but don't load to database
 *   --wells-file FILE  Use a specific wells JSONL file
 *   --prod-file FILE   Use a specific production JSONL file
 *   --limit N          Limit number of records to process
 *   --year-from YYYY   Only load production data from this year onwards
 *   --year-to YYYY     Only load production data up to this year
 *   --data-dir DIR     Data directory (default: ./data)
 *   --active-only      Only import active/shut-in wells
 *
 * Environment variables:
 *   NM_WDA_EMAIL       EMNRD Water Data Act API email
 *   NM_WDA_PASSWORD    EMNRD Water Data Act API password
 */

import * as path from 'path';
import * as fs from 'fs';
import { pool } from '../../db/pool';
import {
  downloadAll,
  downloadWellsViaAPI,
  downloadProductionViaAPI,
  DownloaderOptions,
} from './downloader';
import {
  parseWDAFiles,
  parseWDAProductionFile,
  parseScrapedFiles,
} from './parser';
import { loadNewMexicoData, LoadResult } from './loader';

// ── CLI argument parsing ──────────────────────────────

interface CliOptions {
  download: boolean;
  parseOnly: boolean;
  wellsFile: string | null;
  prodFile: string | null;
  limit: number;
  yearFrom: number;
  yearTo: number;
  dataDir: string;
  activeOnly: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = {
    download: false,
    parseOnly: false,
    wellsFile: null,
    prodFile: null,
    limit: Infinity,
    yearFrom: 0,
    yearTo: 9999,
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
      case '--wells-file':
        opts.wellsFile = args[++i];
        break;
      case '--prod-file':
        opts.prodFile = args[++i];
        break;
      case '--limit':
        opts.limit = parseInt(args[++i]);
        break;
      case '--year-from':
        opts.yearFrom = parseInt(args[++i]);
        break;
      case '--year-to':
        opts.yearTo = parseInt(args[++i]);
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
  const nmDir = path.join(dataDir, 'nm_ocd');
  if (!fs.existsSync(nmDir)) return null;

  const dateDirs = fs.readdirSync(nmDir)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse();

  for (const dateDir of dateDirs) {
    const fullDir = path.join(nmDir, dateDir);
    const files = fs.readdirSync(fullDir);
    for (const file of files) {
      if (pattern.test(file)) {
        return path.join(fullDir, file);
      }
    }
  }

  return null;
}

function findScrapedFiles(dataDir: string): string[] {
  const nmDir = path.join(dataDir, 'nm_ocd');
  if (!fs.existsSync(nmDir)) return [];

  const dateDirs = fs.readdirSync(nmDir)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse();

  if (dateDirs.length === 0) return [];

  const latestDir = path.join(nmDir, dateDirs[0]);
  return fs.readdirSync(latestDir)
    .filter((f) => /^wells_.*\.html$/i.test(f))
    .map((f) => path.join(latestDir, f));
}

// ── Main pipeline ─────────────────────────────────────

async function main(): Promise<void> {
  const opts = parseArgs();
  const startTime = Date.now();

  const wdaEmail = process.env.NM_WDA_EMAIL;
  const wdaPassword = process.env.NM_WDA_PASSWORD;
  const hasAPICredentials = !!(wdaEmail && wdaPassword);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  New Mexico Oil Conservation Division — Data Ingestion');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Data directory: ${opts.dataDir}`);
  console.log(`  Download mode: ${opts.download ? 'YES' : 'NO (use existing files)'}`);
  console.log(`  Data source: ${hasAPICredentials ? 'EMNRD Water Data Act API' : 'OCD Web Scraper'}`);
  console.log(`  Record limit: ${opts.limit === Infinity ? 'none' : opts.limit.toLocaleString()}`);
  console.log(`  Year range: ${opts.yearFrom || 'all'} - ${opts.yearTo === 9999 ? 'present' : opts.yearTo}`);
  console.log(`  Active only: ${opts.activeOnly}`);
  console.log(`  Parse only: ${opts.parseOnly}`);
  console.log('');

  const downloaderOpts: DownloaderOptions = {
    dataDir: opts.dataDir,
    maxRetries: 3,
    timeoutMs: 60_000,
    wdaEmail,
    wdaPassword,
  };

  // ── Phase 1: Download ──────────────────────────────

  let wellsFilePath = opts.wellsFile;
  let prodFilePath = opts.prodFile;
  let scrapedFiles: string[] = [];

  if (opts.download) {
    console.log('── Phase 1: Download ──────────────────────────────────');

    const results = await downloadAll(downloaderOpts);
    for (const r of results) {
      if (r.filePath.includes('wells')) wellsFilePath = r.filePath;
      if (r.filePath.includes('production')) prodFilePath = r.filePath;
    }

    // If we used the scraper, find the HTML files
    if (!hasAPICredentials) {
      scrapedFiles = findScrapedFiles(opts.dataDir);
    }

    console.log('');
  } else {
    // Find existing files
    if (!wellsFilePath) {
      wellsFilePath = findLatestFile(opts.dataDir, /wda-wells\.jsonl$/i);
    }
    if (!prodFilePath) {
      prodFilePath = findLatestFile(opts.dataDir, /wda-production\.jsonl$/i);
    }
    if (!wellsFilePath) {
      scrapedFiles = findScrapedFiles(opts.dataDir);
    }
  }

  // ── Phase 2: Parse ────────────────────────────────

  console.log('── Phase 2: Parse ────────────────────────────────────');

  const statusFilter = opts.activeOnly ? ['active' as const, 'shut-in' as const] : undefined;

  let assets: Map<string, any>;
  let operators: Map<string, any>;
  let parseStats: any;
  let productions: any[] = [];

  if (wellsFilePath && fs.existsSync(wellsFilePath)) {
    // WDA API mode
    console.log(`  Wells file: ${wellsFilePath}`);
    const wellResult = await parseWDAFiles(wellsFilePath, {
      limit: opts.limit,
      statusFilter,
    });
    assets = wellResult.assets;
    operators = wellResult.operators;
    parseStats = wellResult.stats;

    // Parse production if available
    if (prodFilePath && fs.existsSync(prodFilePath)) {
      console.log(`  Production file: ${prodFilePath}`);
      const prodResult = await parseWDAProductionFile(prodFilePath, {
        limit: opts.limit,
        yearFrom: opts.yearFrom,
        yearTo: opts.yearTo,
      });
      productions = prodResult.productions;
      console.log(`  ✓ Parsed ${prodResult.stats.parsedRows.toLocaleString()} production records`);
    }
  } else if (scrapedFiles.length > 0) {
    // Scraper mode
    console.log(`  Scraped files: ${scrapedFiles.length} county files`);
    const scrapeResult = await parseScrapedFiles(scrapedFiles, { limit: opts.limit });
    assets = scrapeResult.assets;
    operators = scrapeResult.operators;
    parseStats = scrapeResult.stats;
  } else {
    console.error('  ✗ No NM OCD data files available.');
    console.error('    Either download with --download or provide with --wells-file <path>');
    console.error('    For API mode: set NM_WDA_EMAIL and NM_WDA_PASSWORD env vars');
    console.error('    Register at: https://api.emnrd.nm.gov/');
    process.exit(1);
  }

  console.log(`  ✓ Parsed ${parseStats.parsedRows.toLocaleString()} wells`);
  console.log(`    Assets:    ${assets.size.toLocaleString()}`);
  console.log(`    Operators: ${operators.size.toLocaleString()}`);
  console.log(`    Errors:    ${parseStats.errorRows.toLocaleString()}`);
  console.log(`    Duration:  ${parseStats.duration}`);
  console.log('');

  if (opts.parseOnly) {
    console.log('  --parse-only mode: skipping database load.');
    printSummary(startTime);
    return;
  }

  // ── Phase 3: Load ─────────────────────────────────

  console.log('── Phase 3: Load ─────────────────────────────────────');

  const loadResult = await loadNewMexicoData(pool, {
    assets,
    operators: Array.from(operators.values()),
    productions: productions.length > 0 ? productions : undefined,
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
