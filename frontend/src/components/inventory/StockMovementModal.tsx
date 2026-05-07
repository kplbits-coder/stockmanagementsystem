'use client';
import { useQuery } from '@tanstack/react-query';
import { X, ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react';
import { productApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useState } from 'react';

interface Props {
  product: { id: string; name: string; sku: string };
  onClose: () => void;
}

export default function StockMovementModal({ product, onClose }: Props) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['movements', product.id, page],
    queryFn: () => productApi.getMovements(product.id, { page, limit: 15 }),
  });

  const movements = data?.data || [];
  const pagination = data?.pagination;

  const typeConfig: Record<string, { icon: any; label: string; color: string; bg: string }> = {
    IN:         { icon: ArrowUpCircle,   label: 'Stock In',    color: 'text-green-600',  bg: 'bg-green-50' },
    OUT:        { icon: ArrowDownCircle, label: 'Stock Out',   color: 'text-red-600',    bg: 'bg-red-50'   },
    ADJUSTMENT: { icon: RefreshCw,       label: 'Adjustment',  color: 'text-blue-600',   bg: 'bg-blue-50'  },
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Stock Movement History</h2>
            <p className="text-sm text-gray-500">{product.name} · <span className="font-mono">{product.sku}</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <LoadingSpinner />
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <RefreshCw className="w-10 h-10 mb-3" />
              <p className="font-medium">No movement history</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Qty</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Before</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">After</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movements.map((m: any) => {
                  const cfg = typeConfig[m.type] || typeConfig.ADJUSTMENT;
                  const Icon = cfg.icon;
                  return (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${cfg.color} ${cfg.bg}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${
                        m.type === 'IN' ? 'text-green-600' : m.type === 'OUT' ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {m.type === 'OUT' ? '-' : '+'}{m.quantity}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{m.previousQty}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{m.newQty}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{m.reason || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(m.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.total > 15 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm">
            <span className="text-gray-500">{pagination.total} total movements</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary px-3 py-1 text-xs disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={movements.length < 15}
                className="btn-secondary px-3 py-1 text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
