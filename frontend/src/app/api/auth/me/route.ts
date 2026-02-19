import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const result = await pool.query('SELECT id, email, created_at FROM users WHERE id = $1', [authResult.userId]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
