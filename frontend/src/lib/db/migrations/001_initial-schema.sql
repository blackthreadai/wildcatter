-- Enable extensions (Neon-compatible)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── Operators ─────────────────────────────────────────

CREATE TABLE operators (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legal_name    TEXT NOT NULL,
  aliases       TEXT[] NOT NULL DEFAULT '{}',
  hq_state      TEXT,
  hq_city       TEXT,
  active_asset_count INTEGER NOT NULL DEFAULT 0,
  compliance_flags   TEXT[] NOT NULL DEFAULT '{}',
  risk_score    NUMERIC(5,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_operators_legal_name ON operators (legal_name);
CREATE INDEX idx_operators_legal_name_trgm ON operators USING GIN (legal_name gin_trgm_ops);

-- ── Assets ────────────────────────────────────────────

CREATE TABLE assets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_type    TEXT NOT NULL CHECK (asset_type IN ('oil', 'gas', 'mining', 'energy')),
  name          TEXT NOT NULL,
  state         TEXT NOT NULL,
  county        TEXT NOT NULL,
  latitude      NUMERIC(10,6),
  longitude     NUMERIC(10,6),
  basin         TEXT,
  operator_id   UUID REFERENCES operators(id),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'shut-in')),
  spud_date     DATE,
  depth_ft      INTEGER,
  commodity     TEXT,
  decline_rate  NUMERIC(8,4),
  estimated_remaining_life_months INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_operator_id ON assets (operator_id);
CREATE INDEX idx_assets_status ON assets (status);
CREATE INDEX idx_assets_asset_type ON assets (asset_type);
CREATE INDEX idx_assets_basin ON assets (basin);
CREATE INDEX idx_assets_state_county ON assets (state, county);
CREATE INDEX idx_assets_lat_lng ON assets (latitude, longitude);
CREATE INDEX idx_assets_name_trgm ON assets USING GIN (name gin_trgm_ops);

-- ── Production Records ───────────────────────────────

CREATE TABLE production_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id        UUID NOT NULL REFERENCES assets(id),
  month           DATE NOT NULL,
  oil_volume_bbl  NUMERIC(14,2),
  gas_volume_mcf  NUMERIC(14,2),
  ore_volume_tons NUMERIC(14,2),
  water_cut_pct   NUMERIC(5,2),
  downtime_days   NUMERIC(5,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(asset_id, month)
);

CREATE INDEX idx_production_asset_month ON production_records (asset_id, month DESC);

-- ── Financial Estimates ───────────────────────────────

CREATE TABLE financial_estimates (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id                UUID NOT NULL REFERENCES assets(id),
  estimated_revenue       NUMERIC(14,2),
  estimated_operating_cost NUMERIC(14,2),
  estimated_net_cash_flow NUMERIC(14,2),
  breakeven_price         NUMERIC(10,2),
  price_sensitivity       NUMERIC(8,4),
  as_of_date              DATE NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_financial_asset_id ON financial_estimates (asset_id, as_of_date DESC);

-- ── Data Provenance ───────────────────────────────────

CREATE TABLE data_provenance (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_name   TEXT NOT NULL,
  source_url    TEXT,
  ingested_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  record_count  INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
  notes         TEXT
);

CREATE INDEX idx_provenance_source ON data_provenance (source_name, ingested_at DESC);
