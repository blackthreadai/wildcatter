import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';

const SORTABLE_COLUMNS: Record<string, string> = {
  name: 'a.name',
  production: 'latest_production',
  decline_rate: 'a.decline_rate',
  cash_flow: 'cash_flow',
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

    const sortKey = sp.get('sort') || 'created_at';
    const sortDir = sp.get('order')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const sortCol = SORTABLE_COLUMNS[sortKey] || 'a.created_at';

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
    addFilter('a.basin', 'basin');
    addFilter('a.asset_type', 'type');
    addFilter('a.status', 'status');
    addFilter('a.operator_id', 'operator_id');

    if (sp.get('min_production')) {
      params.push(parseFloat(sp.get('min_production')!));
      conditions.push(`COALESCE(lp.latest_production, 0) >= $${params.length}`);
    }
    if (sp.get('max_production')) {
      params.push(parseFloat(sp.get('max_production')!));
      conditions.push(`COALESCE(lp.latest_production, 0) <= $${params.length}`);
    }
    if (sp.get('min_decline_rate')) {
      params.push(parseFloat(sp.get('min_decline_rate')!));
      conditions.push(`a.decline_rate >= $${params.length}`);
    }
    if (sp.get('max_decline_rate')) {
      params.push(parseFloat(sp.get('max_decline_rate')!));
      conditions.push(`a.decline_rate <= $${params.length}`);
    }

    if (sp.get('q')) {
      params.push(`%${sp.get('q')}%`);
      conditions.push(`a.name ILIKE $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) FROM assets a
      LEFT JOIN LATERAL (
        SELECT COALESCE(oil_volume_bbl, 0) + COALESCE(gas_volume_mcf, 0) AS latest_production
        FROM production_records pr WHERE pr.asset_id = a.id ORDER BY month DESC LIMIT 1
      ) lp ON true
      ${where}
    `;

    const dataQuery = `
      SELECT
        a.id, a.asset_type, a.name, a.state, a.county,
        a.latitude, a.longitude,
        a.basin, a.operator_id, a.status, a.spud_date, a.depth_ft,
        a.commodity, a.decline_rate, a.estimated_remaining_life_months,
        a.created_at, a.updated_at,
        o.legal_name AS operator_name,
        COALESCE(lp.latest_production, 0) AS latest_production,
        fe.estimated_net_cash_flow AS cash_flow
      FROM assets a
      LEFT JOIN operators o ON o.id = a.operator_id
      LEFT JOIN LATERAL (
        SELECT COALESCE(oil_volume_bbl, 0) + COALESCE(gas_volume_mcf, 0) AS latest_production
        FROM production_records pr WHERE pr.asset_id = a.id ORDER BY month DESC LIMIT 1
      ) lp ON true
      LEFT JOIN LATERAL (
        SELECT estimated_net_cash_flow
        FROM financial_estimates fe2 WHERE fe2.asset_id = a.id ORDER BY as_of_date DESC LIMIT 1
      ) fe ON true
      ${where}
      ORDER BY ${sortCol} ${sortDir} NULLS LAST
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, params.slice(0, -2)),
      pool.query(dataQuery, params),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    return NextResponse.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Assets list error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
