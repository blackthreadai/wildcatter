import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const type = req.nextUrl.searchParams.get('type');
    const userId = auth.userId;

    if (type === 'asset' || type === 'operator') {
      const table = type === 'asset' ? 'assets' : 'operators';
      const nameCol = type === 'operator' ? 'legal_name' : 'name';
      const res = await pool.query(
        `SELECT s.id as saved_id, s.item_type, s.item_id, s.created_at as saved_at, t.*
         FROM saved_items s JOIN ${table} t ON t.id = s.item_id
         WHERE s.user_id = $1 AND s.item_type = $2
         ORDER BY s.created_at DESC`,
        [userId, type]
      );
      return NextResponse.json({ [type + 's']: res.rows });
    }

    // Return both
    const [assetRes, opRes] = await Promise.all([
      pool.query(
        `SELECT s.id as saved_id, s.item_type, s.item_id, s.created_at as saved_at, s.note, a.*,
                o.legal_name as operator_name,
                COALESCE(lp.latest_production, 0) AS latest_production,
                fe.estimated_net_cash_flow AS cash_flow
         FROM saved_items s
         JOIN assets a ON a.id = s.item_id
         LEFT JOIN operators o ON o.id = a.operator_id
         LEFT JOIN LATERAL (
           SELECT COALESCE(oil_volume_bbl, 0) + COALESCE(gas_volume_mcf, 0) AS latest_production
           FROM production_records pr WHERE pr.asset_id = a.id ORDER BY month DESC LIMIT 1
         ) lp ON true
         LEFT JOIN LATERAL (
           SELECT estimated_net_cash_flow
           FROM financial_estimates fe2 WHERE fe2.asset_id = a.id ORDER BY as_of_date DESC LIMIT 1
         ) fe ON true
         WHERE s.user_id = $1 AND s.item_type = 'asset'
         ORDER BY s.created_at DESC`,
        [userId]
      ),
      pool.query(
        `SELECT s.id as saved_id, s.item_type, s.item_id, s.created_at as saved_at, s.note, o.*
         FROM saved_items s JOIN operators o ON o.id = s.item_id
         WHERE s.user_id = $1 AND s.item_type = 'operator'
         ORDER BY s.created_at DESC`,
        [userId]
      ),
    ]);

    return NextResponse.json({ assets: assetRes.rows, operators: opRes.rows });
  } catch (err) {
    console.error('Error fetching saved items:', err);
    return NextResponse.json({ error: 'Failed to fetch saved items' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { itemType, itemId } = await req.json();
    if (!['asset', 'operator'].includes(itemType) || !itemId) {
      return NextResponse.json({ error: 'itemType (asset|operator) and itemId required' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO saved_items (user_id, item_type, item_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, item_type, item_id) DO NOTHING
       RETURNING *`,
      [auth.userId, itemType, itemId]
    );

    return NextResponse.json(result.rows[0] || { message: 'Already saved' }, { status: 201 });
  } catch (err) {
    console.error('Error saving item:', err);
    return NextResponse.json({ error: 'Failed to save item' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { itemType, itemId, note } = await req.json();
    if (!['asset', 'operator'].includes(itemType) || !itemId) {
      return NextResponse.json({ error: 'itemType and itemId required' }, { status: 400 });
    }
    if (typeof note !== 'string' || note.length > 300) {
      return NextResponse.json({ error: 'Note must be a string up to 300 characters' }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE saved_items SET note = $1 WHERE user_id = $2 AND item_type = $3 AND item_id = $4 RETURNING *`,
      [note || null, auth.userId, itemType, itemId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Saved item not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating note:', err);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const itemId = req.nextUrl.searchParams.get('itemId');
    const itemType = req.nextUrl.searchParams.get('itemType');

    if (!itemType || !['asset', 'operator'].includes(itemType) || !itemId) {
      return NextResponse.json({ error: 'itemId and itemType query params required' }, { status: 400 });
    }

    await pool.query(
      'DELETE FROM saved_items WHERE user_id = $1 AND item_type = $2 AND item_id = $3',
      [auth.userId, itemType, itemId]
    );

    return NextResponse.json({ message: 'Unsaved' });
  } catch (err) {
    console.error('Error unsaving item:', err);
    return NextResponse.json({ error: 'Failed to unsave item' }, { status: 500 });
  }
}
