/**
 * Texas RRC data parser/normalizer
 *
 * Parses RRC-specific file formats into our standard Wildcatter types.
 * Primary sources:
 *   - PDQ Dump (pipe-delimited CSV) → ProductionRecord + Asset
 *   - P5 Organization (fixed-width ASCII) → Operator
 *   - Wellbore (fixed-width ASCII) → Asset details
 */

import * as fs from 'fs';
import * as readline from 'readline';
import { Asset, AssetType, AssetStatus, Operator, ProductionRecord } from '../../types';
import { TX_STATE_CODE, TX_COUNTY_CODES, BASIN_BY_DISTRICT, RRC_DISTRICTS } from './constants';

// ── Parsed intermediate types ─────────────────────────

export interface ParsedProduction {
  district: string;
  leaseNumber: string;
  oilOrGas: 'OIL' | 'GAS';
  operatorNumber: string;
  operatorName: string;
  leaseName: string;
  fieldNumber: string;
  fieldName: string;
  countyCode: string;
  month: Date;
  oilBbl: number;
  casingheadGasMcf: number;
  gasWellGasMcf: number;
  condensateBbl: number;
  waterBbl: number;
}

export interface ParsedOperator {
  operatorNumber: string;
  operatorName: string;
  operatorStatus: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  p5FilingDate: string;
}

export interface ParsedWell {
  apiNumber: string;
  district: string;
  countyCode: string;
  leaseName: string;
  leaseNumber: string;
  wellNumber: string;
  operatorNumber: string;
  operatorName: string;
  fieldNumber: string;
  fieldName: string;
  completionDate: string | null;
  plugDate: string | null;
  latitude: number | null;
  longitude: number | null;
  totalDepth: number | null;
  wellType: string;
  wellStatus: string;
}

export interface ParseStats {
  totalRows: number;
  parsedRows: number;
  errorRows: number;
  duration: string;
}

// ── Utility functions ─────────────────────────────────

/**
 * Normalize operator names from RRC ALL CAPS format.
 * Converts "PIONEER NATURAL RES CO" → "Pioneer Natural Resources Co"
 */
