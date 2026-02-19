/**
 * Shared normalization utilities for all state ingestion pipelines.
 */

/**
 * Common abbreviation expansions for operator/lease names.
 * Used across TX, OK, NM parsers.
 */
const ABBREV_MAP: Record<string, string> = {
  CO: 'Co', INC: 'Inc', LLC: 'LLC', LP: 'LP', LLP: 'LLP',
  LTD: 'Ltd', CORP: 'Corp', RES: 'Resources', OPER: 'Operating',
  PROD: 'Production', PETR: 'Petroleum', PETRO: 'Petroleum',
  EXPL: 'Exploration', DEV: 'Development', DRLG: 'Drilling',
  ENER: 'Energy', ENRGY: 'Energy', OIL: 'Oil', GAS: 'Gas',
  NGL: 'NGL', USA: 'USA', US: 'US', TX: 'TX', OK: 'OK', NM: 'NM',
  INTL: 'International', NATL: 'National', NAT: 'Natural',
  MGT: 'Management', MGMT: 'Management', SVC: 'Services',
  SVCS: 'Services', ASSOC: 'Associates', PART: 'Partners',
  GRP: 'Group', HLDG: 'Holdings', HLDGS: 'Holdings',
  AMER: 'American', TEX: 'Texas', MIDL: 'Midland',
  PERMIAN: 'Permian', OKLA: 'Oklahoma', OKC: 'OKC',
};

/**
 * Normalize an ALL-CAPS operator or entity name to Title Case
 * with smart abbreviation handling.
 */
export function normalizeName(raw: string): string {
  if (!raw || !raw.trim()) return '';
  return raw.trim()
    .split(/\s+/)
    .map((word) => {
      const upper = word.toUpperCase();
      if (ABBREV_MAP[upper]) return ABBREV_MAP[upper];
      if (upper.length <= 2) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Safely parse a numeric string, returning null for invalid values.
 */
export function safeNum(val: string | undefined | null): number | null {
  if (!val || !val.trim()) return null;
  const n = parseFloat(val.trim());
  return isNaN(n) ? null : n;
}

/**
 * Parse various date formats used by state agencies.
 * Supports: YYYYMMDD, MM/DD/YYYY, YYYY-MM-DD, YYYYMM
 */
export function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || !dateStr.trim() || dateStr.trim() === '0' || dateStr.trim() === '00000000') {
    return null;
  }
  const d = dateStr.trim();

  if (/^\d{8}$/.test(d)) {
    const date = new Date(parseInt(d.substring(0, 4)), parseInt(d.substring(4, 6)) - 1, parseInt(d.substring(6, 8)));
    return isNaN(date.getTime()) ? null : date;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d)) {
    const date = new Date(d);
    return isNaN(date.getTime()) ? null : date;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
    const date = new Date(d.substring(0, 10) + 'T00:00:00');
    return isNaN(date.getTime()) ? null : date;
  }
  if (/^\d{6}$/.test(d)) {
    const date = new Date(parseInt(d.substring(0, 4)), parseInt(d.substring(4, 6)) - 1, 1);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}
