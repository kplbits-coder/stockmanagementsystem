'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingCart, BarChart2,
  Users, LogOut, Package2, Tag, Thermometer,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useTenantStore } from '@/store/tenant.store';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard',   label: 'Dashboard',  icon: LayoutDashboard, roles: ['ADMIN', 'CASHIER', 'INVENTORY_MANAGER'] },
  { href: '/inventory',   label: 'Inventory',  icon: Package,         roles: ['ADMIN', 'CASHIER', 'INVENTORY_MANAGER'] },
  { href: '/categories',  label: 'Categories', icon: Tag,             roles: ['ADMIN', 'INVENTORY_MANAGER'] },
  { href: '/sales',       label: 'Sales',      icon: ShoppingCart,    roles: ['ADMIN', 'CASHIER'] },
  { href: '/reports',     label: 'Reports',    icon: BarChart2,       roles: ['ADMIN', 'INVENTORY_MANAGER'] },
  { href: '/refrigerators', label: 'Refrigerators', icon: Thermometer, roles: ['ADMIN', 'INVENTORY_MANAGER'], feature: 'refrigeratorTracking' },
  { href: '/users',       label: 'Users',      icon: Users,           roles: ['ADMIN'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { tenant, clearTenant } = useTenantStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleSwitchTenant = () => {
    logout();
    clearTenant();
    router.push('/select-tenant');
  };

  const filteredNav = navItems.filter((item) => {
    if (!item.roles.includes(user?.role || '')) return false;
    if ((item as any).feature && !tenant?.features?.[(item as any).feature]) return false;
    return true;
  });

  return (
    <aside className="w-64 bg-gray-900 flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: tenant?.branding?.primaryColor || '#2563eb' }}
        >
          <Package2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm">{tenant?.branding?.companyName || 'Stock Manager'}</p>
          <p className="text-gray-400 text-xs">{tenant?.displayName || 'v1.0.0'}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-gray-400 text-xs truncate">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
        <button
          onClick={handleSwitchTenant}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors mt-1"
        >
          Switch organization
        </button>
      </div>
    </aside>
  );
}
