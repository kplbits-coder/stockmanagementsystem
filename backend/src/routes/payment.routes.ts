import { Router } from 'express';
import { getPaymentBySale, updatePayment, getPaymentSummary } from '../controllers/payment.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/summary', authorize('ADMIN', 'INVENTORY_MANAGER'), getPaymentSummary);
router.get('/sale/:saleId', getPaymentBySale);
router.put('/sale/:saleId', authorize('ADMIN'), updatePayment);

export default router;
