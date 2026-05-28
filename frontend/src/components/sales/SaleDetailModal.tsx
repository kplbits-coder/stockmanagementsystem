'use client';
import { useEffect, useRef } from 'react';
import { X, Download, Printer } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { saleApi } from '@/lib/api';
import { useTenantStore } from '@/store/tenant.store';

interface Props {
  sale: any;
  onClose: () => void;
}

export default function SaleDetailModal({ sale, onClose }: Props) {
  const printRootRef = useRef<HTMLDivElement>(null);
  const { tenant } = useTenantStore();

  // Mount a hidden print-only div at body level so only invoice prints
  useEffect(() => {
    const el = document.createElement('div');
    el.id = 'invoice-print-root';
    el.style.display = 'none';
    document.body.appendChild(el);
    printRootRef.current = el;
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  const handlePrint = () => {
    if (!printRootRef.current) return;
    // Copy invoice HTML into the print root
    const invoiceEl = document.getElementById('invoice-content');
    if (invoiceEl) {
      printRootRef.current.innerHTML = invoiceEl.innerHTML;
    }
    window.print();
    // Clear after print
    setTimeout(() => {
      if (printRootRef.current) printRootRef.current.innerHTML = '';
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header — hidden on print */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 no-print">
          <h2 className="text-lg font-semibold text-gray-900">Invoice Details</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => saleApi.downloadInvoice(sale.id)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="p-6" id="invoice-content">
          {/* Invoice Header */}
          <div className="flex justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-primary-700">
                {tenant?.branding?.companyName?.toUpperCase() || 'STOCK MANAGER'}
              </h1>
              <p className="text-gray-500 text-sm">
                {tenant?.branding?.tagline || 'Stock Management System'}
              </p>
              {tenant?.branding?.panNo && (
                <p className="text-xs font-semibold text-gray-600 mt-1">
                  PAN/VAT: {tenant.branding.panNo}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-gray-900">INVOICE</p>
              <p className="text-sm text-gray-500 font-mono">{sale.invoiceNo}</p>
              <p className="text-sm text-gray-500">{formatDate(sale.createdAt)}</p>
            </div>
          </div>

          {/* Bill To / Cashier */}
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Bill To</p>
              <p className="font-medium text-gray-900">{sale.customerName || 'Walk-in Customer'}</p>
              {sale.customerPhone && (
                <p className="text-sm text-gray-500">{sale.customerPhone}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Cashier</p>
              <p className="font-medium text-gray-900">{sale.user?.name}</p>
              {sale.payment && (
                <div className="mt-1">
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
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="bg-primary-700 text-white">
                <th className="text-left px-3 py-2 rounded-tl-lg">#</th>
                <th className="text-left px-3 py-2">Product</th>
                <th className="text-right px-3 py-2">Qty</th>
                <th className="text-right px-3 py-2">Unit Price</th>
                <th className="text-right px-3 py-2">Tax</th>
                <th className="text-right px-3 py-2 rounded-tr-lg">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sale.saleItems?.map((item: any, i: number) => (
                <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{item.product?.name}</td>
                  <td className="px-3 py-2 text-right">{item.quantity}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-3 py-2 text-right">{Number(item.taxRate)}%</td>
                  <td className="px-3 py-2 text-right font-semibold">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(sale.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span>{formatCurrency(sale.taxAmount)}</span>
              </div>
              {Number(sale.discount) > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-2">
                <span>Total</span>
                <span className="text-primary-700">{formatCurrency(sale.total)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
            Thank you for your business! · Generated by {tenant?.branding?.companyName || 'Stock Manager'}
          </div>

          {/* Payment Details */}
          {sale.payment && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Payment Details
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Method</span>
                  <span className="font-medium">
                    {sale.payment.method === 'PHONEPAY' ? 'PhonePay' :
                     sale.payment.method === 'ESEWA'    ? 'eSewa'    :
                     sale.payment.method === 'CHEQUE'   ? 'Cheque'   : 'Cash'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`font-medium ${
                    sale.payment.status === 'PAID' ? 'text-green-600' :
                    sale.payment.status === 'PARTIAL' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {sale.payment.status.charAt(0) + sale.payment.status.slice(1).toLowerCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount Paid</span>
                  <span className="font-medium">{formatCurrency(sale.payment.amountPaid)}</span>
                </div>
                {Number(sale.payment.changeAmount) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Change</span>
                    <span className="font-medium text-green-600">{formatCurrency(sale.payment.changeAmount)}</span>
                  </div>
                )}
                {sale.payment.referenceNo && (
                  <div className="flex justify-between col-span-2">
                    <span className="text-gray-500">
                      {sale.payment.method === 'CHEQUE' ? 'Cheque No' : 'Transaction ID'}
                    </span>
                    <span className="font-medium font-mono">{sale.payment.referenceNo}</span>
                  </div>
                )}
                {sale.payment.bankName && (
                  <div className="flex justify-between col-span-2">
                    <span className="text-gray-500">Bank</span>
                    <span className="font-medium">{sale.payment.bankName}</span>
                  </div>
                )}
                {sale.payment.accountName && (
                  <div className="flex justify-between col-span-2">
                    <span className="text-gray-500">Account Holder</span>
                    <span className="font-medium">{sale.payment.accountName}</span>
                  </div>
                )}
                {sale.payment.onlineProvider && (
                  <div className="flex justify-between col-span-2">
                    <span className="text-gray-500">Provider</span>
                    <span className="font-medium">{sale.payment.onlineProvider}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
