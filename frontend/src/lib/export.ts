/**
 * Shared export utilities — CSV and PDF export for all modules.
 * Uses only browser-native APIs + jsPDF (already installed).
 */

// ─── CSV ─────────────────────────────────────────────────────────────────────

function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function exportToCSV(filename: string, headers: string[], rows: any[][]): void {
  const csvContent = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

interface PdfTableOptions {
  filename: string;
  title: string;
  subtitle?: string;
  headers: string[];
  rows: any[][];
  columnWidths?: number[]; // relative widths, must sum to ~1
}

export async function exportToPDF(options: PdfTableOptions): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(30, 64, 175); // primary-800
  doc.rect(0, 0, pageWidth, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('STOCK MANAGER', 14, 13);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(options.title, pageWidth - 14, 13, { align: 'right' });

  // Subtitle / date
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  const subtitle = options.subtitle || `Generated on ${new Date().toLocaleDateString()}`;
  doc.text(subtitle, 14, 28);

  // Table
  autoTable(doc, {
    startY: 32,
    head: [options.headers],
    body: options.rows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8, textColor: [55, 65, 81] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 14, right: 14 },
    columnStyles: options.columnWidths
      ? Object.fromEntries(
          options.columnWidths.map((w, i) => [i, { cellWidth: w * (pageWidth - 28) }])
        )
      : {},
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Page ${i} of ${pageCount}  ·  Stock Management System`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  doc.save(`${options.filename}-${new Date().toISOString().split('T')[0]}.pdf`);
}

// ─── Module-specific helpers ──────────────────────────────────────────────────

export function exportInventoryCSV(products: any[]): void {
  exportToCSV('inventory', [
    'Name', 'SKU', 'Barcode', 'Category', 'Sub-Category',
    'Price ($)', 'Cost Price ($)', 'Quantity', 'Unit',
    'Min Qty', 'Status', 'Tax Rate (%)',
  ], products.map((p) => [
    p.name, p.sku, p.barcode || '',
    p.category?.name || '', p.subCategory?.name || '',
    Number(p.price).toFixed(2), Number(p.costPrice).toFixed(2),
    p.quantity, p.unit, p.minQuantity, p.status,
    Number(p.taxRate).toFixed(2),
  ]));
}

export async function exportInventoryPDF(products: any[]): Promise<void> {
  await exportToPDF({
    filename: 'inventory',
    title: 'Inventory Report',
    subtitle: `Total products: ${products.length}  ·  Generated on ${new Date().toLocaleDateString()}`,
    headers: ['Name', 'SKU', 'Category', 'Price', 'Cost', 'Qty', 'Unit', 'Status'],
    rows: products.map((p) => [
      p.name, p.sku,
      p.category?.name || '',
      '$' + Number(p.price).toFixed(2),
      '$' + Number(p.costPrice).toFixed(2),
      p.quantity, p.unit, p.status,
    ]),
    columnWidths: [0.22, 0.10, 0.14, 0.10, 0.10, 0.07, 0.07, 0.12],
  });
}

export function exportSalesCSV(sales: any[]): void {
  exportToCSV('sales', [
    'Invoice No', 'Customer', 'Phone', 'Cashier',
    'Subtotal ($)', 'Tax ($)', 'Discount ($)', 'Total ($)',
    'Status', 'Date',
  ], sales.map((s) => [
    s.invoiceNo,
    s.customerName || 'Walk-in',
    s.customerPhone || '',
    s.user?.name || '',
    Number(s.subtotal).toFixed(2),
    Number(s.taxAmount).toFixed(2),
    Number(s.discount).toFixed(2),
    Number(s.total).toFixed(2),
    s.status,
    new Date(s.createdAt).toLocaleString(),
  ]));
}

export async function exportSalesPDF(sales: any[], title = 'Sales Report'): Promise<void> {
  await exportToPDF({
    filename: 'sales',
    title,
    subtitle: `Total: ${sales.length} sales  ·  Generated on ${new Date().toLocaleDateString()}`,
    headers: ['Invoice', 'Customer', 'Cashier', 'Subtotal', 'Tax', 'Discount', 'Total', 'Status', 'Date'],
    rows: sales.map((s) => [
      s.invoiceNo,
      s.customerName || 'Walk-in',
      s.user?.name || '',
      '$' + Number(s.subtotal).toFixed(2),
      '$' + Number(s.taxAmount).toFixed(2),
      '$' + Number(s.discount).toFixed(2),
      '$' + Number(s.total).toFixed(2),
      s.status,
      new Date(s.createdAt).toLocaleDateString(),
    ]),
    columnWidths: [0.14, 0.13, 0.11, 0.09, 0.08, 0.09, 0.09, 0.10, 0.10],
  });
}

export function exportSalesReportCSV(report: any, period: string): void {
  // Summary sheet
  exportToCSV(`sales-report-${period}`, [
    'Period', 'Total Sales', 'Total Revenue ($)', 'Tax Collected ($)',
    'Total Discount ($)', 'Net Revenue ($)',
  ], [[
    period,
    report.summary.totalSales,
    Number(report.summary.totalRevenue).toFixed(2),
    Number(report.summary.totalTax).toFixed(2),
    Number(report.summary.totalDiscount).toFixed(2),
    Number(report.summary.netRevenue).toFixed(2),
  ]]);
}

export function exportCategoryReportCSV(breakdown: any[]): void {
  exportToCSV('category-breakdown', [
    'Category', 'Units Sold', 'Revenue ($)',
  ], breakdown.map((c) => [
    c.category, c.quantity, Number(c.revenue).toFixed(2),
  ]));
}

export async function exportInventoryReportPDF(report: any): Promise<void> {
  await exportToPDF({
    filename: 'inventory-report',
    title: 'Inventory Valuation Report',
    subtitle: [
      `Products: ${report.summary.totalProducts}`,
      `Stock Value: $${Number(report.summary.totalValue).toFixed(2)}`,
      `Retail Value: $${Number(report.summary.totalRetailValue).toFixed(2)}`,
      `Potential Profit: $${Number(report.summary.potentialProfit).toFixed(2)}`,
    ].join('  ·  '),
    headers: ['Product', 'Category', 'SKU', 'Qty', 'Cost Price', 'Retail Price', 'Stock Value'],
    rows: report.products.map((p: any) => [
      p.name,
      p.category?.name || '',
      p.sku,
      p.quantity,
      '$' + Number(p.costPrice).toFixed(2),
      '$' + Number(p.price).toFixed(2),
      '$' + (Number(p.costPrice) * p.quantity).toFixed(2),
    ]),
    columnWidths: [0.22, 0.14, 0.12, 0.07, 0.12, 0.12, 0.13],
  });
}
