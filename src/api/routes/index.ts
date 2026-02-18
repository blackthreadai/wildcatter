import { Router } from 'express';
import assets from './assets';
import operators from './operators';
import production from './production';
import search from './search';
import exportRoutes from './export';
import auth from './auth';

const router = Router();

router.use('/assets', assets);
router.use('/operators', operators);
router.use('/production', production);
router.use('/search', search);
router.use('/export', exportRoutes);
router.use('/auth', auth);

export default router;
