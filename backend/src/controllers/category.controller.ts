import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { createError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

export const getCategories = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { products: true } },
        products: { where: { isActive: true }, select: { status: true } },
        subCategories: {
          include: { _count: { select: { products: true } } },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const enriched = categories.map((cat) => {
      const activeProducts = cat.products;
      return {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
        _count: cat._count,
        subCategories: cat.subCategories,
        stockSummary: {
          inStock: activeProducts.filter((p) => p.status === 'IN_STOCK').length,
          lowStock: activeProducts.filter((p) => p.status === 'LOW_STOCK').length,
          outOfStock: activeProducts.filter((p) => p.status === 'OUT_OF_STOCK').length,
        },
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

export const getCategoryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { products: true } },
        subCategories: {
          include: { _count: { select: { products: true } } },
          orderBy: { name: 'asc' },
        },
        products: {
          where: { isActive: true },
          select: { id: true, name: true, sku: true, quantity: true, status: true, price: true, subCategoryId: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!category) return next(createError('Category not found', 404));
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

export const createCategory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description } = req.body;

    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) return next(createError('Category already exists', 409));

    const category = await prisma.category.create({
      data: { name, description: description || null },
      include: { _count: { select: { products: true } } },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'CREATE',
        entity: 'Category',
        entityId: category.id,
        newData: category as any,
      },
    });

    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!category) return next(createError('Category not found', 404));

    const { name, description } = req.body;

    // Check name uniqueness if changing name
    if (name && name !== category.name) {
      const nameExists = await prisma.category.findUnique({ where: { name } });
      if (nameExists) return next(createError('Category name already in use', 409));
    }

    const updated = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
      include: { _count: { select: { products: true } } },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'UPDATE',
        entity: 'Category',
        entityId: category.id,
        oldData: category as any,
        newData: updated as any,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { products: true } } },
    });
    if (!category) return next(createError('Category not found', 404));

    if (category._count.products > 0) {
      return next(
        createError(
          `Cannot delete "${category.name}" — it has ${category._count.products} product(s). Reassign or deactivate those products first.`,
          400
        )
      );
    }

    await prisma.category.delete({ where: { id: req.params.id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'DELETE',
        entity: 'Category',
        entityId: category.id,
        oldData: category as any,
      },
    });

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
};
