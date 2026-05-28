import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import {
  getRefrigerators,
  getRefrigeratorById,
  createRefrigerator,
  updateRefrigerator,
  deleteRefrigerator,
  getShops,
  createShop,
  updateShop,
  deleteShop,
  getAssignments,
  assignRefrigerator,
  transferRefrigerator,
  returnRefrigerator,
  getRefrigeratorDashboard,
  getRefrigeratorLogs,
} from '../controllers/refrigerator.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Block access for tenants without refrigeratorTracking feature
router.use((req: Request, res: Response, next: NextFunction) => {
  const tenantConfig = (req as any).tenantConfig;
  if (!tenantConfig?.features?.refrigeratorTracking) {
    res.status(403).json({ success: false, message: 'Refrigerator tracking is not available for your organization.' });
    return;
  }
  next();
});

// ─── Refrigerators ───────────────────────────────────────────────────────────
router.get('/', getRefrigerators);
router.get('/dashboard', getRefrigeratorDashboard);
router.get('/logs', getRefrigeratorLogs);
router.get('/:id', getRefrigeratorById);

router.post(
  '/',
  authorize('ADMIN', 'INVENTORY_MANAGER'),
  [
    body('code').notEmpty().trim().withMessage('Code is required'),
    body('name').notEmpty().trim().withMessage('Name is required'),
  ],
  validate,
  createRefrigerator
);

router.put(
  '/:id',
  authorize('ADMIN', 'INVENTORY_MANAGER'),
  updateRefrigerator
);

router.delete(
  '/:id',
  authorize('ADMIN'),
  deleteRefrigerator
);

// ─── Shops ───────────────────────────────────────────────────────────────────
router.get('/shops/list', getShops);

router.post(
  '/shops',
  authorize('ADMIN', 'INVENTORY_MANAGER'),
  [
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('code').notEmpty().trim().withMessage('Code is required'),
  ],
  validate,
  createShop
);

router.put(
  '/shops/:id',
  authorize('ADMIN', 'INVENTORY_MANAGER'),
  updateShop
);

router.delete(
  '/shops/:id',
  authorize('ADMIN'),
  deleteShop
);

// ─── Assignments ─────────────────────────────────────────────────────────────
router.get('/assignments/list', getAssignments);

router.post(
  '/assignments/assign',
  authorize('ADMIN', 'INVENTORY_MANAGER'),
  [
    body('refrigeratorId').notEmpty().withMessage('Refrigerator ID is required'),
    body('shopId').notEmpty().withMessage('Shop ID is required'),
  ],
  validate,
  assignRefrigerator
);

router.post(
  '/assignments/transfer',
  authorize('ADMIN', 'INVENTORY_MANAGER'),
  [
    body('refrigeratorId').notEmpty().withMessage('Refrigerator ID is required'),
    body('newShopId').notEmpty().withMessage('New shop ID is required'),
  ],
  validate,
  transferRefrigerator
);

router.post(
  '/assignments/return',
  authorize('ADMIN', 'INVENTORY_MANAGER'),
  [
    body('refrigeratorId').notEmpty().withMessage('Refrigerator ID is required'),
  ],
  validate,
  returnRefrigerator
);

export default router;
