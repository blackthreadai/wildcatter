import { Router, Request, Response } from 'express';
import { pool } from '../../db';

const router = Router();

// GET /search — unified search across assets + operators
router.get('/', async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q || q.trim().length === 0) {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }

    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const pattern = `%${q}%`;

    // Build asset conditions
    const assetParams: unknown[] = [pattern];
    const assetConditions = ['a.name ILIKE $1'];

    if (req.query.state) {
      assetParams.push(req.query.state);
      assetConditions.push(`a.state = $${assetParams.length}`);
    }
    if (req.query.basin) {
      assetParams.push(req.query.basin);
      assetConditions.push(`a.basin = $${assetParams.length}`);
    }
    if (req.query.type) {
      assetParams.push(req.query.type);
      assetConditions.push(`a.asset_type = $${assetParams.length}`);
    }
    if (req.query.status) {
      assetParams.push(req.query.status);
      assetConditions.push(`a.status = $${assetParams.length}`);
    }

    assetParams.push(limit);
    const assetQuery = `
      SELECT a.id, a.name, a.asset_type, a.status, a.state, a.county, a.basin,
             ST_Y(a.location) AS latitude, ST_X(a.location) AS longitude,
             o.legal_name AS operator_name
      FROM assets a
      LEFT JOIN operators o ON o.id = a.operator_id
      WHERE ${assetConditions.join(' AND ')}
      ORDER BY a.name
      LIMIT $${assetParams.length}
    `;

    const operatorQuery = `
      SELECT id, legal_name, hq_state, hq_city, active_asset_count, risk_score
      FROM operators
      WHERE legal_name ILIKE $1
      ORDER BY legal_name
      LIMIT $2
    `;

    const [assetsResult, operatorsResult] = await Promise.all([
      pool.query(assetQuery, assetParams),
      pool.query(operatorQuery, [pattern, limit]),
    ]);

    res.json({
      query: q,
      assets: assetsResult.rows,
      operators: operatorsResult.rows,
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
