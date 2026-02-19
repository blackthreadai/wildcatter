/**
 * Oklahoma OCC data parser/normalizer
 *
 * Parses OCC-specific formats into standard Wildcatter types.
 * Primary source: RBDMS Well Data CSV → Asset + Operator
 *
 * Note: Oklahoma production data is held by the Oklahoma Tax Commission,
 * not the OCC. Production records are not available from the RBDMS download.
 * We create Asset and Operator records from the well data.
 */

import * as fs from 'fs';
import * as readline from 'readline';
import { Asset, AssetType, AssetStatus, Operator } from '../../types';
import { normalizeName, safeNum } from '../shared/normalize';
import {
  OK_STATE_CODE,
  OK_BASIN_BY_COUNTY,
  WELL_STATUS_MAP,
  WELL_TYPE_MAP,
} from './constants';

// ── Parsed intermediate types ─────────────────────────

export interface ParsedRBDMSWell {
  api: string;
  wellRecordsUrl: string;
  wellName: string;
  wellNum: string;
  operator: string;
  wellStatus: string;
  wellType: string;
  symbolClass: string;
  latitude: number | null;
  longitude: number | null;
  county: string;
  section: string;
  township: string;
  range: string;
  qtr4: string;
  qtr3: string;
  qtr2: string;
  qtr1: string;
  pm: string; // Principal Meridian
}

export interface ParseStats {
  totalRows: number;
  parsedRows: number;
  errorRows: number;
  duration: string;
}

// ── Utility functions ─────────────────────────────────

/**
 * Build a deterministic asset ID from OCC API number.
 * OK API format: 35CCCNNNNN (state + county + sequence, 10 digits)
 */
export function buildAssetId(api: string): string {
  const cleaned = api.replace(/\D/g, '').padStart(10, '0');
  return `OK_OCC_${cleaned}`;
}

/**
 * Format API number with dashes: 35-CCC-NNNNN
 */
