import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const sp = req.nextUrl.searchParams;
    const q = sp.get('q');
    if (!q || q.trim().length === 0) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    const limit = Math.min(50, Math.max(1, parseInt(sp.get('limit') || '10', 10)));
    const pattern = `%${q}%`;

    const assetParams: unknown[] = [pattern];
    const assetConditions = ['a.name ILIKE $1'];

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

    assetParams.push(limit);
    const assetQuery = `
      SELECT a.id, a.name, a.asset_type, a.status, a.state, a.county, a.basin,
             a.latitude, a.longitude,
             o.legal_name AS operator_name
      FROM assets a
      LEFT JOIN operators o ON o.id = a.operator_id
      WHERE ${assetConditions.join(' AND ')}
      ORDER BY a.name
      LIMIT $${assetParams.length}
    `;

    const operatorQuery = `
      SELECT id, legal_name, hq_state, hq_city, active_asset_count, risk_score
      FROM operators
      WHERE legal_name ILIKE $1
      ORDER BY legal_name
      LIMIT $2
    `;

    const [assetsResult, operatorsResult] = await Promise.all([
      pool.query(assetQuery, assetParams),
      pool.query(operatorQuery, [pattern, limit]),
    ]);

    return NextResponse.json({
      query: q,
      assets: assetsResult.rows,
      operators: operatorsResult.rows,
    });
  } catch (err) {
    console.error('Search error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
