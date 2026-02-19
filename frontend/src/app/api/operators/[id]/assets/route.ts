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
    const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '25', 10)));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM assets WHERE operator_id = $1', [id]);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await pool.query(
      `SELECT id, asset_type, name, state, county, basin, status, decline_rate,
              latitude, longitude, created_at
       FROM assets WHERE operator_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    return NextResponse.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Operator assets error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
