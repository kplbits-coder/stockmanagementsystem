import { Request, Response, NextFunction } from 'express';
import { db } from '../utils/request';

export const getSalesReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const { period = 'daily', startDate, endDate } = req.query;

    let start: Date;
    let end: Date = new Date();

    if (startDate && endDate) {
      start = new Date(String(startDate));
      end = new Date(String(endDate));
    } else {
      const now = new Date();
      switch (period) {
        case 'weekly':
          start = new Date(now);
          start.setDate(now.getDate() - 7);
          break;
        case 'monthly':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'yearly':
          start = new Date(now.getFullYear(), 0, 1);
          break;
        default: // daily
          start = new Date(now);
          start.setHours(0, 0, 0, 0);
      }
    }

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: 'COMPLETED',
      },
      include: {
        saleItems: {
          include: { product: { select: { name: true, sku: true, categoryId: true } } },
        },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
    const totalTax = sales.reduce((sum, s) => sum + Number(s.taxAmount), 0);
    const totalDiscount = sales.reduce((sum, s) => sum + Number(s.discount), 0);

    // Category breakdown
    const categoryMap: Record<string, { revenue: number; quantity: number }> = {};
    for (const sale of sales) {
      for (const item of sale.saleItems) {
        const catId = item.product.categoryId;
        if (!categoryMap[catId]) categoryMap[catId] = { revenue: 0, quantity: 0 };
        categoryMap[catId].revenue += Number(item.total);
        categoryMap[catId].quantity += item.quantity;
      }
    }

    const categoryIds = Object.keys(categoryMap);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });

    const categoryBreakdown = categories.map((cat) => ({
      category: cat.name,
      revenue: categoryMap[cat.id]?.revenue || 0,
      quantity: categoryMap[cat.id]?.quantity || 0,
    }));

    res.json({
      success: true,
      data: {
        period,
        startDate: start,
        endDate: end,
        summary: {
          totalSales: sales.length,
          totalRevenue,
          totalTax,
          totalDiscount,
          netRevenue: totalRevenue - totalTax,
        },
        categoryBreakdown,
        sales,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getInventoryReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });

    const totalValue = products.reduce(
      (sum, p) => sum + Number(p.costPrice) * p.quantity,
      0
    );
    const totalRetailValue = products.reduce(
      (sum, p) => sum + Number(p.price) * p.quantity,
      0
    );

    res.json({
      success: true,
      data: {
        summary: {
          totalProducts: products.length,
          totalValue,
          totalRetailValue,
          potentialProfit: totalRetailValue - totalValue,
        },
        products,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const { page = '1', limit = '20', entity, action } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (entity) where.entity = String(entity);
    if (action) where.action = String(action);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    next(err);
  }
};
