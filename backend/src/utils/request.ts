import { Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { TenantRequest } from '../middleware/tenant.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Get the tenant-specific Prisma client from the request.
 * Use this in all controllers instead of importing `prisma` directly.
 */
export function db(req: Request): PrismaClient {
  return (req as TenantRequest).prisma;
}

/**
 * Get the tenant ID from the request.
 */
export function tenantId(req: Request): string {
  return (req as TenantRequest).tenantId;
}

/**
 * Get the authenticated user from the request.
 */
export function currentUser(req: Request) {
  return (req as AuthRequest).user!;
}