export function normalizeOperatorName(raw: string): string {
  if (!raw || !raw.trim()) return '';

  const cleaned = raw.trim();

  // Common abbreviations that should stay uppercase or be expanded
  const abbrevMap: Record<string, string> = {
    'CO': 'Co', 'INC': 'Inc', 'LLC': 'LLC', 'LP': 'LP', 'LLP': 'LLP',
    'LTD': 'Ltd', 'CORP': 'Corp', 'RES': 'Resources', 'OPER': 'Operating',
    'PROD': 'Production', 'PETR': 'Petroleum', 'PETRO': 'Petroleum',
    'EXPL': 'Exploration', 'DEV': 'Development', 'DRLG': 'Drilling',
    'ENER': 'Energy', 'ENRGY': 'Energy', 'OIL': 'Oil', 'GAS': 'Gas',
    'NGL': 'NGL', 'USA': 'USA', 'US': 'US', 'TX': 'TX',
    'INTL': 'International', 'NATL': 'National', 'NAT': 'Natural',
    'MGT': 'Management', 'MGMT': 'Management', 'SVC': 'Services',
    'SVCS': 'Services', 'ASSOC': 'Associates', 'PART': 'Partners',
    'GRP': 'Group', 'HLDG': 'Holdings', 'HLDGS': 'Holdings',
    'AMER': 'American', 'TEX': 'Texas', 'MIDL': 'Midland',
    'PERMIAN': 'Permian', 'EAGLE': 'Eagle', 'FORD': 'Ford',
  };

  return cleaned
    .split(/\s+/)
    .map((word) => {
      const upper = word.toUpperCase();
      if (abbrevMap[upper]) return abbrevMap[upper];
      if (upper.length <= 2) return upper; // Leave short words as-is
      // Title case
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Build an API number from RRC components.
 * TX API format: 42-CCC-NNNNN (state-county-sequence)
 */
export function buildApiNumber(
  countyCode: string,
  leaseOrWellNumber: string,
): string {
  const county = countyCode.padStart(3, '0');
  const seq = leaseOrWellNumber.padStart(5, '0');
  return `${TX_STATE_CODE}-${county}-${seq}`;
}

/**
 * Build a deterministic asset ID from RRC identifiers.
 */
export function buildAssetId(
  district: string,
  leaseNumber: string,
  oilOrGas: 'OIL' | 'GAS',
): string {
  return `TX_RRC_${district}_${leaseNumber}_${oilOrGas}`;
}

/**
 * Parse an RRC date string (various formats: YYYYMMDD, MM/DD/YYYY, YYYY-MM-DD)
 */
export function parseRRCDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || !dateStr.trim() || dateStr.trim() === '0' || dateStr.trim() === '00000000') {
    return null;
  }

  const d = dateStr.trim();

  // YYYYMMDD format
  if (/^\d{8}$/.test(d)) {
    const year = parseInt(d.substring(0, 4));
    const month = parseInt(d.substring(4, 6)) - 1;
    const day = parseInt(d.substring(6, 8));
    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  }

  // MM/DD/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d)) {
    const date = new Date(d);
    return isNaN(date.getTime()) ? null : date;
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const date = new Date(d + 'T00:00:00');
    return isNaN(date.getTime()) ? null : date;
  }

  // YYYYMM (production month)
  if (/^\d{6}$/.test(d)) {
    const year = parseInt(d.substring(0, 4));
    const month = parseInt(d.substring(4, 6)) - 1;
    const date = new Date(year, month, 1);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/**
 * Map RRC well type codes to our AssetType
 */
function mapWellType(rrcType: string): AssetType {
  const t = (rrcType || '').toUpperCase().trim();
  if (t.includes('GAS') || t === 'G') return 'gas';
  if (t.includes('OIL') || t === 'O') return 'oil';
  return 'oil'; // default
}

/**
 * Map RRC well status to our AssetStatus
 */
function mapWellStatus(rrcStatus: string): AssetStatus {
  const s = (rrcStatus || '').toUpperCase().trim();
  if (s.includes('ACTIVE') || s === 'A' || s === '') return 'active';
  if (s.includes('SHUT') || s === 'S' || s === 'SI') return 'shut-in';
  return 'inactive';
}

/**
 * Safely parse a number, returning null for invalid values
 */
function safeNum(val: string | undefined): number | null {
  if (!val || !val.trim()) return null;
  const n = parseFloat(val.trim());
  return isNaN(n) ? null : n;
}

/**
 * Get county name from county code
 */
function countyName(code: string): string {
  const padded = code.padStart(3, '0');
  const name = TX_COUNTY_CODES[padded];
  if (name) {
    // Title case
    return name.charAt(0) + name.slice(1).toLowerCase();
  }
  return `County ${code}`;
}

// ── PDQ Dump Parser ───────────────────────────────────

/**
 * PDQ Dump is a pipe-delimited (|) file (inside the ZIP, after extraction).
 * Based on the PDQ Dump User Manual, the format is:
 *
 * Fields (pipe-delimited):
 *   0: DISTRICT_NO
 *   1: LEASE_NO  (oil lease number or gas ID)
 *   2: CYCLE_YEAR
 *   3: CYCLE_MONTH
 *   4: LEASE_OIL_OR_GAS  (O/G)
 *   5: OPERATOR_NO
 *   6: OPERATOR_NAME
 *   7: LEASE_NAME
 *   8: FIELD_NO
 *   9: FIELD_NAME
 *  10: COUNTY_CODE
 *  11: COUNTY_NAME
 *  12: OIL_BBL (oil production in barrels)
 *  13: CASINGHEAD_GAS_MCF
 *  14: GAS_WELL_GAS_MCF
 *  15: CONDENSATE_BBL
 *  16: WATER_DISP_BBL (water disposal/produced water)
 */
export async function* parsePDQDump(
  filePath: string,
): AsyncGenerator<ParsedProduction> {
  const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let lineNum = 0;
  let isHeader = true;

  for await (const line of rl) {
    lineNum++;

    // Skip empty lines
    if (!line.trim()) continue;

    // Skip header row if present
    if (isHeader) {
      isHeader = false;
      if (line.includes('DISTRICT') || line.includes('LEASE') || !line.match(/^\d/)) {
        continue;
      }
    }

    const fields = line.split('|');
    if (fields.length < 13) {
      // Short line, skip
      continue;
    }

    try {
      const cycleYear = parseInt(fields[2]?.trim() || '0');
      const cycleMonth = parseInt(fields[3]?.trim() || '0');

      if (cycleYear < 1900 || cycleYear > 2100 || cycleMonth < 1 || cycleMonth > 12) {
        continue; // Invalid date
      }

      const month = new Date(cycleYear, cycleMonth - 1, 1);

      yield {
        district: fields[0]?.trim() || '',
        leaseNumber: fields[1]?.trim() || '',
        oilOrGas: (fields[4]?.trim() || 'O').toUpperCase() === 'G' ? 'GAS' : 'OIL',
        operatorNumber: fields[5]?.trim() || '',
        operatorName: fields[6]?.trim() || '',
        leaseName: fields[7]?.trim() || '',
        fieldNumber: fields[8]?.trim() || '',
        fieldName: fields[9]?.trim() || '',
        countyCode: fields[10]?.trim() || '',
        month,
        oilBbl: parseFloat(fields[12]?.trim() || '0') || 0,
        casingheadGasMcf: parseFloat(fields[13]?.trim() || '0') || 0,
        gasWellGasMcf: parseFloat(fields[14]?.trim() || '0') || 0,
        condensateBbl: parseFloat(fields[15]?.trim() || '0') || 0,
        waterBbl: parseFloat(fields[16]?.trim() || '0') || 0,
      };
    } catch {
      // Skip unparseable rows
      continue;
    }
  }
}

/**
 * Convert a parsed PDQ production record to our standard ProductionRecord.
 */
export function pdqToProductionRecord(p: ParsedProduction): Omit<ProductionRecord, 'id' | 'created_at'> {
  const assetId = buildAssetId(p.district, p.leaseNumber, p.oilOrGas);

  return {
    asset_id: assetId,
    month: p.month,
    oil_volume_bbl: p.oilBbl + p.condensateBbl || null,
    gas_volume_mcf: p.casingheadGasMcf + p.gasWellGasMcf || null,
    ore_volume_tons: null,
    water_cut_pct: null, // Would need total fluid to calculate
    downtime_days: null,
  };
}

/**
 * Convert a parsed PDQ record to an Asset stub (we'll enrich later with wellbore data).
 */
export function pdqToAsset(p: ParsedProduction): Omit<Asset, 'id' | 'created_at' | 'updated_at'> {
  const assetId = buildAssetId(p.district, p.leaseNumber, p.oilOrGas);
  const basin = BASIN_BY_DISTRICT[p.district] || null;

  return {
    // id will be set to assetId during insert
    asset_type: p.oilOrGas === 'GAS' ? 'gas' : 'oil',
    name: p.leaseName ? normalizeOperatorName(p.leaseName) : `Lease ${p.leaseNumber}`,
    state: 'TX',
    county: countyName(p.countyCode),
    latitude: 0,  // Will be enriched from wellbore/permit data
    longitude: 0,
    basin,
    operator_id: p.operatorNumber || null,
    status: 'active' as AssetStatus, // Default; will be refined
    spud_date: null,
    depth_ft: null,
    commodity: p.oilOrGas === 'GAS' ? 'natural gas' : 'crude oil',
    decline_rate: null,
    estimated_remaining_life_months: null,
  };
}

// ── P5 Organization Parser ────────────────────────────

/**
 * Parse P5 Organization file (fixed-width ASCII format).
 *
 * P5 record layout (approximate positions based on RRC documentation):
 *   1-6:    Operator Number
 *   7-42:   Operator Name (36 chars)
 *   43-43:  Status (A=Active, I=Inactive)
 *   44-53:  Phone Number
 *   54-89:  Address Line 1
 *   90-125: Address Line 2
 *   126-150: City
 *   151-152: State
 *   153-162: Zip
 *   163-170: P5 Filing Date (YYYYMMDD)
 */
export async function* parseP5Organization(
  filePath: string,
): AsyncGenerator<ParsedOperator> {
  const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.length < 50) continue; // Too short to be a valid record

    try {
      yield {
        operatorNumber: line.substring(0, 6).trim(),
        operatorName: line.substring(6, 42).trim(),
        operatorStatus: line.substring(42, 43).trim(),
        phone: line.substring(43, 53).trim(),
        address1: line.substring(53, 89).trim(),
        address2: line.substring(89, 125).trim(),
        city: line.substring(125, 150).trim(),
        state: line.substring(150, 152).trim(),
        zip: line.substring(152, 162).trim(),
        p5FilingDate: line.substring(162, 170).trim(),
      };
    } catch {
      continue;
    }
  }
}

