'use client';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { refrigeratorApi } from '@/lib/api';

interface Props {
  shop?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ShopModal({ shop, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!shop;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      name: shop?.name || '',
      code: shop?.code || '',
      address: shop?.address || '',
      contactPerson: shop?.contactPerson || '',
      phone: shop?.phone || '',
      region: shop?.region || '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEdit ? refrigeratorApi.updateShop({ id: shop.id, ...data }) : refrigeratorApi.createShop(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Shop updated' : 'Shop created');
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      onSuccess();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Operation failed'),
  });

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Shop' : 'Add Shop'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name *</label>
              <input
                {...register('name', { required: 'Name is required' })}
                className="input-field"
                placeholder="Shop name"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message as string}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <input
                {...register('code', { required: 'Code is required' })}
                className="input-field"
                placeholder="SH-001"
              />
              {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message as string}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input {...register('address')} className="input-field" placeholder="Shop address" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
              <input {...register('contactPerson')} className="input-field" placeholder="Contact name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input {...register('phone')} className="input-field" placeholder="Phone number" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
            <input {...register('region')} className="input-field" placeholder="e.g. Kathmandu" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
