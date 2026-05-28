'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package2, ArrowRight, Loader2 } from 'lucide-react';
import { tenantApi } from '@/lib/api';
import { useTenantStore, TenantInfo } from '@/store/tenant.store';
import { useAuthStore } from '@/store/auth.store';

export default function SelectTenantPage() {
  const router = useRouter();
  const { setTenant, tenantId } = useTenantStore();
  const { token } = useAuthStore();
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If already has tenant + token, go to dashboard
    if (tenantId && token) {
      router.replace('/dashboard');
      return;
    }
    // If has tenant but no token, go to login
    if (tenantId && !token) {
      router.replace('/login');
      return;
    }

    // Fetch available tenants
    tenantApi.getAll().then((res) => {
      setTenants(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [tenantId, token, router]);

  const handleSelect = (tenant: TenantInfo) => {
    setTenant(tenant.id, tenant);
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <Package2 className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-white">Stock Manager</h1>
          <p className="text-gray-400 mt-2">Select your organization to continue</p>
        </div>

        {/* Tenant Cards */}
        <div className="space-y-4">
          {tenants.map((tenant) => (
            <button
              key={tenant.id}
              onClick={() => handleSelect(tenant)}
              className="w-full bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] group text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: tenant.branding.primaryColor }}
                  >
                    {tenant.displayName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {tenant.displayName}
                    </h2>
                    {tenant.branding.tagline && (
                      <p className="text-sm text-gray-500">{tenant.branding.tagline}</p>
                    )}
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-gray-600 transition-colors" />
              </div>
            </button>
          ))}
        </div>

        {tenants.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <p>No organizations configured.</p>
            <p className="text-sm mt-1">Contact your administrator.</p>
          </div>
        )}
      </div>
    </div>
  );
}