/**
 * Convert a parsed P5 record to our standard Operator.
 */
export function p5ToOperator(p: ParsedOperator): Omit<Operator, 'id' | 'created_at' | 'updated_at'> {
  return {
    legal_name: normalizeOperatorName(p.operatorName),
    aliases: [p.operatorName.trim()], // Keep original ALL CAPS as alias
    hq_state: p.state || null,
    hq_city: p.city ? normalizeOperatorName(p.city) : null,
    active_asset_count: 0, // Will be computed
    compliance_flags: [],
    risk_score: null,
  };
}

// ── Wellbore Parser ───────────────────────────────────

/**
 * Parse the Full Wellbore file (fixed-width ASCII).
 *
 * Wellbore record layout (simplified, key fields):
 *   1-2:    Record Type
 *   3-4:    District Code
 *   5-7:    County Code
 *   8-15:   API Number (county + sequence)
 *   16-47:  Lease Name (32 chars)
 *   48-52:  Lease Number
 *   53-58:  Well Number
 *   59-64:  Operator Number
 *   65-100: Operator Name
 *  101-108: Field Number
 *  109-140: Field Name
 *  141-148: Completion Date (YYYYMMDD)
 *  149-156: Plug Date (YYYYMMDD)
 *  157-167: Latitude (decimal degrees, where available)
 *  168-179: Longitude (decimal degrees, where available)
 *  180-185: Total Depth (feet)
 *  186-186: Well Type (O/G)
 *  187-187: Well Status (A/I/S)
 *
 * Note: Actual field positions may vary. The parser is tolerant of
 * variations and will attempt to parse what it can.
 */
