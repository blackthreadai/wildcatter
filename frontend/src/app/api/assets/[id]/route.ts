import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { calculateAll } from '@/lib/calculations';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;

    const assetQuery = `
      SELECT
        a.id, a.asset_type, a.name, a.state, a.county,
        a.latitude, a.longitude,
        a.basin, a.operator_id, a.status, a.spud_date, a.depth_ft,
        a.commodity, a.decline_rate, a.estimated_remaining_life_months,
        a.created_at, a.updated_at,
        o.legal_name AS operator_name, o.hq_state AS operator_hq_state,
        o.risk_score AS operator_risk_score, o.compliance_flags AS operator_compliance_flags
      FROM assets a
      LEFT JOIN operators o ON o.id = a.operator_id
      WHERE a.id = $1
    `;

    const productionQuery = `
      SELECT month, oil_volume_bbl, gas_volume_mcf, ore_volume_tons, water_cut_pct, downtime_days
      FROM production_records
      WHERE asset_id = $1
      ORDER BY month DESC
      LIMIT 60
    `;

    const financialsQuery = `
      SELECT estimated_revenue, estimated_operating_cost, estimated_net_cash_flow,
             breakeven_price, price_sensitivity, as_of_date
      FROM financial_estimates
      WHERE asset_id = $1
      ORDER BY as_of_date DESC
      LIMIT 1
    `;

    const [assetResult, productionResult, financialsResult] = await Promise.all([
      pool.query(assetQuery, [id]),
      pool.query(productionQuery, [id]),
      pool.query(financialsQuery, [id]),
    ]);

    if (assetResult.rows.length === 0) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const asset = assetResult.rows[0];

    const relatedQuery = `
      SELECT id, name, asset_type, status, state, county, basin
      FROM assets
      WHERE id != $1 AND (operator_id = $2 OR basin = $3)
      LIMIT 10
    `;
    const relatedResult = await pool.query(relatedQuery, [id, asset.operator_id, asset.basin]);

    let financials = financialsResult.rows[0] || null;
    if (!financials && productionResult.rows.length > 0) {
      try {
        financials = calculateAll(asset, productionResult.rows);
      } catch {
        // Non-fatal
      }
    }

    return NextResponse.json({
      ...asset,
      production_history: productionResult.rows,
      financials,
      related_assets: relatedResult.rows,
    });
  } catch (err) {
    console.error('Asset detail error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
