import { Request, Response, NextFunction } from 'express';
import { db } from '../utils/request';
import { createError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { generateInvoicePDF } from '../utils/invoice';
import { StockStatus } from '@prisma/client';

function generateInvoiceNo(): string {
  const date = new Date();
  const prefix = `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${random}`;
}

function computeStatus(quantity: number, minQuantity: number): StockStatus {
  if (quantity === 0) return StockStatus.OUT_OF_STOCK;
  if (quantity <= minQuantity) return StockStatus.LOW_STOCK;
  return StockStatus.IN_STOCK;
}

export const getSales = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const { page = '1', limit = '20', startDate, endDate, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = String(status);
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          user: { select: { id: true, name: true } },
          saleItems: {
            include: { product: { select: { id: true, name: true, sku: true } } },
          },
          payment: true,
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sale.count({ where }),
    ]);

    res.json({
      success: true,
      data: sales,
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

export const getSaleById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true } },
        saleItems: {
          include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
        },
        payment: true,
      },
    });
    if (!sale) return next(createError('Sale not found', 404));
    res.json({ success: true, data: sale });
  } catch (err) {
    next(err);
  }
};

export const createSale = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const {
      customerName, customerPhone, items, discount = 0, notes,
      paymentMethod = 'CASH', amountPaid, referenceNo,
      bankName, accountName, paymentNotes,
    } = req.body;

    if (!items || items.length === 0) {
      return next(createError('Sale must have at least one item', 400));
    }

    // Validate stock availability
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || !product.isActive) {
        return next(createError(`Product ${item.productId} not found`, 404));
      }
      if (product.quantity < item.quantity) {
        return next(
          createError(
            `Insufficient stock for "${product.name}". Available: ${product.quantity}, Requested: ${item.quantity}`,
            400
          )
        );
      }
    }

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;
    const saleItemsData = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      const unitPrice = Number(product!.price);
      const taxRate = Number(product!.taxRate);
      const itemDiscount = Number(item.discount || 0);
      const itemSubtotal = unitPrice * item.quantity;
      const itemTax = (itemSubtotal * taxRate) / 100;
      const itemTotal = itemSubtotal + itemTax - itemDiscount;

      subtotal += itemSubtotal;
      taxAmount += itemTax;

      saleItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        taxRate,
        discount: itemDiscount,
        total: itemTotal,
      });
    }

    const total = subtotal + taxAmount - Number(discount);
    const paid = Number(amountPaid ?? total);
    const change = Math.max(0, paid - total);

    // Create sale + payment in transaction
    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          invoiceNo: generateInvoiceNo(),
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          userId: req.user!.id,
          subtotal,
          taxAmount,
          discount: Number(discount),
          total,
          notes: notes || null,
          saleItems: { create: saleItemsData },
          payment: {
            create: {
              method: paymentMethod,
              status: paid >= total ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING',
              amountPaid: paid,
              changeAmount: change,
              referenceNo: referenceNo || null,
              bankName: bankName || null,
              accountName: accountName || null,
              notes: paymentNotes || null,
            },
          },
        },
        include: {
          saleItems: {
            include: { product: { select: { id: true, name: true, sku: true } } },
          },
          user: { select: { id: true, name: true } },
          payment: true,
        },
      });

      // Deduct stock
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        const newQty = product!.quantity - item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: newQty,
            status: computeStatus(newQty, product!.minQuantity),
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'OUT',
            quantity: item.quantity,
            previousQty: product!.quantity,
            newQty,
            reason: 'Sale',
            reference: newSale.invoiceNo,
          },
        });
      }

      return newSale;
    });

    res.status(201).json({ success: true, data: sale });
  } catch (err) {
    next(err);
  }
};

export const cancelSale = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: { saleItems: true },
    });
    if (!sale) return next(createError('Sale not found', 404));
    if (sale.status !== 'COMPLETED') {
      return next(createError('Only completed sales can be cancelled', 400));
    }

    await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id: sale.id },
        data: { status: 'CANCELLED' },
      });

      // Restore stock
      for (const item of sale.saleItems) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        const newQty = product!.quantity + item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: newQty,
            status: computeStatus(newQty, product!.minQuantity),
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'IN',
            quantity: item.quantity,
            previousQty: product!.quantity,
            newQty,
            reason: 'Sale cancelled',
            reference: sale.invoiceNo,
          },
        });
      }
    });

    res.json({ success: true, message: 'Sale cancelled and stock restored' });
  } catch (err) {
    next(err);
  }
};

export const downloadInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const tenantConfig = (req as any).tenantConfig;
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { name: true } },
        saleItems: {
          include: { product: { select: { name: true } } },
        },
        payment: true,
      },
    });
    if (!sale) return next(createError('Sale not found', 404));

    generateInvoicePDF(
      {
        companyName: tenantConfig?.branding?.companyName || 'Stock Manager',
        companyTagline: tenantConfig?.branding?.tagline || 'Stock Management System',
        panNo: tenantConfig?.branding?.panNo || undefined,
        invoiceNo: sale.invoiceNo,
        date: sale.createdAt,
        customerName: sale.customerName || undefined,
        customerPhone: sale.customerPhone || undefined,
        cashierName: sale.user.name,
        paymentMethod: sale.payment?.method,
        paymentStatus: sale.payment?.status,
        amountPaid: sale.payment ? Number(sale.payment.amountPaid) : undefined,
        changeAmount: sale.payment ? Number(sale.payment.changeAmount) : undefined,
        referenceNo: sale.payment?.referenceNo || undefined,
        bankName: sale.payment?.bankName || undefined,
        accountName: sale.payment?.accountName || undefined,
        items: sale.saleItems.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate),
          discount: Number(item.discount),
          total: Number(item.total),
        })),
        subtotal: Number(sale.subtotal),
        taxAmount: Number(sale.taxAmount),
        discount: Number(sale.discount),
        total: Number(sale.total),
      },
      res
    );
  } catch (err) {
    next(err);
  }
};
