import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const sp = req.nextUrl.searchParams;
    const groupBy = sp.get('group_by') || 'state';
    const validGroups: Record<string, string> = { state: 'a.state', basin: 'a.basin', commodity: 'a.commodity' };
    const groupCol = validGroups[groupBy] || 'a.state';

    const params: unknown[] = [];
    const conditions: string[] = [];

    if (sp.get('start')) {
      params.push(sp.get('start'));
      conditions.push(`pr.month >= $${params.length}`);
    }
    if (sp.get('end')) {
      params.push(sp.get('end'));
      conditions.push(`pr.month <= $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT
         ${groupCol} AS group_key,
         date_trunc('month', pr.month) AS month,
         SUM(pr.oil_volume_bbl) AS total_oil_bbl,
         SUM(pr.gas_volume_mcf) AS total_gas_mcf,
         COUNT(DISTINCT pr.asset_id) AS asset_count
       FROM production_records pr
       JOIN assets a ON a.id = pr.asset_id
       ${where}
       GROUP BY ${groupCol}, date_trunc('month', pr.month)
       ORDER BY month DESC, group_key`,
      params
    );

    return NextResponse.json({ group_by: groupBy, data: result.rows });
  } catch (err) {
    console.error('Production summary error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
