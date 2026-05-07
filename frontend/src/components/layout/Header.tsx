'use client';
import { Bell, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { productApi } from '@/lib/api';
import { usePathname } from 'next/navigation';

const pageTitles: Record<string, string> = {
  '/dashboard':   'Dashboard',
  '/inventory':   'Inventory Management',
  '/categories':  'Category Management',
  '/sales':       'Sales Management',
  '/reports':     'Reports & Analytics',
  '/users':       'User Management',
};

export default function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || 'Stock Manager';

  const { data } = useQuery({
    queryKey: ['low-stock-count'],
    queryFn: productApi.getLowStock,
    refetchInterval: 60000,
  });

  const alertCount = data?.data?.length || 0;

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Low stock bell */}
        <div className="relative">
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
