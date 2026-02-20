import { Router } from 'express';
import assets from './assets';
import operators from './operators';
import production from './production';
import search from './search';
import exportRoutes from './export';
import saved from './saved';
import auth from './auth';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Public routes
router.use('/auth', auth);

// Protected routes
router.use('/assets', requireAuth, assets);
router.use('/operators', requireAuth, operators);
router.use('/production', requireAuth, production);
router.use('/search', requireAuth, search);
router.use('/export', requireAuth, exportRoutes);
router.use('/saved', requireAuth, saved);

export default router;
