import { Router } from 'express';
import { body } from 'express-validator';
import {
  getSubCategories,
  getSubCategoryById,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
} from '../controllers/subcategory.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getSubCategories);
router.get('/:id', getSubCategoryById);

router.post(
  '/',
  authorize('ADMIN', 'INVENTORY_MANAGER'),
  [
    body('name').notEmpty().trim().withMessage('SubCategory name is required'),
    body('categoryId').notEmpty().withMessage('Parent category is required'),
  ],
  validate,
  createSubCategory
);

router.put(
  '/:id',
  authorize('ADMIN', 'INVENTORY_MANAGER'),
  [body('name').optional().notEmpty().trim()],
  validate,
  updateSubCategory
);

router.delete('/:id', authorize('ADMIN'), deleteSubCategory);

export default router;
