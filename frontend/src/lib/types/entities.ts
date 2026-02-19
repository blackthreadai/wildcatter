// ── Asset ──────────────────────────────────────────────

export type AssetType = 'oil' | 'gas' | 'mining' | 'energy';
export type AssetStatus = 'active' | 'inactive' | 'shut-in';

export interface Asset {
  id: string;
  asset_type: AssetType;
  name: string;
  state: string;
  county: string;
  latitude: number;
  longitude: number;
  basin: string | null;
  operator_id: string | null;
  status: AssetStatus;
  spud_date: Date | null;
  depth_ft: number | null;
  commodity: string | null;
  decline_rate: number | null;
  estimated_remaining_life_months: number | null;
  created_at: Date;
  updated_at: Date;
}

// ── Operator ──────────────────────────────────────────

export interface Operator {
  id: string;
  legal_name: string;
  aliases: string[];
  hq_state: string | null;
  hq_city: string | null;
  active_asset_count: number;
  compliance_flags: string[];
  risk_score: number | null;
  created_at: Date;
  updated_at: Date;
}

// ── Production Record ─────────────────────────────────

export interface ProductionRecord {
  id: string;
  asset_id: string;
  month: Date;
  oil_volume_bbl: number | null;
  gas_volume_mcf: number | null;
  ore_volume_tons: number | null;
  water_cut_pct: number | null;
  downtime_days: number | null;
  created_at: Date;
}

// ── Financial Estimate ────────────────────────────────

export interface FinancialEstimate {
  id: string;
  asset_id: string;
  estimated_revenue: number | null;
  estimated_operating_cost: number | null;
  estimated_net_cash_flow: number | null;
  breakeven_price: number | null;
  price_sensitivity: number | null;
  as_of_date: Date;
  created_at: Date;
}

// ── Data Provenance ───────────────────────────────────

export interface DataProvenance {
  id: string;
  source_name: string;
  source_url: string | null;
  ingested_at: Date;
  record_count: number;
  status: 'success' | 'partial' | 'failed';
  notes: string | null;
}

// ── User ──────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

// ── Auth ──────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  email: string;
}
