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
    const conditions = ['pr.asset_id = $1'];

    if (sp.get('start')) {
      queryParams.push(sp.get('start'));
      conditions.push(`pr.month >= $${queryParams.length}`);
    }
    if (sp.get('end')) {
      queryParams.push(sp.get('end'));
      conditions.push(`pr.month <= $${queryParams.length}`);
    }

    const result = await pool.query(
      `SELECT month, oil_volume_bbl, gas_volume_mcf, ore_volume_tons, water_cut_pct, downtime_days
       FROM production_records pr
       WHERE ${conditions.join(' AND ')}
       ORDER BY month DESC`,
      queryParams
    );

    return NextResponse.json({ asset_id: id, data: result.rows });
  } catch (err) {
    console.error('Asset production error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
