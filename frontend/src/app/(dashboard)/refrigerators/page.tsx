'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Search, Thermometer, ArrowRightLeft, RotateCcw, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { refrigeratorApi } from '@/lib/api';
import { formatDateShort } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useTenantStore } from '@/store/tenant.store';
import RefrigeratorModal from '@/components/refrigerators/RefrigeratorModal';
import AssignModal from '@/components/refrigerators/AssignModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const statusBadge: Record<string, { class: string; label: string }> = {
  AVAILABLE: { class: 'badge-green', label: 'Available' },
  ASSIGNED: { class: 'badge-blue', label: 'Assigned' },
  UNDER_MAINTENANCE: { class: 'badge-yellow', label: 'Maintenance' },
  INACTIVE: { class: 'badge-red', label: 'Inactive' },
};

export default function RefrigeratorsPage() {
  const { user } = useAuthStore();
  const { tenant } = useTenantStore();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [assignModal, setAssignModal] = useState<{ mode: 'assign' | 'transfer' | 'return'; refrigerator: any; currentShop?: any } | null>(null);

  const canManage = user?.role === 'ADMIN' || user?.role === 'INVENTORY_MANAGER';

  const { data, isLoading } = useQuery({
    queryKey: ['refrigerators', { search, status: statusFilter, page }],
    queryFn: () => refrigeratorApi.getAll({ search, status: statusFilter, page, limit: 20 }),
    enabled: !!tenant?.features?.refrigeratorTracking,
  });

  const deleteMutation = useMutation({
    mutationFn: refrigeratorApi.delete,
    onSuccess: () => {
      toast.success('Refrigerator deactivated');
      queryClient.invalidateQueries({ queryKey: ['refrigerators'] });
      setDeleteId(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete'),
  });

  if (!tenant?.features?.refrigeratorTracking) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">This feature is not available for your organization.</p>
      </div>
    );
  }

  const refrigerators = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Refrigerators</h1>
          <p className="text-gray-500 text-sm">Manage and track all refrigerators</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/refrigerators/dashboard" className="btn-secondary text-sm">
            Dashboard
          </Link>
          <Link href="/refrigerators/shops" className="btn-secondary text-sm">
            Shops
          </Link>
          <Link href="/refrigerators/assignments" className="btn-secondary text-sm">
            Assignments
          </Link>
          {canManage && (
            <button
              onClick={() => { setEditItem(null); setShowModal(true); }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Refrigerator
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by code, name, brand..."
              className="input-field pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="input-field w-auto"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="UNDER_MAINTENANCE">Under Maintenance</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner />
      ) : refrigerators.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-400">
          <Thermometer className="w-12 h-12 mb-3" />
          <p className="font-medium">No refrigerators found</p>
          {canManage && (
            <button
              onClick={() => { setEditItem(null); setShowModal(true); }}
              className="btn-primary mt-4 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add your first refrigerator
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Brand/Model</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Current Shop</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Purchase Date</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {refrigerators.map((item: any) => {
                  const badge = statusBadge[item.status] || { class: 'badge-gray', label: item.status };
                  const activeAssignment = item.assignments?.[0];
                  const currentShop = activeAssignment?.shop;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{item.code}</td>
                      <td className="px-4 py-3 text-gray-700">{item.name}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {[item.brand, item.model].filter(Boolean).join(' / ') || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={badge.class}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {currentShop ? currentShop.name : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {item.purchaseDate ? formatDateShort(item.purchaseDate) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {canManage && item.status === 'AVAILABLE' && (
                            <button
                              onClick={() => setAssignModal({ mode: 'assign', refrigerator: item })}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                              title="Assign to shop"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          {canManage && item.status === 'ASSIGNED' && (
                            <>
                              <button
                                onClick={() => setAssignModal({ mode: 'transfer', refrigerator: item, currentShop })}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="Transfer"
                              >
                                <ArrowRightLeft className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setAssignModal({ mode: 'return', refrigerator: item, currentShop })}
                                className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg"
                                title="Return"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {canManage && (
                            <button
                              onClick={() => { setEditItem(item); setShowModal(true); }}
                              className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {user?.role === 'ADMIN' && (
                            <button
                              onClick={() => setDeleteId(item.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              title="Deactivate"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      {/* Modals */}
      {showModal && (
        <RefrigeratorModal
          refrigerator={editItem}
          onClose={() => setShowModal(false)}
          onSuccess={() => setShowModal(false)}
        />
      )}

      {assignModal && (
        <AssignModal
          mode={assignModal.mode}
          refrigerator={assignModal.refrigerator}
          currentShop={assignModal.currentShop}
          onClose={() => setAssignModal(null)}
          onSuccess={() => setAssignModal(null)}
        />
      )}

      {deleteId && (
        <ConfirmDialog
          title="Deactivate Refrigerator"
          message="Are you sure you want to deactivate this refrigerator? It can be reactivated later."
          onConfirm={() => deleteMutation.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
          loading={deleteMutation.isPending}
          variant="danger"
        />
      )}
    </div>
  );
}
