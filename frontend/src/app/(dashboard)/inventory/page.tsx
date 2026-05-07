'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, Package, RefreshCw, History, Tag, Barcode, FileDown } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { productApi, categoryApi } from '@/lib/api';
import { formatCurrency, getStatusBadge } from '@/lib/utils';
import { exportInventoryCSV, exportInventoryPDF } from '@/lib/export';
import { useAuthStore } from '@/store/auth.store';
import ProductModal from '@/components/inventory/ProductModal';
import StockMovementModal from '@/components/inventory/StockMovementModal';
import BarcodeModal from '@/components/inventory/BarcodeModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Pagination from '@/components/ui/Pagination';

export default function InventoryPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  // Pre-fill filters from URL params (e.g. coming from Categories page)
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('categoryId') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [movementProduct, setMovementProduct] = useState<any>(null);
  const [barcodeProduct, setBarcodeProduct] = useState<any>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportCSV = () => {
    if (!products.length) { toast.error('No data to export'); return; }
    exportInventoryCSV(products);
    toast.success('CSV exported');
  };

  const handleExportPDF = async () => {
    if (!products.length) { toast.error('No data to export'); return; }
    setExporting(true);
    try {
      await exportInventoryPDF(products);
      toast.success('PDF exported');
    } finally {
      setExporting(false);
    }
  };

  // Sync URL params when they change (e.g. browser back/forward)
  useEffect(() => {
    const catId = searchParams.get('categoryId') || '';
    const status = searchParams.get('status') || '';
    setCategoryFilter(catId);
    setStatusFilter(status);
    setPage(1);
  }, [searchParams]);

  const canManage = user?.role === 'ADMIN' || user?.role === 'INVENTORY_MANAGER';

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['products', search, categoryFilter, statusFilter, page],
    queryFn: () =>
      productApi.getAll({ search, categoryId: categoryFilter, status: statusFilter, page, limit: 15 }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: productApi.delete,
    onSuccess: () => {
      toast.success('Product deactivated');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteId(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete'),
  });

  const products = data?.data || [];
  const pagination = data?.pagination;
  const categories = categoriesData?.data || [];

  // Active category name for breadcrumb
  const activeCategoryName = categories.find((c: any) => c.id === categoryFilter)?.name;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 text-sm">
            {activeCategoryName
              ? <>Filtered by category: <span className="font-medium text-primary-600">{activeCategoryName}</span></>
              : 'Manage your product stock'}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Shortcut to Categories */}
          {canManage && (
            <Link href="/categories" className="btn-secondary flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Categories
            </Link>
          )}
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          {/* Export dropdown */}
          <div className="relative group">
            <button
              disabled={exporting}
              className="btn-secondary flex items-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              Export
            </button>
            <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20 hidden group-hover:block">
              <button
                onClick={handleExportCSV}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
              >
                Export CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
              >
                Export PDF
              </button>
            </div>
          </div>
          {canManage && (
            <button
              onClick={() => { setEditProduct(null); setShowModal(true); }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, SKU, or barcode..."
              className="input-field pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="input-field sm:w-48"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Categories</option>
            {categories.map((cat: any) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            className="input-field sm:w-40"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Status</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
          {/* Clear filters */}
          {(categoryFilter || statusFilter || search) && (
            <button
              onClick={() => { setSearch(''); setCategoryFilter(''); setStatusFilter(''); setPage(1); }}
              className="btn-secondary text-sm px-3"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <LoadingSpinner />
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Package className="w-12 h-12 mb-3" />
            <p className="font-medium">No products found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
            {canManage && (
              <button
                onClick={() => { setEditProduct(null); setShowModal(true); }}
                className="btn-primary mt-4 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">SKU</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Price</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Quantity</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  {canManage && (
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                  )}
                  <th className="text-center px-4 py-3 font-medium text-gray-600">History</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Barcode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product: any) => {
                  const badge = getStatusBadge(product.status);
                  return (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          {product.barcode && (
                            <p className="text-xs text-gray-400">{product.barcode}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{product.sku}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={'/categories'}
                          className="text-gray-600 hover:text-primary-600 hover:underline text-sm"
                        >
                          {product.category?.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(product.price)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={product.quantity <= product.minQuantity ? 'text-red-600 font-medium' : ''}>
                          {product.quantity} {product.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={badge.class}>{badge.label}</span>
                      </td>
                      {canManage && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => { setEditProduct(product); setShowModal(true); }}
                              className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                              title="Edit product"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {user?.role === 'ADMIN' && (
                              <button
                                onClick={() => setDeleteId(product.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Deactivate product"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setMovementProduct(product)}
                          className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="View stock movement history"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setBarcodeProduct(product)}
                          className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="View / generate barcode"
                        >
                          <Barcode className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200">
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <ProductModal
          product={editProduct}
          categories={categories}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            queryClient.invalidateQueries({ queryKey: ['products'] });
          }}
        />
      )}

      {deleteId && (
        <ConfirmDialog
          title="Deactivate Product"
          message="Are you sure you want to deactivate this product? It will no longer appear in inventory."
          onConfirm={() => deleteMutation.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
          loading={deleteMutation.isPending}
        />
      )}

      {movementProduct && (
        <StockMovementModal
          product={movementProduct}
          onClose={() => setMovementProduct(null)}
        />
      )}

      {barcodeProduct && (
        <BarcodeModal
          product={barcodeProduct}
          onClose={() => setBarcodeProduct(null)}
          onBarcodeGenerated={async (barcode) => {
            try {
              await productApi.update({ id: barcodeProduct.id, barcode });
              queryClient.invalidateQueries({ queryKey: ['products'] });
              setBarcodeProduct(null);
            } catch (err: any) {
              toast.error(err.response?.data?.message || 'Failed to save barcode');
            }
          }}
        />
      )}
    </div>
  );
}
