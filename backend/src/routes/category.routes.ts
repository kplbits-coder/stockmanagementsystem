import { Router } from 'express';
import { body } from 'express-validator';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getCategories);
router.get('/:id', getCategoryById);

router.post(
  '/',
  authorize('ADMIN', 'INVENTORY_MANAGER'),
  [body('name').notEmpty().trim().withMessage('Category name is required')],
  validate,
  createCategory
);

router.put(
  '/:id',
  authorize('ADMIN', 'INVENTORY_MANAGER'),
  [body('name').optional().notEmpty().trim()],
  validate,
  updateCategory
);

router.delete('/:id', authorize('ADMIN'), deleteCategory);

export default router;
