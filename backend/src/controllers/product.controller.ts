import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { createError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { StockStatus } from '@prisma/client';

function computeStatus(quantity: number, minQuantity: number): StockStatus {
  if (quantity === 0) return StockStatus.OUT_OF_STOCK;
  if (quantity <= minQuantity) return StockStatus.LOW_STOCK;
  return StockStatus.IN_STOCK;
}

export const getProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      search,
      categoryId,
      status,
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { sku: { contains: String(search), mode: 'insensitive' } },
        { barcode: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = String(categoryId);
    if (status) where.status = String(status);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          subCategory: { select: { id: true, name: true } },
        },
        skip,
        take: Number(limit),
        orderBy: { [String(sortBy)]: sortOrder },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        subCategory: true,
        stockMovements: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!product) return next(createError('Product not found', 404));
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

export const getProductByBarcode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await prisma.product.findUnique({
      where: { barcode: req.params.barcode },
      include: {
        category: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
      },
    });
    if (!product) return next(createError('Product not found', 404));
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

export const createProduct = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      name, description, sku, barcode, categoryId, subCategoryId,
      price, costPrice, quantity, minQuantity, unit, taxRate, imageUrl,
    } = req.body;

    const existing = await prisma.product.findFirst({
      where: { OR: [{ sku }, ...(barcode ? [{ barcode }] : [])] },
    });
    if (existing) return next(createError('SKU or barcode already exists', 409));

    // Validate subCategory belongs to the selected category
    if (subCategoryId) {
      const sub = await prisma.subCategory.findUnique({ where: { id: subCategoryId } });
      if (!sub) return next(createError('SubCategory not found', 404));
      if (sub.categoryId !== categoryId) {
        return next(createError('SubCategory does not belong to the selected category', 400));
      }
    }

    const qty = Number(quantity) || 0;
    const minQty = Number(minQuantity) || 10;

    const product = await prisma.product.create({
      data: {
        name, description, sku,
        barcode: barcode || null,
        categoryId,
        subCategoryId: subCategoryId || null,
        price, costPrice,
        quantity: qty,
        minQuantity: minQty,
        unit: unit || 'pcs',
        taxRate: taxRate || 0,
        imageUrl: imageUrl || null,
        status: computeStatus(qty, minQty),
      },
      include: {
        category: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
      },
    });

    // Log initial stock movement
    if (qty > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: 'IN',
          quantity: qty,
          previousQty: 0,
          newQty: qty,
          reason: 'Initial stock',
        },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'CREATE',
        entity: 'Product',
        entityId: product.id,
        newData: product as any,
      },
    });

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(createError('Product not found', 404));

    const {
      name, description, sku, barcode, categoryId, subCategoryId,
      price, costPrice, quantity, minQuantity, unit, taxRate, imageUrl, isActive,
    } = req.body;

    // Validate subCategory belongs to the selected/existing category
    const effectiveCategoryId = categoryId || existing.categoryId;
    if (subCategoryId) {
      const sub = await prisma.subCategory.findUnique({ where: { id: subCategoryId } });
      if (!sub) return next(createError('SubCategory not found', 404));
      if (sub.categoryId !== effectiveCategoryId) {
        return next(createError('SubCategory does not belong to the selected category', 400));
      }
    }

    const newQty = quantity !== undefined ? Number(quantity) : existing.quantity;
    const newMinQty = minQuantity !== undefined ? Number(minQuantity) : existing.minQuantity;

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(sku && { sku }),
        ...(barcode !== undefined && { barcode }),
        ...(categoryId && { categoryId }),
        // Allow explicitly clearing subCategory by passing null
        ...(subCategoryId !== undefined && { subCategoryId: subCategoryId || null }),
        ...(price !== undefined && { price }),
        ...(costPrice !== undefined && { costPrice }),
        ...(quantity !== undefined && { quantity: newQty }),
        ...(minQuantity !== undefined && { minQuantity: newMinQty }),
        ...(unit && { unit }),
        ...(taxRate !== undefined && { taxRate }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isActive !== undefined && { isActive }),
        status: computeStatus(newQty, newMinQty),
      },
      include: {
        category: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
      },
    });

    // Log stock adjustment if quantity changed
    if (quantity !== undefined && Number(quantity) !== existing.quantity) {
      const diff = Number(quantity) - existing.quantity;
      await prisma.stockMovement.create({
        data: {
          productId: existing.id,
          type: 'ADJUSTMENT',
          quantity: Math.abs(diff),
          previousQty: existing.quantity,
          newQty: Number(quantity),
          reason: 'Manual adjustment',
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'UPDATE',
        entity: 'Product',
        entityId: existing.id,
        oldData: existing as any,
        newData: updated as any,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return next(createError('Product not found', 404));

    // Soft delete
    await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'DELETE',
        entity: 'Product',
        entityId: product.id,
        oldData: product as any,
      },
    });

    res.json({ success: true, message: 'Product deactivated successfully' });
  } catch (err) {
    next(err);
  }
};

export const getLowStockProducts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        status: { in: [StockStatus.LOW_STOCK, StockStatus.OUT_OF_STOCK] },
      },
      include: {
        category: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
      },
      orderBy: { quantity: 'asc' },
    });
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
};

export const getStockMovements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { productId: req.params.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.stockMovement.count({ where: { productId: req.params.id } }),
    ]);

    res.json({
      success: true,
      data: movements,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    next(err);
  }
};
