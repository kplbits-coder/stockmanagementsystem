import { Router } from 'express';
import { getSalesReport, getInventoryReport, getAuditLogs } from '../controllers/report.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/sales', authorize('ADMIN', 'INVENTORY_MANAGER'), getSalesReport);
router.get('/inventory', authorize('ADMIN', 'INVENTORY_MANAGER'), getInventoryReport);
router.get('/audit-logs', authorize('ADMIN'), getAuditLogs);

export default router;
