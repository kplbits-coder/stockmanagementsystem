'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useTenantStore } from '@/store/tenant.store';

export default function Home() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { tenantId } = useTenantStore();

  useEffect(() => {
    if (!tenantId) {
      router.replace('/select-tenant');
    } else if (token) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [token, tenantId, router]);

  return null;
}
