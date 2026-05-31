'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingDown, TrendingUp, DollarSign, AlertTriangle,
  Package, FileDown, BarChart2, PieChart,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  Title, Tooltip, Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { costAnalysisApi } from '@/lib/api';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import { exportToCSV, exportToPDF } from '@/lib/export';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

type Tab = 'overview' | 'products' | 'dead-stock' | 'abc';

export default function CostAnalysisPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [sortBy, setSortBy] = useState<'profit' | 'margin' | 'revenue'>('profit');
  const [deadStockDays, setDeadStockDays] = useState<number>(30);
  const [exporting, setExporting] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['cost-analysis-overview'],
    queryFn: costAnalysisApi.getOverview,
    enabled: activeTab === 'overview',
  });

  const { data: categoryData } = useQuery({
    queryKey: ['cost-analysis-category'],
    queryFn: () => costAnalysisApi.getProfitByCategory(),
    enabled: activeTab === 'overview',
  });

  const { data: productData, isLoading: productLoading } = useQuery({
    queryKey: ['cost-analysis-products', period, sortBy],
    queryFn: () => costAnalysisApi.getProfitByProduct({ period, sortBy }),
    enabled: activeTab === 'products',
  });

  const { data: deadStockData, isLoading: deadStockLoading } = useQuery({
    queryKey: ['cost-analysis-dead-stock', deadStockDays],
    queryFn: () => costAnalysisApi.getDeadStock({ days: deadStockDays }),
    enabled: activeTab === 'dead-stock',
  });

  const { data: abcData, isLoading: abcLoading } = useQuery({
    queryKey: ['cost-analysis-abc'],
    queryFn: costAnalysisApi.getAbcAnalysis,
    enabled: activeTab === 'abc',
  });

  const overview = overviewData?.data;
  const categories = categoryData?.data;
  const products = productData?.data;
  const deadStock = deadStockData?.data;
  const abc = abcData?.data;

  // ── Export handlers ─────────────────────────────────────────────────────
  const handleProductExportCSV = () => {
    if (!products?.length) { toast.error('No data to export'); return; }
    exportToCSV('product-profitability', [
      'Product', 'SKU', 'Category', 'Cost Price', 'Selling Price',
      'Margin %', 'Units Sold', 'Revenue', 'COGS', 'Gross Profit',
    ], products.map((p: any) => [
      p.name, p.sku, p.category,
      Number(p.costPrice).toFixed(2), Number(p.sellingPrice).toFixed(2),
      p.margin.toFixed(2), p.totalSold,
      Number(p.totalRevenue).toFixed(2), Number(p.totalCOGS).toFixed(2),
      Number(p.grossProfit).toFixed(2),
    ]));
    toast.success('Product profitability exported to CSV');
  };

  const handleProductExportPDF = async () => {
    if (!products?.length) { toast.error('No data to export'); return; }
    setExporting(true);
    try {
      await exportToPDF({
        filename: 'product-profitability',
        title: 'Product Profitability Report',
        subtitle: `Period: ${period} · Generated on ${new Date().toLocaleDateString()}`,
        headers: ['Product', 'SKU', 'Category', 'Cost', 'Price', 'Margin%', 'Sold', 'Revenue', 'Profit'],
        rows: products.map((p: any) => [
          p.name, p.sku, p.category,
          'Rs. ' + Number(p.costPrice).toFixed(2),
          'Rs. ' + Number(p.sellingPrice).toFixed(2),
          p.margin.toFixed(1) + '%', p.totalSold,
          'Rs. ' + Number(p.totalRevenue).toFixed(2),
          'Rs. ' + Number(p.grossProfit).toFixed(2),
        ]),
        columnWidths: [0.16, 0.09, 0.12, 0.10, 0.10, 0.08, 0.06, 0.12, 0.12],
      });
      toast.success('Product profitability exported to PDF');
    } finally { setExporting(false); }
  };

  const handleDeadStockExportCSV = () => {
    if (!deadStock?.products?.length) { toast.error('No data to export'); return; }
    exportToCSV('dead-stock', [
      'Product', 'SKU', 'Category', 'Quantity', 'Cost Value',
      'Last Sold', 'Days Idle',
    ], deadStock.products.map((p: any) => [
      p.name, p.sku, p.category, p.quantity,
      Number(p.holdingValue).toFixed(2),
      p.lastSoldDate ? new Date(p.lastSoldDate).toLocaleDateString() : 'Never',
      p.neverSold ? 'Never Sold' : p.daysSinceLastSale,
    ]));
    toast.success('Dead stock exported to CSV');
  };

  const handleDeadStockExportPDF = async () => {
    if (!deadStock?.products?.length) { toast.error('No data to export'); return; }
    setExporting(true);
    try {
      await exportToPDF({
        filename: 'dead-stock',
        title: 'Dead Stock Report',
        subtitle: `Threshold: ${deadStockDays} days · Total Value: Rs. ${Number(deadStock.totalDeadStockValue).toFixed(2)}`,
        headers: ['Product', 'SKU', 'Category', 'Qty', 'Cost Value', 'Last Sold', 'Days Idle'],
        rows: deadStock.products.map((p: any) => [
          p.name, p.sku, p.category, p.quantity,
          'Rs. ' + Number(p.holdingValue).toFixed(2),
          p.lastSoldDate ? new Date(p.lastSoldDate).toLocaleDateString() : 'Never',
          p.neverSold ? 'Never Sold' : p.daysSinceLastSale + ' days',
        ]),
        columnWidths: [0.20, 0.10, 0.14, 0.07, 0.14, 0.14, 0.12],
      });
      toast.success('Dead stock exported to PDF');
    } finally { setExporting(false); }
  };

  const handleAbcExportCSV = () => {
    if (!abc?.products?.length) { toast.error('No data to export'); return; }
    exportToCSV('abc-analysis', [
      'Product', 'SKU', 'Category', 'Revenue', '% of Total', 'Cumulative %', 'Class',
    ], abc.products.map((p: any) => [
      p.name, p.sku, p.category,
      Number(p.revenue).toFixed(2),
      p.percentageOfTotal.toFixed(2) + '%',
      p.cumulativePercentage.toFixed(2) + '%',
      p.classification,
    ]));
    toast.success('ABC analysis exported to CSV');
  };

  const handleAbcExportPDF = async () => {
    if (!abc?.products?.length) { toast.error('No data to export'); return; }
    setExporting(true);
    try {
      await exportToPDF({
        filename: 'abc-analysis',
        title: 'ABC Analysis Report',
        subtitle: `Total Revenue: Rs. ${Number(abc.totalRevenue).toFixed(2)} · ${abc.totalProducts} products`,
        headers: ['Product', 'SKU', 'Category', 'Revenue', '% of Total', 'Cumulative %', 'Class'],
        rows: abc.products.map((p: any) => [
          p.name, p.sku, p.category,
          'Rs. ' + Number(p.revenue).toFixed(2),
          p.percentageOfTotal.toFixed(2) + '%',
          p.cumulativePercentage.toFixed(2) + '%',
          p.classification,
        ]),
        columnWidths: [0.20, 0.10, 0.14, 0.14, 0.12, 0.14, 0.08],
      });
      toast.success('ABC analysis exported to PDF');
    } finally { setExporting(false); }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────
  const getMarginColor = (margin: number) => {
    if (margin >= 30) return 'text-green-600 bg-green-50';
    if (margin >= 15) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getDaysColor = (days: number | null, neverSold: boolean) => {
    if (neverSold) return 'text-red-600 bg-red-50';
    if (days === null) return '';
    if (days >= 90) return 'text-red-600 bg-red-50';
    if (days >= 60) return 'text-orange-600 bg-orange-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const ExportDropdown = ({ onCSV, onPDF }: { onCSV: () => void; onPDF: () => void }) => (
    <div className="relative group">
      <button disabled={exporting} className="btn-secondary flex items-center gap-2 text-sm">
        <FileDown className="w-4 h-4" />
        {exporting ? 'Exporting...' : 'Export'}
      </button>
      <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20 hidden group-hover:block">
        <button onClick={onCSV} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg">
          Export CSV
        </button>
        <button onClick={onPDF} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg">
          Export PDF
        </button>
      </div>
    </div>
  );

  // ── Category chart data ─────────────────────────────────────────────────
  const categoryChartData = categories ? {
    labels: categories.map((c: any) => c.categoryName),
    datasets: [
      {
        label: 'Revenue',
        data: categories.map((c: any) => c.totalRevenue),
        backgroundColor: 'rgba(37, 99, 235, 0.7)',
      },
      {
        label: 'COGS',
        data: categories.map((c: any) => c.totalCOGS),
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
      },
      {
        label: 'Profit',
        data: categories.map((c: any) => c.grossProfit),
        backgroundColor: 'rgba(34, 197, 94, 0.7)',
      },
    ],
  } : null;

  // ── ABC donut chart data ────────────────────────────────────────────────
  const abcChartData = abc ? {
    labels: ['A - Top 80%', 'B - Next 15%', 'C - Remaining 5%'],
    datasets: [{
      data: [abc.summary.A.revenue, abc.summary.B.revenue, abc.summary.C.revenue],
      backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(234, 179, 8, 0.8)', 'rgba(239, 68, 68, 0.7)'],
      borderColor: ['rgb(34, 197, 94)', 'rgb(234, 179, 8)', 'rgb(239, 68, 68)'],
      borderWidth: 2,
    }],
  } : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cost Analysis</h1>
        <p className="text-gray-500 text-sm">Cost intelligence and profitability insights</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
        {([
          { key: 'overview', label: 'Overview', icon: TrendingUp },
          { key: 'products', label: 'Product Profitability', icon: BarChart2 },
          { key: 'dead-stock', label: 'Dead Stock', icon: AlertTriangle },
          { key: 'abc', label: 'ABC Analysis', icon: PieChart },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: OVERVIEW
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {overviewLoading ? <LoadingSpinner /> : overview ? (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Inventory Value', value: formatCurrency(overview.totalInventoryValue), icon: Package, color: 'text-blue-600 bg-blue-50' },
                  { label: 'Gross Profit (Month)', value: formatCurrency(overview.monthlyGrossProfit), icon: TrendingUp, color: 'text-green-600 bg-green-50' },
                  { label: 'Average Margin', value: overview.averageMargin.toFixed(1) + '%', icon: DollarSign, color: 'text-purple-600 bg-purple-50' },
                  { label: 'Dead Stock Value', value: formatCurrency(overview.deadStockValue), icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
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

              {/* Monthly Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="card">
                  <p className="text-sm text-gray-500">Monthly Revenue</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(overview.monthlyRevenue)}</p>
                </div>
                <div className="card">
                  <p className="text-sm text-gray-500">Monthly COGS</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(overview.monthlyCOGS)}</p>
                </div>
                <div className="card">
                  <p className="text-sm text-gray-500">Gross Profit Potential</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(overview.grossProfitPotential)}</p>
                </div>
              </div>

              {/* Profit by Category Chart */}
              {categoryChartData && (
                <div className="card">
                  <h3 className="font-semibold text-gray-900 mb-4">Profit by Category</h3>
                  <div className="h-72">
                    <Bar
                      data={categoryChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `${ctx.dataset.label}: Rs. ${Number(ctx.raw).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                            },
                          },
                        },
                        scales: {
                          y: {
                            ticks: {
                              callback: (value) => 'Rs. ' + Number(value).toLocaleString('en-IN'),
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Top/Bottom Margin Products */}
              {categories && products === undefined && (
                <TopBottomMarginProducts />
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: PRODUCT PROFITABILITY
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'products' && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-3 flex-wrap">
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
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="input-field w-auto text-sm"
              >
                <option value="profit">Sort by Profit</option>
                <option value="margin">Sort by Margin</option>
                <option value="revenue">Sort by Revenue</option>
              </select>
            </div>
            <ExportDropdown onCSV={handleProductExportCSV} onPDF={handleProductExportPDF} />
          </div>

          {productLoading ? <LoadingSpinner /> : products?.length ? (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">SKU</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Cost</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Price</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Margin%</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Sold</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Revenue</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">COGS</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.sku}</td>
                        <td className="px-4 py-3 text-gray-500">{p.category}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(p.costPrice)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(p.sellingPrice)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getMarginColor(p.margin)}`}>
                            {p.margin.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{p.totalSold}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(p.totalRevenue)}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(p.totalCOGS)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${p.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(p.grossProfit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card text-center py-12 text-gray-500">
              No product data available for the selected period.
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: DEAD STOCK
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'dead-stock' && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2">
              {([30, 60, 90] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDeadStockDays(d)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    deadStockDays === d
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {d}+ Days
                </button>
              ))}
            </div>
            <ExportDropdown onCSV={handleDeadStockExportCSV} onPDF={handleDeadStockExportPDF} />
          </div>

          {deadStockLoading ? <LoadingSpinner /> : deadStock ? (
            <>
              {/* Alert Banner */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-800">
                    {formatCurrency(deadStock.totalDeadStockValue)} tied up in dead stock
                  </p>
                  <p className="text-sm text-red-600">
                    {deadStock.totalItems} products haven&apos;t sold in {deadStockDays}+ days
                  </p>
                </div>
              </div>

              {/* Table */}
              {deadStock.products?.length > 0 && (
                <div className="card p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">SKU</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">Qty</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">Cost Value</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Last Sold</th>
                          <th className="text-center px-4 py-3 font-medium text-gray-600">Days Idle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {deadStock.products.map((p: any) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                            <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.sku}</td>
                            <td className="px-4 py-3 text-gray-500">{p.category}</td>
                            <td className="px-4 py-3 text-right">{p.quantity}</td>
                            <td className="px-4 py-3 text-right font-medium">{formatCurrency(p.holdingValue)}</td>
                            <td className="px-4 py-3 text-gray-500">
                              {p.lastSoldDate ? formatDateShort(p.lastSoldDate) : 'Never'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getDaysColor(p.daysSinceLastSale, p.neverSold)}`}>
                                {p.neverSold ? 'Never Sold' : `${p.daysSinceLastSale} days`}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 4: ABC ANALYSIS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'abc' && (
        <div className="space-y-5">
          {abcLoading ? <LoadingSpinner /> : abc ? (
            <>
              {/* Export */}
              <div className="flex justify-end">
                <ExportDropdown onCSV={handleAbcExportCSV} onPDF={handleAbcExportPDF} />
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card border-l-4 border-l-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Class A — Top Revenue</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{abc.summary.A.count} items</p>
                      <p className="text-sm text-green-600 font-medium">{abc.summary.A.percentage.toFixed(1)}% of revenue</p>
                    </div>
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-700 font-bold text-lg">A</span>
                  </div>
                </div>
                <div className="card border-l-4 border-l-yellow-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Class B — Medium Revenue</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{abc.summary.B.count} items</p>
                      <p className="text-sm text-yellow-600 font-medium">{abc.summary.B.percentage.toFixed(1)}% of revenue</p>
                    </div>
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-yellow-100 text-yellow-700 font-bold text-lg">B</span>
                  </div>
                </div>
                <div className="card border-l-4 border-l-red-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Class C — Low Revenue</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{abc.summary.C.count} items</p>
                      <p className="text-sm text-red-600 font-medium">{abc.summary.C.percentage.toFixed(1)}% of revenue</p>
                    </div>
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-700 font-bold text-lg">C</span>
                  </div>
                </div>
              </div>

              {/* Donut Chart */}
              {abcChartData && (
                <div className="card">
                  <h3 className="font-semibold text-gray-900 mb-4">Revenue Distribution by Class</h3>
                  <div className="flex justify-center">
                    <div className="w-72 h-72">
                      <Doughnut
                        data={abcChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            tooltip: {
                              callbacks: {
                                label: (ctx) => {
                                  const value = Number(ctx.raw);
                                  return `${ctx.label}: Rs. ${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                                },
                              },
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Full Table */}
              {abc.products?.length > 0 && (
                <div className="card p-0 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">All Products — ABC Classification</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">SKU</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">Revenue</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">% of Total</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">Cumulative %</th>
                          <th className="text-center px-4 py-3 font-medium text-gray-600">Class</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {abc.products.map((p: any) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                            <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.sku}</td>
                            <td className="px-4 py-3 text-gray-500">{p.category}</td>
                            <td className="px-4 py-3 text-right font-medium">{formatCurrency(p.revenue)}</td>
                            <td className="px-4 py-3 text-right">{p.percentageOfTotal.toFixed(2)}%</td>
                            <td className="px-4 py-3 text-right">{p.cumulativePercentage.toFixed(2)}%</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                p.classification === 'A' ? 'bg-green-100 text-green-700' :
                                p.classification === 'B' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {p.classification}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * Sub-component: Top 5 highest and lowest margin products (shown in Overview tab)
 */
function TopBottomMarginProducts() {
  const { data } = useQuery({
    queryKey: ['cost-analysis-products-overview'],
    queryFn: () => costAnalysisApi.getProfitByProduct({ period: 'monthly', sortBy: 'margin' }),
  });

  const products = data?.data;
  if (!products?.length) return null;

  const top5 = products.slice(0, 5);
  const bottom5 = [...products].sort((a: any, b: any) => a.margin - b.margin).slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Top 5 Highest Margin */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-600" />
          Top 5 Highest Margin Products
        </h3>
        <div className="space-y-2">
          {top5.map((p: any, i: number) => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.category}</p>
                </div>
              </div>
              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium text-green-600 bg-green-50">
                {p.margin.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top 5 Lowest Margin */}
      <div className="card border border-red-100">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-red-600" />
          Top 5 Lowest Margin Products
        </h3>
        <div className="space-y-2">
          {bottom5.map((p: any, i: number) => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.category}</p>
                </div>
              </div>
              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium text-red-600 bg-red-50">
                {p.margin.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
