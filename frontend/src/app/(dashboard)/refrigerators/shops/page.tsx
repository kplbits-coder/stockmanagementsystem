'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Search, Store, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { refrigeratorApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useTenantStore } from '@/store/tenant.store';
import ShopModal from '@/components/refrigerators/ShopModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ShopsPage() {
  const { user } = useAuthStore();
  const { tenant } = useTenantStore();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canManage = user?.role === 'ADMIN' || user?.role === 'INVENTORY_MANAGER';

  const { data, isLoading } = useQuery({
    queryKey: ['shops', { search }],
    queryFn: () => refrigeratorApi.getShops({ search }),
    enabled: !!tenant?.features?.refrigeratorTracking,
  });

  const deleteMutation = useMutation({
    mutationFn: refrigeratorApi.deleteShop,
    onSuccess: () => {
      toast.success('Shop deactivated');
      queryClient.invalidateQueries({ queryKey: ['shops'] });
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

  const shops = data?.data || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shops</h1>
          <p className="text-gray-500 text-sm">Manage shops for refrigerator assignments</p>
        </div>
        {canManage && (
          <button
            onClick={() => { setEditItem(null); setShowModal(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Shop
          </button>
        )}
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search shops..."
            className="input-field pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <LoadingSpinner />
      ) : shops.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-400">
          <Store className="w-12 h-12 mb-3" />
          <p className="font-medium">No shops found</p>
          {canManage && (
            <button
              onClick={() => { setEditItem(null); setShowModal(true); }}
              className="btn-primary mt-4 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add your first shop
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map((shop: any) => (
            <div key={shop.id} className="card p-5 group hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                    <Store className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{shop.name}</h3>
                    <p className="text-xs text-gray-400">{shop.code}</p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditItem(shop); setShowModal(true); }}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {user?.role === 'ADMIN' && (
                      <button
                        onClick={() => setDeleteId(shop.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2 text-sm">
                {shop.address && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{shop.address}</span>
                  </div>
                )}
                {shop.region && (
                  <p className="text-gray-500">Region: <span className="text-gray-700">{shop.region}</span></p>
                )}
                {shop.contactPerson && (
                  <p className="text-gray-500">Contact: <span className="text-gray-700">{shop.contactPerson}</span></p>
                )}
                {shop.phone && (
                  <p className="text-gray-500">Phone: <span className="text-gray-700">{shop.phone}</span></p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t flex items-center justify-between">
                <span className="text-xs text-gray-400">Active Refrigerators</span>
                <span className="text-sm font-bold text-primary-600">{shop.activeRefrigerators || 0}</span>
              </div>

              {!shop.isActive && (
                <div className="mt-2">
                  <span className="badge-red">Inactive</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <ShopModal
          shop={editItem}
          onClose={() => setShowModal(false)}
          onSuccess={() => setShowModal(false)}
        />
      )}

      {deleteId && (
        <ConfirmDialog
          title="Deactivate Shop"
          message="Are you sure you want to deactivate this shop? Active refrigerator assignments must be returned first."
          onConfirm={() => deleteMutation.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
          loading={deleteMutation.isPending}
          variant="danger"
        />
      )}
    </div>
  );
}
