import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    const { rows: [operatorCount] } = await pool.query(`SELECT count(*)::int AS total FROM operators`);
    const { rows: [assetCount] } = await pool.query(`SELECT count(*)::int AS total FROM assets`);
    const { rows: [activeCount] } = await pool.query(`SELECT count(*)::int AS total FROM assets WHERE status = 'active'`);
    const { rows: basins } = await pool.query(`
      SELECT basin, count(*)::int AS cnt
      FROM assets
      WHERE basin IS NOT NULL AND basin != ''
      GROUP BY basin
      ORDER BY cnt DESC
      LIMIT 8
    `);

    return NextResponse.json({
      totalOperators: operatorCount?.total ?? 0,
      totalAssets: assetCount?.total ?? 0,
      activeWells: activeCount?.total ?? 0,
      topBasins: basins.map((b: any) => b.basin),
    });
  } catch (e: any) {
    console.error('Stats overview error:', e);
    return NextResponse.json({ totalOperators: 0, totalAssets: 0, activeWells: 0, topBasins: [] }, { status: 500 });
  }
}
