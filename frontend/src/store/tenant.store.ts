import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TenantBranding {
  primaryColor: string;
  logo?: string;
  companyName: string;
  tagline?: string;
  address?: string;
  phone?: string;
  email?: string;
  panNo?: string;
}

export interface TenantInfo {
  id: string;
  displayName: string;
  branding: TenantBranding;
  features: Record<string, boolean>;
}

interface TenantState {
  tenantId: string | null;
  tenant: TenantInfo | null;
  setTenant: (tenantId: string, tenant: TenantInfo) => void;
  clearTenant: () => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      tenantId: null,
      tenant: null,
      setTenant: (tenantId, tenant) => set({ tenantId, tenant }),
      clearTenant: () => set({ tenantId: null, tenant: null }),
    }),
    { name: 'tenant-storage' }
  )
);
