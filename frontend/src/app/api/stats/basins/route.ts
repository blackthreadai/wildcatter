import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT basin, count(*)::int AS count, 
             string_agg(DISTINCT state, ', ' ORDER BY state) AS states
      FROM assets
      WHERE basin IS NOT NULL AND basin != ''
      GROUP BY basin
      ORDER BY count DESC
    `);

    // Add undefined basin count
    const { rows: [undefinedRow] } = await pool.query(`
      SELECT count(*)::int AS count,
             string_agg(DISTINCT state, ', ' ORDER BY state) AS states
      FROM assets
      WHERE basin IS NULL OR basin = ''
    `);

    if (undefinedRow.count > 0) {
      rows.push({ basin: '__undefined__', count: undefinedRow.count, states: undefinedRow.states });
    }

    return NextResponse.json(rows);
  } catch (e: any) {
    console.error('Basins stats error:', e);
    return NextResponse.json([], { status: 500 });
  }
}
