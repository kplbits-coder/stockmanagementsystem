import { formatCurrency, formatDate } from '@/lib/utils';

export default function RecentSales({ sales }: { sales: any[] }) {
  if (!sales.length) {
    return <p className="text-gray-400 text-sm text-center py-8">No recent sales</p>;
  }

  return (
    <div className="space-y-3">
      {sales.map((sale) => (
        <div key={sale.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
          <div>
            <p className="text-sm font-medium text-gray-900">{sale.invoiceNo}</p>
            <p className="text-xs text-gray-400">
              {sale.customerName || 'Walk-in'} · {sale.user?.name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">{formatCurrency(sale.total)}</p>
            <p className="text-xs text-gray-400">{formatDate(sale.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
