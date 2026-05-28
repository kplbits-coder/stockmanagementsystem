'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Thermometer, Store } from 'lucide-react';
import { refrigeratorApi } from '@/lib/api';
import { useTenantStore } from '@/store/tenant.store';
import { formatDateShort } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

type ReportType = 'all-refrigerators' | 'assignments' | 'shop-wise';

export default function RefrigeratorReportsPage() {
  const { tenant } = useTenantStore();
  const [reportType, setReportType] = useState<ReportType>('all-refrigerators');

  const { data: refrigeratorsData, isLoading: loadingRefrigerators } = useQuery({
    queryKey: ['refrigerators', { limit: 500 }],
    queryFn: () => refrigeratorApi.getAll({ limit: 500 }),
    enabled: reportType === 'all-refrigerators' && !!tenant?.features?.refrigeratorTracking,
  });

  const { data: assignmentsData, isLoading: loadingAssignments } = useQuery({
    queryKey: ['refrigerator-assignments', { limit: 500 }],
    queryFn: () => refrigeratorApi.getAssignments({ limit: 500 }),
    enabled: reportType === 'assignments' && !!tenant?.features?.refrigeratorTracking,
  });

  const { data: dashboardData, isLoading: loadingDashboard } = useQuery({
    queryKey: ['refrigerator-dashboard'],
    queryFn: refrigeratorApi.getDashboard,
    enabled: reportType === 'shop-wise' && !!tenant?.features?.refrigeratorTracking,
  });

  if (!tenant?.features?.refrigeratorTracking) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">This feature is not available for your organization.</p>
      </div>
    );
  }

  const isLoading = loadingRefrigerators || loadingAssignments || loadingDashboard;

  const exportCSV = () => {
    let csvContent = '';
    let filename = '';

    if (reportType === 'all-refrigerators') {
      const items = refrigeratorsData?.data || [];
      csvContent = 'Code,Name,Brand,Model,Capacity,Serial Number,Status,Current Shop,Purchase Date\n';
      items.forEach((item: any) => {
        const shop = item.assignments?.[0]?.shop?.name || '';
        csvContent += `"${item.code}","${item.name}","${item.brand || ''}","${item.model || ''}","${item.capacity || ''}","${item.serialNumber || ''}","${item.status}","${shop}","${item.purchaseDate ? formatDateShort(item.purchaseDate) : ''}"\n`;
      });
      filename = 'refrigerators-report.csv';
    } else if (reportType === 'assignments') {
      const items = assignmentsData?.data || [];
      csvContent = 'Refrigerator Code,Refrigerator Name,Shop,Assigned Date,Returned Date,Status,Remarks\n';
      items.forEach((item: any) => {
        csvContent += `"${item.refrigerator?.code || ''}","${item.refrigerator?.name || ''}","${item.shop?.name || ''}","${formatDateShort(item.assignedDate)}","${item.returnedDate ? formatDateShort(item.returnedDate) : ''}","${item.status}","${item.remarks || ''}"\n`;
      });
      filename = 'assignments-report.csv';
    } else {
      const items = dashboardData?.data?.shopWise || [];
      csvContent = 'Shop Name,Code,Region,Refrigerator Count\n';
      items.forEach((item: any) => {
        csvContent += `"${item.name}","${item.code}","${item.region || ''}","${item.refrigeratorCount}"\n`;
      });
      filename = 'shop-wise-report.csv';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const exportPDF = () => {
    // Generate a printable HTML and trigger print dialog
    let title = '';
    let tableHTML = '';

    if (reportType === 'all-refrigerators') {
      title = 'Refrigerators Report';
      const items = refrigeratorsData?.data || [];
      tableHTML = `
        <table>
          <thead><tr><th>Code</th><th>Name</th><th>Brand</th><th>Model</th><th>Status</th><th>Current Shop</th></tr></thead>
          <tbody>
            ${items.map((item: any) => `
              <tr>
                <td>${item.code}</td>
                <td>${item.name}</td>
                <td>${item.brand || '-'}</td>
                <td>${item.model || '-'}</td>
                <td>${item.status}</td>
                <td>${item.assignments?.[0]?.shop?.name || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (reportType === 'assignments') {
      title = 'Assignments Report';
      const items = assignmentsData?.data || [];
      tableHTML = `
        <table>
          <thead><tr><th>Refrigerator</th><th>Shop</th><th>Assigned</th><th>Returned</th><th>Status</th></tr></thead>
          <tbody>
            ${items.map((item: any) => `
              <tr>
                <td>${item.refrigerator?.code} - ${item.refrigerator?.name}</td>
                <td>${item.shop?.name}</td>
                <td>${formatDateShort(item.assignedDate)}</td>
                <td>${item.returnedDate ? formatDateShort(item.returnedDate) : '-'}</td>
                <td>${item.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      title = 'Shop-wise Refrigerator Distribution';
      const items = dashboardData?.data?.shopWise || [];
      tableHTML = `
        <table>
          <thead><tr><th>Shop</th><th>Code</th><th>Region</th><th>Refrigerators</th></tr></thead>
          <tbody>
            ${items.map((item: any) => `
              <tr>
                <td>${item.name}</td>
                <td>${item.code}</td>
                <td>${item.region || '-'}</td>
                <td>${item.refrigeratorCount}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 18px; margin-bottom: 5px; }
            p { color: #666; font-size: 12px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: 600; }
            tr:nth-child(even) { background-color: #fafafa; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>${tenant?.branding?.companyName || 'Scoopmandu'} — Generated on ${new Date().toLocaleDateString()}</p>
          ${tableHTML}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Refrigerator Reports</h1>
          <p className="text-gray-500 text-sm">Generate and export refrigerator tracking reports</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} disabled={isLoading} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button onClick={exportPDF} disabled={isLoading} className="btn-primary flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all-refrigerators' as ReportType, label: 'All Refrigerators', icon: Thermometer },
            { key: 'assignments' as ReportType, label: 'Assignment History', icon: FileText },
            { key: 'shop-wise' as ReportType, label: 'Shop-wise Distribution', icon: Store },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setReportType(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                reportType === tab.key
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Report Content */}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="card overflow-hidden">
          {reportType === 'all-refrigerators' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Brand</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Model</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Capacity</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Current Shop</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(refrigeratorsData?.data || []).map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{item.code}</td>
                      <td className="px-4 py-3">{item.name}</td>
                      <td className="px-4 py-3 text-gray-500">{item.brand || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{item.model || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{item.capacity || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={
                          item.status === 'AVAILABLE' ? 'badge-green' :
                          item.status === 'ASSIGNED' ? 'badge-blue' :
                          item.status === 'UNDER_MAINTENANCE' ? 'badge-yellow' :
                          'badge-red'
                        }>
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{item.assignments?.[0]?.shop?.name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(refrigeratorsData?.data || []).length === 0 && (
                <div className="py-12 text-center text-gray-400">No data available</div>
              )}
            </div>
          )}

          {reportType === 'assignments' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Refrigerator</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Shop</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Assigned Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Returned Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(assignmentsData?.data || []).map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.refrigerator?.code}</p>
                        <p className="text-xs text-gray-400">{item.refrigerator?.name}</p>
                      </td>
                      <td className="px-4 py-3">{item.shop?.name}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDateShort(item.assignedDate)}</td>
                      <td className="px-4 py-3 text-gray-500">{item.returnedDate ? formatDateShort(item.returnedDate) : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={
                          item.status === 'ACTIVE' ? 'badge-green' :
                          item.status === 'RETURNED' ? 'badge-blue' :
                          'badge-yellow'
                        }>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{item.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(assignmentsData?.data || []).length === 0 && (
                <div className="py-12 text-center text-gray-400">No data available</div>
              )}
            </div>
          )}

          {reportType === 'shop-wise' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Shop Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Region</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Refrigerators</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(dashboardData?.data?.shopWise || []).map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-gray-500">{item.code}</td>
                      <td className="px-4 py-3 text-gray-500">{item.region || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-primary-600">{item.refrigeratorCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(dashboardData?.data?.shopWise || []).length === 0 && (
                <div className="py-12 text-center text-gray-400">No data available</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
