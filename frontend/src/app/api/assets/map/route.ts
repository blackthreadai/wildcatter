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
        `a.location && ST_MakeEnvelope($${params.length - 3}, $${params.length - 2}, $${params.length - 1}, $${params.length}, 4326)`
      );
    }

    const zoomLevel = zoom ? parseInt(zoom, 10) : 10;
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let query: string;
    if (zoomLevel < 8) {
      query = `
        SELECT json_build_object(
          'type', 'FeatureCollection',
          'features', COALESCE(json_agg(json_build_object(
            'type', 'Feature',
            'geometry', json_build_object(
              'type', 'Point',
              'coordinates', ARRAY[cx, cy]
            ),
            'properties', json_build_object(
              'count', cnt,
              'cluster', true
            )
          )), '[]'::json)
        ) AS geojson
        FROM (
          SELECT
            AVG(ST_X(a.location)) AS cx,
            AVG(ST_Y(a.location)) AS cy,
            COUNT(*) AS cnt
          FROM assets a
          ${where}
          GROUP BY
            FLOOR(ST_X(a.location) * ${Math.pow(2, zoomLevel) / 10}),
            FLOOR(ST_Y(a.location) * ${Math.pow(2, zoomLevel) / 10})
        ) clusters
      `;
    } else {
      query = `
        SELECT json_build_object(
          'type', 'FeatureCollection',
          'features', COALESCE(json_agg(json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(a.location)::json,
            'properties', json_build_object(
              'id', a.id,
              'name', a.name,
              'asset_type', a.asset_type,
              'status', a.status,
              'operator_id', a.operator_id
            )
          )), '[]'::json)
        ) AS geojson
        FROM assets a
        ${where}
      `;
    }

    const result = await pool.query(query, params);
    return NextResponse.json(result.rows[0]?.geojson || { type: 'FeatureCollection', features: [] });
  } catch (err) {
    console.error('Map error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
