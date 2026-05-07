'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { productApi, subCategoryApi } from '@/lib/api';

interface Props {
  product?: any;
  categories: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProductModal({ product, categories, onClose, onSuccess }: Props) {
  const isEdit = !!product;
  const [selectedCategoryId, setSelectedCategoryId] = useState(product?.categoryId || '');

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: '', description: '', sku: '', barcode: '',
      categoryId: '', subCategoryId: '', price: '', costPrice: '',
      quantity: '0', minQuantity: '10', unit: 'pcs', taxRate: '0',
    },
  });

  const watchedCategoryId = watch('categoryId');

  // Fetch subcategories for the selected category
  const { data: subCatData } = useQuery({
    queryKey: ['subcategories', watchedCategoryId],
    queryFn: () => subCategoryApi.getAll({ categoryId: watchedCategoryId }),
    enabled: !!watchedCategoryId,
  });
  const subCategories = subCatData?.data || [];

  // When category changes, clear subcategory selection
  useEffect(() => {
    if (watchedCategoryId !== selectedCategoryId) {
      setValue('subCategoryId', '');
      setSelectedCategoryId(watchedCategoryId);
    }
  }, [watchedCategoryId, selectedCategoryId, setValue]);

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description || '',
        sku: product.sku,
        barcode: product.barcode || '',
        categoryId: product.categoryId,
        subCategoryId: product.subCategoryId || '',
        price: String(product.price),
        costPrice: String(product.costPrice),
        quantity: String(product.quantity),
        minQuantity: String(product.minQuantity),
        unit: product.unit,
        taxRate: String(product.taxRate),
      });
      setSelectedCategoryId(product.categoryId);
    }
  }, [product, reset]);

  const mutation = useMutation({
    mutationFn: isEdit
      ? (data: any) => productApi.update({ id: product.id, ...data })
      : productApi.create,
    onSuccess: () => {
      toast.success(isEdit ? 'Product updated' : 'Product created');
      onSuccess();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const onSubmit = (data: any) => {
    // Send null if no subcategory selected so backend can clear it
    mutation.mutate({
      ...data,
      subCategoryId: data.subCategoryId || null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Product Name */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input className="input-field" {...register('name', { required: 'Required' })} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea className="input-field" rows={2} {...register('description')} />
            </div>

            {/* SKU */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SKU <span className="text-red-500">*</span>
              </label>
              <input className="input-field" {...register('sku', { required: 'Required' })} />
              {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku.message}</p>}
            </div>

            {/* Barcode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
              <input className="input-field" {...register('barcode')} />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                className="input-field"
                {...register('categoryId', { required: 'Required' })}
              >
                <option value="">Select category</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>
              )}
            </div>

            {/* SubCategory — optional, filtered by selected category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sub-Category
                <span className="ml-1 text-xs text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                className="input-field"
                disabled={!watchedCategoryId}
                {...register('subCategoryId')}
              >
                <option value="">
                  {watchedCategoryId
                    ? subCategories.length === 0
                      ? 'No sub-categories for this category'
                      : 'Select sub-category (optional)'
                    : 'Select a category first'}
                </option>
                {subCategories.map((sub: any) => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
              {watchedCategoryId && subCategories.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Add sub-categories from the Categories page.
                </p>
              )}
            </div>

            {/* Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <input
                className="input-field"
                placeholder="pcs, kg, liters..."
                {...register('unit')}
              />
            </div>

            {/* Selling Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selling Price ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number" step="0.01" min="0" className="input-field"
                {...register('price', { required: 'Required', min: { value: 0, message: 'Must be ≥ 0' } })}
              />
              {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
            </div>

            {/* Cost Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost Price ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number" step="0.01" min="0" className="input-field"
                {...register('costPrice', { required: 'Required', min: { value: 0, message: 'Must be ≥ 0' } })}
              />
              {errors.costPrice && <p className="text-red-500 text-xs mt-1">{errors.costPrice.message}</p>}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number" min="0" className="input-field"
                {...register('quantity', { required: 'Required', min: { value: 0, message: 'Must be ≥ 0' } })}
              />
              {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message}</p>}
            </div>

            {/* Min Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Quantity (Alert)
              </label>
              <input type="number" min="0" className="input-field" {...register('minQuantity')} />
            </div>

            {/* Tax Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
              <input
                type="number" step="0.01" min="0" max="100"
                className="input-field" {...register('taxRate')}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
