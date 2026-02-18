import { Router, Request, Response } from 'express';

const router = Router();

router.get('/pdf/:assetId', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

router.get('/csv/:assetId', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

export default router;
