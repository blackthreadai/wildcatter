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
    const sortCol = sp.get('sort') === 'name' ? 'legal_name' : sp.get('sort') === 'assets' ? 'active_asset_count' : 'created_at';

    const params: unknown[] = [];
    const conditions: string[] = [];

    if (sp.get('q')) {
      params.push(`%${sp.get('q')}%`);
      conditions.push(`legal_name ILIKE $${params.length}`);
    }
    if (sp.get('state')) {
      params.push(sp.get('state'));
      conditions.push(`hq_state = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM operators ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT * FROM operators ${where} ORDER BY ${sortCol} ${sortDir} NULLS LAST LIMIT $${params.length - 1} OFFSET $${params.length}`,
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
