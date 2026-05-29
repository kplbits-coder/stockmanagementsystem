/**
 * Multi-tenant configuration.
 * Each client has its own database URL, branding, and feature flags.
 * Add new clients here — the rest of the system picks them up automatically.
 */

export interface TenantConfig {
  id: string;
  name: string;
  displayName: string;
  databaseUrl: string;
  features: {
    barcode: boolean;
    subCategories: boolean;
    reports: boolean;
    multiPayment: boolean;
    // Add client-specific feature flags here
    [key: string]: boolean;
  };
  branding: {
    primaryColor: string;
    logo?: string;
    companyName: string;
    tagline?: string;
    address?: string;
    phone?: string;
    email?: string;
    panNo?: string;   // PAN/VAT number for invoices
  };
}

// Load tenant configs from environment variables
function loadTenants(): Record<string, TenantConfig> {
  const tenants: Record<string, TenantConfig> = {};

  // ─── Scoopmandu ──────────────────────────────────────────────────────────
  tenants['scoopmandu'] = {
    id: 'scoopmandu',
    name: 'scoopmandu',
    displayName: 'Scoopmandu',
    databaseUrl: process.env.DATABASE_URL_SCOOPMANDU || process.env.DATABASE_URL || '',
    features: {
      barcode: true,
      subCategories: true,
      reports: true,
      multiPayment: true,
      refrigeratorTracking: true,
    },
    branding: {
      primaryColor: '#7c3aed', // violet
      companyName: 'Scoopmandu',
      tagline: 'Premium Ice Cream & Desserts',
      panNo: '601234567',
    },
  };

  // ─── RKT Tradings ────────────────────────────────────────────────────────
  tenants['rkt-tradings'] = {
    id: 'rkt-tradings',
    name: 'rkt-tradings',
    displayName: 'RKT Tradings',
    databaseUrl: process.env.DATABASE_URL_RKT || process.env.DATABASE_URL || '',
    features: {
      barcode: true,
      subCategories: true,
      reports: true,
      multiPayment: true,
      refrigeratorTracking: false,
    },
    branding: {
      primaryColor: '#1e40af', // blue
      companyName: 'RKT Tradings',
      tagline: 'Wholesale & Retail Trading',
      address: 'Kathmandu, Nepal',
      panNo: '609876543',
    },
  };

  return tenants;
}

export const TENANTS = loadTenants();

export function getTenantConfig(tenantId: string): TenantConfig | undefined {
  return TENANTS[tenantId];
}

export function getAllTenantIds(): string[] {
  return Object.keys(TENANTS);
}

export const DEFAULT_TENANT = 'scoopmandu';
