'use client';
import { useQuery } from '@tanstack/react-query';
import {
  Package, ShoppingCart, TrendingUp, AlertTriangle,
  DollarSign, BarChart2, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { dashboardApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import SalesChart from '@/components/dashboard/SalesChart';
import RecentSales from '@/components/dashboard/RecentSales';
import LowStockAlert from '@/components/dashboard/LowStockAlert';
import TopProducts from '@/components/dashboard/TopProducts';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.getStats,
    refetchInterval: 30000,
  });

  if (isLoading) return <LoadingSpinner />;

  const stats = data?.data;

  const statCards = [
    {
      title: "Today's Revenue",
      value: formatCurrency(stats?.sales.today.revenue || 0),
      sub: `${stats?.sales.today.orders || 0} orders`,
      icon: DollarSign,
      color: 'bg-green-500',
      trend: null,
      up: true,
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(stats?.sales.monthly.revenue || 0),
      sub: `${stats?.sales.monthly.orders || 0} orders`,
      icon: TrendingUp,
      color: 'bg-blue-500',
      trend: null,
      up: true,
    },
    {
      title: 'Total Products',
      value: stats?.inventory.total || 0,
      sub: `${stats?.inventory.inStock || 0} in stock`,
      icon: Package,
      color: 'bg-purple-500',
      trend: null,
      up: true,
    },
    {
      title: 'Low Stock Alerts',
      value: (stats?.inventory.lowStock || 0) + (stats?.inventory.outOfStock || 0),
      sub: `${stats?.inventory.outOfStock || 0} out of stock`,
      icon: AlertTriangle,
      color: 'bg-orange-500',
      trend: null,
      up: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card) => (
          <div key={card.title} className="card flex items-start gap-4">
            <div className={`${card.color} p-3 rounded-xl`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{card.value}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-gray-400">{card.sub}</span>
                {card.trend && (
                  <span className={`text-xs font-medium flex items-center ${card.up ? 'text-green-600' : 'text-red-600'}`}>
                    {card.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {card.trend}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary-600" />
              Sales Trend (Last 7 Days)
            </h2>
          </div>
          <SalesChart data={stats?.salesTrend || []} />
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <ShoppingCart className="w-4 h-4 text-primary-600" />
            Top Products
          </h2>
          <TopProducts products={stats?.topProducts || []} />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Sales</h2>
          <RecentSales sales={stats?.recentSales || []} />
        </div>
        <div className="card">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Low Stock Alerts
          </h2>
          <LowStockAlert products={stats?.lowStockProducts || []} />
        </div>
      </div>
    </div>
  );
}
