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
    const sp = req.nextUrl.searchParams;
    const queryParams: unknown[] = [id];
    const conditions = ['a.operator_id = $1'];

    if (sp.get('start')) {
      queryParams.push(sp.get('start'));
      conditions.push(`pr.month >= $${queryParams.length}`);
    }
    if (sp.get('end')) {
      queryParams.push(sp.get('end'));
      conditions.push(`pr.month <= $${queryParams.length}`);
    }

    const result = await pool.query(
      `SELECT
         date_trunc('month', pr.month) AS month,
         SUM(pr.oil_volume_bbl) AS total_oil_bbl,
         SUM(pr.gas_volume_mcf) AS total_gas_mcf,
         SUM(pr.ore_volume_tons) AS total_ore_tons,
         AVG(pr.water_cut_pct) AS avg_water_cut_pct,
         COUNT(DISTINCT pr.asset_id) AS asset_count
       FROM production_records pr
       JOIN assets a ON a.id = pr.asset_id
       WHERE ${conditions.join(' AND ')}
       GROUP BY date_trunc('month', pr.month)
       ORDER BY month DESC`,
      queryParams
    );

    return NextResponse.json({ operator_id: id, data: result.rows });
  } catch (err) {
    console.error('Operator production error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
