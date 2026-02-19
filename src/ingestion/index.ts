#!/usr/bin/env npx ts-node
/**
 * Wildcatter Ingestion Orchestrator
 *
 * CLI entry point for running ingestion pipelines.
 *
 * Usage:
 *   npx ts-node src/ingestion/index.ts [flags]
 *
 * Flags:
 *   --all          Run all states → dedup → link
 *   --texas        Run Texas pipeline only
 *   --oklahoma     Run Oklahoma pipeline only
 *   --new-mexico   Run New Mexico pipeline only
 *   --dedup        Run deduplication only
 *   --link         Run linker only
 *   --schedule     Start the cron scheduler
 *   --download     Pass --download to state pipelines
 */

import { execFileSync } from 'child_process';
import * as path from 'path';
import { pool } from '../db/pool';
import { runDeduplication } from './dedup';
import { runLinker } from './linker';
import { startScheduler, runFullSequence } from './scheduler';

// ── CLI parsing ───────────────────────────────────────

interface Flags {
  all: boolean;
  texas: boolean;
  oklahoma: boolean;
  newMexico: boolean;
  dedup: boolean;
  link: boolean;
  schedule: boolean;
  download: boolean;
}

function parseFlags(): Flags {
  const args = new Set(process.argv.slice(2));
  return {
    all: args.has('--all'),
    texas: args.has('--texas'),
    oklahoma: args.has('--oklahoma'),
    newMexico: args.has('--new-mexico'),
    dedup: args.has('--dedup'),
    link: args.has('--link'),
    schedule: args.has('--schedule'),
    download: args.has('--download'),
  };
}

function printUsage(): void {
  console.log(`
Wildcatter Ingestion Orchestrator

Usage: npx ts-node src/ingestion/index.ts [flags]

Flags:
  --all          Run all states → dedup → link
  --texas        Run Texas pipeline only
  --oklahoma     Run Oklahoma pipeline only
  --new-mexico   Run New Mexico pipeline only
  --dedup        Run deduplication only
  --link         Run linker only
  --schedule     Start the cron scheduler
  --download     Pass --download to state pipelines
`);
}

// ── State pipeline runner ─────────────────────────────

function runState(state: string, download: boolean): { success: boolean; duration: string } {
  const script = path.resolve(__dirname, state, 'index.ts');
  const args = ['tsx', script];
  if (download) args.push('--download');

  const start = Date.now();
  try {
    execFileSync('npx', args, {
      stdio: 'inherit',
      timeout: 30 * 60 * 1000,
      cwd: process.cwd(),
    });
    return { success: true, duration: `${((Date.now() - start) / 1000).toFixed(1)}s` };
  } catch (err) {
    console.error(`  ✗ ${state} pipeline failed:`, (err as Error).message);
    return { success: false, duration: `${((Date.now() - start) / 1000).toFixed(1)}s` };
  }
}

// ── Main ──────────────────────────────────────────────

async function main(): Promise<void> {
  const flags = parseFlags();
  const startTime = Date.now();

  const hasAnyFlag = flags.all || flags.texas || flags.oklahoma || flags.newMexico ||
    flags.dedup || flags.link || flags.schedule;

  if (!hasAnyFlag) {
    printUsage();
    process.exit(0);
  }

  // Schedule mode — starts cron and stays running
  if (flags.schedule) {
    startScheduler();
    return; // scheduler keeps process alive
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Wildcatter Ingestion Orchestrator');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  const results: Array<{ step: string; success: boolean; duration: string }> = [];

  // State pipelines
  const statesToRun: string[] = [];
  if (flags.all || flags.texas) statesToRun.push('texas');
  if (flags.all || flags.oklahoma) statesToRun.push('oklahoma');
  if (flags.all || flags.newMexico) statesToRun.push('new-mexico');

  for (const state of statesToRun) {
    const result = runState(state, flags.download);
    results.push({ step: state, ...result });
  }

  // Dedup
  if (flags.all || flags.dedup) {
    const start = Date.now();
    try {
      await runDeduplication(pool);
      results.push({ step: 'dedup', success: true, duration: `${((Date.now() - start) / 1000).toFixed(1)}s` });
    } catch (err) {
      console.error('  ✗ Dedup failed:', (err as Error).message);
      results.push({ step: 'dedup', success: false, duration: `${((Date.now() - start) / 1000).toFixed(1)}s` });
    }
  }

  // Linker
  if (flags.all || flags.link) {
    const start = Date.now();
    try {
      await runLinker(pool);
      results.push({ step: 'link', success: true, duration: `${((Date.now() - start) / 1000).toFixed(1)}s` });
    } catch (err) {
      console.error('  ✗ Linker failed:', (err as Error).message);
      results.push({ step: 'link', success: false, duration: `${((Date.now() - start) / 1000).toFixed(1)}s` });
    }
  }

  // Summary
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  const allPassed = results.every(r => r.success);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════════════');
  for (const r of results) {
    console.log(`  ${r.success ? '✓' : '✗'} ${r.step.padEnd(14)} ${r.duration}`);
  }
  console.log(`  ─────────────────────────────`);
  console.log(`  Total: ${totalDuration}s  Status: ${allPassed ? '✓ SUCCESS' : '⚠ PARTIAL'}`);
  console.log('═══════════════════════════════════════════════════════════');

  await pool.end();
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('Orchestrator failed:', err);
  process.exit(1);
});
