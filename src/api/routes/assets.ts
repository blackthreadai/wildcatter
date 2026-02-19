import { Router, Request, Response } from 'express';
import { pool } from '../../db';
import { calculateAll } from '../../calculations';

const router = Router();

const SORTABLE_COLUMNS: Record<string, string> = {
  name: 'a.name',
  production: 'latest_production',
  decline_rate: 'a.decline_rate',
  cash_flow: 'cash_flow',
  age: 'a.spud_date',
  created_at: 'a.created_at',
};

// GET /assets/map — GeoJSON (must be before /:id)
router.get('/map', async (req: Request, res: Response) => {
  try {
    const { bbox, zoom } = req.query;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = (bbox as string).split(',').map(Number);
      params.push(minLng, minLat, maxLng, maxLat);
      conditions.push(
        `a.location && ST_MakeEnvelope($${params.length - 3}, $${params.length - 2}, $${params.length - 1}, $${params.length}, 4326)`
      );
    }

    const zoomLevel = zoom ? parseInt(zoom as string, 10) : 10;
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let query: string;
    if (zoomLevel < 8) {
      // Cluster at low zoom
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
    res.json(result.rows[0]?.geojson || { type: 'FeatureCollection', features: [] });
  } catch (err) {
    console.error('Map error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /assets — list with pagination, sorting, filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
    const offset = (page - 1) * limit;

    const sortKey = (req.query.sort as string) || 'created_at';
    const sortDir = (req.query.order as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const sortCol = SORTABLE_COLUMNS[sortKey] || 'a.created_at';

    const params: unknown[] = [];
    const conditions: string[] = [];

    // Filters
    const addFilter = (field: string, paramName: string) => {
      const val = req.query[paramName] as string | undefined;
      if (val) {
        params.push(val);
        conditions.push(`${field} = $${params.length}`);
      }
    };

    addFilter('a.state', 'state');
    addFilter('a.county', 'county');
    addFilter('a.basin', 'basin');
    addFilter('a.asset_type', 'type');
    addFilter('a.status', 'status');
    addFilter('a.operator_id', 'operator_id');

    if (req.query.min_production) {
      params.push(parseFloat(req.query.min_production as string));
      conditions.push(`COALESCE(lp.latest_production, 0) >= $${params.length}`);
    }
    if (req.query.max_production) {
      params.push(parseFloat(req.query.max_production as string));
      conditions.push(`COALESCE(lp.latest_production, 0) <= $${params.length}`);
    }
    if (req.query.min_decline_rate) {
      params.push(parseFloat(req.query.min_decline_rate as string));
      conditions.push(`a.decline_rate >= $${params.length}`);
    }
    if (req.query.max_decline_rate) {
      params.push(parseFloat(req.query.max_decline_rate as string));
      conditions.push(`a.decline_rate <= $${params.length}`);
    }

    // Full-text search
    if (req.query.q) {
      params.push(`%${req.query.q}%`);
      conditions.push(`a.name ILIKE $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) FROM assets a
      LEFT JOIN LATERAL (
        SELECT COALESCE(oil_volume_bbl, 0) + COALESCE(gas_volume_mcf, 0) AS latest_production
        FROM production_records pr WHERE pr.asset_id = a.id ORDER BY month DESC LIMIT 1
      ) lp ON true
      ${where}
    `;

    const dataQuery = `
      SELECT
        a.id, a.asset_type, a.name, a.state, a.county,
        ST_Y(a.location) AS latitude, ST_X(a.location) AS longitude,
        a.basin, a.operator_id, a.status, a.spud_date, a.depth_ft,
        a.commodity, a.decline_rate, a.estimated_remaining_life_months,
        a.created_at, a.updated_at,
        o.legal_name AS operator_name,
        COALESCE(lp.latest_production, 0) AS latest_production,
        fe.estimated_net_cash_flow AS cash_flow
      FROM assets a
      LEFT JOIN operators o ON o.id = a.operator_id
      LEFT JOIN LATERAL (
        SELECT COALESCE(oil_volume_bbl, 0) + COALESCE(gas_volume_mcf, 0) AS latest_production
        FROM production_records pr WHERE pr.asset_id = a.id ORDER BY month DESC LIMIT 1
      ) lp ON true
      LEFT JOIN LATERAL (
        SELECT estimated_net_cash_flow
        FROM financial_estimates fe2 WHERE fe2.asset_id = a.id ORDER BY as_of_date DESC LIMIT 1
      ) fe ON true
      ${where}
      ORDER BY ${sortCol} ${sortDir} NULLS LAST
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, params.slice(0, -2)),
      pool.query(dataQuery, params),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    res.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Assets list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /assets/:id — full detail
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const assetQuery = `
      SELECT
        a.id, a.asset_type, a.name, a.state, a.county,
        ST_Y(a.location) AS latitude, ST_X(a.location) AS longitude,
        a.basin, a.operator_id, a.status, a.spud_date, a.depth_ft,
        a.commodity, a.decline_rate, a.estimated_remaining_life_months,
        a.created_at, a.updated_at,
        o.legal_name AS operator_name, o.hq_state AS operator_hq_state,
        o.risk_score AS operator_risk_score, o.compliance_flags AS operator_compliance_flags
      FROM assets a
      LEFT JOIN operators o ON o.id = a.operator_id
      WHERE a.id = $1
    `;

    const productionQuery = `
      SELECT month, oil_volume_bbl, gas_volume_mcf, ore_volume_tons, water_cut_pct, downtime_days
      FROM production_records
      WHERE asset_id = $1
      ORDER BY month DESC
      LIMIT 60
    `;

    const financialsQuery = `
      SELECT estimated_revenue, estimated_operating_cost, estimated_net_cash_flow,
             breakeven_price, price_sensitivity, as_of_date
      FROM financial_estimates
      WHERE asset_id = $1
      ORDER BY as_of_date DESC
      LIMIT 1
    `;

    const [assetResult, productionResult, financialsResult] = await Promise.all([
      pool.query(assetQuery, [id]),
      pool.query(productionQuery, [id]),
      pool.query(financialsQuery, [id]),
    ]);

    if (assetResult.rows.length === 0) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    const asset = assetResult.rows[0];

    // Related assets (same operator or basin)
    const relatedQuery = `
      SELECT id, name, asset_type, status, state, county, basin
      FROM assets
      WHERE id != $1 AND (operator_id = $2 OR basin = $3)
      LIMIT 10
    `;
    const relatedResult = await pool.query(relatedQuery, [id, asset.operator_id, asset.basin]);

    // Compute financials on-the-fly if none cached
    let financials = financialsResult.rows[0] || null;
    if (!financials && productionResult.rows.length > 0) {
      try {
        financials = calculateAll(asset, productionResult.rows);
      } catch {
        // Non-fatal: calculations may fail
      }
    }

    res.json({
      ...asset,
      production_history: productionResult.rows,
      financials,
      related_assets: relatedResult.rows,
    });
  } catch (err) {
    console.error('Asset detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
