import { Request, Response, NextFunction } from 'express';
import { db, currentUser } from '../utils/request';
import { createError } from '../middleware/error.middleware';

// ─── Refrigerators ───────────────────────────────────────────────────────────

export const getRefrigerators = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const { search, status, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { code: { contains: String(search), mode: 'insensitive' } },
        { name: { contains: String(search), mode: 'insensitive' } },
        { brand: { contains: String(search), mode: 'insensitive' } },
        { serialNumber: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    if (status) where.status = String(status);

    const [refrigerators, total] = await Promise.all([
      prisma.refrigerator.findMany({
        where,
        include: {
          assignments: {
            where: { status: 'ACTIVE' },
            include: { shop: { select: { id: true, name: true, code: true } } },
            take: 1,
          },
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.refrigerator.count({ where }),
    ]);

    res.json({
      success: true,
      data: refrigerators,
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

export const getRefrigeratorById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const refrigerator = await prisma.refrigerator.findUnique({
      where: { id: req.params.id },
      include: {
        assignments: {
          include: { shop: true },
          orderBy: { assignedDate: 'desc' },
        },
        logs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!refrigerator) return next(createError('Refrigerator not found', 404));
    res.json({ success: true, data: refrigerator });
  } catch (err) {
    next(err);
  }
};

export const createRefrigerator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const { code, name, brand, model, capacity, serialNumber, purchaseDate, remarks } = req.body;

    const existing = await prisma.refrigerator.findFirst({
      where: { OR: [{ code }, ...(serialNumber ? [{ serialNumber }] : [])] },
    });
    if (existing) return next(createError('Refrigerator code or serial number already exists', 409));

    const refrigerator = await prisma.refrigerator.create({
      data: {
        code,
        name,
        brand: brand || null,
        model: model || null,
        capacity: capacity || null,
        serialNumber: serialNumber || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        remarks: remarks || null,
      },
    });

    // Log creation
    const user = currentUser(req);
    await prisma.refrigeratorLog.create({
      data: {
        refrigeratorId: refrigerator.id,
        action: 'CREATED',
        performedBy: user.name,
        remarks: `Refrigerator ${code} created`,
      },
    });

    res.status(201).json({ success: true, data: refrigerator });
  } catch (err) {
    next(err);
  }
};

export const updateRefrigerator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const existing = await prisma.refrigerator.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(createError('Refrigerator not found', 404));

    const { code, name, brand, model, capacity, serialNumber, purchaseDate, status, remarks } = req.body;

    const refrigerator = await prisma.refrigerator.update({
      where: { id: req.params.id },
      data: {
        ...(code && { code }),
        ...(name && { name }),
        ...(brand !== undefined && { brand: brand || null }),
        ...(model !== undefined && { model: model || null }),
        ...(capacity !== undefined && { capacity: capacity || null }),
        ...(serialNumber !== undefined && { serialNumber: serialNumber || null }),
        ...(purchaseDate !== undefined && { purchaseDate: purchaseDate ? new Date(purchaseDate) : null }),
        ...(status && { status }),
        ...(remarks !== undefined && { remarks: remarks || null }),
      },
    });

    // Log status change
    if (status && status !== existing.status) {
      const user = currentUser(req);
      await prisma.refrigeratorLog.create({
        data: {
          refrigeratorId: refrigerator.id,
          action: 'STATUS_CHANGED',
          performedBy: user.name,
          remarks: `Status changed from ${existing.status} to ${status}`,
        },
      });
    }

    res.json({ success: true, data: refrigerator });
  } catch (err) {
    next(err);
  }
};

export const deleteRefrigerator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const existing = await prisma.refrigerator.findUnique({
      where: { id: req.params.id },
      include: { assignments: { where: { status: 'ACTIVE' } } },
    });
    if (!existing) return next(createError('Refrigerator not found', 404));
    if (existing.assignments.length > 0) {
      return next(createError('Cannot delete refrigerator with active assignments', 400));
    }

    await prisma.refrigerator.update({
      where: { id: req.params.id },
      data: { status: 'INACTIVE' },
    });

    res.json({ success: true, message: 'Refrigerator deactivated successfully' });
  } catch (err) {
    next(err);
  }
};

// ─── Shops ───────────────────────────────────────────────────────────────────

export const getShops = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const { search, page = '1', limit = '50' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { code: { contains: String(search), mode: 'insensitive' } },
        { region: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const [shops, total] = await Promise.all([
      prisma.shop.findMany({
        where,
        include: {
          _count: { select: { assignments: true } },
          assignments: {
            where: { status: 'ACTIVE' },
            select: { id: true },
          },
        },
        skip,
        take: Number(limit),
        orderBy: { name: 'asc' },
      }),
      prisma.shop.count({ where }),
    ]);

    const shopsWithCount = shops.map((shop: any) => ({
      ...shop,
      activeRefrigerators: shop.assignments.length,
      assignments: undefined,
    }));

    res.json({
      success: true,
      data: shopsWithCount,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

export const createShop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const { name, code, address, contactPerson, phone, region } = req.body;

    const existing = await prisma.shop.findUnique({ where: { code } });
    if (existing) return next(createError('Shop code already exists', 409));

    const shop = await prisma.shop.create({
      data: { name, code, address, contactPerson, phone, region },
    });

    res.status(201).json({ success: true, data: shop });
  } catch (err) {
    next(err);
  }
};

export const updateShop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const existing = await prisma.shop.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(createError('Shop not found', 404));

    const { name, code, address, contactPerson, phone, region, isActive } = req.body;

    const shop = await prisma.shop.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(address !== undefined && { address }),
        ...(contactPerson !== undefined && { contactPerson }),
        ...(phone !== undefined && { phone }),
        ...(region !== undefined && { region }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ success: true, data: shop });
  } catch (err) {
    next(err);
  }
};

