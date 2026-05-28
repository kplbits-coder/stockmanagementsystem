'use client';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { refrigeratorApi } from '@/lib/api';

interface Props {
  refrigerator?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RefrigeratorModal({ refrigerator, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!refrigerator;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      code: refrigerator?.code || '',
      name: refrigerator?.name || '',
      brand: refrigerator?.brand || '',
      model: refrigerator?.model || '',
      capacity: refrigerator?.capacity || '',
      serialNumber: refrigerator?.serialNumber || '',
      purchaseDate: refrigerator?.purchaseDate ? new Date(refrigerator.purchaseDate).toISOString().split('T')[0] : '',
      status: refrigerator?.status || 'AVAILABLE',
      remarks: refrigerator?.remarks || '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEdit ? refrigeratorApi.update({ id: refrigerator.id, ...data }) : refrigeratorApi.create(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Refrigerator updated' : 'Refrigerator created');
      queryClient.invalidateQueries({ queryKey: ['refrigerators'] });
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
            {isEdit ? 'Edit Refrigerator' : 'Add Refrigerator'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <input
                {...register('code', { required: 'Code is required' })}
                className="input-field"
                placeholder="RF-001"
              />
              {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message as string}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                {...register('name', { required: 'Name is required' })}
                className="input-field"
                placeholder="Refrigerator name"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message as string}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input {...register('brand')} className="input-field" placeholder="e.g. Samsung" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input {...register('model')} className="input-field" placeholder="e.g. RT-200" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
              <input {...register('capacity')} className="input-field" placeholder="e.g. 200L" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
              <input {...register('serialNumber')} className="input-field" placeholder="Serial number" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
              <input type="date" {...register('purchaseDate')} className="input-field" />
            </div>
            {isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select {...register('status')} className="input-field">
                  <option value="AVAILABLE">Available</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <textarea {...register('remarks')} className="input-field" rows={2} placeholder="Optional notes..." />
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
