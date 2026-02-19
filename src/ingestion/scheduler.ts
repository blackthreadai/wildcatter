/**
 * Cron-based Scheduled Ingestion Runner
 *
 * Runs state pipelines → dedup → linker on a configurable schedule.
 */

import * as cron from 'node-cron';
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { pool } from '../db/pool';
import { runDeduplication } from './dedup';
import { runLinker } from './linker';

export interface ScheduleConfig {
  texas: string;
  oklahoma: string;
  newMexico: string;
}

const DEFAULT_SCHEDULE: ScheduleConfig = {
  // Default: weekly on Sunday at 2:00 AM
  texas: '0 2 * * 0',
  oklahoma: '0 2 * * 0',
  newMexico: '0 2 * * 0',
};

interface RunState {
  lastRun: Record<string, string | null>;
  lastStatus: Record<string, 'success' | 'failed' | null>;
}

const STATE_FILE = path.resolve(process.cwd(), 'data', 'scheduler-state.json');

function loadState(): RunState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch { /* ignore */ }
  return {
    lastRun: { texas: null, oklahoma: null, newMexico: null },
    lastStatus: { texas: null, oklahoma: null, newMexico: null },
  };
}

function saveState(state: RunState): void {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Run a single state pipeline via its CLI entry point.
 * Returns true on success, false on failure.
 */
async function runStatePipeline(state: 'texas' | 'oklahoma' | 'new-mexico'): Promise<boolean> {
  const script = path.resolve(__dirname, state, 'index.ts');
  console.log(`[Scheduler] Running ${state} pipeline...`);

  try {
    execFileSync('npx', ['tsx', script, '--download'], {
      stdio: 'inherit',
      timeout: 30 * 60 * 1000, // 30 min max
      cwd: process.cwd(),
    });
    console.log(`[Scheduler] ${state} pipeline completed successfully`);
    return true;
  } catch (err) {
    console.error(`[Scheduler] ${state} pipeline failed:`, (err as Error).message);
    return false;
  }
}

/**
 * Run the full ingestion sequence: all states → dedup → linker.
 */
async function runFullSequence(): Promise<void> {
  const runState = loadState();
  const now = new Date().toISOString();

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Scheduled Ingestion Run');
  console.log(`  Started: ${now}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Run each state pipeline independently — one failing doesn't block others
  const states = ['texas', 'oklahoma', 'new-mexico'] as const;

  for (const state of states) {
    const stateKey = state.replace('-', '') as string;
    try {
      const success = await runStatePipeline(state);
      runState.lastRun[stateKey] = now;
      runState.lastStatus[stateKey] = success ? 'success' : 'failed';
    } catch (err) {
      console.error(`[Scheduler] Unexpected error in ${state}:`, err);
      runState.lastRun[stateKey] = now;
      runState.lastStatus[stateKey] = 'failed';
    }
    saveState(runState);
  }

  // Run dedup
  console.log('');
  console.log('[Scheduler] Running deduplication...');
  try {
    await runDeduplication(pool);
  } catch (err) {
    console.error('[Scheduler] Deduplication failed:', (err as Error).message);
  }

  // Run linker
  console.log('');
  console.log('[Scheduler] Running linker...');
  try {
    await runLinker(pool);
  } catch (err) {
    console.error('[Scheduler] Linker failed:', (err as Error).message);
  }

  console.log('');
  console.log('[Scheduler] Full sequence complete');
  console.log('');
}

/**
 * Start the cron scheduler.
 * All states share the same schedule by default (weekly).
 */
export function startScheduler(userSchedule?: Partial<ScheduleConfig>): void {
  const schedule = { ...DEFAULT_SCHEDULE, ...userSchedule };

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Wildcatter Ingestion Scheduler');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Texas schedule:     ${schedule.texas}`);
  console.log(`  Oklahoma schedule:  ${schedule.oklahoma}`);
  console.log(`  New Mexico schedule: ${schedule.newMexico}`);
  console.log('');

  const state = loadState();
  for (const [key, last] of Object.entries(state.lastRun)) {
    console.log(`  Last run (${key}): ${last || 'never'} — ${state.lastStatus[key] || 'n/a'}`);
  }
  console.log('');
  console.log('  Scheduler is running. Press Ctrl+C to stop.');
  console.log('');

  // Use a single unified cron job (simplest — all states run together)
  cron.schedule(schedule.texas, async () => {
    await runFullSequence();
  });

  // Keep process alive
  process.on('SIGINT', async () => {
    console.log('\n[Scheduler] Shutting down...');
    await pool.end();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n[Scheduler] Shutting down...');
    await pool.end();
    process.exit(0);
  });
}

export { runFullSequence };
