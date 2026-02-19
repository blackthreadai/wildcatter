import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './jwt';
import { JwtPayload } from '@/lib/types/entities';

/**
 * Validate JWT from Authorization header.
 * Returns the decoded payload on success, or a 401 NextResponse on failure.
 */
export function requireAuth(
  req: NextRequest
): JwtPayload | NextResponse {
  const header = req.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid authorization header' },
      { status: 401 }
    );
  }

  const token = header.slice(7);
  try {
    return verifyToken(token);
  } catch {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}