export function formatApiNumber(api: string): string {
  const cleaned = api.replace(/\D/g, '').padStart(10, '0');
  return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 5)}-${cleaned.substring(5)}`;
}

/**
 * Build a deterministic operator ID from operator name.
 * OCC data doesn't provide operator numbers in RBDMS CSV,
 * so we hash the normalized name.
 */
export function buildOperatorId(operatorName: string): string {
  const normalized = operatorName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
  return `OK_OP_${normalized}`.substring(0, 64);
}

/**
 * Map OCC well type to our AssetType
 */
function mapWellType(occType: string): AssetType {
  const upper = (occType || '').toUpperCase().trim();
  return WELL_TYPE_MAP[upper] || (upper.includes('GAS') ? 'gas' : 'oil');
}

/**
 * Map OCC well status to our AssetStatus
 */
function mapWellStatus(occStatus: string): AssetStatus {
  const upper = (occStatus || '').toUpperCase().trim();
  return WELL_STATUS_MAP[upper] || 'inactive';
}

/**
 * Get basin name from county
 */
function basinFromCounty(county: string): string | null {
  const upper = (county || '').toUpperCase().trim();
  return OK_BASIN_BY_COUNTY[upper] || null;
}

/**
 * Title-case a county name
 */
function titleCase(s: string): string {
  if (!s) return '';
  return s.trim().split(/\s+/).map(w =>
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join(' ');
}

// ── RBDMS CSV Parser ──────────────────────────────────

/**
 * Parse the RBDMS Well Data CSV file.
 * CSV header:
 *   API,WELL_RECORDS_DOCS,WELL_NAME,WELL_NUM,OPERATOR,WELLSTATUS,WELLTYPE,
 *   SYMBOL_CLASS,SH_LAT,SH_LON,COUNTY,SECTION,TOWNSHIP,RANGE,
 *   QTR4,QTR3,QTR2,QTR1,PM,FOOTAGE_EW,EW,FOOTAGE_NS,NS
 */
export async function* parseRBDMSWells(
  filePath: string,
): AsyncGenerator<ParsedRBDMSWell> {
  const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headerParsed = false;
  let colMap: Record<string, number> = {};

  for await (const line of rl) {
    if (!line.trim()) continue;

    // Parse header to get column indices (handles any column order)
    if (!headerParsed) {
      const headers = parseCSVLine(line);
      for (let i = 0; i < headers.length; i++) {
        colMap[headers[i].toUpperCase().trim()] = i;
      }
      headerParsed = true;
      continue;
    }

    const fields = parseCSVLine(line);

    try {
      const col = (name: string) => fields[colMap[name]] || '';

      const api = col('API');
      if (!api || api.length < 5) continue; // Skip invalid

      yield {
        api,
        wellRecordsUrl: col('WELL_RECORDS_DOCS'),
        wellName: col('WELL_NAME'),
        wellNum: col('WELL_NUM'),
        operator: col('OPERATOR'),
        wellStatus: col('WELLSTATUS'),
        wellType: col('WELLTYPE'),
        symbolClass: col('SYMBOL_CLASS'),
        latitude: safeNum(col('SH_LAT')),
        longitude: safeNum(col('SH_LON')),
        county: col('COUNTY'),
        section: col('SECTION'),
        township: col('TOWNSHIP'),
        range: col('RANGE'),
        qtr4: col('QTR4'),
        qtr3: col('QTR3'),
        qtr2: col('QTR2'),
        qtr1: col('QTR1'),
        pm: col('PM'),
      };
    } catch {
      continue;
    }
  }
}

/**
 * Simple CSV line parser that handles quoted fields with commas.
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ── Conversion to standard types ──────────────────────

/**
 * Convert a parsed RBDMS well to our standard Asset.
 */
export function rbdmsToAsset(w: ParsedRBDMSWell): { assetId: string } & Omit<Asset, 'id' | 'created_at' | 'updated_at'> {
  const assetId = buildAssetId(w.api);
  const wellType = mapWellType(w.wellType);

  const displayName = w.wellName
    ? `${normalizeName(w.wellName)}${w.wellNum ? ' ' + w.wellNum : ''}`
    : `Well ${formatApiNumber(w.api)}`;

  return {
    assetId,
    asset_type: wellType,
    name: displayName,
    state: 'OK',
    county: titleCase(w.county),
    latitude: w.latitude || 0,
    longitude: w.longitude || 0,
    basin: basinFromCounty(w.county),
    operator_id: w.operator ? buildOperatorId(w.operator) : null,
    status: mapWellStatus(w.wellStatus),
    spud_date: null, // Not in RBDMS CSV; available in completions data
    depth_ft: null,  // Not in RBDMS CSV; available in completions data
    commodity: wellType === 'gas' ? 'natural gas' : 'crude oil',
    decline_rate: null,
    estimated_remaining_life_months: null,
  };
}

/**
 * Convert a parsed RBDMS well's operator info to our standard Operator.
 */
export function rbdmsToOperator(w: ParsedRBDMSWell): { operatorId: string } & Omit<Operator, 'id' | 'created_at' | 'updated_at'> {
  const operatorId = buildOperatorId(w.operator);

  return {
    operatorId,
    legal_name: normalizeName(w.operator),
    aliases: [w.operator.trim()],
    hq_state: 'OK',
    hq_city: null,
    active_asset_count: 0,
    compliance_flags: [],
    risk_score: null,
  };
}

// ── Batch parsing ─────────────────────────────────────

/**
 * Parse the full RBDMS CSV and return assets + operators.
 */
export async function parseRBDMSFile(
  filePath: string,
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

  for await (const well of parseRBDMSWells(filePath)) {
    totalRows++;
    if (parsedRows >= limit) break;

    try {
      const asset = rbdmsToAsset(well);

      // Apply status filter if provided
      if (statusFilter && !statusFilter.includes(asset.status)) continue;

      const { assetId, ...assetData } = asset;
      assets.set(assetId, assetData);

      // Track unique operators
      if (well.operator && well.operator.trim()) {
        const op = rbdmsToOperator(well);
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

  return {
    assets,
    operators,
    stats: { totalRows, parsedRows, errorRows, duration },
  };
}
