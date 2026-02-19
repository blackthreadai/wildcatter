/**
 * New Mexico Oil Conservation Division (OCD) data source constants
 */

// ── Data source URLs ─────────────────────────────────

export const OCD_URLS = {
  /** OCD Permitting — Well Search (ASP.NET web app, query-based) */
  WELL_SEARCH: 'https://wwwapps.emnrd.nm.gov/ocd/ocdpermitting/Data/Wells.aspx',

  /** OCD Permitting — Well Detail page (append ?api=XXXXXXXXXXX) */
  WELL_DETAIL: 'https://wwwapps.emnrd.nm.gov/ocd/ocdpermitting/Data/WellDetails.aspx',

  /** OCD Permitting — Operator well list (append ?operator=NNNNN) */
  OPERATOR_WELLS: 'https://wwwapps.emnrd.nm.gov/ocd/ocdpermitting/Data/OperatorWellList.aspx',

  /** EMNRD Water Data Act API — requires registration + JWT auth */
  WDA_API_BASE: 'https://api.emnrd.nm.gov/wda/api',

  /** WDA API — well endpoint */
  WDA_WELLS: 'https://api.emnrd.nm.gov/wda/api/Wells',

  /** WDA API — production endpoint */
  WDA_PRODUCTION: 'https://api.emnrd.nm.gov/wda/api/Production',

  /** WDA API — operators endpoint */
  WDA_OPERATORS: 'https://api.emnrd.nm.gov/wda/api/Operators',

  /** WDA API — authentication */
  WDA_AUTH: 'https://api.emnrd.nm.gov/wda/api/Auth/login',

  /** OCD well file download (C-115 production reports) */
  C115_REPORT: 'https://wwwapps.emnrd.nm.gov/ocd/ocdpermitting/Data/C115.aspx',

  /** GO-TECH / PRRC well data (NM Tech) */
  GOTECH_WELLS: 'https://gotech.nmt.edu/gotech/Wellsearch/wellsearch.aspx',
} as const;

// ── State code ───────────────────────────────────────
export const NM_STATE_CODE = '30'; // API state code for New Mexico

// ── OCD Districts ────────────────────────────────────
// NM OCD has 4 administrative districts
export const OCD_DISTRICTS: Record<string, string> = {
  '1': 'Artesia (SE NM)',
  '2': 'Santa Fe (NE NM)',
  '3': 'Aztec (NW NM)',
  '4': 'Hobbs (SE NM)',
};

// ── New Mexico county FIPS codes ─────────────────────
// NM has 33 counties
export const NM_COUNTY_CODES: Record<string, string> = {
  '001': 'BERNALILLO', '003': 'CATRON', '005': 'CHAVES', '006': 'CIBOLA',
  '007': 'COLFAX', '009': 'CURRY', '011': 'DE BACA', '013': 'DONA ANA',
  '015': 'EDDY', '017': 'GRANT', '019': 'GUADALUPE', '021': 'HARDING',
  '023': 'HIDALGO', '025': 'LEA', '027': 'LINCOLN', '028': 'LOS ALAMOS',
  '029': 'LUNA', '031': 'MCKINLEY', '033': 'MORA', '035': 'OTERO',
  '037': 'QUAY', '039': 'RIO ARRIBA', '041': 'ROOSEVELT', '043': 'SANDOVAL',
  '045': 'SAN JUAN', '047': 'SAN MIGUEL', '049': 'SANTA FE', '051': 'SIERRA',
  '053': 'SOCORRO', '055': 'TAOS', '057': 'TORRANCE', '059': 'UNION',
  '061': 'VALENCIA',
};

// Reverse lookup: county name → FIPS code
export const NM_COUNTY_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(NM_COUNTY_CODES).map(([code, name]) => [name, code]),
);

// ── Basin mapping by county ──────────────────────────
export const NM_BASIN_BY_COUNTY: Record<string, string> = {
  // Permian Basin (Delaware sub-basin in SE NM)
  EDDY: 'Permian (Delaware)', LEA: 'Permian (Delaware)',
  CHAVES: 'Permian (Delaware)', ROOSEVELT: 'Permian',

  // San Juan Basin (NW NM — major gas producer)
  'SAN JUAN': 'San Juan', 'RIO ARRIBA': 'San Juan',
  SANDOVAL: 'San Juan', MCKINLEY: 'San Juan',

  // Raton Basin (NE NM — coalbed methane)
  COLFAX: 'Raton', UNION: 'Raton', MORA: 'Raton',

  // Tucumcari Basin
  QUAY: 'Tucumcari', GUADALUPE: 'Tucumcari',
  'SAN MIGUEL': 'Tucumcari', HARDING: 'Tucumcari',

  // Estancia Basin
  TORRANCE: 'Estancia',

  // Pedregosa Basin (SW NM)
  HIDALGO: 'Pedregosa', GRANT: 'Pedregosa', LUNA: 'Pedregosa',

  // Otero Mesa area
  OTERO: 'Otero Mesa',

  // Lincoln County — mixed
  LINCOLN: 'Permian',

  // De Baca
  'DE BACA': 'Permian',
};

// ── Well status codes used by NM OCD ─────────────────
export const NM_WELL_STATUS_MAP: Record<string, 'active' | 'inactive' | 'shut-in'> = {
  'Active': 'active',
  'New': 'active',
  'Drilling': 'active',
  'Completing': 'active',
  'Producing': 'active',
  'Shut-in': 'shut-in',
  'Shut In': 'shut-in',
  'SI': 'shut-in',
  'TA': 'shut-in',        // Temporarily Abandoned
  'Inactive': 'inactive',
  'Plugged': 'inactive',
  'PA': 'inactive',        // Plugged & Abandoned
  'P&A': 'inactive',
  'Cancelled': 'inactive',
  'Expired': 'inactive',
  'Dry Hole': 'inactive',
  'DH': 'inactive',
};

// ── Well type mapping ────────────────────────────────
export const NM_WELL_TYPE_MAP: Record<string, 'oil' | 'gas'> = {
  'Oil': 'oil',
  'Gas': 'gas',
  'Oil Well': 'oil',
  'Gas Well': 'gas',
  'OIL': 'oil',
  'GAS': 'gas',
  'CBM': 'gas',            // Coalbed methane
  'CO2': 'gas',
  'Injection': 'oil',
  'SWD': 'oil',            // Saltwater disposal
  'Water Supply': 'oil',
  'Other': 'oil',
};
