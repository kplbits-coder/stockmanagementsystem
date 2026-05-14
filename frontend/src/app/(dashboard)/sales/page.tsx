'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Download, Eye, XCircle, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { saleApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportSalesCSV, exportSalesPDF } from '@/lib/export';
import { useAuthStore } from '@/store/auth.store';
import NewSaleModal from '@/components/sales/NewSaleModal';
import SaleDetailModal from '@/components/sales/SaleDetailModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Pagination from '@/components/ui/Pagination';

export default function SalesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewSale, setShowNewSale] = useState(false);
  const [viewSale, setViewSale] = useState<any>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['sales', page, statusFilter],
    queryFn: () => saleApi.getAll({ page, limit: 15, status: statusFilter }),
  });

  // Fetch ALL sales for export (no pagination limit)
  const { data: allSalesData } = useQuery({
    queryKey: ['sales-all', statusFilter],
    queryFn: () => saleApi.getAll({ page: 1, limit: 10000, status: statusFilter }),
    enabled: false, // only fetch on demand
  });

  const cancelMutation = useMutation({
    mutationFn: saleApi.cancel,
    onSuccess: () => {
      toast.success('Sale cancelled and stock restored');
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setCancelId(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to cancel'),
  });

  const sales = data?.data || [];
  const pagination = data?.pagination;

  const handleExportCSV = async () => {
    try {
      const res = await saleApi.getAll({ page: 1, limit: 10000, status: statusFilter });
      const allSales = res.data || [];
      if (!allSales.length) { toast.error('No data to export'); return; }
      exportSalesCSV(allSales);
      toast.success(`Exported ${allSales.length} sales to CSV`);
    } catch {
      toast.error('Export failed');
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const res = await saleApi.getAll({ page: 1, limit: 10000, status: statusFilter });
      const allSales = res.data || [];
      if (!allSales.length) { toast.error('No data to export'); return; }
      const title = statusFilter ? `Sales Report — ${statusFilter}` : 'Sales Report — All';
      await exportSalesPDF(allSales, title);
      toast.success(`Exported ${allSales.length} sales to PDF`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      COMPLETED: 'badge-green',
      PENDING: 'badge-yellow',
      CANCELLED: 'badge-red',
      REFUNDED: 'badge-gray',
    };
    return map[status] || 'badge-gray';
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-gray-500 text-sm">Manage sales orders and invoices</p>
        </div>
        <div className="flex gap-2">
          {/* Export dropdown */}
          <div className="relative group">
            <button disabled={exporting} className="btn-secondary flex items-center gap-2">
              <FileDown className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export'}
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

          {(user?.role === 'ADMIN' || user?.role === 'CASHIER') && (
            <button
              onClick={() => setShowNewSale(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Sale
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex gap-3">
          <select
            className="input-field w-48"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Status</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {pagination && (
            <p className="text-sm text-gray-500 self-center">
              {pagination.total} total records
            </p>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <LoadingSpinner />
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Search className="w-12 h-12 mb-3" />
            <p className="font-medium">No sales found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cashier</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Payment</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sales.map((sale: any) => (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-primary-600">
                      {sale.invoiceNo}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {sale.customerName || 'Walk-in'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{sale.user?.name}</td>
                    <td className="px-4 py-3 text-center">
                      {sale.payment ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          sale.payment.method === 'CASH'
                            ? 'bg-green-100 text-green-700'
                            : sale.payment.method === 'CHEQUE'
                            ? 'bg-blue-100 text-blue-700'
                            : sale.payment.method === 'PHONEPAY'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-teal-100 text-teal-700'
                        }`}>
                          {sale.payment.method === 'PHONEPAY' ? 'PhonePay' :
                           sale.payment.method === 'ESEWA'    ? 'eSewa'    :
                           sale.payment.method === 'CHEQUE'   ? 'Cheque'   : 'Cash'}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={statusBadge(sale.status)}>{sale.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(sale.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewSale(sale)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => saleApi.downloadInvoice(sale.id)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                          title="Download Invoice PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {user?.role === 'ADMIN' && sale.status === 'COMPLETED' && (
                          <button
                            onClick={() => setCancelId(sale.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Cancel"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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

      {showNewSale && (
        <NewSaleModal
          onClose={() => setShowNewSale(false)}
          onSuccess={() => {
            setShowNewSale(false);
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          }}
        />
      )}

      {viewSale && (
        <SaleDetailModal sale={viewSale} onClose={() => setViewSale(null)} />
      )}

      {cancelId && (
        <ConfirmDialog
          title="Cancel Sale"
          message="Are you sure you want to cancel this sale? Stock will be restored."
          onConfirm={() => cancelMutation.mutate(cancelId)}
          onCancel={() => setCancelId(null)}
          loading={cancelMutation.isPending}
          variant="danger"
        />
      )}
    </div>
  );
}
