'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowRightLeft, Calendar } from 'lucide-react';
import { refrigeratorApi } from '@/lib/api';
import { useTenantStore } from '@/store/tenant.store';
import { formatDate } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function AssignmentsPage() {
  const { tenant } = useTenantStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['refrigerator-assignments', { status: statusFilter, page }],
    queryFn: () => refrigeratorApi.getAssignments({ status: statusFilter, page, limit: 20 }),
    enabled: !!tenant?.features?.refrigeratorTracking,
  });

  if (!tenant?.features?.refrigeratorTracking) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">This feature is not available for your organization.</p>
      </div>
    );
  }

  const assignments = data?.data || [];
  const pagination = data?.pagination;

  const statusBadge: Record<string, string> = {
    ACTIVE: 'badge-green',
    RETURNED: 'badge-blue',
    TRANSFERRED: 'badge-yellow',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignment History</h1>
          <p className="text-gray-500 text-sm">Track all refrigerator assignments, transfers, and returns</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            className="input-field w-auto"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="RETURNED">Returned</option>
            <option value="TRANSFERRED">Transferred</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner />
      ) : assignments.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-400">
          <ArrowRightLeft className="w-12 h-12 mb-3" />
          <p className="font-medium">No assignments found</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Refrigerator</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Shop</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Assigned Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Returned Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {assignments.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.refrigerator?.code}</p>
                      <p className="text-xs text-gray-400">{item.refrigerator?.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{item.shop?.name}</p>
                      <p className="text-xs text-gray-400">{item.shop?.code}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(item.assignedDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {item.returnedDate ? formatDate(item.returnedDate) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={statusBadge[item.status] || 'badge-gray'}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                      {item.remarks || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <p className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary text-xs disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= pagination.totalPages}
                  className="btn-secondary text-xs disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