export const deleteShop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const existing = await prisma.shop.findUnique({
      where: { id: req.params.id },
      include: { assignments: { where: { status: 'ACTIVE' } } },
    });
    if (!existing) return next(createError('Shop not found', 404));
    if (existing.assignments.length > 0) {
      return next(createError('Cannot delete shop with active refrigerator assignments', 400));
    }

    await prisma.shop.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Shop deactivated successfully' });
  } catch (err) {
    next(err);
  }
};

// ─── Assignments ─────────────────────────────────────────────────────────────

export const getAssignments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const { refrigeratorId, shopId, status, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (refrigeratorId) where.refrigeratorId = String(refrigeratorId);
    if (shopId) where.shopId = String(shopId);
    if (status) where.status = String(status);

    const [assignments, total] = await Promise.all([
      prisma.refrigeratorAssignment.findMany({
        where,
        include: {
          refrigerator: { select: { id: true, code: true, name: true } },
          shop: { select: { id: true, name: true, code: true } },
        },
        skip,
        take: Number(limit),
        orderBy: { assignedDate: 'desc' },
      }),
      prisma.refrigeratorAssignment.count({ where }),
    ]);

    res.json({
      success: true,
      data: assignments,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

export const assignRefrigerator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const { refrigeratorId, shopId, remarks } = req.body;
    const user = currentUser(req);

    const refrigerator = await prisma.refrigerator.findUnique({ where: { id: refrigeratorId } });
    if (!refrigerator) return next(createError('Refrigerator not found', 404));
    if (refrigerator.status === 'ASSIGNED') {
      return next(createError('Refrigerator is already assigned. Transfer or return it first.', 400));
    }
    if (refrigerator.status === 'INACTIVE') {
      return next(createError('Cannot assign an inactive refrigerator', 400));
    }

    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) return next(createError('Shop not found', 404));

    const assignment = await prisma.refrigeratorAssignment.create({
      data: {
        refrigeratorId,
        shopId,
        remarks: remarks || null,
        status: 'ACTIVE',
      },
      include: {
        refrigerator: { select: { id: true, code: true, name: true } },
        shop: { select: { id: true, name: true, code: true } },
      },
    });

    await prisma.refrigerator.update({
      where: { id: refrigeratorId },
      data: { status: 'ASSIGNED' },
    });

    await prisma.refrigeratorLog.create({
      data: {
        refrigeratorId,
        action: 'ASSIGNED',
        newShop: shop.name,
        performedBy: user.name,
        remarks: remarks || `Assigned to ${shop.name}`,
      },
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (err) {
    next(err);
  }
};

export const transferRefrigerator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const { refrigeratorId, newShopId, remarks } = req.body;
    const user = currentUser(req);

    const activeAssignment = await prisma.refrigeratorAssignment.findFirst({
      where: { refrigeratorId, status: 'ACTIVE' },
      include: { shop: true },
    });
    if (!activeAssignment) {
      return next(createError('No active assignment found for this refrigerator', 400));
    }

    const newShop = await prisma.shop.findUnique({ where: { id: newShopId } });
    if (!newShop) return next(createError('New shop not found', 404));

    if (activeAssignment.shopId === newShopId) {
      return next(createError('Refrigerator is already assigned to this shop', 400));
    }

    // Close current assignment
    await prisma.refrigeratorAssignment.update({
      where: { id: activeAssignment.id },
      data: { status: 'TRANSFERRED', returnedDate: new Date() },
    });

    // Create new assignment
    const newAssignment = await prisma.refrigeratorAssignment.create({
      data: {
        refrigeratorId,
        shopId: newShopId,
        remarks: remarks || null,
        status: 'ACTIVE',
      },
      include: {
        refrigerator: { select: { id: true, code: true, name: true } },
        shop: { select: { id: true, name: true, code: true } },
      },
    });

    await prisma.refrigeratorLog.create({
      data: {
        refrigeratorId,
        action: 'TRANSFERRED',
        previousShop: activeAssignment.shop.name,
        newShop: newShop.name,
        performedBy: user.name,
        remarks: remarks || `Transferred from ${activeAssignment.shop.name} to ${newShop.name}`,
      },
    });

    res.json({ success: true, data: newAssignment });
  } catch (err) {
    next(err);
  }
};

export const returnRefrigerator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const { refrigeratorId, remarks } = req.body;
    const user = currentUser(req);

    const activeAssignment = await prisma.refrigeratorAssignment.findFirst({
      where: { refrigeratorId, status: 'ACTIVE' },
      include: { shop: true },
    });
    if (!activeAssignment) {
      return next(createError('No active assignment found for this refrigerator', 400));
    }

    await prisma.refrigeratorAssignment.update({
      where: { id: activeAssignment.id },
      data: { status: 'RETURNED', returnedDate: new Date() },
    });

    await prisma.refrigerator.update({
      where: { id: refrigeratorId },
      data: { status: 'AVAILABLE' },
    });

    await prisma.refrigeratorLog.create({
      data: {
        refrigeratorId,
        action: 'RETURNED',
        previousShop: activeAssignment.shop.name,
        performedBy: user.name,
        remarks: remarks || `Returned from ${activeAssignment.shop.name}`,
      },
    });

    res.json({ success: true, message: 'Refrigerator returned successfully' });
  } catch (err) {
    next(err);
  }
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const getRefrigeratorDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);

    const [total, assigned, available, maintenance, inactive, shops, recentLogs] = await Promise.all([
      prisma.refrigerator.count(),
      prisma.refrigerator.count({ where: { status: 'ASSIGNED' } }),
      prisma.refrigerator.count({ where: { status: 'AVAILABLE' } }),
      prisma.refrigerator.count({ where: { status: 'UNDER_MAINTENANCE' } }),
      prisma.refrigerator.count({ where: { status: 'INACTIVE' } }),
      prisma.shop.findMany({
        where: { isActive: true },
        include: {
          assignments: {
            where: { status: 'ACTIVE' },
            select: { id: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.refrigeratorLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { refrigerator: { select: { code: true, name: true } } },
      }),
    ]);

    const shopWise = shops.map((shop: any) => ({
      id: shop.id,
      name: shop.name,
      code: shop.code,
      region: shop.region,
      refrigeratorCount: shop.assignments.length,
    }));

    res.json({
      success: true,
      data: {
        stats: { total, assigned, available, maintenance, inactive },
        shopWise,
        recentLogs,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Logs ────────────────────────────────────────────────────────────────────

export const getRefrigeratorLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const { refrigeratorId, action, page = '1', limit = '30' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (refrigeratorId) where.refrigeratorId = String(refrigeratorId);
    if (action) where.action = String(action);

    const [logs, total] = await Promise.all([
      prisma.refrigeratorLog.findMany({
        where,
        include: { refrigerator: { select: { id: true, code: true, name: true } } },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.refrigeratorLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
};
