import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role, PrismaClient } from '@prisma/client';
import { TenantRequest } from './tenant.middleware';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
    name: string;
  };
  tenantId: string;
  prisma: PrismaClient;
  tenantConfig: any;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      role: Role;
    };

    // Use the tenant-specific prisma client from the request
    const prisma = (req as TenantRequest).prisma;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id, isActive: true },
      select: { id: true, email: true, role: true, name: true },
    });

    if (!user) {
      res.status(401).json({ message: 'User not found or inactive' });
      return;
    }

    (req as AuthRequest).user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const authorize = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    if (!authReq.user || !roles.includes(authReq.user.role)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }
    next();
  };
};
