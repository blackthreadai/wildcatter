import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '25', 10)));
    const offset = (page - 1) * limit;
    const sortDir = sp.get('order')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const sortCol = sp.get('sort') === 'name' ? 'o.legal_name'
      : sp.get('sort') === 'assets' ? 'o.active_asset_count'
      : sp.get('sort') === 'totalProduction' ? 'total_production'
      : 'o.created_at';

    const params: unknown[] = [];
    const conditions: string[] = [];

    if (sp.get('q')) {
      params.push(`%${sp.get('q')}%`);
      conditions.push(`o.legal_name ILIKE $${params.length}`);
    }
    if (sp.get('state')) {
      params.push(sp.get('state'));
      conditions.push(`o.hq_state = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM operators o ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT o.*,
         COALESCE(tp.total_production, 0) AS total_production
       FROM operators o
       LEFT JOIN LATERAL (
         SELECT SUM(COALESCE(pr.oil_volume_bbl, 0) + COALESCE(pr.gas_volume_mcf, 0)) AS total_production
         FROM production_records pr
         JOIN assets a ON a.id = pr.asset_id
         WHERE a.operator_id = o.id
           AND pr.month = (SELECT MAX(month) FROM production_records)
       ) tp ON true
       ${where}
       ORDER BY ${sortCol} ${sortDir} NULLS LAST
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return NextResponse.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Operators list error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
