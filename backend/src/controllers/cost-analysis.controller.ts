import { Request, Response, NextFunction } from 'express';
import { db } from '../utils/request';

/**
 * GET /api/cost-analysis/overview
 * Main dashboard stats: inventory value, margins, COGS, monthly profit
 */
export const getOverview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);

    // Get all active products for inventory valuation
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { costPrice: true, price: true, quantity: true },
    });

    const totalInventoryValue = products.reduce(
      (sum, p) => sum + Number(p.costPrice) * p.quantity, 0
    );
    const totalRetailValue = products.reduce(
      (sum, p) => sum + Number(p.price) * p.quantity, 0
    );
    const grossProfitPotential = totalRetailValue - totalInventoryValue;

    // Average margin across all products
    const margins = products.map((p) => {
      const cost = Number(p.costPrice);
      const price = Number(p.price);
      return price > 0 ? ((price - cost) / price) * 100 : 0;
    });
    const averageMargin = margins.length > 0
      ? margins.reduce((sum, m) => sum + m, 0) / margins.length
      : 0;

    // Current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // COGS for current month: sum of costPrice × quantity for completed sale items
    const monthlySaleItems = await prisma.saleItem.findMany({
      where: {
        sale: {
          status: 'COMPLETED',
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      },
      include: {
        product: { select: { costPrice: true } },
      },
    });

    const monthlyCOGS = monthlySaleItems.reduce(
      (sum, item) => sum + Number(item.product.costPrice) * item.quantity, 0
    );

    // Total revenue this month
    const monthlySales = await prisma.sale.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      select: { total: true },
    });

    const monthlyRevenue = monthlySales.reduce(
      (sum, s) => sum + Number(s.total), 0
    );
    const monthlyGrossProfit = monthlyRevenue - monthlyCOGS;

    // Dead stock value (products not sold in 30+ days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const productsWithLastSale = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        costPrice: true,
        quantity: true,
        saleItems: {
          select: { sale: { select: { createdAt: true } } },
          orderBy: { sale: { createdAt: 'desc' } },
          take: 1,
        },
      },
    });

    const deadStockValue = productsWithLastSale.reduce((sum, p) => {
      const lastSaleDate = p.saleItems[0]?.sale?.createdAt;
      if (!lastSaleDate || new Date(lastSaleDate) < thirtyDaysAgo) {
        return sum + Number(p.costPrice) * p.quantity;
      }
      return sum;
    }, 0);

    res.json({
      success: true,
      data: {
        totalInventoryValue,
        totalRetailValue,
        grossProfitPotential,
        averageMargin: Math.round(averageMargin * 100) / 100,
        monthlyCOGS,
        monthlyRevenue,
        monthlyGrossProfit,
        deadStockValue,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/cost-analysis/profit-by-product
 * Per-product profit analysis with period and sort filters
 */
export const getProfitByProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const { period = 'monthly', sortBy = 'profit' } = req.query;

    // Determine date range based on period
    const now = new Date();
    let start: Date;
    switch (period) {
      case 'daily':
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case 'yearly':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default: // monthly
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get all products with their sale items in the period
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: { select: { name: true } },
        saleItems: {
          where: {
            sale: {
              status: 'COMPLETED',
              createdAt: { gte: start },
            },
          },
          select: {
            quantity: true,
            total: true,
          },
        },
      },
    });

    const result = products.map((p) => {
      const totalSold = p.saleItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalRevenue = p.saleItems.reduce((sum, item) => sum + Number(item.total), 0);
      const totalCOGS = totalSold * Number(p.costPrice);
      const grossProfit = totalRevenue - totalCOGS;
      const margin = Number(p.price) > 0
        ? ((Number(p.price) - Number(p.costPrice)) / Number(p.price)) * 100
        : 0;

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category.name,
        costPrice: Number(p.costPrice),
        sellingPrice: Number(p.price),
        margin: Math.round(margin * 100) / 100,
        totalSold,
        totalRevenue,
        totalCOGS,
        grossProfit,
      };
    });

    // Sort based on sortBy parameter
    switch (sortBy) {
      case 'margin':
        result.sort((a, b) => b.margin - a.margin);
        break;
      case 'revenue':
        result.sort((a, b) => b.totalRevenue - a.totalRevenue);
        break;
      default: // profit
        result.sort((a, b) => b.grossProfit - a.grossProfit);
    }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/cost-analysis/profit-by-category
 * Category-wise profit breakdown
 */
