import { Router, Request, Response } from 'express';
import { pool } from '../../db';

const router = Router();

// GET /assets/:id/production — time series for an asset
router.get('/assets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const params: unknown[] = [id];
    const conditions = ['pr.asset_id = $1'];

    if (req.query.start) {
      params.push(req.query.start);
      conditions.push(`pr.month >= $${params.length}`);
    }
    if (req.query.end) {
      params.push(req.query.end);
      conditions.push(`pr.month <= $${params.length}`);
    }

    const result = await pool.query(
      `SELECT month, oil_volume_bbl, gas_volume_mcf, ore_volume_tons, water_cut_pct, downtime_days
       FROM production_records pr
       WHERE ${conditions.join(' AND ')}
       ORDER BY month DESC`,
      params
    );

    res.json({ asset_id: id, data: result.rows });
  } catch (err) {
    console.error('Asset production error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /operators/:id/production — aggregated production across operator's assets
router.get('/operators/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const params: unknown[] = [id];
    const conditions = ['a.operator_id = $1'];

    if (req.query.start) {
      params.push(req.query.start);
      conditions.push(`pr.month >= $${params.length}`);
    }
    if (req.query.end) {
      params.push(req.query.end);
      conditions.push(`pr.month <= $${params.length}`);
    }

    const result = await pool.query(
      `SELECT
         date_trunc('month', pr.month) AS month,
         SUM(pr.oil_volume_bbl) AS total_oil_bbl,
         SUM(pr.gas_volume_mcf) AS total_gas_mcf,
         SUM(pr.ore_volume_tons) AS total_ore_tons,
         AVG(pr.water_cut_pct) AS avg_water_cut_pct,
         COUNT(DISTINCT pr.asset_id) AS asset_count
       FROM production_records pr
       JOIN assets a ON a.id = pr.asset_id
       WHERE ${conditions.join(' AND ')}
       GROUP BY date_trunc('month', pr.month)
       ORDER BY month DESC`,
      params
    );

    res.json({ operator_id: id, data: result.rows });
  } catch (err) {
    console.error('Operator production error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /production/summary — market-level aggregates
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const groupBy = (req.query.group_by as string) || 'state';
    const validGroups: Record<string, string> = { state: 'a.state', basin: 'a.basin', commodity: 'a.commodity' };
    const groupCol = validGroups[groupBy] || 'a.state';

    const params: unknown[] = [];
    const conditions: string[] = [];

    if (req.query.start) {
      params.push(req.query.start);
      conditions.push(`pr.month >= $${params.length}`);
    }
    if (req.query.end) {
      params.push(req.query.end);
      conditions.push(`pr.month <= $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT
         ${groupCol} AS group_key,
         date_trunc('month', pr.month) AS month,
         SUM(pr.oil_volume_bbl) AS total_oil_bbl,
         SUM(pr.gas_volume_mcf) AS total_gas_mcf,
         COUNT(DISTINCT pr.asset_id) AS asset_count
       FROM production_records pr
       JOIN assets a ON a.id = pr.asset_id
       ${where}
       GROUP BY ${groupCol}, date_trunc('month', pr.month)
       ORDER BY month DESC, group_key`,
      params
    );

    res.json({ group_by: groupBy, data: result.rows });
  } catch (err) {
    console.error('Production summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
