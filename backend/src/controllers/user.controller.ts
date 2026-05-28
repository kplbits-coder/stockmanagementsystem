import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../utils/request';
import { createError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const { name, email, password, role } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return next(createError('Email already in use', 409));

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const { name, role, isActive } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return next(createError('User not found', 404));

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    if (req.params.id === req.user!.id) {
      return next(createError('Cannot delete your own account', 400));
    }

    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'User deactivated' });
  } catch (err) {
    next(err);
  }
};
