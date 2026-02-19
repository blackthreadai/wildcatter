/**
 * Oklahoma Corporation Commission (OCC) data source constants
 */

// ── Data source URLs ─────────────────────────────────
// All from https://oklahoma.gov/occ/divisions/oil-gas/oil-gas-data.html

export const OCC_DATA_URLS = {
  /** RBDMS Well Data — CSV, updated nightly, ~200k+ wells */
  RBDMS_WELLS_CSV: 'https://oklahoma.gov/content/dam/ok/en/occ/documents/og/ogdatafiles/rbdms-wells.csv',

  /** RBDMS Wells shapefile (zipped) for GIS */
  RBDMS_WELLS_SHP: 'https://oklahoma.gov/content/dam/ok/en/occ/documents/og/ogdatafiles/RBDMS_WELLS.zip',

  /** Well Completions master (2010-present) — XLSX */
  COMPLETIONS_MASTER: 'https://oklahoma.gov/content/dam/ok/en/occ/documents/og/ogdatafiles/completions-wells-formations-base.xlsx',

  /** Well Completions last 7 days — XLSX */
  COMPLETIONS_DAILY: 'https://oklahoma.gov/content/dam/ok/en/occ/documents/og/ogdatafiles/completions-wells-formations-daily.xlsx',

  /** Legacy completions (pre-2010) — XLSX */
  COMPLETIONS_LEGACY: 'https://oklahoma.gov/content/dam/ok/en/occ/documents/og/ogdatafiles/completions-wells-legacy.xlsx',

  /** Intent to Drill master — XLSX */
  ITD_MASTER: 'https://oklahoma.gov/content/dam/ok/en/occ/documents/og/ogdatafiles/ITD-wells-formations-base.xlsx',

  /** Intent to Drill last 7 days — XLSX */
  ITD_DAILY: 'https://oklahoma.gov/content/dam/ok/en/occ/documents/og/ogdatafiles/ITD-wells-formations-daily.xlsx',

  /** Incident reports — CSV */
  INCIDENTS: 'https://oklahoma.gov/content/dam/ok/en/occ/documents/og/ogdatafiles/ogcd-incidents.csv',

  /** Orphan well list — XLSX */
  ORPHAN_WELLS: 'https://oklahoma.gov/content/dam/ok/en/occ/documents/og/ogdatafiles/orphan-well-list.xlsx',

  /** Well transfers last 30 days — XLSX */
  WELL_TRANSFERS: 'https://oklahoma.gov/content/dam/ok/en/occ/documents/og/ogdatafiles/well-transfers-daily.xlsx',

  /** Well records document search base URL */
  WELL_RECORDS_SEARCH: 'https://public.occ.ok.gov/OGCDWellRecords/Search.aspx',
} as const;

/**
 * Oklahoma Tax Commission — gross production data.
 * OCC does NOT publish production volumes; the OK Tax Commission does.
 * This requires a separate data request or scraping their reporting portal.
 */
export const OTC_PRODUCTION_INFO = {
  url: 'https://oklahoma.gov/tax/businesses/oil-gas-gross-production.html',
  note: 'Production volumes are reported to the Oklahoma Tax Commission, not OCC. Bulk data access may require FOIA or their electronic reporting system.',
} as const;

// ── Oklahoma state code ──────────────────────────────
export const OK_STATE_CODE = '35'; // API state code for Oklahoma

// ── RBDMS CSV column names (header row) ──────────────
export const RBDMS_COLUMNS = [
  'API', 'WELL_RECORDS_DOCS', 'WELL_NAME', 'WELL_NUM', 'OPERATOR',
  'WELLSTATUS', 'WELLTYPE', 'SYMBOL_CLASS', 'SH_LAT', 'SH_LON',
  'COUNTY', 'SECTION', 'TOWNSHIP', 'RANGE', 'QTR4', 'QTR3', 'QTR2', 'QTR1',
  'PM', 'FOOTAGE_EW', 'EW', 'FOOTAGE_NS', 'NS',
] as const;

// ── Oklahoma county FIPS codes ───────────────────────
// Oklahoma has 77 counties
export const OK_COUNTY_CODES: Record<string, string> = {
  '001': 'ADAIR', '003': 'ALFALFA', '005': 'ATOKA', '007': 'BEAVER',
  '009': 'BECKHAM', '011': 'BLAINE', '013': 'BRYAN', '015': 'CADDO',
  '017': 'CANADIAN', '019': 'CARTER', '021': 'CHEROKEE', '023': 'CHOCTAW',
  '025': 'CIMARRON', '027': 'CLEVELAND', '029': 'COAL', '031': 'COMANCHE',
  '033': 'COTTON', '035': 'CRAIG', '037': 'CREEK', '039': 'CUSTER',
  '041': 'DELAWARE', '043': 'DEWEY', '045': 'ELLIS', '047': 'GARFIELD',
  '049': 'GARVIN', '051': 'GRADY', '053': 'GRANT', '055': 'GREER',
  '057': 'HARMON', '059': 'HARPER', '061': 'HASKELL', '063': 'HUGHES',
  '065': 'JACKSON', '067': 'JEFFERSON', '069': 'JOHNSTON', '071': 'KAY',
  '073': 'KINGFISHER', '075': 'KIOWA', '077': 'LATIMER', '079': 'LE FLORE',
  '081': 'LINCOLN', '083': 'LOGAN', '085': 'LOVE', '087': 'MAJOR',
  '089': 'MARSHALL', '091': 'MAYES', '093': 'MCCLAIN', '095': 'MCCURTAIN',
  '097': 'MCINTOSH', '099': 'MURRAY', '101': 'MUSKOGEE', '103': 'NOBLE',
  '105': 'NOWATA', '107': 'OKFUSKEE', '109': 'OKLAHOMA', '111': 'OKMULGEE',
  '113': 'OSAGE', '115': 'OTTAWA', '117': 'PAWNEE', '119': 'PAYNE',
  '121': 'PITTSBURG', '123': 'PONTOTOC', '125': 'POTTAWATOMIE', '127': 'PUSHMATAHA',
  '129': 'ROGER MILLS', '131': 'ROGERS', '133': 'SEMINOLE', '135': 'SEQUOYAH',
  '137': 'STEPHENS', '139': 'TEXAS', '141': 'TILLMAN', '143': 'TULSA',
  '145': 'WAGONER', '147': 'WASHINGTON', '149': 'WASHITA', '151': 'WOODS',
  '153': 'WOODWARD',
};

