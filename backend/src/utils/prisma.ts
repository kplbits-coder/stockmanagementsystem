import { PrismaClient } from '@prisma/client';
import { getTenantConfig, getAllTenantIds } from '../config/tenants';

/**
 * Multi-tenant Prisma client manager.
 * Maintains one PrismaClient instance per tenant (database).
 * Clients are lazily created and cached for the lifetime of the process.
 */

const clientCache = new Map<string, PrismaClient>();

export function getPrismaClient(tenantId: string): PrismaClient {
  // Return cached client if exists
  if (clientCache.has(tenantId)) {
    return clientCache.get(tenantId)!;
  }

  const config = getTenantConfig(tenantId);
  if (!config) {
    throw new Error(`Unknown tenant: "${tenantId}". Valid tenants: ${getAllTenantIds().join(', ')}`);
  }

  if (!config.databaseUrl) {
    throw new Error(`No database URL configured for tenant: "${tenantId}"`);
  }

  const client = new PrismaClient({
    datasources: { db: { url: config.databaseUrl } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  clientCache.set(tenantId, client);
  return client;
}

/**
 * Disconnect all cached clients (for graceful shutdown).
 */
export async function disconnectAll(): Promise<void> {
  const promises = Array.from(clientCache.values()).map((client) => client.$disconnect());
  await Promise.all(promises);
  clientCache.clear();
}

/**
 * Legacy export for backward compatibility.
 * Uses the default DATABASE_URL from .env (fallback for scripts like seed).
 */
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});
