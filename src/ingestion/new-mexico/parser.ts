/**
 * New Mexico OCD data parser/normalizer
 *
 * Parses NM OCD data into standard Wildcatter types.
 * Supports two input formats:
 *   1. WDA API JSON lines (from downloader API mode)
 *   2. OCD web scraper HTML (from downloader scraper mode)
 */

import * as fs from 'fs';
import * as readline from 'readline';
import { Asset, AssetType, AssetStatus, Operator, ProductionRecord } from '../../types';
import { normalizeName, safeNum, parseDate } from '../shared/normalize';
import {
  NM_STATE_CODE,
  NM_BASIN_BY_COUNTY,
  NM_WELL_STATUS_MAP,
  NM_WELL_TYPE_MAP,
  NM_COUNTY_CODES,
} from './constants';

// ── Parsed intermediate types ─────────────────────────

export interface ParsedNMWell {
  api: string;
  wellName: string;
  wellNumber: string;
  operator: string;
  operatorId: string;
  wellStatus: string;
  wellType: string;
  county: string;
  latitude: number | null;
  longitude: number | null;
  spudDate: string | null;
  completionDate: string | null;
  totalDepth: number | null;
  pool: string | null;
  district: string;
  section: string;
  township: string;
  range: string;
}

export interface ParsedNMProduction {
  api: string;
  month: Date;
  oilBbl: number;
  gasMcf: number;
  waterBbl: number;
}

export interface ParsedNMOperator {
  operatorId: string;
  operatorName: string;
  status: string;
}

export interface ParseStats {
  totalRows: number;
  parsedRows: number;
  errorRows: number;
  duration: string;
}

// ── Utility functions ─────────────────────────────────

/**
 * Build a deterministic asset ID from NM API number.
 * NM API format: 30-CCC-NNNNN (state-county-sequence)
 */
export function buildAssetId(api: string): string {
  const cleaned = api.replace(/\D/g, '').padStart(10, '0');
  return `NM_OCD_${cleaned}`;
}

/**
 * Format API number with dashes: 30-CCC-NNNNN
 */
