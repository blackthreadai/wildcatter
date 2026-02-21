import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const sp = req.nextUrl.searchParams;
    const q = sp.get('q')?.trim() || '';
    const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '50', 10)));
    const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
    const offset = (page - 1) * limit;

    const assetParams: unknown[] = [];
    const assetConditions: string[] = [];

    if (q.length > 0) {
      assetParams.push(`%${q}%`);
      assetConditions.push(`a.name ILIKE $${assetParams.length}`);
    }
    if (sp.get('state')) {
      assetParams.push(sp.get('state'));
      assetConditions.push(`a.state = $${assetParams.length}`);
    }
    if (sp.get('basin')) {
      assetParams.push(sp.get('basin'));
      assetConditions.push(`a.basin = $${assetParams.length}`);
    }
    if (sp.get('type')) {
      assetParams.push(sp.get('type'));
      assetConditions.push(`a.asset_type = $${assetParams.length}`);
    }
    if (sp.get('status')) {
      assetParams.push(sp.get('status'));
      assetConditions.push(`a.status = $${assetParams.length}`);
    }

    const whereClause = assetConditions.length > 0 ? `WHERE ${assetConditions.join(' AND ')}` : '';

    // Count query
    const countQuery = `SELECT count(*)::int AS total FROM assets a ${whereClause}`;
    const { rows: [assetCountRow] } = await pool.query(countQuery, assetParams.slice());

    // Data query with pagination
    const dataParams = [...assetParams, limit, offset];
    const assetQuery = `
      SELECT a.id, a.name, a.asset_type, a.status, a.state, a.county, a.basin,
             a.latitude, a.longitude,
             o.legal_name AS operator_name
      FROM assets a
      LEFT JOIN operators o ON o.id = a.operator_id
      ${whereClause}
      ORDER BY a.name
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;

    // Operators
    const opParams: unknown[] = [];
    const opConditions: string[] = [];
    if (q.length > 0) {
      opParams.push(`%${q}%`);
      opConditions.push(`legal_name ILIKE $${opParams.length}`);
    }
    if (sp.get('state')) {
      opParams.push(sp.get('state'));
      opConditions.push(`hq_state = $${opParams.length}`);
    }

    const opWhere = opConditions.length > 0 ? `WHERE ${opConditions.join(' AND ')}` : '';

    const { rows: [opCountRow] } = await pool.query(`SELECT count(*)::int AS total FROM operators ${opWhere}`, opParams.slice());

    const opDataParams = [...opParams, limit, offset];
    const operatorQuery = `
      SELECT id, legal_name, hq_state, hq_city, active_asset_count, risk_score
      FROM operators
      ${opWhere}
      ORDER BY legal_name
      LIMIT $${opDataParams.length - 1} OFFSET $${opDataParams.length}
    `;

    const [assetsResult, operatorsResult] = await Promise.all([
      pool.query(assetQuery, dataParams),
      pool.query(operatorQuery, opDataParams),
    ]);

    return NextResponse.json({
      query: q,
      page,
      limit,
      assets: assetsResult.rows,
      assetTotal: assetCountRow?.total ?? 0,
      operators: operatorsResult.rows,
      operatorTotal: opCountRow?.total ?? 0,
    });
  } catch (err) {
    console.error('Search error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
