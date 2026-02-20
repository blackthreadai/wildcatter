import { Router, Request, Response } from 'express';
import { pool } from '../../db';

const router = Router();

// GET /saved — list saved items with full data
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { type } = req.query;

    let query: string;
    const params: unknown[] = [userId];

    if (type === 'asset') {
      query = `
        SELECT s.id as saved_id, s.item_type, s.item_id, s.created_at as saved_at,
               a.*
        FROM saved_items s
        JOIN assets a ON a.id = s.item_id
        WHERE s.user_id = $1 AND s.item_type = 'asset'
        ORDER BY s.created_at DESC
      `;
    } else if (type === 'operator') {
      query = `
        SELECT s.id as saved_id, s.item_type, s.item_id, s.created_at as saved_at,
               o.*
        FROM saved_items s
        JOIN operators o ON o.id = s.item_id
        WHERE s.user_id = $1 AND s.item_type = 'operator'
        ORDER BY s.created_at DESC
      `;
    } else {
      // Return both
      const [assetRes, opRes] = await Promise.all([
        pool.query(`
          SELECT s.id as saved_id, s.item_type, s.item_id, s.created_at as saved_at, a.*
          FROM saved_items s JOIN assets a ON a.id = s.item_id
          WHERE s.user_id = $1 AND s.item_type = 'asset'
          ORDER BY s.created_at DESC
        `, [userId]),
        pool.query(`
          SELECT s.id as saved_id, s.item_type, s.item_id, s.created_at as saved_at, o.*
          FROM saved_items s JOIN operators o ON o.id = s.item_id
          WHERE s.user_id = $1 AND s.item_type = 'operator'
          ORDER BY s.created_at DESC
        `, [userId]),
      ]);
      return res.json({ assets: assetRes.rows, operators: opRes.rows });
    }

    const result = await pool.query(query, params);
    const key = type === 'asset' ? 'assets' : 'operators';
    res.json({ [key]: result.rows });
  } catch (err) {
    console.error('Error fetching saved items:', err);
    res.status(500).json({ error: 'Failed to fetch saved items' });
  }
});

// POST /saved — save an item
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { itemType, itemId } = req.body;

    if (!['asset', 'operator'].includes(itemType) || !itemId) {
      return res.status(400).json({ error: 'itemType (asset|operator) and itemId required' });
    }

    const result = await pool.query(
      `INSERT INTO saved_items (user_id, item_type, item_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, item_type, item_id) DO NOTHING
       RETURNING *`,
      [userId, itemType, itemId]
    );

    res.status(201).json(result.rows[0] || { message: 'Already saved' });
  } catch (err) {
    console.error('Error saving item:', err);
    res.status(500).json({ error: 'Failed to save item' });
  }
});

// DELETE /saved/:itemId — unsave by item_id + itemType query param
router.delete('/:itemId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { itemId } = req.params;
    const { itemType } = req.query;

    if (!itemType || !['asset', 'operator'].includes(itemType as string)) {
      return res.status(400).json({ error: 'itemType query param required (asset|operator)' });
    }

    await pool.query(
      'DELETE FROM saved_items WHERE user_id = $1 AND item_type = $2 AND item_id = $3',
      [userId, itemType, itemId]
    );

    res.json({ message: 'Unsaved' });
  } catch (err) {
    console.error('Error unsaving item:', err);
    res.status(500).json({ error: 'Failed to unsave item' });
  }
});

export default router;
