'use client';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { refrigeratorApi } from '@/lib/api';

type Mode = 'assign' | 'transfer' | 'return';

interface Props {
  mode: Mode;
  refrigerator: any;
  currentShop?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignModal({ mode, refrigerator, currentShop, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      shopId: '',
      newShopId: '',
      remarks: '',
    },
  });

  const { data: shopsData } = useQuery({
    queryKey: ['shops'],
    queryFn: () => refrigeratorApi.getShops({ limit: '200' }),
    enabled: mode !== 'return',
  });

  const shops = shopsData?.data || [];

  const assignMutation = useMutation({
    mutationFn: refrigeratorApi.assign,
    onSuccess: () => {
      toast.success('Refrigerator assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['refrigerators'] });
      queryClient.invalidateQueries({ queryKey: ['refrigerator-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['refrigerator-dashboard'] });
      onSuccess();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Assignment failed'),
  });

  const transferMutation = useMutation({
    mutationFn: refrigeratorApi.transfer,
    onSuccess: () => {
      toast.success('Refrigerator transferred successfully');
      queryClient.invalidateQueries({ queryKey: ['refrigerators'] });
      queryClient.invalidateQueries({ queryKey: ['refrigerator-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['refrigerator-dashboard'] });
      onSuccess();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Transfer failed'),
  });

  const returnMutation = useMutation({
    mutationFn: refrigeratorApi.return,
    onSuccess: () => {
      toast.success('Refrigerator returned successfully');
      queryClient.invalidateQueries({ queryKey: ['refrigerators'] });
      queryClient.invalidateQueries({ queryKey: ['refrigerator-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['refrigerator-dashboard'] });
      onSuccess();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Return failed'),
  });

  const onSubmit = (data: any) => {
    if (mode === 'assign') {
      assignMutation.mutate({
        refrigeratorId: refrigerator.id,
        shopId: data.shopId,
        remarks: data.remarks || undefined,
      });
    } else if (mode === 'transfer') {
      transferMutation.mutate({
        refrigeratorId: refrigerator.id,
        newShopId: data.newShopId,
        remarks: data.remarks || undefined,
      });
    } else {
      returnMutation.mutate({
        refrigeratorId: refrigerator.id,
        remarks: data.remarks || undefined,
      });
    }
  };

  const title = mode === 'assign' ? 'Assign Refrigerator' : mode === 'transfer' ? 'Transfer Refrigerator' : 'Return Refrigerator';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Refrigerator info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500">Refrigerator</p>
            <p className="font-medium text-gray-900">{refrigerator.code} — {refrigerator.name}</p>
            {currentShop && (
              <p className="text-sm text-gray-500 mt-1">Currently at: <span className="font-medium text-gray-700">{currentShop.name}</span></p>
            )}
          </div>

          {/* Shop selection for assign/transfer */}
          {mode === 'assign' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Shop *</label>
              <select
                {...register('shopId', { required: 'Please select a shop' })}
                className="input-field"
              >
                <option value="">Select a shop...</option>
                {shops.map((shop: any) => (
                  <option key={shop.id} value={shop.id}>{shop.name} ({shop.code})</option>
                ))}
              </select>
              {errors.shopId && <p className="text-red-500 text-xs mt-1">{errors.shopId.message as string}</p>}
            </div>
          )}

          {mode === 'transfer' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transfer to Shop *</label>
              <select
                {...register('newShopId', { required: 'Please select a shop' })}
                className="input-field"
              >
                <option value="">Select a shop...</option>
                {shops
                  .filter((shop: any) => shop.id !== currentShop?.id)
                  .map((shop: any) => (
                    <option key={shop.id} value={shop.id}>{shop.name} ({shop.code})</option>
                  ))}
              </select>
              {errors.newShopId && <p className="text-red-500 text-xs mt-1">{errors.newShopId.message as string}</p>}
            </div>
          )}

          {mode === 'return' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                This will return the refrigerator from <strong>{currentShop?.name}</strong> and mark it as available.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <textarea {...register('remarks')} className="input-field" rows={2} placeholder="Optional notes..." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Processing...' : mode === 'assign' ? 'Assign' : mode === 'transfer' ? 'Transfer' : 'Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
