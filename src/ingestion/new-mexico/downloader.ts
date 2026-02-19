/**
 * New Mexico OCD data downloader
 *
 * Downloads well and production data from the NM OCD system.
 *
 * Data access strategies (in order of preference):
 * 1. EMNRD Water Data Act REST API (best: structured JSON, well+production+operator)
 *    - Requires free registration at https://api.emnrd.nm.gov/
 *    - JWT auth, rate limited to 1500 req/min
 * 2. OCD Permitting web scraper (fallback: HTML parsing from Wells.aspx)
 *    - No auth required, but ASP.NET ViewState makes it harder
 * 3. GO-TECH well search (supplemental)
 */

import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { OCD_URLS, NM_COUNTY_CODES } from './constants';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;
const WDA_PAGE_SIZE = 1000;

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
  /** WDA API credentials (email + password registered at api.emnrd.nm.gov) */
  wdaEmail?: string;
  wdaPassword?: string;
}

function ensureDateDir(baseDir: string): string {
  const dateStr = new Date().toISOString().split('T')[0];
  const dir = path.join(baseDir, 'nm_ocd', dateStr);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function createClient(timeoutMs: number): AxiosInstance {
  return axios.create({
    timeout: timeoutMs,
    maxRedirects: 10,
    headers: {
      'User-Agent': 'Wildcatter-DataPipeline/0.1 (Energy Analytics)',
      Accept: 'application/json',
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── WDA API Authentication ───────────────────────────

interface WDAAuthResult {
  token: string;
  refreshToken: string;
  expiration: string;
}

/**
 * Authenticate with the EMNRD Water Data Act API.
 * Returns a JWT token for subsequent requests.
 */
async function authenticateWDA(
  client: AxiosInstance,
  email: string,
  password: string,
): Promise<WDAAuthResult> {
  console.log('  [WDA API] Authenticating...');
  const resp = await client.post(OCD_URLS.WDA_AUTH, { email, password });
  return resp.data;
}

// ── WDA API Paginated Fetch ──────────────────────────

/**
 * Fetch all pages from a WDA API endpoint.
 * The API uses offset/limit pagination.
 */
async function fetchAllPages(
  client: AxiosInstance,
  url: string,
  token: string,
  params: Record<string, any> = {},
  maxRetries: number = MAX_RETRIES,
): Promise<any[]> {
  const allRecords: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const resp = await client.get(url, {
          headers: { Authorization: `Bearer ${token}` },
          params: { ...params, offset, limit: WDA_PAGE_SIZE },
        });

        const data = Array.isArray(resp.data) ? resp.data : resp.data?.data || [];
        allRecords.push(...data);

        if (data.length < WDA_PAGE_SIZE) {
          hasMore = false;
        } else {
          offset += WDA_PAGE_SIZE;
        }

        // Progress log every 10k records
        if (allRecords.length % 10_000 < WDA_PAGE_SIZE && allRecords.length > 0) {
          console.log(`    ... fetched ${allRecords.length.toLocaleString()} records`);
        }

        lastError = null;
        break; // success
      } catch (err) {
        lastError = err as Error;
        const status = (err as any)?.response?.status;
        if (status === 429) {
          // Rate limited — wait longer
          console.warn(`    Rate limited, waiting 60s...`);
          await sleep(60_000);
        } else if (attempt < maxRetries) {
          await sleep(RETRY_DELAY_MS * attempt);
        }
      }
    }

    if (lastError) {
      console.error(`    Failed to fetch page at offset ${offset}: ${lastError.message}`);
      hasMore = false; // Stop on persistent error
    }
  }

  return allRecords;
}

// ── WDA API Downloads ────────────────────────────────

/**
 * Download well data via the WDA API.
 * Saves as JSON lines file.
 */
export async function downloadWellsViaAPI(
  options: DownloaderOptions,
): Promise<DownloadResult> {
  if (!options.wdaEmail || !options.wdaPassword) {
    throw new Error(
      'WDA API credentials required. Register at https://api.emnrd.nm.gov/ ' +
      'and set NM_WDA_EMAIL and NM_WDA_PASSWORD environment variables.',
    );
  }

  const client = createClient(options.timeoutMs || 60_000);
  const destDir = ensureDateDir(options.dataDir);
  const retries = options.maxRetries || MAX_RETRIES;

  console.log('[NM OCD] Downloading well data via WDA API...');

  const auth = await authenticateWDA(client, options.wdaEmail, options.wdaPassword);
  const wells = await fetchAllPages(client, OCD_URLS.WDA_WELLS, auth.token, {}, retries);

  const destPath = path.join(destDir, 'wda-wells.jsonl');
  const writer = fs.createWriteStream(destPath);
  for (const well of wells) {
    writer.write(JSON.stringify(well) + '\n');
  }
  writer.end();
  await new Promise<void>((resolve) => writer.on('finish', resolve));

  const stats = fs.statSync(destPath);
  console.log(`  ✓ Downloaded ${wells.length.toLocaleString()} wells (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);

  return {
    filePath: destPath,
    sizeBytes: stats.size,
    source: OCD_URLS.WDA_WELLS,
    downloadedAt: new Date(),
  };
}

/**
 * Download production data via the WDA API.
 */
export async function downloadProductionViaAPI(
  options: DownloaderOptions,
): Promise<DownloadResult> {
  if (!options.wdaEmail || !options.wdaPassword) {
    throw new Error(
      'WDA API credentials required. Register at https://api.emnrd.nm.gov/',
    );
  }

  const client = createClient(options.timeoutMs || 60_000);
  const destDir = ensureDateDir(options.dataDir);
  const retries = options.maxRetries || MAX_RETRIES;

  console.log('[NM OCD] Downloading production data via WDA API...');

  const auth = await authenticateWDA(client, options.wdaEmail, options.wdaPassword);
  const production = await fetchAllPages(client, OCD_URLS.WDA_PRODUCTION, auth.token, {}, retries);

  const destPath = path.join(destDir, 'wda-production.jsonl');
  const writer = fs.createWriteStream(destPath);
  for (const rec of production) {
    writer.write(JSON.stringify(rec) + '\n');
  }
  writer.end();
  await new Promise<void>((resolve) => writer.on('finish', resolve));

  const stats = fs.statSync(destPath);
  console.log(`  ✓ Downloaded ${production.length.toLocaleString()} production records (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);

  return {
    filePath: destPath,
    sizeBytes: stats.size,
    source: OCD_URLS.WDA_PRODUCTION,
    downloadedAt: new Date(),
  };
}

/**
 * Download operator data via the WDA API.
 */
export async function downloadOperatorsViaAPI(
  options: DownloaderOptions,
): Promise<DownloadResult> {
  if (!options.wdaEmail || !options.wdaPassword) {
    throw new Error(
      'WDA API credentials required. Register at https://api.emnrd.nm.gov/',
    );
  }

  const client = createClient(options.timeoutMs || 60_000);
  const destDir = ensureDateDir(options.dataDir);
  const retries = options.maxRetries || MAX_RETRIES;

  console.log('[NM OCD] Downloading operator data via WDA API...');

  const auth = await authenticateWDA(client, options.wdaEmail, options.wdaPassword);
  const operators = await fetchAllPages(client, OCD_URLS.WDA_OPERATORS, auth.token, {}, retries);

  const destPath = path.join(destDir, 'wda-operators.jsonl');
  const writer = fs.createWriteStream(destPath);
  for (const op of operators) {
    writer.write(JSON.stringify(op) + '\n');
  }
  writer.end();
  await new Promise<void>((resolve) => writer.on('finish', resolve));

  const stats = fs.statSync(destPath);
  console.log(`  ✓ Downloaded ${operators.length.toLocaleString()} operators (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);

  return {
    filePath: destPath,
    sizeBytes: stats.size,
    source: OCD_URLS.WDA_OPERATORS,
    downloadedAt: new Date(),
  };
}

// ── OCD Web Scraper (fallback when no API credentials) ──

/**
 * Scrape well data from the OCD Permitting website by county.
 * This is the fallback when WDA API credentials are not available.
 *
 * The OCD Wells.aspx page is an ASP.NET WebForms app that requires
 * ViewState manipulation. We query by county to get manageable result sets.
 */
export async function scrapeWellsByCounty(
  options: DownloaderOptions,
  countyName: string,
): Promise<DownloadResult> {
  const client = createClient(options.timeoutMs || 30_000);
  const destDir = ensureDateDir(options.dataDir);
  const retries = options.maxRetries || MAX_RETRIES;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`  [attempt ${attempt}/${retries}] Fetching well search page...`);

      // Step 1: GET the search page to obtain ViewState
      const pageResp = await client.get(OCD_URLS.WELL_SEARCH, {
        headers: { Accept: 'text/html' },
      });

      const html: string = pageResp.data;
      const cookies = (pageResp.headers['set-cookie'] || [])
        .map((c: string) => c.split(';')[0])
        .join('; ');

      // Extract ViewState and other ASP.NET hidden fields
      const viewState = extractHiddenField(html, '__VIEWSTATE');
      const viewStateGen = extractHiddenField(html, '__VIEWSTATEGENERATOR');
      const eventValidation = extractHiddenField(html, '__EVENTVALIDATION');

      if (!viewState) {
        throw new Error('Could not extract ViewState from OCD search page');
      }

      // Step 2: POST search with county filter, requesting CSV output
      const formData = new URLSearchParams();
      formData.append('__VIEWSTATE', viewState);
      if (viewStateGen) formData.append('__VIEWSTATEGENERATOR', viewStateGen);
      if (eventValidation) formData.append('__EVENTVALIDATION', eventValidation);
      formData.append('county', countyName);
      formData.append('reportFormat', 'CSV');
      formData.append('btnSearch', 'Search');

      const searchResp = await client.post(OCD_URLS.WELL_SEARCH, formData.toString(), {
        headers: {
          Cookie: cookies,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'text/html,text/csv,*/*',
          Referer: OCD_URLS.WELL_SEARCH,
        },
        timeout: 300_000, // 5 min for large counties
      });

      const safeCounty = countyName.replace(/\s+/g, '_').toLowerCase();
      const destPath = path.join(destDir, `wells_${safeCounty}.html`);
      fs.writeFileSync(destPath, searchResp.data);

      const stats = fs.statSync(destPath);
      console.log(`  ✓ Scraped ${countyName} county wells (${(stats.size / 1024).toFixed(0)} KB)`);

      return {
        filePath: destPath,
        sizeBytes: stats.size,
        source: `${OCD_URLS.WELL_SEARCH}?county=${countyName}`,
        downloadedAt: new Date(),
      };
    } catch (err) {
      lastError = err as Error;
      if (attempt < retries) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw new Error(
    `Failed to scrape wells for ${countyName} after ${retries} attempts: ${lastError?.message}`,
  );
}

function extractHiddenField(html: string, fieldName: string): string | null {
  const regex = new RegExp(`name="${fieldName}"[^>]*value="([^"]*)"`, 'i');
  const match = html.match(regex);
  return match ? match[1] : null;
}

/**
 * Scrape wells from all oil-producing counties.
 * Only targets counties with known basins (the ones that matter).
 */
export async function scrapeAllCounties(
  options: DownloaderOptions,
): Promise<DownloadResult[]> {
  const results: DownloadResult[] = [];
  const oilCounties = ['EDDY', 'LEA', 'CHAVES', 'ROOSEVELT', 'SAN JUAN',
    'RIO ARRIBA', 'SANDOVAL', 'COLFAX', 'UNION', 'MCKINLEY'];

  for (const county of oilCounties) {
    try {
      results.push(await scrapeWellsByCounty(options, county));
      // Be respectful — 2s between county queries
      await sleep(2000);
    } catch (err) {
      console.error(`  ✗ Failed to scrape ${county}: ${(err as Error).message}`);
    }
  }

  return results;
}

/**
 * Download all NM OCD data.
 * Prefers WDA API if credentials are available, falls back to scraping.
 */
export async function downloadAll(
  options: DownloaderOptions,
): Promise<DownloadResult[]> {
  const results: DownloadResult[] = [];
  const useAPI = !!(options.wdaEmail && options.wdaPassword);

  if (useAPI) {
    console.log('[NM OCD] Using EMNRD Water Data Act API');
    try { results.push(await downloadWellsViaAPI(options)); } catch (err) {
      console.error(`  ✗ WDA Wells download failed: ${(err as Error).message}`);
    }
    try { results.push(await downloadProductionViaAPI(options)); } catch (err) {
      console.error(`  ✗ WDA Production download failed: ${(err as Error).message}`);
    }
    try { results.push(await downloadOperatorsViaAPI(options)); } catch (err) {
      console.error(`  ✗ WDA Operators download failed: ${(err as Error).message}`);
    }
  } else {
    console.log('[NM OCD] No WDA API credentials; falling back to web scraper');
    console.log('  ℹ For better results, register at https://api.emnrd.nm.gov/');
    console.log('  and set NM_WDA_EMAIL and NM_WDA_PASSWORD environment variables.');
    const scrapeResults = await scrapeAllCounties(options);
    results.push(...scrapeResults);
  }

  return results;
}
