import { Router } from 'express';
import {
  getOverview,
  getProfitByProduct,
  getProfitByCategory,
  getDeadStock,
  getAbcAnalysis,
} from '../controllers/cost-analysis.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'INVENTORY_MANAGER'));

router.get('/overview', getOverview);
router.get('/profit-by-product', getProfitByProduct);
router.get('/profit-by-category', getProfitByCategory);
router.get('/dead-stock', getDeadStock);
router.get('/abc-analysis', getAbcAnalysis);

export default router;
