import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import { pool } from './db';
import routes from './api/routes';
import { errorHandler } from './api/middleware/errorHandler';

const app = express();

// ── Middleware ─────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// ── Health check ──────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ── API routes ────────────────────────────────────────
app.use('/api', routes);

// ── Error handler ─────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`Wildcatter API listening on port ${config.port}`);
});

export default app;
