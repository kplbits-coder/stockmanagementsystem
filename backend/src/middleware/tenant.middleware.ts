import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../utils/prisma';
import { getTenantConfig, DEFAULT_TENANT, TenantConfig } from '../config/tenants';

/**
 * Extends Express Request with tenant context.
 * Every route handler can access req.tenantId, req.prisma, and req.tenantConfig.
 */
export interface TenantRequest extends Request {
  tenantId: string;
  prisma: PrismaClient;
  tenantConfig: TenantConfig;
}

/**
 * Tenant resolution middleware.
 * Determines the tenant from (in priority order):
 * 1. `x-tenant-id` header
 * 2. Subdomain (e.g. scoopmandu.stockmanager.com)
 * 3. Falls back to DEFAULT_TENANT
 *
 * Attaches prisma client and tenant config to the request.
 */
export const resolveTenant = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // 1. Check header
    let tenantId = req.headers['x-tenant-id'] as string | undefined;

    // 2. Check subdomain
    if (!tenantId) {
      const host = req.hostname;
      const parts = host.split('.');
      if (parts.length > 2) {
        tenantId = parts[0]; // e.g. "scoopmandu" from scoopmandu.example.com
      }
    }

    // 3. Fallback
    if (!tenantId) {
      tenantId = DEFAULT_TENANT;
    }

    tenantId = tenantId.toLowerCase().trim();

    const config = getTenantConfig(tenantId);
    if (!config) {
      res.status(400).json({
        success: false,
        message: `Unknown tenant: "${tenantId}". Contact support.`,
      });
      return;
    }

    const prisma = getPrismaClient(tenantId);

    // Attach to request
    (req as TenantRequest).tenantId = tenantId;
    (req as TenantRequest).prisma = prisma;
    (req as TenantRequest).tenantConfig = config;

    next();
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Tenant resolution failed',
    });
  }
};
