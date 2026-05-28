'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useTenantStore } from '@/store/tenant.store';
import { tenantApi } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token } = useAuthStore();
  const { tenantId, setTenant } = useTenantStore();

  useEffect(() => {
    if (!tenantId) {
      router.replace('/select-tenant');
    } else if (!token) {
      router.replace('/login');
    }
  }, [token, tenantId, router]);

  // Refresh tenant config from server on every dashboard load
  // This ensures branding changes (like panNo) are picked up without re-selecting
  useEffect(() => {
    if (tenantId && token) {
      tenantApi.getConfig().then((res) => {
        if (res?.data) {
          setTenant(res.data.id, res.data);
        }
      }).catch(() => {});
    }
  }, [tenantId, token, setTenant]);

  if (!token || !tenantId) return null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