export async function* parseWellbore(
  filePath: string,
): AsyncGenerator<ParsedWell> {
  const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.length < 100) continue;

    try {
      const district = line.substring(2, 4).trim();
      const countyCode = line.substring(4, 7).trim();
      const apiSeq = line.substring(7, 15).trim();

      yield {
        apiNumber: `${TX_STATE_CODE}-${countyCode.padStart(3, '0')}-${apiSeq.padStart(5, '0')}`,
        district,
        countyCode,
        leaseName: line.substring(15, 47).trim(),
        leaseNumber: line.substring(47, 52).trim(),
        wellNumber: line.substring(52, 58).trim(),
        operatorNumber: line.substring(58, 64).trim(),
        operatorName: line.substring(64, 100).trim(),
        fieldNumber: line.substring(100, 108).trim(),
        fieldName: line.substring(108, 140).trim(),
        completionDate: line.substring(140, 148).trim() || null,
        plugDate: line.substring(148, 156).trim() || null,
        latitude: safeNum(line.substring(156, 167)),
        longitude: safeNum(line.substring(167, 179)),
        totalDepth: safeNum(line.substring(179, 185)) as number | null,
        wellType: line.substring(185, 186).trim(),
        wellStatus: line.substring(186, 187).trim(),
      };
    } catch {
      continue;
    }
  }
}

/**
 * Convert a parsed wellbore record to our standard Asset.
 */
export function wellToAsset(w: ParsedWell): Omit<Asset, 'id' | 'created_at' | 'updated_at'> {
  const basin = BASIN_BY_DISTRICT[w.district] || null;

  return {
    asset_type: mapWellType(w.wellType),
    name: w.leaseName
      ? `${normalizeOperatorName(w.leaseName)} #${w.wellNumber || '1'}`
      : `Well ${w.apiNumber}`,
    state: 'TX',
    county: countyName(w.countyCode),
    latitude: w.latitude || 0,
    longitude: w.longitude || 0,
    basin,
    operator_id: w.operatorNumber || null,
    status: mapWellStatus(w.wellStatus),
    spud_date: parseRRCDate(w.completionDate),
    depth_ft: w.totalDepth,
    commodity: mapWellType(w.wellType) === 'gas' ? 'natural gas' : 'crude oil',
    decline_rate: null,
    estimated_remaining_life_months: null,
  };
}

// ── Batch parsing with stats ──────────────────────────

/**
 * Parse an entire PDQ dump file and return arrays of production records and assets.
 * For very large files, use the async generator directly instead.
 */
export async function parsePDQDumpFile(
  filePath: string,
  options?: { limit?: number; yearFrom?: number; yearTo?: number },
): Promise<{
  productions: Omit<ProductionRecord, 'id' | 'created_at'>[];
  assets: Map<string, Omit<Asset, 'id' | 'created_at' | 'updated_at'>>;
  operators: Map<string, { number: string; name: string }>;
  stats: ParseStats;
}> {
  const start = Date.now();
  const productions: Omit<ProductionRecord, 'id' | 'created_at'>[] = [];
  const assets = new Map<string, Omit<Asset, 'id' | 'created_at' | 'updated_at'>>();
  const operators = new Map<string, { number: string; name: string }>();

  let totalRows = 0;
  let parsedRows = 0;
  let errorRows = 0;

  const limit = options?.limit || Infinity;
  const yearFrom = options?.yearFrom || 0;
  const yearTo = options?.yearTo || 9999;

  for await (const record of parsePDQDump(filePath)) {
    totalRows++;
    if (parsedRows >= limit) break;

    const year = record.month.getFullYear();
    if (year < yearFrom || year > yearTo) continue;

    try {
      productions.push(pdqToProductionRecord(record));

      const assetId = buildAssetId(record.district, record.leaseNumber, record.oilOrGas);
      if (!assets.has(assetId)) {
        assets.set(assetId, pdqToAsset(record));
      }

      if (record.operatorNumber && !operators.has(record.operatorNumber)) {
        operators.set(record.operatorNumber, {
          number: record.operatorNumber,
          name: record.operatorName,
        });
      }

      parsedRows++;
    } catch {
      errorRows++;
    }
  }

  const duration = `${((Date.now() - start) / 1000).toFixed(1)}s`;

  return {
    productions,
    assets,
    operators,
    stats: { totalRows, parsedRows, errorRows, duration },
  };
}