export function formatApiNumber(api: string): string {
  const cleaned = api.replace(/\D/g, '').padStart(10, '0');
  return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 5)}-${cleaned.substring(5)}`;
}

/**
 * Build operator ID from OCD operator number or name.
 */
export function buildOperatorId(operatorId: string, operatorName: string): string {
  if (operatorId && operatorId.trim()) {
    return `NM_OP_${operatorId.trim()}`;
  }
  const normalized = operatorName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
  return `NM_OP_${normalized}`.substring(0, 64);
}

function mapWellType(nmType: string): AssetType {
  const key = (nmType || '').trim();
  return NM_WELL_TYPE_MAP[key] || NM_WELL_TYPE_MAP[key.toUpperCase()] ||
    (key.toUpperCase().includes('GAS') ? 'gas' : 'oil');
}

function mapWellStatus(nmStatus: string): AssetStatus {
  const key = (nmStatus || '').trim();
  return NM_WELL_STATUS_MAP[key] || NM_WELL_STATUS_MAP[key.toUpperCase()] || 'inactive';
}

function basinFromCounty(county: string): string | null {
  const upper = (county || '').toUpperCase().trim();
  return NM_BASIN_BY_COUNTY[upper] || null;
}

function titleCase(s: string): string {
  if (!s) return '';
  return s.trim().split(/\s+/).map(w =>
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join(' ');
}

function countyNameFromCode(code: string): string {
  const padded = code.padStart(3, '0');
  const name = NM_COUNTY_CODES[padded];
  return name ? titleCase(name) : `County ${code}`;
}

// ── WDA API JSON Lines Parser ─────────────────────────

/**
 * Parse WDA API well data (JSONL format).
 * Each line is a JSON object with well properties.
 *
 * Expected fields (based on EMNRD WDA API schema):
 *   api, wellName, wellNumber, operator, operatorNumber,
 *   wellStatus, wellType, county, latitude, longitude,
 *   spudDate, completionDate, totalDepth, pool, district,
 *   section, township, range
 */
export async function* parseWDAWells(
  filePath: string,
): AsyncGenerator<ParsedNMWell> {
  const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const obj = JSON.parse(line);

      // Flexible field mapping — WDA API field names may vary
      const api = obj.api || obj.API || obj.apiNumber || obj.Api || '';
      if (!api || api.length < 5) continue;

      yield {
        api,
        wellName: obj.wellName || obj.WellName || obj.well_name || '',
        wellNumber: obj.wellNumber || obj.WellNumber || obj.well_number || obj.wellNum || '',
        operator: obj.operator || obj.Operator || obj.operatorName || obj.OperatorName || '',
        operatorId: obj.operatorNumber || obj.OperatorNumber || obj.operatorId || obj.ogrid || '',
        wellStatus: obj.wellStatus || obj.WellStatus || obj.status || obj.Status || '',
        wellType: obj.wellType || obj.WellType || obj.well_type || '',
        county: obj.county || obj.County || '',
        latitude: safeNum(String(obj.latitude || obj.Latitude || obj.lat || '')),
        longitude: safeNum(String(obj.longitude || obj.Longitude || obj.lon || obj.lng || '')),
        spudDate: obj.spudDate || obj.SpudDate || obj.spud_date || null,
        completionDate: obj.completionDate || obj.CompletionDate || null,
        totalDepth: safeNum(String(obj.totalDepth || obj.TotalDepth || obj.depth || '')),
        pool: obj.pool || obj.Pool || obj.poolName || null,
        district: String(obj.district || obj.District || ''),
        section: String(obj.section || obj.Section || ''),
        township: String(obj.township || obj.Township || ''),
        range: String(obj.range || obj.Range || ''),
      };
    } catch {
      continue;
    }
  }
}

/**
 * Parse WDA API production data (JSONL format).
 */
export async function* parseWDAProduction(
  filePath: string,
): AsyncGenerator<ParsedNMProduction> {
  const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const obj = JSON.parse(line);

      const api = obj.api || obj.API || obj.apiNumber || '';
      if (!api) continue;

      // Parse production month from various possible formats
      const monthStr = obj.productionDate || obj.ProductionDate ||
        obj.reportDate || obj.month || obj.Month || '';
      const month = parseDate(monthStr);
      if (!month) continue;

      yield {
        api,
        month,
        oilBbl: parseFloat(obj.oilVolume || obj.OilVolume || obj.oil || obj.oilBbl || '0') || 0,
        gasMcf: parseFloat(obj.gasVolume || obj.GasVolume || obj.gas || obj.gasMcf || '0') || 0,
        waterBbl: parseFloat(obj.waterVolume || obj.WaterVolume || obj.water || obj.waterBbl || '0') || 0,
      };
    } catch {
      continue;
    }
  }
}

/**
 * Parse WDA API operator data (JSONL format).
 */
export async function* parseWDAOperators(
  filePath: string,
): AsyncGenerator<ParsedNMOperator> {
  const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const obj = JSON.parse(line);
      const opId = obj.operatorNumber || obj.OperatorNumber || obj.ogrid || obj.id || '';
      const opName = obj.operatorName || obj.OperatorName || obj.operator || obj.name || '';
      if (!opName) continue;

      yield {
        operatorId: String(opId),
        operatorName: opName,
        status: obj.status || obj.Status || 'Active',
      };
    } catch {
      continue;
    }
  }
}

// ── OCD HTML Scraper Parser ───────────────────────────

/**
 * Parse well data from OCD Wells.aspx HTML response.
 * The response contains an HTML table with well records.
 */
export async function* parseOCDWellsHTML(
  filePath: string,
): AsyncGenerator<ParsedNMWell> {
  const html = fs.readFileSync(filePath, 'utf-8');

  // Extract table rows using regex (ASP.NET GridView output)
  const rowRegex = /<tr[^>]*class="(?:Row|AltRow)"[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const rowHtml = match[1];
    const cells: string[] = [];
    let cellMatch;

    // Reset cellRegex lastIndex
    cellRegex.lastIndex = 0;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      // Strip HTML tags from cell content
      const text = cellMatch[1].replace(/<[^>]*>/g, '').trim();
      cells.push(text);
    }

    if (cells.length < 5) continue;

    try {
      // OCD well search result columns (typical order):
      // API, Operator, Well Name, Well #, County, Status, Type, Spud Date, ...
      const api = cells[0] || '';
      if (!api || api.length < 5) continue;

      yield {
        api: api.replace(/\D/g, ''),
        wellName: cells[2] || '',
        wellNumber: cells[3] || '',
        operator: cells[1] || '',
        operatorId: '',
        wellStatus: cells[5] || '',
        wellType: cells[6] || '',
        county: cells[4] || '',
        latitude: null,
        longitude: null,
        spudDate: cells[7] || null,
        completionDate: null,
        totalDepth: null,
        pool: null,
        district: '',
        section: '',
        township: '',
        range: '',
      };
    } catch {
      continue;
    }
  }
}

// ── Conversion to standard types ──────────────────────

/**
 * Convert a parsed NM well to our standard Asset.
 */
export function nmWellToAsset(w: ParsedNMWell): { assetId: string } & Omit<Asset, 'id' | 'created_at' | 'updated_at'> {
  const assetId = buildAssetId(w.api);
  const wellType = mapWellType(w.wellType);

  const displayName = w.wellName
    ? `${normalizeName(w.wellName)}${w.wellNumber ? ' #' + w.wellNumber : ''}`
    : `Well ${formatApiNumber(w.api)}`;

  return {
    assetId,
    asset_type: wellType,
    name: displayName,
    state: 'NM',
    county: titleCase(w.county),
    latitude: w.latitude || 0,
    longitude: w.longitude || 0,
    basin: basinFromCounty(w.county),
    operator_id: w.operator ? buildOperatorId(w.operatorId, w.operator) : null,
    status: mapWellStatus(w.wellStatus),
    spud_date: parseDate(w.spudDate),
    depth_ft: w.totalDepth,
    commodity: wellType === 'gas' ? 'natural gas' : 'crude oil',
    decline_rate: null,
    estimated_remaining_life_months: null,
  };
}

/**
 * Convert a parsed NM well's operator info to our standard Operator.
 */
export function nmWellToOperator(w: ParsedNMWell): { operatorId: string } & Omit<Operator, 'id' | 'created_at' | 'updated_at'> {
  const operatorId = buildOperatorId(w.operatorId, w.operator);

  return {
    operatorId,
    legal_name: normalizeName(w.operator),
    aliases: [w.operator.trim()],
    hq_state: 'NM',
    hq_city: null,
    active_asset_count: 0,
    compliance_flags: [],
    risk_score: null,
  };
}

/**
 * Convert a parsed NM production record to our standard ProductionRecord.
 */
export function nmProductionToRecord(p: ParsedNMProduction): Omit<ProductionRecord, 'id' | 'created_at'> {
  return {
    asset_id: buildAssetId(p.api),
    month: p.month,
    oil_volume_bbl: p.oilBbl || null,
    gas_volume_mcf: p.gasMcf || null,
    ore_volume_tons: null,
    water_cut_pct: null,
    downtime_days: null,
  };
}

/**
 * Convert a parsed NM operator to our standard Operator.
 */
export function nmOperatorToStandard(op: ParsedNMOperator): { id: string } & Omit<Operator, 'id' | 'created_at' | 'updated_at'> {
  const id = buildOperatorId(op.operatorId, op.operatorName);

  return {
    id,
    legal_name: normalizeName(op.operatorName),
    aliases: [op.operatorName.trim()],
    hq_state: 'NM',
    hq_city: null,
    active_asset_count: 0,
    compliance_flags: [],
    risk_score: null,
  };
}

// ── Batch parsing ─────────────────────────────────────

/**
 * Parse all WDA well + operator files and return consolidated results.
 */
export async function parseWDAFiles(
  wellsFile: string,
  options?: { limit?: number; statusFilter?: AssetStatus[] },
): Promise<{
  assets: Map<string, Omit<Asset, 'id' | 'created_at' | 'updated_at'>>;
  operators: Map<string, { id: string } & Omit<Operator, 'id' | 'created_at' | 'updated_at'>>;
  stats: ParseStats;
}> {
  const start = Date.now();
  const assets = new Map<string, Omit<Asset, 'id' | 'created_at' | 'updated_at'>>();
  const operators = new Map<string, { id: string } & Omit<Operator, 'id' | 'created_at' | 'updated_at'>>();

  let totalRows = 0;
  let parsedRows = 0;
  let errorRows = 0;
  const limit = options?.limit || Infinity;
  const statusFilter = options?.statusFilter;

  for await (const well of parseWDAWells(wellsFile)) {
    totalRows++;
    if (parsedRows >= limit) break;

    try {
      const asset = nmWellToAsset(well);
      if (statusFilter && !statusFilter.includes(asset.status)) continue;

      const { assetId, ...assetData } = asset;
      assets.set(assetId, assetData);

      if (well.operator && well.operator.trim()) {
        const op = nmWellToOperator(well);
        if (!operators.has(op.operatorId)) {
          const { operatorId, ...opData } = op;
          operators.set(operatorId, { id: operatorId, ...opData });
        }
      }

      parsedRows++;
    } catch {
      errorRows++;
    }
  }

  const duration = `${((Date.now() - start) / 1000).toFixed(1)}s`;
  return { assets, operators, stats: { totalRows, parsedRows, errorRows, duration } };
}

/**
 * Parse WDA production file and return production records.
 */
export async function parseWDAProductionFile(
  productionFile: string,
  options?: { limit?: number; yearFrom?: number; yearTo?: number },
): Promise<{
  productions: Omit<ProductionRecord, 'id' | 'created_at'>[];
  stats: ParseStats;
}> {
  const start = Date.now();
  const productions: Omit<ProductionRecord, 'id' | 'created_at'>[] = [];

  let totalRows = 0;
  let parsedRows = 0;
  let errorRows = 0;
  const limit = options?.limit || Infinity;
  const yearFrom = options?.yearFrom || 0;
  const yearTo = options?.yearTo || 9999;

  for await (const rec of parseWDAProduction(productionFile)) {
    totalRows++;
    if (parsedRows >= limit) break;

    const year = rec.month.getFullYear();
    if (year < yearFrom || year > yearTo) continue;

    try {
      productions.push(nmProductionToRecord(rec));
      parsedRows++;
    } catch {
      errorRows++;
    }
  }

  const duration = `${((Date.now() - start) / 1000).toFixed(1)}s`;
  return { productions, stats: { totalRows, parsedRows, errorRows, duration } };
}

/**
 * Parse scraped HTML files from multiple counties.
 */
export async function parseScrapedFiles(
  filePaths: string[],
  options?: { limit?: number },
): Promise<{
  assets: Map<string, Omit<Asset, 'id' | 'created_at' | 'updated_at'>>;
  operators: Map<string, { id: string } & Omit<Operator, 'id' | 'created_at' | 'updated_at'>>;
  stats: ParseStats;
}> {
  const start = Date.now();
  const assets = new Map<string, Omit<Asset, 'id' | 'created_at' | 'updated_at'>>();
  const operators = new Map<string, { id: string } & Omit<Operator, 'id' | 'created_at' | 'updated_at'>>();

  let totalRows = 0;
  let parsedRows = 0;
  let errorRows = 0;
  const limit = options?.limit || Infinity;

  for (const filePath of filePaths) {
    if (parsedRows >= limit) break;

    for await (const well of parseOCDWellsHTML(filePath)) {
      totalRows++;
      if (parsedRows >= limit) break;

      try {
        const asset = nmWellToAsset(well);
        const { assetId, ...assetData } = asset;
        assets.set(assetId, assetData);

        if (well.operator && well.operator.trim()) {
          const op = nmWellToOperator(well);
          if (!operators.has(op.operatorId)) {
            const { operatorId, ...opData } = op;
            operators.set(operatorId, { id: operatorId, ...opData });
          }
        }

        parsedRows++;
      } catch {
        errorRows++;
      }
    }
  }

  const duration = `${((Date.now() - start) / 1000).toFixed(1)}s`;
  return { assets, operators, stats: { totalRows, parsedRows, errorRows, duration } };
}
