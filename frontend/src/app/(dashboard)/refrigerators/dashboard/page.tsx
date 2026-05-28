'use client';
import { useQuery } from '@tanstack/react-query';
import { Thermometer, Store, CheckCircle, AlertTriangle, XCircle, Activity } from 'lucide-react';
import Link from 'next/link';
import { refrigeratorApi } from '@/lib/api';
import { useTenantStore } from '@/store/tenant.store';
import { formatDate } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function RefrigeratorDashboardPage() {
  const { tenant } = useTenantStore();

  const { data, isLoading } = useQuery({
    queryKey: ['refrigerator-dashboard'],
    queryFn: refrigeratorApi.getDashboard,
    enabled: !!tenant?.features?.refrigeratorTracking,
  });

  if (!tenant?.features?.refrigeratorTracking) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">This feature is not available for your organization.</p>
      </div>
    );
  }

  if (isLoading) return <LoadingSpinner />;

  const stats = data?.data?.stats || {};
  const shopWise = data?.data?.shopWise || [];
  const recentLogs = data?.data?.recentLogs || [];

  const statCards = [
    { label: 'Total Refrigerators', value: stats.total || 0, icon: Thermometer, color: 'bg-gray-100 text-gray-600' },
    { label: 'Assigned', value: stats.assigned || 0, icon: Store, color: 'bg-blue-100 text-blue-600' },
    { label: 'Available', value: stats.available || 0, icon: CheckCircle, color: 'bg-green-100 text-green-600' },
    { label: 'Under Maintenance', value: stats.maintenance || 0, icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-600' },
    { label: 'Inactive', value: stats.inactive || 0, icon: XCircle, color: 'bg-red-100 text-red-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Refrigerator Dashboard</h1>
          <p className="text-gray-500 text-sm">Overview of refrigerator tracking and assignments</p>
        </div>
        <div className="flex gap-2">
          <Link href="/refrigerators" className="btn-secondary text-sm">
            All Refrigerators
          </Link>
          <Link href="/refrigerators/reports" className="btn-primary text-sm">
            Reports
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="card p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shop-wise Distribution */}
        <div className="card">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-900">Shop-wise Distribution</h2>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {shopWise.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400">
                <Store className="w-8 h-8 mx-auto mb-2" />
                <p>No shops configured yet</p>
              </div>
            ) : (
              shopWise.map((shop: any) => (
                <div key={shop.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{shop.name}</p>
                    <p className="text-xs text-gray-400">{shop.region || shop.code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary-600">{shop.refrigeratorCount}</span>
                    <span className="text-xs text-gray-400">units</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {recentLogs.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400">
                <Activity className="w-8 h-8 mx-auto mb-2" />
                <p>No activity yet</p>
              </div>
            ) : (
              recentLogs.map((log: any) => (
                <div key={log.id} className="px-5 py-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {log.refrigerator?.code}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        log.action === 'ASSIGNED' ? 'bg-blue-100 text-blue-700' :
                        log.action === 'RETURNED' ? 'bg-green-100 text-green-700' :
                        log.action === 'TRANSFERRED' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {log.action}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(log.createdAt)}</span>
                  </div>
                  {log.remarks && (
                    <p className="text-xs text-gray-500 mt-1">{log.remarks}</p>
                  )}
                  {log.performedBy && (
                    <p className="text-xs text-gray-400 mt-0.5">by {log.performedBy}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
