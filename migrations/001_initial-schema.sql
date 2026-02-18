-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

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

-- ── Assets ────────────────────────────────────────────

CREATE TYPE asset_type AS ENUM ('oil', 'gas', 'mining', 'energy');
CREATE TYPE asset_status AS ENUM ('active', 'inactive', 'shut-in');

CREATE TABLE assets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_type    asset_type NOT NULL,
  name          TEXT NOT NULL,
  state         TEXT NOT NULL,
  county        TEXT NOT NULL,
  location      GEOMETRY(Point, 4326),
  basin         TEXT,
  operator_id   UUID REFERENCES operators(id),
  status        asset_status NOT NULL DEFAULT 'active',
  spud_date     DATE,
  depth_ft      INTEGER,
  commodity     TEXT,
  decline_rate  NUMERIC(8,4),
  estimated_remaining_life_months INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_location ON assets USING GIST (location);
CREATE INDEX idx_assets_operator_id ON assets (operator_id);
CREATE INDEX idx_assets_status ON assets (status);
CREATE INDEX idx_assets_asset_type ON assets (asset_type);
CREATE INDEX idx_assets_basin ON assets (basin);
CREATE INDEX idx_assets_state_county ON assets (state, county);

-- ── Production Records (TimescaleDB hypertable) ──────

CREATE TABLE production_records (
  id              UUID DEFAULT uuid_generate_v4(),
  asset_id        UUID NOT NULL REFERENCES assets(id),
  month           TIMESTAMPTZ NOT NULL,
  oil_volume_bbl  NUMERIC(14,2),
  gas_volume_mcf  NUMERIC(14,2),
  ore_volume_tons NUMERIC(14,2),
  water_cut_pct   NUMERIC(5,2),
  downtime_days   NUMERIC(5,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, month)
);

SELECT create_hypertable('production_records', 'month');

CREATE INDEX idx_production_asset_id ON production_records (asset_id, month DESC);

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

CREATE TYPE provenance_status AS ENUM ('success', 'partial', 'failed');

CREATE TABLE data_provenance (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_name   TEXT NOT NULL,
  source_url    TEXT,
  ingested_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  record_count  INTEGER NOT NULL DEFAULT 0,
  status        provenance_status NOT NULL DEFAULT 'success',
  notes         TEXT
);

CREATE INDEX idx_provenance_source ON data_provenance (source_name, ingested_at DESC);
