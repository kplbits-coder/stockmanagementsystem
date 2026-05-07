import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { createError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

export const getSubCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { categoryId } = req.query;

    const where: any = {};
    if (categoryId) where.categoryId = String(categoryId);

    const subCategories = await prisma.subCategory.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: subCategories });
  } catch (err) {
    next(err);
  }
};

export const getSubCategoryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const subCategory = await prisma.subCategory.findUnique({
      where: { id: req.params.id },
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { products: true } },
        products: {
          where: { isActive: true },
          select: { id: true, name: true, sku: true, quantity: true, status: true, price: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!subCategory) return next(createError('SubCategory not found', 404));
    res.json({ success: true, data: subCategory });
  } catch (err) {
    next(err);
  }
};

export const createSubCategory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, categoryId } = req.body;

    // Verify parent category exists
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) return next(createError('Parent category not found', 404));

    // Check uniqueness within the same category
    const existing = await prisma.subCategory.findUnique({
      where: { name_categoryId: { name, categoryId } },
    });
    if (existing) {
      return next(createError(`SubCategory "${name}" already exists in "${category.name}"`, 409));
    }

    const subCategory = await prisma.subCategory.create({
      data: { name, description: description || null, categoryId },
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { products: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'CREATE',
        entity: 'SubCategory',
        entityId: subCategory.id,
        newData: subCategory as any,
      },
    });

    res.status(201).json({ success: true, data: subCategory });
  } catch (err) {
    next(err);
  }
};

export const updateSubCategory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const subCategory = await prisma.subCategory.findUnique({ where: { id: req.params.id } });
    if (!subCategory) return next(createError('SubCategory not found', 404));

    const { name, description } = req.body;

    // Check name uniqueness within same category if name is changing
    if (name && name !== subCategory.name) {
      const nameExists = await prisma.subCategory.findUnique({
        where: { name_categoryId: { name, categoryId: subCategory.categoryId } },
      });
      if (nameExists) return next(createError('SubCategory name already in use in this category', 409));
    }

    const updated = await prisma.subCategory.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { products: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'UPDATE',
        entity: 'SubCategory',
        entityId: subCategory.id,
        oldData: subCategory as any,
        newData: updated as any,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteSubCategory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const subCategory = await prisma.subCategory.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { products: true } } },
    });
    if (!subCategory) return next(createError('SubCategory not found', 404));

    if (subCategory._count.products > 0) {
      return next(
        createError(
          `Cannot delete "${subCategory.name}" — it has ${subCategory._count.products} product(s). Reassign those products first.`,
          400
        )
      );
    }

    await prisma.subCategory.delete({ where: { id: req.params.id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'DELETE',
        entity: 'SubCategory',
        entityId: subCategory.id,
        oldData: subCategory as any,
      },
    });

    res.json({ success: true, message: 'SubCategory deleted successfully' });
  } catch (err) {
    next(err);
  }
};
