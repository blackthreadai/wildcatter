/**
 * Oklahoma OCC data downloader
 *
 * Downloads bulk data files from the Oklahoma Corporation Commission.
 * Primary source: RBDMS Well Data (CSV, updated nightly).
 * Secondary: Completions master (XLSX), ITD data (XLSX).
 */

import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { OCC_DATA_URLS } from './constants';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

export interface DownloadResult {
  filePath: string;
  sizeBytes: number;
  source: string;
  downloadedAt: Date;
}

export interface DownloaderOptions {
  dataDir: string;
  maxRetries?: number;
  timeoutMs?: number;
}

function ensureDateDir(baseDir: string): string {
  const dateStr = new Date().toISOString().split('T')[0];
  const dir = path.join(baseDir, 'ok_occ', dateStr);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function createClient(timeoutMs: number): AxiosInstance {
  return axios.create({
    timeout: timeoutMs,
    maxRedirects: 10,
    headers: {
      'User-Agent': 'Wildcatter-DataPipeline/0.1 (Energy Analytics)',
      Accept: '*/*',
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Download a file from a direct URL (OCC uses simple static file hosting).
 */
async function downloadFile(
  client: AxiosInstance,
  url: string,
  destDir: string,
  filename: string,
  maxRetries: number,
): Promise<DownloadResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  [attempt ${attempt}/${maxRetries}] Downloading: ${url}`);

      const destPath = path.join(destDir, filename);
      const writer = fs.createWriteStream(destPath);

      const resp = await client.get(url, {
        responseType: 'stream',
        timeout: 1800_000, // 30 min for large files
      });

      await new Promise<void>((resolve, reject) => {
        resp.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
        resp.data.on('error', reject);
      });

      const stats = fs.statSync(destPath);

      // Verify we got actual data
      if (stats.size < 100) {
        const content = fs.readFileSync(destPath, 'utf-8').substring(0, 500);
        if (content.includes('<html') || content.includes('<!DOCTYPE')) {
          fs.unlinkSync(destPath);
          throw new Error('Downloaded file appears to be an HTML error page');
        }
      }

      console.log(`  ✓ Downloaded ${filename} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);

      return {
        filePath: destPath,
        sizeBytes: stats.size,
        source: url,
        downloadedAt: new Date(),
      };
    } catch (err) {
      lastError = err as Error;
      console.warn(`  ✗ Attempt ${attempt} failed: ${(err as Error).message}`);
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY_MS * attempt;
        console.log(`  Retrying in ${delay / 1000}s...`);
        await sleep(delay);
      }
    }
  }

  throw new Error(
    `Failed to download from ${url} after ${maxRetries} attempts: ${lastError?.message}`,
  );
}

/**
 * Download the RBDMS Well Data CSV (~200k+ wells, updated nightly).
 * This is the primary well data source for Oklahoma.
 */
export async function downloadRBDMSWells(
  options: DownloaderOptions,
): Promise<DownloadResult> {
  const client = createClient(options.timeoutMs || 60_000);
  const destDir = ensureDateDir(options.dataDir);
  const retries = options.maxRetries || MAX_RETRIES;

  console.log('[OK OCC] Downloading RBDMS Well Data...');
  return downloadFile(
    client,
    OCC_DATA_URLS.RBDMS_WELLS_CSV,
    destDir,
    'rbdms-wells.csv',
    retries,
  );
}

/**
 * Download the Completions master file (2010-present, XLSX ~75MB).
 */
export async function downloadCompletions(
  options: DownloaderOptions,
): Promise<DownloadResult> {
  const client = createClient(options.timeoutMs || 60_000);
  const destDir = ensureDateDir(options.dataDir);
  const retries = options.maxRetries || MAX_RETRIES;

  console.log('[OK OCC] Downloading Completions Master...');
  return downloadFile(
    client,
    OCC_DATA_URLS.COMPLETIONS_MASTER,
    destDir,
    'completions-master.xlsx',
    retries,
  );
}

/**
 * Download the Intent to Drill master file (XLSX).
 */
export async function downloadITDMaster(
  options: DownloaderOptions,
): Promise<DownloadResult> {
  const client = createClient(options.timeoutMs || 60_000);
  const destDir = ensureDateDir(options.dataDir);
  const retries = options.maxRetries || MAX_RETRIES;

  console.log('[OK OCC] Downloading Intent to Drill Master...');
  return downloadFile(
    client,
    OCC_DATA_URLS.ITD_MASTER,
    destDir,
    'itd-master.xlsx',
    retries,
  );
}

/**
 * Download the Incident Reports CSV.
 */
export async function downloadIncidents(
  options: DownloaderOptions,
): Promise<DownloadResult> {
  const client = createClient(options.timeoutMs || 30_000);
  const destDir = ensureDateDir(options.dataDir);
  const retries = options.maxRetries || MAX_RETRIES;

  console.log('[OK OCC] Downloading Incident Reports...');
  return downloadFile(
    client,
    OCC_DATA_URLS.INCIDENTS,
    destDir,
    'ogcd-incidents.csv',
    retries,
  );
}

/**
 * Download all OK OCC datasets needed for ingestion.
 */
export async function downloadAll(
  options: DownloaderOptions,
): Promise<DownloadResult[]> {
  const results: DownloadResult[] = [];

  // Download sequentially to be respectful
  try {
    results.push(await downloadRBDMSWells(options));
  } catch (err) {
    console.error(`Failed to download RBDMS Wells: ${(err as Error).message}`);
  }

  try {
    results.push(await downloadCompletions(options));
  } catch (err) {
    console.error(`Failed to download Completions: ${(err as Error).message}`);
  }

  try {
    results.push(await downloadITDMaster(options));
  } catch (err) {
    console.error(`Failed to download ITD Master: ${(err as Error).message}`);
  }

  return results;
}
