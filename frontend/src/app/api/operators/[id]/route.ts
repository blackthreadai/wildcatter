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

    const assetsResult = await pool.query(
      `SELECT id, name, asset_type, status, state, county, basin, decline_rate
       FROM assets WHERE operator_id = $1 ORDER BY created_at DESC LIMIT 20`,
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

    return NextResponse.json({
      ...opResult.rows[0],
      assets: assetsResult.rows,
      production_trend: trendResult.rows,
    });
  } catch (err) {
    console.error('Operator detail error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
