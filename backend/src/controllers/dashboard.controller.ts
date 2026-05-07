import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { StockStatus } from '@prisma/client';

export const getDashboardStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const [
      totalProducts,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      todaySales,
      weeklySales,
      monthlySales,
      recentSales,
      topProducts,
      lowStockProducts,
    ] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: true, status: StockStatus.IN_STOCK } }),
      prisma.product.count({ where: { isActive: true, status: StockStatus.LOW_STOCK } }),
      prisma.product.count({ where: { isActive: true, status: StockStatus.OUT_OF_STOCK } }),

      prisma.sale.aggregate({
        where: { createdAt: { gte: today, lt: tomorrow }, status: 'COMPLETED' },
        _sum: { total: true },
        _count: true,
      }),

      prisma.sale.aggregate({
        where: { createdAt: { gte: startOfWeek }, status: 'COMPLETED' },
        _sum: { total: true },
        _count: true,
      }),

      prisma.sale.aggregate({
        where: { createdAt: { gte: startOfMonth }, status: 'COMPLETED' },
        _sum: { total: true },
        _count: true,
      }),

      prisma.sale.findMany({
        where: { status: 'COMPLETED' },
        include: {
          user: { select: { name: true } },
          saleItems: { include: { product: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      prisma.saleItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),

      prisma.product.findMany({
        where: {
          isActive: true,
          status: { in: [StockStatus.LOW_STOCK, StockStatus.OUT_OF_STOCK] },
        },
        include: { category: { select: { name: true } } },
        orderBy: { quantity: 'asc' },
        take: 10,
      }),
    ]);

    // Enrich top products
    const topProductsEnriched = await Promise.all(
      topProducts.map(async (tp) => {
        const product = await prisma.product.findUnique({
          where: { id: tp.productId },
          select: { name: true, sku: true },
        });
        return { ...tp, product };
      })
    );

    // Sales trend (last 7 days)
    const salesTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const daySales = await prisma.sale.aggregate({
        where: { createdAt: { gte: date, lt: nextDate }, status: 'COMPLETED' },
        _sum: { total: true },
        _count: true,
      });

      salesTrend.push({
        date: date.toISOString().split('T')[0],
        revenue: Number(daySales._sum.total || 0),
        orders: daySales._count,
      });
    }

    res.json({
      success: true,
      data: {
        inventory: {
          total: totalProducts,
          inStock: inStockCount,
          lowStock: lowStockCount,
          outOfStock: outOfStockCount,
        },
        sales: {
          today: {
            revenue: Number(todaySales._sum.total || 0),
            orders: todaySales._count,
          },
          weekly: {
            revenue: Number(weeklySales._sum.total || 0),
            orders: weeklySales._count,
          },
          monthly: {
            revenue: Number(monthlySales._sum.total || 0),
            orders: monthlySales._count,
          },
        },
        recentSales,
        topProducts: topProductsEnriched,
        lowStockProducts,
        salesTrend,
      },
    });
  } catch (err) {
    next(err);
  }
};