// Reverse lookup: county name → FIPS code
export const OK_COUNTY_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(OK_COUNTY_CODES).map(([code, name]) => [name, code]),
);

// ── Basin mapping by county ──────────────────────────
// Oklahoma spans several major basins
export const OK_BASIN_BY_COUNTY: Record<string, string> = {
  // Anadarko Basin (western OK — the big one)
  BECKHAM: 'Anadarko', BLAINE: 'Anadarko', CADDO: 'Anadarko', CANADIAN: 'Anadarko',
  CUSTER: 'Anadarko', DEWEY: 'Anadarko', ELLIS: 'Anadarko', GRADY: 'Anadarko',
  GREER: 'Anadarko', HARMON: 'Anadarko', KIOWA: 'Anadarko', MAJOR: 'Anadarko',
  'ROGER MILLS': 'Anadarko', WASHITA: 'Anadarko', WOODWARD: 'Anadarko',
  // Anadarko extends into these
  KINGFISHER: 'Anadarko', GARFIELD: 'Anadarko',

  // Arkoma Basin (eastern OK)
  COAL: 'Arkoma', HASKELL: 'Arkoma', LATIMER: 'Arkoma', 'LE FLORE': 'Arkoma',
  MCINTOSH: 'Arkoma', PITTSBURG: 'Arkoma', SEQUOYAH: 'Arkoma',
  HUGHES: 'Arkoma', MUSKOGEE: 'Arkoma',

  // Ardmore Basin (south-central OK)
  CARTER: 'Ardmore', GARVIN: 'Ardmore', JOHNSTON: 'Ardmore',
  LOVE: 'Ardmore', MARSHALL: 'Ardmore', MURRAY: 'Ardmore',

  // Cherokee Platform (NE OK)
  CRAIG: 'Cherokee Platform', CREEK: 'Cherokee Platform', DELAWARE: 'Cherokee Platform',
  MAYES: 'Cherokee Platform', NOWATA: 'Cherokee Platform', OSAGE: 'Cherokee Platform',
  OTTAWA: 'Cherokee Platform', PAWNEE: 'Cherokee Platform', ROGERS: 'Cherokee Platform',
  TULSA: 'Cherokee Platform', WAGONER: 'Cherokee Platform', WASHINGTON: 'Cherokee Platform',

  // Hugoton Embayment / Panhandle
  BEAVER: 'Hugoton', CIMARRON: 'Hugoton', HARPER: 'Hugoton', TEXAS: 'Hugoton',
  WOODS: 'Hugoton',

  // Marietta Basin
  JEFFERSON: 'Marietta', STEPHENS: 'Marietta',

  // Sedgwick Basin / NE
  GRANT: 'Sedgwick', KAY: 'Sedgwick', NOBLE: 'Sedgwick',

  // Others default to null in the parser
};

// ── Well status mapping ──────────────────────────────
// RBDMS WELLSTATUS values → our AssetStatus
export const WELL_STATUS_MAP: Record<string, 'active' | 'inactive' | 'shut-in'> = {
  'AA': 'active',   // Active – Allocated
  'AI': 'active',   // Active – Injection
  'AO': 'active',   // Active – Other
  'AP': 'active',   // Active – Producing
  'CCO': 'inactive', // Cancelled – Consent Order
  'CCR': 'inactive', // Cancelled – Completion Report
  'CI': 'shut-in',  // Currently Inactive
  'CPO': 'inactive', // Cancelled – Plugging Order
  'EX': 'inactive',  // Exempt
  'IN': 'inactive',  // Inactive
  'NEW': 'active',   // New permit
  'NR': 'inactive',  // No Report
  'PA': 'inactive',  // Plugged and Abandoned
  'SI': 'shut-in',   // Shut In
  'TA': 'shut-in',   // Temporarily Abandoned
  'W': 'active',     // Working (drilling)
};

// ── Well type mapping ────────────────────────────────
// RBDMS WELLTYPE values → our AssetType
export const WELL_TYPE_MAP: Record<string, 'oil' | 'gas'> = {
  'OIL': 'oil',
  'GAS': 'gas',
  'OIL WELL': 'oil',
  'GAS WELL': 'gas',
  'COMBO': 'oil', // Oil & Gas combo → default oil
  'CBM': 'gas',   // Coalbed methane
  'DRY': 'oil',   // Dry hole — default
  'INJ': 'oil',   // Injection
  'SWD': 'oil',   // Saltwater disposal
  'OBSERVATION': 'oil',
  'OTHER': 'oil',
  'TEST': 'oil',
  'WATER SUPPLY': 'oil',
};
