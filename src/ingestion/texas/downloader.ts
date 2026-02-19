/**
 * Texas RRC data downloader
 *
 * Downloads bulk data files from the TX RRC GoAnywhere MFT portal
 * and the PDQ (Production Data Query) web interface.
 */

import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { MFT_LINKS, PDQ_BASE_URL } from './constants';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

export interface DownloadResult {
  filePath: string;
  sizeBytes: number;
  source: string;
  downloadedAt: Date;
}

export interface DownloaderOptions {
  dataDir: string;      // base data directory
  maxRetries?: number;
  timeoutMs?: number;
}

/**
 * Create a date-stamped directory for downloads
 */
function ensureDateDir(baseDir: string): string {
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const dir = path.join(baseDir, 'tx_rrc', dateStr);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Create an axios client with appropriate settings for RRC downloads
 */
function createClient(timeoutMs: number): AxiosInstance {
  return axios.create({
    timeout: timeoutMs,
    maxRedirects: 10,
    httpsAgent: new https.Agent({
      rejectUnauthorized: true,
    }),
    headers: {
      'User-Agent': 'Wildcatter-DataPipeline/0.1 (Energy Analytics)',
      Accept: '*/*',
    },
  });
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Download a file from a GoAnywhere MFT portal link.
 *
 * The MFT portal uses a JSF-based web UI. To download files:
 * 1. GET the portal page to obtain the session cookie and ViewState token
 * 2. POST to select the file (checkbox)
 * 3. POST to trigger download
 */
async function downloadFromMFT(
  client: AxiosInstance,
  mftUrl: string,
  destDir: string,
  filename: string,
  maxRetries: number,
): Promise<DownloadResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  [attempt ${attempt}/${maxRetries}] Fetching MFT portal: ${mftUrl}`);

      // Step 1: GET the MFT portal page to get session & ViewState
      const portalResp = await client.get(mftUrl, {
        maxRedirects: 10,
        withCredentials: true,
      });

      const cookies = (portalResp.headers['set-cookie'] || []).map((c: string) =>
        c.split(';')[0],
      ).join('; ');

      const html: string = portalResp.data;

      // Extract ViewState token
      const vsMatch = html.match(
        /name="javax\.faces\.ViewState"[^>]*value="([^"]+)"/,
      );
      if (!vsMatch) {
        throw new Error('Could not extract ViewState from MFT portal');
      }
      const viewState = vsMatch[1];

      // Extract the file row key (data-rk attribute)
      const rkMatch = html.match(/data-rk="(\d+)"/);
      if (!rkMatch) {
        throw new Error('Could not find file row key in MFT portal');
      }
      const rowKey = rkMatch[1];

      // Step 2: Select the file by simulating checkbox click
      const selectParams = new URLSearchParams();
      selectParams.append('javax.faces.partial.ajax', 'true');
      selectParams.append('javax.faces.source', 'fileTable');
      selectParams.append('javax.faces.partial.execute', 'fileTable');
      selectParams.append('javax.faces.partial.render', 'multiRowButtons');
      selectParams.append('javax.faces.behavior.event', 'rowSelectCheckbox');
      selectParams.append('javax.faces.partial.event', 'rowSelectCheckbox');
      selectParams.append('fileTable_selection', rowKey);
      selectParams.append('fileList_SUBMIT', '1');
      selectParams.append('javax.faces.ViewState', viewState);

      const portalUrl = mftUrl.includes('/link/')
        ? `https://mft.rrc.texas.gov/webclient/godrive/PublicGoDrive.xhtml`
        : mftUrl;

      await client.post(portalUrl, selectParams.toString(), {
        headers: {
          Cookie: cookies,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Faces-Request': 'partial/ajax',
          Referer: mftUrl,
          Origin: 'https://mft.rrc.texas.gov',
        },
      });

      // Step 3: Click "Download" button
      const downloadParams = new URLSearchParams();
      downloadParams.append('j_id_3f:j_id_3f', 'j_id_3f:j_id_3f');
      downloadParams.append('j_id_3e_SUBMIT', '1');
      downloadParams.append('javax.faces.ViewState', viewState);
      downloadParams.append('fileTable_selection', rowKey);

      const destPath = path.join(destDir, filename);
      const writer = fs.createWriteStream(destPath);

      const downloadResp = await client.post(portalUrl, downloadParams.toString(), {
        headers: {
          Cookie: cookies,
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: mftUrl,
          Origin: 'https://mft.rrc.texas.gov',
        },
        responseType: 'stream',
        timeout: 3600_000, // 1 hour for large files
      });

      await new Promise<void>((resolve, reject) => {
        downloadResp.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
        downloadResp.data.on('error', reject);
      });

      const stats = fs.statSync(destPath);

      // Verify we got actual data (not an HTML error page)
      if (stats.size < 1000) {
        const content = fs.readFileSync(destPath, 'utf-8').substring(0, 500);
        if (content.includes('<html') || content.includes('<!DOCTYPE')) {
          fs.unlinkSync(destPath);
          throw new Error(
            'Downloaded file appears to be an HTML page, not data. ' +
            'The MFT portal may have changed or require additional interaction.',
          );
        }
      }

      console.log(`  ✓ Downloaded ${filename} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);

      return {
        filePath: destPath,
        sizeBytes: stats.size,
        source: mftUrl,
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
    `Failed to download from ${mftUrl} after ${maxRetries} attempts: ${lastError?.message}`,
  );
}

/**
 * Download the PDQ production dump (CSV format, ~3.4 GB compressed).
 * This is the primary production data source.
 */
export async function downloadPDQDump(
  options: DownloaderOptions,
): Promise<DownloadResult> {
  const client = createClient(options.timeoutMs || 30_000);
  const destDir = ensureDateDir(options.dataDir);
  const retries = options.maxRetries || MAX_RETRIES;

  console.log('[TX RRC] Downloading PDQ production dump...');
  return downloadFromMFT(
    client,
    MFT_LINKS.PDQ_DUMP,
    destDir,
    'PDQ_DSV.zip',
    retries,
  );
}

/**
 * Download the P5 Organization data (operator information).
 */
export async function downloadP5Organization(
  options: DownloaderOptions,
): Promise<DownloadResult> {
  const client = createClient(options.timeoutMs || 30_000);
  const destDir = ensureDateDir(options.dataDir);
  const retries = options.maxRetries || MAX_RETRIES;

  console.log('[TX RRC] Downloading P5 Organization data...');
  return downloadFromMFT(
    client,
    MFT_LINKS.P5_ORG,
    destDir,
    'p5_organization.zip',
    retries,
  );
}

/**
 * Download the Full Wellbore data.
 */
export async function downloadWellbore(
  options: DownloaderOptions,
): Promise<DownloadResult> {
  const client = createClient(options.timeoutMs || 30_000);
  const destDir = ensureDateDir(options.dataDir);
  const retries = options.maxRetries || MAX_RETRIES;

  console.log('[TX RRC] Downloading Full Wellbore data...');
  return downloadFromMFT(
    client,
    MFT_LINKS.WELLBORE,
    destDir,
    'wellbore.zip',
    retries,
  );
}

/**
 * Download drilling permits with lat/long.
 */
export async function downloadDrillingPermits(
  options: DownloaderOptions,
): Promise<DownloadResult> {
  const client = createClient(options.timeoutMs || 30_000);
  const destDir = ensureDateDir(options.dataDir);
  const retries = options.maxRetries || MAX_RETRIES;

  console.log('[TX RRC] Downloading Drilling Permits...');
  return downloadFromMFT(
    client,
    MFT_LINKS.DRILLING_PERMITS,
    destDir,
    'drilling_permits.zip',
    retries,
  );
}

/**
 * Query the PDQ web interface for production data by lease.
 * This is useful for targeted queries rather than the full dump.
 *
 * Returns HTML which must be parsed separately.
 */
export async function queryPDQByLease(
  leaseNumber: string,
  districtCode: string,
): Promise<string> {
  const client = createClient(30_000);
  const url = `${PDQ_BASE_URL}/quickLeaseReportBuilderAction.do`;

  const resp = await client.get(url, {
    params: {
      methodToCall: 'quickLeaseSearch',
      leaseNumber,
      rrcDistrictNo: districtCode,
    },
  });

  return resp.data;
}

/**
 * Extract ZIP file to a destination directory.
 * Uses Node's built-in zlib through child_process for reliability with large files.
 */
export async function extractZip(
  zipPath: string,
  destDir?: string,
): Promise<string> {
  const { execSync } = await import('child_process');
  const extractDir = destDir || zipPath.replace(/\.zip$/i, '');
  fs.mkdirSync(extractDir, { recursive: true });

  console.log(`  Extracting ${path.basename(zipPath)} to ${extractDir}...`);
  execSync(`unzip -o "${zipPath}" -d "${extractDir}"`, {
    stdio: 'pipe',
    maxBuffer: 50 * 1024 * 1024,
  });

  const files = fs.readdirSync(extractDir);
  console.log(`  ✓ Extracted ${files.length} files: ${files.join(', ')}`);

  return extractDir;
}

/**
 * Download all TX RRC datasets needed for the ingestion pipeline.
 */
export async function downloadAll(
  options: DownloaderOptions,
): Promise<DownloadResult[]> {
  const results: DownloadResult[] = [];

  // Download in sequence to be respectful to RRC servers
  try {
    results.push(await downloadPDQDump(options));
  } catch (err) {
    console.error(`Failed to download PDQ Dump: ${(err as Error).message}`);
  }

  try {
    results.push(await downloadP5Organization(options));
  } catch (err) {
    console.error(`Failed to download P5 Organization: ${(err as Error).message}`);
  }

  try {
    results.push(await downloadWellbore(options));
  } catch (err) {
    console.error(`Failed to download Wellbore: ${(err as Error).message}`);
  }

  try {
    results.push(await downloadDrillingPermits(options));
  } catch (err) {
    console.error(`Failed to download Drilling Permits: ${(err as Error).message}`);
  }

  return results;
}