export const getProfitByCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);

    const categories = await prisma.category.findMany({
      include: {
        products: {
          where: { isActive: true },
          include: {
            saleItems: {
              where: {
                sale: { status: 'COMPLETED' },
              },
              select: {
                quantity: true,
                total: true,
                product: { select: { costPrice: true } },
              },
            },
          },
        },
      },
    });

    const result = categories.map((cat) => {
      let totalRevenue = 0;
      let totalCOGS = 0;

      for (const product of cat.products) {
        for (const item of product.saleItems) {
          totalRevenue += Number(item.total);
          totalCOGS += Number(item.product.costPrice) * item.quantity;
        }
      }

      const grossProfit = totalRevenue - totalCOGS;
      const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        totalRevenue,
        totalCOGS,
        grossProfit,
        margin: Math.round(margin * 100) / 100,
      };
    });

    // Sort by revenue descending
    result.sort((a, b) => b.totalRevenue - a.totalRevenue);

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/cost-analysis/dead-stock
 * Dead/slow-moving inventory analysis
 */
export const getDeadStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const days = Number(req.query.days) || 30;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get all active products with their last sale date
    const products = await prisma.product.findMany({
      where: { isActive: true, quantity: { gt: 0 } },
      include: {
        category: { select: { name: true } },
        saleItems: {
          include: {
            sale: { select: { createdAt: true, status: true } },
          },
          orderBy: { sale: { createdAt: 'desc' } },
        },
      },
    });

    const now = new Date();
    const result = products
      .map((p) => {
        // Find the last completed sale date
        const completedSaleItems = p.saleItems.filter(
          (item) => item.sale.status === 'COMPLETED'
        );
        const lastSaleDate = completedSaleItems.length > 0
          ? completedSaleItems[0].sale.createdAt
          : null;

        const daysSinceLastSale = lastSaleDate
          ? Math.floor((now.getTime() - new Date(lastSaleDate).getTime()) / (1000 * 60 * 60 * 24))
          : Infinity;

        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category.name,
          quantity: p.quantity,
          costPrice: Number(p.costPrice),
          holdingValue: Number(p.costPrice) * p.quantity,
          lastSoldDate: lastSaleDate,
          daysSinceLastSale: lastSaleDate ? daysSinceLastSale : null,
          neverSold: !lastSaleDate,
        };
      })
      .filter((p) => {
        // Include if never sold OR last sale is older than cutoff
        if (p.neverSold) return true;
        return p.daysSinceLastSale! >= days;
      })
      .sort((a, b) => {
        // Never sold items first, then by days since last sale descending
        if (a.neverSold && !b.neverSold) return -1;
        if (!a.neverSold && b.neverSold) return 1;
        if (a.neverSold && b.neverSold) return b.holdingValue - a.holdingValue;
        return (b.daysSinceLastSale || 0) - (a.daysSinceLastSale || 0);
      });

    const totalDeadStockValue = result.reduce((sum, p) => sum + p.holdingValue, 0);

    res.json({
      success: true,
      data: {
        totalDeadStockValue,
        totalItems: result.length,
        products: result,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/cost-analysis/abc-analysis
 * ABC classification based on revenue contribution
 */
export const getAbcAnalysis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);

    // Get all products with their total revenue from completed sales
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: { select: { name: true } },
        saleItems: {
          where: {
            sale: { status: 'COMPLETED' },
          },
          select: { total: true },
        },
      },
    });

    // Calculate total revenue per product
    const productRevenues = products
      .map((p) => {
        const revenue = p.saleItems.reduce((sum, item) => sum + Number(item.total), 0);
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category.name,
          revenue,
        };
      })
      .filter((p) => p.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = productRevenues.reduce((sum, p) => sum + p.revenue, 0);

    // Calculate cumulative percentage and classify
    let cumulativeRevenue = 0;
    const result = productRevenues.map((p) => {
      cumulativeRevenue += p.revenue;
      const percentageOfTotal = totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0;
      const cumulativePercentage = totalRevenue > 0 ? (cumulativeRevenue / totalRevenue) * 100 : 0;

      let classification: 'A' | 'B' | 'C';
      if (cumulativePercentage <= 80) {
        classification = 'A';
      } else if (cumulativePercentage <= 95) {
        classification = 'B';
      } else {
        classification = 'C';
      }

      return {
        ...p,
        percentageOfTotal: Math.round(percentageOfTotal * 100) / 100,
        cumulativePercentage: Math.round(cumulativePercentage * 100) / 100,
        classification,
      };
    });

    // Summary counts
    const summary = {
      A: { count: 0, revenue: 0, percentage: 0 },
      B: { count: 0, revenue: 0, percentage: 0 },
      C: { count: 0, revenue: 0, percentage: 0 },
    };

    for (const item of result) {
      summary[item.classification].count++;
      summary[item.classification].revenue += item.revenue;
    }

    if (totalRevenue > 0) {
      summary.A.percentage = (summary.A.revenue / totalRevenue) * 100;
      summary.B.percentage = (summary.B.revenue / totalRevenue) * 100;
      summary.C.percentage = (summary.C.revenue / totalRevenue) * 100;
    }

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalProducts: result.length,
        summary,
        products: result,
      },
    });
  } catch (err) {
    next(err);
  }
};
