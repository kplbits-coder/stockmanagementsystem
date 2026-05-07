'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Tag, Package, Search, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { categoryApi, subCategoryApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import CategoryModal from '@/components/inventory/CategoryModal';
import SubCategoryModal from '@/components/inventory/SubCategoryModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function CategoriesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Category modal state
  const [showCatModal, setShowCatModal] = useState(false);
  const [editCategory, setEditCategory] = useState<any>(null);
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);

  // SubCategory modal state
  const [showSubModal, setShowSubModal] = useState(false);
  const [editSubCategory, setEditSubCategory] = useState<any>(null);
  const [subModalParent, setSubModalParent] = useState<any>(null);
  const [deleteSubId, setDeleteSubId] = useState<string | null>(null);
  const [deleteSubTarget, setDeleteSubTarget] = useState<any>(null);

  const canManage = user?.role === 'ADMIN' || user?.role === 'INVENTORY_MANAGER';
  const canDelete = user?.role === 'ADMIN';

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.getAll,
  });

  const deleteCatMutation = useMutation({
    mutationFn: categoryApi.delete,
    onSuccess: () => {
      toast.success('Category deleted');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeleteCatId(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete'),
  });

  const deleteSubMutation = useMutation({
    mutationFn: subCategoryApi.delete,
    onSuccess: () => {
      toast.success('Sub-category deleted');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      setDeleteSubId(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete'),
  });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['subcategories'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const allCategories: any[] = data?.data || [];
  const categories = allCategories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );
  const deleteCatTarget = allCategories.find((c) => c.id === deleteCatId);

  const totalSubCategories = allCategories.reduce(
    (sum, c) => sum + (c.subCategories?.length || 0), 0
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500 text-sm">
            Manage categories and sub-categories — changes reflect instantly in Inventory
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => { setEditCategory(null); setShowCatModal(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        )}
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search categories..."
            className="input-field pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Categories', value: allCategories.length, color: 'text-gray-900' },
          { label: 'Sub-Categories', value: totalSubCategories, color: 'text-primary-600' },
          {
            label: 'Total Products',
            value: allCategories.reduce((s, c) => s + (c._count?.products || 0), 0),
            color: 'text-gray-900',
          },
          {
            label: 'Empty Categories',
            value: allCategories.filter((c) => c._count?.products === 0).length,
            color: 'text-gray-400',
          },
        ].map((s) => (
          <div key={s.label} className="card py-4">
            <p className={'text-2xl font-bold ' + s.color}>{s.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Category List */}
      {isLoading ? (
        <LoadingSpinner />
      ) : categories.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-400">
          <Tag className="w-12 h-12 mb-3" />
          <p className="font-medium">No categories found</p>
          {canManage && (
            <button
              onClick={() => { setEditCategory(null); setShowCatModal(true); }}
              className="btn-primary mt-4 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add your first category
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((category: any) => {
            const isExpanded = expandedIds.has(category.id);
            const subCats: any[] = category.subCategories || [];

            return (
              <div key={category.id} className="card p-0 overflow-hidden">
                {/* Category Row */}
                <div className="flex items-center gap-3 px-5 py-4 group">
                  {/* Expand toggle */}
                  <button
                    onClick={() => toggleExpand(category.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors flex-shrink-0"
                  >
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4" />
                      : <ChevronRight className="w-4 h-4" />}
                  </button>

                  {/* Icon */}
                  <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <Tag className="w-4 h-4 text-primary-600" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{category.name}</h3>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {category._count?.products || 0} products
                      </span>
                      {subCats.length > 0 && (
                        <span className="text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                          {subCats.length} sub-{subCats.length === 1 ? 'category' : 'categories'}
                        </span>
                      )}
                    </div>
                    {category.description && (
                      <p className="text-sm text-gray-500 truncate mt-0.5">{category.description}</p>
                    )}
                  </div>

                  {/* Stock summary */}
                  {category.stockSummary && (
                    <div className="hidden sm:flex items-center gap-3 text-xs mr-4">
                      <span className="text-green-600 font-medium">{category.stockSummary.inStock} in</span>
                      <span className="text-yellow-600 font-medium">{category.stockSummary.lowStock} low</span>
                      <span className="text-red-600 font-medium">{category.stockSummary.outOfStock} out</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={'/inventory?categoryId=' + category.id}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="View in Inventory"
                    >
                      <Package className="w-4 h-4" />
                    </Link>
                    {canManage && (
                      <>
                        <button
                          onClick={() => {
                            setSubModalParent(category);
                            setEditSubCategory(null);
                            setShowSubModal(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Add sub-category"
                        >
                          <Layers className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEditCategory(category); setShowCatModal(true); }}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit category"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => setDeleteCatId(category.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete category"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* SubCategories — collapsible */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50">
                    {subCats.length === 0 ? (
                      <div className="px-14 py-4 text-sm text-gray-400 flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        No sub-categories yet.
                        {canManage && (
                          <button
                            onClick={() => {
                              setSubModalParent(category);
                              setEditSubCategory(null);
                              setShowSubModal(true);
                            }}
                            className="text-primary-600 hover:underline font-medium"
                          >
                            Add one
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {subCats.map((sub: any) => (
                          <div
                            key={sub.id}
                            className="flex items-center gap-3 px-14 py-3 group/sub hover:bg-white transition-colors"
                          >
                            <div className="w-7 h-7 rounded-md bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                              <Layers className="w-3.5 h-3.5 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-800">{sub.name}</span>
                                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                  {sub._count?.products || 0} products
                                </span>
                              </div>
                              {sub.description && (
                                <p className="text-xs text-gray-400 truncate">{sub.description}</p>
                              )}
                            </div>
                            {canManage && (
                              <div className="flex items-center gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setEditSubCategory({ ...sub, categoryName: category.name });
                                    setSubModalParent(category);
                                    setShowSubModal(true);
                                  }}
                                  className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {canDelete && (
                                  <button
                                    onClick={() => {
                                      setDeleteSubId(sub.id);
                                      setDeleteSubTarget(sub);
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                        {/* Add sub-category inline */}
                        {canManage && (
                          <div className="px-14 py-2">
                            <button
                              onClick={() => {
                                setSubModalParent(category);
                                setEditSubCategory(null);
                                setShowSubModal(true);
                              }}
                              className="text-xs text-primary-600 hover:underline flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              Add sub-category
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Category Modal */}
      {showCatModal && (
        <CategoryModal
          category={editCategory}
          onClose={() => setShowCatModal(false)}
          onSuccess={() => {
            setShowCatModal(false);
            invalidateAll();
          }}
        />
      )}

      {/* SubCategory Modal */}
      {showSubModal && subModalParent && (
        <SubCategoryModal
          subCategory={editSubCategory}
          parentCategory={subModalParent}
          onClose={() => setShowSubModal(false)}
          onSuccess={() => {
            setShowSubModal(false);
            // Auto-expand the parent category
            setExpandedIds((prev) => new Set([...prev, subModalParent.id]));
            invalidateAll();
          }}
        />
      )}

      {/* Delete Category Confirm */}
      {deleteCatId && (
        <ConfirmDialog
          title="Delete Category"
          message={
            deleteCatTarget?._count?.products > 0
              ? `Cannot delete "${deleteCatTarget?.name}" — it has ${deleteCatTarget._count.products} product(s). Reassign or deactivate those products first.`
              : `Are you sure you want to delete "${deleteCatTarget?.name}"? All its sub-categories will also be deleted.`
          }
          onConfirm={() =>
            deleteCatTarget?._count?.products > 0
              ? setDeleteCatId(null)
              : deleteCatMutation.mutate(deleteCatId)
          }
          onCancel={() => setDeleteCatId(null)}
          loading={deleteCatMutation.isPending}
          variant="danger"
        />
      )}

      {/* Delete SubCategory Confirm */}
      {deleteSubId && deleteSubTarget && (
        <ConfirmDialog
          title="Delete Sub-Category"
          message={
            deleteSubTarget._count?.products > 0
              ? `Cannot delete "${deleteSubTarget.name}" — it has ${deleteSubTarget._count.products} product(s). Reassign those products first.`
              : `Are you sure you want to delete "${deleteSubTarget.name}"?`
          }
          onConfirm={() =>
            deleteSubTarget._count?.products > 0
              ? setDeleteSubId(null)
              : deleteSubMutation.mutate(deleteSubId)
          }
          onCancel={() => { setDeleteSubId(null); setDeleteSubTarget(null); }}
          loading={deleteSubMutation.isPending}
          variant="danger"
        />
      )}
    </div>
  );
}
