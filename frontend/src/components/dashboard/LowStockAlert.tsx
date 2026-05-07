import { getStatusBadge } from '@/lib/utils';
import Link from 'next/link';

export default function LowStockAlert({ products }: { products: any[] }) {
  if (!products.length) {
    return (
      <div className="text-center py-8">
        <p className="text-green-600 font-medium text-sm">All products are well stocked!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {products.map((product) => {
        const badge = getStatusBadge(product.status);
        return (
          <div key={product.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-900">{product.name}</p>
              <p className="text-xs text-gray-400">{product.category?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                {product.quantity} {product.unit}
              </span>
              <span className={badge.class}>{badge.label}</span>
            </div>
          </div>
        );
      })}
      <Link href="/inventory?status=LOW_STOCK" className="block text-center text-xs text-primary-600 hover:underline pt-2">
        View all →
      </Link>
    </div>
  );
}
