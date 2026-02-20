import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if email is already taken by another user
    const existing = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, auth.userId]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    await pool.query('UPDATE users SET email = $1 WHERE id = $2', [email, auth.userId]);
    return NextResponse.json({ message: 'Email updated' });
  } catch (err) {
    console.error('Profile update error:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
