import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;

    const opResult = await pool.query('SELECT * FROM operators WHERE id = $1', [id]);
    if (opResult.rows.length === 0) {
      return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
    }

    // Compute total production from latest month of each asset
    const prodResult = await pool.query(
      `SELECT COALESCE(SUM(lp.latest), 0) AS total_production
       FROM assets a
       LEFT JOIN LATERAL (
         SELECT COALESCE(oil_volume_bbl, 0) + COALESCE(gas_volume_mcf, 0) AS latest
         FROM production_records pr WHERE pr.asset_id = a.id ORDER BY month DESC LIMIT 1
       ) lp ON true
       WHERE a.operator_id = $1`,
      [id]
    );

    const assetsResult = await pool.query(
      `SELECT a.id, a.name, a.asset_type, a.status, a.state, a.county, a.basin, a.decline_rate,
              COALESCE(lp.latest, 0) AS latest_production
       FROM assets a
       LEFT JOIN LATERAL (
         SELECT COALESCE(oil_volume_bbl, 0) + COALESCE(gas_volume_mcf, 0) AS latest
         FROM production_records pr WHERE pr.asset_id = a.id ORDER BY month DESC LIMIT 1
       ) lp ON true
       WHERE a.operator_id = $1 ORDER BY a.created_at DESC LIMIT 20`,
      [id]
    );

    const trendResult = await pool.query(
      `SELECT
         date_trunc('month', pr.month) AS month,
         SUM(pr.oil_volume_bbl) AS total_oil_bbl,
         SUM(pr.gas_volume_mcf) AS total_gas_mcf
       FROM production_records pr
       JOIN assets a ON a.id = pr.asset_id
       WHERE a.operator_id = $1
       GROUP BY date_trunc('month', pr.month)
       ORDER BY month DESC
       LIMIT 24`,
      [id]
    );

    const op = opResult.rows[0];
    return NextResponse.json({
      ...op,
      risk_score: op.risk_score ?? 0,
      total_production: Number(prodResult.rows[0]?.total_production || 0),
      assets: assetsResult.rows,
      production_trend: trendResult.rows,
    });
  } catch (err) {
    console.error('Operator detail error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
