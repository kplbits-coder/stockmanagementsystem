'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { X, Loader2, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { subCategoryApi } from '@/lib/api';

interface Props {
  subCategory?: any;       // present when editing
  parentCategory: any;     // always required — the parent category
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  description: string;
}

export default function SubCategoryModal({ subCategory, parentCategory, onClose, onSuccess }: Props) {
  const isEdit = !!subCategory;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (subCategory) {
      reset({ name: subCategory.name, description: subCategory.description || '' });
    }
  }, [subCategory, reset]);

  const mutation = useMutation({
    mutationFn: isEdit
      ? (data: FormData) => subCategoryApi.update({ id: subCategory.id, ...data })
      : (data: FormData) =>
          subCategoryApi.create({ ...data, categoryId: parentCategory.id }),
    onSuccess: () => {
      toast.success(isEdit ? 'Sub-category updated' : 'Sub-category created');
      onSuccess();
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEdit ? 'Edit Sub-Category' : 'Add Sub-Category'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <Layers className="w-3 h-3" />
              Under: <span className="font-medium text-primary-600">{parentCategory.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sub-Category Name <span className="text-red-500">*</span>
            </label>
            <input
              className="input-field"
              placeholder="e.g. Laptops, T-Shirts, Soft Drinks..."
              {...register('name', { required: 'Sub-category name is required' })}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
              <span className="ml-1 text-xs text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Optional description..."
              {...register('description')}
            />
          </div>

          <div className="flex gap-3 pt-2 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Update' : 'Add Sub-Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
