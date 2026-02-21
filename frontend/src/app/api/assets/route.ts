import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';

const SORTABLE_COLUMNS: Record<string, string> = {
  name: 'a.name',
  state: 'a.state',
  basin: 'a.basin',
  status: 'a.status',
  county: 'a.county',
  decline_rate: 'a.decline_rate',
  age: 'a.spud_date',
  created_at: 'a.created_at',
};

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '25', 10)));
    const offset = (page - 1) * limit;

    const sortKey = sp.get('sort') || 'name';
    const sortDir = sp.get('order')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const sortCol = SORTABLE_COLUMNS[sortKey] || 'a.name';

    const params: unknown[] = [];
    const conditions: string[] = [];

    const addFilter = (field: string, paramName: string) => {
      const val = sp.get(paramName);
      if (val) {
        params.push(val);
        conditions.push(`${field} = $${params.length}`);
      }
    };

    addFilter('a.state', 'state');
    addFilter('a.county', 'county');
    if (sp.get('basin') === '__undefined__') {
      conditions.push(`(a.basin IS NULL OR a.basin = '')`);
    } else {
      addFilter('a.basin', 'basin');
    }
    addFilter('a.asset_type', 'type');
    addFilter('a.status', 'status');
    addFilter('a.operator_id', 'operator_id');

    if (sp.get('q')) {
      params.push(`%${sp.get('q')}%`);
      conditions.push(`a.name ILIKE $${params.length}`);
    }

    // Support fetching by IDs (for recently viewed)
    if (sp.get('ids')) {
      const ids = sp.get('ids')!.split(',').filter(Boolean);
      if (ids.length > 0) {
        params.push(ids);
        conditions.push(`a.id = ANY($${params.length}::uuid[])`);
      }
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countParams = params.slice();
    const { rows: [countRow] } = await pool.query(
      `SELECT count(*)::int AS total FROM assets a ${where}`,
      countParams
    );

    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT
        a.id, a.asset_type, a.name, a.state, a.county,
        a.latitude, a.longitude,
        a.basin, a.operator_id, a.status, a.spud_date, a.depth_ft,
        a.commodity, a.decline_rate, a.estimated_remaining_life_months,
        o.legal_name AS operator_name
      FROM assets a
      LEFT JOIN operators o ON o.id = a.operator_id
      ${where}
      ORDER BY ${sortCol} ${sortDir} NULLS LAST
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const total = countRow?.total ?? 0;

    return NextResponse.json({
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      // Compat aliases
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Assets list error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
