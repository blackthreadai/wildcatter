import { Router, Request, Response } from 'express';
import { pool } from '../../db';

const router = Router();

// GET /operators — list with pagination, sorting, search
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
    const offset = (page - 1) * limit;
    const sortDir = (req.query.order as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const sortCol = req.query.sort === 'name' ? 'legal_name' : req.query.sort === 'assets' ? 'active_asset_count' : 'created_at';

    const params: unknown[] = [];
    const conditions: string[] = [];

    if (req.query.q) {
      params.push(`%${req.query.q}%`);
      conditions.push(`legal_name ILIKE $${params.length}`);
    }
    if (req.query.state) {
      params.push(req.query.state);
      conditions.push(`hq_state = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM operators ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT * FROM operators ${where} ORDER BY ${sortCol} ${sortDir} NULLS LAST LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Operators list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /operators/:id — detail with assets, production trends, risk
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const opResult = await pool.query('SELECT * FROM operators WHERE id = $1', [id]);
    if (opResult.rows.length === 0) {
      res.status(404).json({ error: 'Operator not found' });
      return;
    }

    const assetsResult = await pool.query(
      `SELECT id, name, asset_type, status, state, county, basin, decline_rate
       FROM assets WHERE operator_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [id]
    );

    // Monthly aggregate production trend
    const trendResult = await pool.query(
      `SELECT
         date_trunc('month', pr.month) AS month,
         SUM(pr.oil_volume_bbl) AS total_oil_bbl,
         SUM(pr.gas_volume_mcf) AS total_gas_mcf
       FROM production_records pr
       JOIN assets a ON a.id = pr.asset_id
       WHERE a.operator_id = $1
       GROUP BY date_trunc('month', pr.month)
       ORDER BY month DESC
       LIMIT 24`,
      [id]
    );

    res.json({
      ...opResult.rows[0],
      assets: assetsResult.rows,
      production_trend: trendResult.rows,
    });
  } catch (err) {
    console.error('Operator detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /operators/:id/assets — paginated assets
router.get('/:id/assets', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM assets WHERE operator_id = $1', [id]);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await pool.query(
      `SELECT id, asset_type, name, state, county, basin, status, decline_rate,
              ST_Y(location) AS latitude, ST_X(location) AS longitude, created_at
       FROM assets WHERE operator_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    res.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Operator assets error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
