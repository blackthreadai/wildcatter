// Server-side entity types (used by API routes)
export { type JwtPayload } from './entities';
export {
  type Asset as DbAsset,
  type Operator as DbOperator,
  type ProductionRecord as DbProductionRecord,
  type FinancialEstimate as DbFinancialEstimate,
  type User as DbUser,
  type AssetType,
  type AssetStatus,
  type DataProvenance,
} from './entities';

// Frontend types used by components (camelCase, matching API response shapes)

export interface Asset {
  id: string;
  name: string;
  type: 'oil' | 'gas' | 'mining' | 'energy';
  status: 'active' | 'inactive' | 'shut-in';
  state: string;
  county: string;
  basin: string;
  latitude: number;
  longitude: number;
  operatorId: string;
  operatorName: string;
  spudDate: string;
  depth: number;
  commodity: string;
  currentProduction: number;
  declineRate: number;
  estimatedLife: number;
  cashFlow: number;
  age: number;
}

export interface Operator {
  id: string;
  name: string;
  aliases: string[];
  hqLocation: string;
  activeAssets: number;
  totalProduction: number;
  complianceFlags: string[];
  riskScore: number;
}

export interface ProductionRecord {
  assetId: string;
  month: string;
  oilVolume: number;
  gasVolume: number;
  waterCut: number;
  downtime: number;
}

export interface FinancialEstimate {
  assetId: string;
  revenue: number;
  operatingCost: number;
  netCashFlow: number;
  breakevenPrice: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface SearchFilters {
  query?: string;
  state?: string;
  county?: string;
  basin?: string;
  assetType?: string;
  status?: string;
  productionMin?: number;
  productionMax?: number;
  declineRateMin?: number;
  declineRateMax?: number;
  operatorSize?: string;
  ageMin?: number;
  ageMax?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
