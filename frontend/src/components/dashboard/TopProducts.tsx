import { formatCurrency } from '@/lib/utils';

export default function TopProducts({ products }: { products: any[] }) {
  if (!products.length) {
    return <p className="text-gray-400 text-sm text-center py-8">No sales data yet</p>;
  }

  const maxRevenue = Math.max(...products.map((p) => Number(p._sum?.total || 0)));

  return (
    <div className="space-y-3">
      {products.map((item, i) => {
        const revenue = Number(item._sum?.total || 0);
        const pct = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
        return (
          <div key={item.productId}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-gray-900 truncate">{item.product?.name}</p>
              <p className="text-sm font-semibold text-gray-700 ml-2">{formatCurrency(revenue)}</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-primary-500 h-1.5 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
