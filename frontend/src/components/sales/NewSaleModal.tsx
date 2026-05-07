'use client';
import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, Plus, Minus, Trash2, Search, Loader2, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { productApi, saleApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import BarcodeScanner from '@/components/sales/BarcodeScanner';

interface CartItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  taxRate: number;
  quantity: number;
  maxQty: number;
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewSaleModal({ onClose, onSuccess }: Props) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  const { data: searchData } = useQuery({
    queryKey: ['product-search', search],
    queryFn: () => productApi.getAll({ search, limit: 8 }),
    enabled: search.length > 1,
  });

  useEffect(() => {
    if (searchData?.data) {
      setSearchResults(searchData.data);
      setShowResults(true);
    }
  }, [searchData]);

  const addToCart = (product: any) => {
    if (product.quantity === 0) {
      toast.error('Product is out of stock');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          toast.error('Insufficient stock');
          return prev;
        }
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: Number(product.price),
          taxRate: Number(product.taxRate),
          quantity: 1,
          maxQty: product.quantity,
        },
      ];
    });
    setSearch('');
    setShowResults(false);
  };

  const handleBarcodeDetected = async (barcode: string) => {
    try {
      const res = await productApi.getByBarcode(barcode);
      addToCart(res.data);
      setShowScanner(false);
      toast.success(`Added: ${res.data.name}`);
    } catch {
      toast.error('Product not found for barcode: ' + barcode);
    }
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i;
          const newQty = i.quantity + delta;
          if (newQty > i.maxQty) { toast.error('Insufficient stock'); return i; }
          return { ...i, quantity: newQty };
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const taxAmount = cart.reduce((sum, i) => sum + (i.price * i.quantity * i.taxRate) / 100, 0);
  const total = subtotal + taxAmount - discount;

  const mutation = useMutation({
    mutationFn: saleApi.create,
    onSuccess: (data) => {
      toast.success(`Sale created! Invoice: ${data.data.invoiceNo}`);
      onSuccess();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create sale'),
  });

  const handleSubmit = () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    mutation.mutate({
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      discount,
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New Sale</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Product Search + Cart */}
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            {/* Search */}
            <div className="relative mb-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search product by name or SKU..."
                    className="input-field pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onFocus={() => search.length > 1 && setShowResults(true)}
                  />
                </div>
                <button
                  onClick={() => setShowScanner(true)}
                  className="btn-secondary flex items-center gap-2 px-3"
                  title="Scan barcode"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {searchResults.map((product: any) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(product.price)}</p>
                        <p className={`text-xs ${product.quantity === 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          {product.quantity} {product.unit}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cart */}
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Search className="w-10 h-10 mb-2" />
                  <p className="text-sm">Search and add products to cart</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">{formatCurrency(item.price)} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(item.productId, -1)}
                          className="w-7 h-7 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.productId, 1)}
                          className="w-7 h-7 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-sm font-semibold w-20 text-right">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Summary */}
          <div className="w-72 border-l border-gray-200 p-6 flex flex-col">
            <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name</label>
                <input
                  className="input-field text-sm"
                  placeholder="Walk-in customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input
                  className="input-field text-sm"
                  placeholder="Optional"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Discount ($)</label>
                <input
                  type="number"
                  min="0"
                  className="input-field text-sm"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-2 flex-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-2 mt-2">
                <span>Total</span>
                <span className="text-primary-600">{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={mutation.isPending || cart.length === 0}
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
            >
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Complete Sale
            </button>
          </div>
        </div>
      </div>

      {showScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
