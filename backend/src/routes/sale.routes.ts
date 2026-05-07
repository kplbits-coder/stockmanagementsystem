import { Router } from 'express';
import { body } from 'express-validator';
import {
  getSales,
  getSaleById,
  createSale,
  cancelSale,
  downloadInvoice,
} from '../controllers/sale.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getSales);
router.get('/:id', getSaleById);
router.get('/:id/invoice', downloadInvoice);

router.post(
  '/',
  authorize('ADMIN', 'CASHIER'),
  [
    body('items').isArray({ min: 1 }),
    body('items.*.productId').notEmpty(),
    body('items.*.quantity').isInt({ min: 1 }),
  ],
  validate,
  createSale
);

router.put('/:id/cancel', authorize('ADMIN'), cancelSale);

export default router;
