import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const sp = req.nextUrl.searchParams;
    const bbox = sp.get('bbox');
    const zoom = sp.get('zoom');
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number);
      params.push(minLng, minLat, maxLng, maxLat);
      conditions.push(
        `a.longitude >= $${params.length - 3} AND a.latitude >= $${params.length - 2} AND a.longitude <= $${params.length - 1} AND a.latitude <= $${params.length}`
      );
    }

    const zoomLevel = zoom ? parseInt(zoom, 10) : 10;
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let result;
    if (zoomLevel < 8) {
      const gridFactor = Math.pow(2, zoomLevel) / 10;
      const query = `
        SELECT
          AVG(a.longitude) AS cx,
          AVG(a.latitude) AS cy,
          COUNT(*) AS cnt
        FROM assets a
        ${where}
        GROUP BY
          FLOOR(a.longitude * ${gridFactor}),
          FLOOR(a.latitude * ${gridFactor})
      `;
      result = await pool.query(query, params);

      const features = result.rows.map((row: { cx: number; cy: number; cnt: string }) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [Number(row.cx), Number(row.cy)] },
        properties: { count: parseInt(row.cnt, 10), cluster: true },
      }));

      return NextResponse.json({ type: 'FeatureCollection', features });
    } else {
      const query = `
        SELECT a.id, a.name, a.asset_type, a.status, a.operator_id,
               a.latitude, a.longitude
        FROM assets a
        ${where}
      `;
      result = await pool.query(query, params);

      const features = result.rows.map((row: { id: string; name: string; asset_type: string; status: string; operator_id: string; latitude: number; longitude: number }) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [Number(row.longitude), Number(row.latitude)] },
        properties: {
          id: row.id,
          name: row.name,
          asset_type: row.asset_type,
          status: row.status,
          operator_id: row.operator_id,
        },
      }));

      return NextResponse.json({ type: 'FeatureCollection', features });
    }
  } catch (err) {
    console.error('Map error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
