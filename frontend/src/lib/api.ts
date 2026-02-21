import axios from 'axios';

// ── snake_case → camelCase recursive converter ────────────────────────

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

/** Field aliases: maps generic-camelCased keys to the names frontend types expect */
const FIELD_ALIASES: Record<string, string | undefined> = {
  assetType: 'type',
  legalName: 'name',
  depthFt: 'depth',
  estimatedRemainingLifeMonths: 'estimatedLife',
  latestProduction: 'currentProduction',
  activeAssetCount: 'activeAssets',
  oilVolumeBbl: 'oilVolume',
  gasVolumeMcf: 'gasVolume',
  waterCutPct: 'waterCut',
  downtimeDays: 'downtime',
  estimatedRevenue: 'revenue',
  estimatedOperatingCost: 'operatingCost',
  estimatedNetCashFlow: 'netCashFlow',
  // Aggregated production fields from operator endpoints
  totalOilBbl: 'oilVolume',
  totalGasMcf: 'gasVolume',
  totalOreTons: 'oreVolume',
  avgWaterCutPct: 'waterCut',
  passwordHash: undefined, // strip sensitive fields
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(transformKeys);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      let newKey = snakeToCamel(key);
      if (newKey in FIELD_ALIASES) {
        const alias = FIELD_ALIASES[newKey];
        if (alias === undefined) continue; // strip field
        newKey = alias;
      }
      out[newKey] = transformKeys(value);
    }
    // Synthesize hqLocation from hqCity + hqState if present
    if ('hqCity' in out || 'hqState' in out) {
      const parts = [out.hqCity, out.hqState].filter(Boolean);
      out.hqLocation = parts.join(', ') || null;
    }
    // Synthesize totalProduction for operators (sum from activeAssets context)
    // This field comes from joined queries when available; keep as-is if present

    return out;
  }
  return obj;
}

/** Convert numeric string fields to actual numbers */
const NUMERIC_FIELDS = new Set([
  'latitude', 'longitude', 'declineRate', 'currentProduction', 'cashFlow',
  'revenue', 'operatingCost', 'netCashFlow', 'breakevenPrice', 'priceSensitivity',
  'riskScore', 'oilVolume', 'gasVolume', 'oreVolume', 'waterCut', 'downtime',
  'totalProduction',
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function coerceNumbers(obj: any): any {
  if (Array.isArray(obj)) return obj.map(coerceNumbers);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    for (const key of Object.keys(obj)) {
      if (NUMERIC_FIELDS.has(key) && typeof obj[key] === 'string') {
        const n = parseFloat(obj[key]);
        if (!isNaN(n)) obj[key] = n;
      } else if (typeof obj[key] === 'object') {
        obj[key] = coerceNumbers(obj[key]);
      }
    }
  }
  return obj;
}

/**
 * Flatten `{ data: [...], pagination: { page, limit, total, totalPages } }`
 * into `{ data: [...], page, limit, total, totalPages }` so components
 * can read `res.data.totalPages` directly.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenPagination(obj: any): any {
  if (obj && typeof obj === 'object' && obj.pagination && obj.data) {
    const { pagination, ...rest } = obj;
    return { ...rest, ...pagination };
  }
  return obj;
}

// ── Axios instance ────────────────────────────────────────────────────

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('wc_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    res.data = coerceNumbers(flattenPagination(transformKeys(res.data)));
    return res;
  },
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('wc_token');
      window.location.href = '/welcome';
    }
    return Promise.reject(err);
  }
);

export default api;
