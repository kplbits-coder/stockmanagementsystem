'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart2, Package, FileText, TrendingUp, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { reportApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  exportSalesReportCSV,
  exportCategoryReportCSV,
  exportInventoryReportPDF,
  exportInventoryCSV,
  exportToPDF,
} from '@/lib/export';
import SalesReportChart from '@/components/reports/SalesReportChart';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ReportsPage() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [activeTab, setActiveTab] = useState<'sales' | 'inventory'>('sales');
  const [exporting, setExporting] = useState(false);

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['report-sales', period],
    queryFn: () => reportApi.getSales(period),
    enabled: activeTab === 'sales',
  });

  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['report-inventory'],
    queryFn: reportApi.getInventory,
    enabled: activeTab === 'inventory',
  });

  const salesReport = salesData?.data;
  const inventoryReport = inventoryData?.data;

  // ── Sales export handlers ──────────────────────────────────────────────────
  const handleSalesCSV = () => {
    if (!salesReport) { toast.error('No data to export'); return; }
    exportSalesReportCSV(salesReport, period);
    toast.success('Summary exported to CSV');
  };

  const handleCategoryCSV = () => {
    if (!salesReport?.categoryBreakdown?.length) { toast.error('No category data'); return; }
    exportCategoryReportCSV(salesReport.categoryBreakdown);
    toast.success('Category breakdown exported to CSV');
  };

  const handleSalesPDF = async () => {
    if (!salesReport) { toast.error('No data to export'); return; }
    setExporting(true);
    try {
      await exportToPDF({
        filename: `sales-report-${period}`,
        title: `Sales Report — ${period.charAt(0).toUpperCase() + period.slice(1)}`,
        subtitle: [
          `Period: ${period}`,
          `Total Sales: ${salesReport.summary.totalSales}`,
          `Revenue: $${Number(salesReport.summary.totalRevenue).toFixed(2)}`,
          `Generated: ${new Date().toLocaleDateString()}`,
        ].join('  ·  '),
        headers: ['Category', 'Units Sold', 'Revenue ($)'],
        rows: salesReport.categoryBreakdown.map((c: any) => [
          c.category, c.quantity, '$' + Number(c.revenue).toFixed(2),
        ]),
        columnWidths: [0.5, 0.25, 0.25],
      });
      toast.success('Sales report exported to PDF');
    } finally {
      setExporting(false);
    }
  };

  // ── Inventory export handlers ──────────────────────────────────────────────
  const handleInventoryCSV = () => {
    if (!inventoryReport) { toast.error('No data to export'); return; }
    exportInventoryCSV(inventoryReport.products);
    toast.success('Inventory exported to CSV');
  };

  const handleInventoryPDF = async () => {
    if (!inventoryReport) { toast.error('No data to export'); return; }
    setExporting(true);
    try {
      await exportInventoryReportPDF(inventoryReport);
      toast.success('Inventory report exported to PDF');
    } finally {
      setExporting(false);
    }
  };

  const ExportDropdown = ({ onCSV, onPDF }: { onCSV: () => void; onPDF: () => void }) => (
    <div className="relative group">
      <button disabled={exporting} className="btn-secondary flex items-center gap-2 text-sm">
        <FileDown className="w-4 h-4" />
        {exporting ? 'Exporting...' : 'Export'}
      </button>
      <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20 hidden group-hover:block">
        <button
          onClick={onCSV}
          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
        >
          Export CSV
        </button>
        <button
          onClick={onPDF}
          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
        >
          Export PDF
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 text-sm">Analytics and business insights</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'sales' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Sales Report
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'inventory' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package className="w-4 h-4" />
          Inventory Report
        </button>
      </div>

      {/* ── SALES TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'sales' && (
        <div className="space-y-5">
          {/* Period + Export row */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    period === p
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            {salesReport && <ExportDropdown onCSV={handleSalesCSV} onPDF={handleSalesPDF} />}
          </div>

          {salesLoading ? (
            <LoadingSpinner />
          ) : salesReport ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Sales', value: salesReport.summary.totalSales, icon: FileText, color: 'text-blue-600 bg-blue-50' },
                  { label: 'Total Revenue', value: formatCurrency(salesReport.summary.totalRevenue), icon: TrendingUp, color: 'text-green-600 bg-green-50' },
                  { label: 'Tax Collected', value: formatCurrency(salesReport.summary.totalTax), icon: BarChart2, color: 'text-purple-600 bg-purple-50' },
                  { label: 'Total Discount', value: formatCurrency(salesReport.summary.totalDiscount), icon: Package, color: 'text-orange-600 bg-orange-50' },
                ].map((item) => (
                  <div key={item.label} className="card">
                    <div className={`inline-flex p-2 rounded-lg ${item.color} mb-3`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                    <p className="text-sm text-gray-500 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">Revenue by Category</h3>
                <SalesReportChart data={salesReport.categoryBreakdown} />
              </div>

              {/* Category Table */}
              <div className="card p-0 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Category Breakdown</h3>
                  <button
                    onClick={handleCategoryCSV}
                    className="btn-secondary text-xs flex items-center gap-1.5 py-1.5"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    CSV
                  </button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Units Sold</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {salesReport.categoryBreakdown.map((cat: any) => (
                      <tr key={cat.category} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{cat.category}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{cat.quantity}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(cat.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── INVENTORY TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div className="space-y-5">
          {inventoryLoading ? (
            <LoadingSpinner />
          ) : inventoryReport ? (
            <>
              {/* Summary + Export */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                  {[
                    { label: 'Total Products', value: inventoryReport.summary.totalProducts },
                    { label: 'Stock Value (Cost)', value: formatCurrency(inventoryReport.summary.totalValue) },
                    { label: 'Retail Value', value: formatCurrency(inventoryReport.summary.totalRetailValue) },
                    { label: 'Potential Profit', value: formatCurrency(inventoryReport.summary.potentialProfit) },
                  ].map((item) => (
                    <div key={item.label} className="card">
                      <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                      <p className="text-sm text-gray-500 mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
                <ExportDropdown onCSV={handleInventoryCSV} onPDF={handleInventoryPDF} />
              </div>

              {/* Product Table */}
              <div className="card p-0 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Product Inventory</h3>
                  <span className="text-xs text-gray-400">{inventoryReport.products.length} products</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Qty</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Cost Price</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Retail Price</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Stock Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {inventoryReport.products.map((p: any) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{p.name}</td>
                          <td className="px-4 py-3 text-gray-500">{p.category?.name}</td>
                          <td className="px-4 py-3 text-right">{p.quantity}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(p.costPrice)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(p.price)}</td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {formatCurrency(Number(p.costPrice) * p.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
