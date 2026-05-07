import { Router } from 'express';
import { body } from 'express-validator';
import {
  getProducts,
  getProductById,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  getStockMovements,
} from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getProducts);
router.get('/low-stock', getLowStockProducts);
router.get('/barcode/:barcode', getProductByBarcode);
router.get('/:id', getProductById);
router.get('/:id/movements', getStockMovements);

router.post(
  '/',
  authorize('ADMIN', 'INVENTORY_MANAGER'),
  [
    body('name').notEmpty().trim(),
    body('sku').notEmpty().trim(),
    body('categoryId').notEmpty(),
    body('price').isFloat({ min: 0 }),
    body('costPrice').isFloat({ min: 0 }),
    body('quantity').isInt({ min: 0 }),
  ],
  validate,
  createProduct
);

router.put(
  '/:id',
  authorize('ADMIN', 'INVENTORY_MANAGER'),
  updateProduct
);

router.delete(
  '/:id',
  authorize('ADMIN'),
  deleteProduct
);

export default router;
