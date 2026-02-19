# Wildcatter - Energy Asset Intelligence Platform

## Purpose
Centralized intelligence and analytics for oil, gas, mining, and energy assets using public data and derived estimates.

## Target Users
- Energy funds
- Family offices
- Independent operators
- Analysts / consultants

## MVP Geographic Focus
Texas / Oklahoma / New Mexico (tristate)

## Core User Jobs
1. Discover assets
2. Compare assets
3. Monitor assets
4. Export intelligence for diligence

## MVP Scope
### Included
- Asset database (wells / leases / mines)
- Operator profiles
- Production analytics
- Search & filters
- Basic financial estimates
- PDF / CSV export

### Excluded
- Marketplace / listings
- Messaging
- User uploads
- Real-time data
- Payments

## Core Entities

### Asset
Asset ID, Type (oil/gas/mining/energy), Name, Location (state/county/lat-long), Basin/region, Operator ID, Status (active/inactive/shut-in), Spud date, Depth, Commodity, Monthly production history, Decline rate (calculated), Estimated remaining life

### Operator
Operator ID, Legal name, Aliases, HQ location, Assets owned, Historical production, Active asset count, Compliance flags, Risk score (derived)

### Production Record
Asset ID, Month, Volume (oil/gas/ore), Water cut, Downtime

### Financial Estimate
Asset ID, Estimated revenue, Estimated operating cost, Estimated net cash flow, Breakeven price, Price sensitivity

## Core Screens
1. Home / Dashboard - market snapshot, recent assets, saved searches, alerts
2. Asset List View - table + map toggle, sortable, paginated
3. Asset Detail Page - summary, production chart, decline curve, financials, operator, related assets
4. Operator Profile Page - overview, asset list, production trend, risk indicators
5. Search & Filters - location, type, production range, decline rate, operator size, age, status
6. Export - PDF report, CSV download

## Data Ingestion (MVP)
### Sources
- Texas RRC
- Oklahoma OCC
- New Mexico OCD
- Federal public datasets

### Process
Scheduled ingestion → Normalization → Deduplication → Asset/operator linking

## Calculations
- Decline curve (basic exponential)
- Estimated revenue (production × price)
- Estimated costs (static benchmarks)
- Risk score (rule-based)

## Auth
- Email + password
- Single "User" role

## Non-Functional
- Read-only platform
- Fast search (<500ms)
- Scalable ingestion pipeline
- Clear data provenance tags

## Phase 5 — Renewable Energy (Future)
- Add asset types: solar, wind, hydro
- Production metrics: MWh instead of bbl/mcf
- Data sources: EIA, FERC, state utility commissions
- Financial benchmarks: capacity factor, PPA rates
- Separate "Power" section in UI
- Data model already supports this via asset_type field

## Tech Stack
- Backend: REST API
- Database: PostgreSQL (+ TimescaleDB extension)
- Frontend: Dashboard UI
- Cloud-hosted
