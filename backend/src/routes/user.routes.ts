import { Router } from 'express';
import { body } from 'express-validator';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/', getUsers);

router.post(
  '/',
  [
    body('name').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('role').isIn(['ADMIN', 'CASHIER', 'INVENTORY_MANAGER']),
  ],
  validate,
  createUser
);

router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
