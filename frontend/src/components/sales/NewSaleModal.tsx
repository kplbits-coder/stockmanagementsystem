'use client';
import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  X, Plus, Minus, Trash2, Search, Loader2, Camera,
  Banknote, Smartphone, Wallet, FileCheck, Package,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { productApi, saleApi, categoryApi } from '@/lib/api';
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

type PaymentMethod = 'CASH' | 'CHEQUE' | 'PHONEPAY' | 'ESEWA';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: any; color: string }[] = [
  { value: 'CASH',     label: 'Cash',     icon: Banknote,   color: 'text-green-600 bg-green-50 border-green-200' },
  { value: 'CHEQUE',   label: 'Cheque',   icon: FileCheck,  color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'PHONEPAY', label: 'PhonePay', icon: Smartphone, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { value: 'ESEWA',    label: 'eSewa',    icon: Wallet,     color: 'text-teal-600 bg-teal-50 border-teal-200' },
];

export default function NewSaleModal({ onClose, onSuccess }: Props) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPan, setCustomerPan] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [discount, setDiscount] = useState(0);
  const [showScanner, setShowScanner] = useState(false);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountPaid, setAmountPaid] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');

  // Fetch ALL products (no pagination — show everything)
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['all-products-for-sale'],
    queryFn: () => productApi.getAll({ limit: 500 }),
  });

  // Fetch categories for filter
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.getAll,
  });

  const allProducts: any[] = productsData?.data || [];
  const categories: any[] = categoriesData?.data || [];

  // Filter products by search text and category
  const filteredProducts = useMemo(() => {
    return allProducts.filter((p: any) => {
      if (!p.isActive || p.quantity === 0) return false; // hide out-of-stock
      const matchesSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode && p.barcode.includes(search));
      const matchesCategory = !categoryFilter || p.categoryId === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [allProducts, search, categoryFilter]);

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const taxAmount = cart.reduce((sum, i) => sum + (i.price * i.quantity * i.taxRate) / 100, 0);
  const total = subtotal + taxAmount - discount;
  const paid = Number(amountPaid) || 0;
  const change = Math.max(0, paid - total);

  // Auto-fill amount paid for non-cash methods
  useEffect(() => {
    if (paymentMethod !== 'CASH') {
      setAmountPaid(total > 0 ? total.toFixed(2) : '');
    }
  }, [total, paymentMethod]);

  const addToCart = (product: any) => {
    if (product.quantity === 0) { toast.error('Product is out of stock'); return; }
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) { toast.error('Insufficient stock'); return prev; }
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        productId: product.id, name: product.name, sku: product.sku,
        price: Number(product.price), taxRate: Number(product.taxRate),
        quantity: 1, maxQty: product.quantity,
      }];
    });
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
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const newQty = i.quantity + delta;
        if (newQty > i.maxQty) { toast.error('Insufficient stock'); return i; }
        return { ...i, quantity: newQty };
      }).filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (productId: string) => setCart((prev) => prev.filter((i) => i.productId !== productId));

  const isInCart = (productId: string) => cart.some((i) => i.productId === productId);
  const getCartQty = (productId: string) => cart.find((i) => i.productId === productId)?.quantity || 0;

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
    if (paymentMethod === 'CASH' && paid < total && paid > 0) {
      toast.error('Amount paid is less than total');
      return;
    }
    if (paymentMethod === 'CHEQUE' && !referenceNo.trim()) {
      toast.error('Please enter the cheque number'); return;
    }
    if ((paymentMethod === 'PHONEPAY' || paymentMethod === 'ESEWA') && !referenceNo.trim()) {
      toast.error(`Please enter a transaction ID for ${paymentMethod === 'PHONEPAY' ? 'PhonePay' : 'eSewa'}`);
      return;
    }

    mutation.mutate({
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      customerPan: customerPan || undefined,
      customerAddress: customerAddress || undefined,
      discount,
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      paymentMethod,
      amountPaid: paid || total,
      referenceNo: referenceNo || undefined,
      bankName: bankName || undefined,
      accountName: accountName || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New Sale</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowScanner(true)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Camera className="w-4 h-4" />
              Scan Barcode
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: All Products Grid */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200">
            {/* Search + Category Filter */}
            <div className="p-4 border-b border-gray-100 space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filter products..."
                    className="input-field pl-9 text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  className="input-field text-sm w-40"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-400">
                {filteredProducts.length} products available · Click to add to cart
              </p>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {productsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Package className="w-10 h-10 mb-2" />
                  <p className="text-sm">No products found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                  {filteredProducts.map((product: any) => {
                    const inCart = isInCart(product.id);
                    const cartQty = getCartQty(product.id);
                    return (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className={`text-left p-3 rounded-lg border transition-all ${
                          inCart
                            ? 'border-primary-300 bg-primary-50 ring-1 ring-primary-200'
                            : 'border-gray-200 hover:border-primary-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">{product.name}</p>
                          {inCart && (
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center">
                              {cartQty}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{product.sku}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-sm font-semibold text-primary-700">
                            {formatCurrency(product.price)}
                          </span>
                          <span className={`text-xs ${product.quantity <= product.minQuantity ? 'text-red-500' : 'text-gray-400'}`}>
                            {product.quantity} {product.unit}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Cart + Payment */}
          <div className="w-80 flex flex-col overflow-y-auto">
            {/* Cart Items */}
            <div className="p-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="font-semibold text-gray-900 text-sm mb-2">
                Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'})
              </h3>
              {cart.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">Click products to add them here</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">{formatCurrency(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(item.productId, -1)}
                          className="w-5 h-5 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100">
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                        <button onClick={() => updateQty(item.productId, 1)}
                          className="w-5 h-5 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100">
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <button onClick={() => removeItem(item.productId)} className="p-0.5 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer + Discount */}
            <div className="p-4 border-b border-gray-100 space-y-2 flex-shrink-0">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Customer</label>
                <input className="input-field text-sm" placeholder="Walk-in"
                  value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Phone</label>
                  <input className="input-field text-sm" placeholder="Optional"
                    value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">PAN No.</label>
                  <input className="input-field text-sm" placeholder="Customer PAN"
                    value={customerPan} onChange={(e) => setCustomerPan(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Address</label>
                <input className="input-field text-sm" placeholder="Customer address"
                  value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
              </div>
              <div className="w-full">
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Discount (Rs.)</label>
                <input type="number" min="0" className="input-field text-sm"
                  value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
              </div>
            </div>

            {/* Totals */}
            <div className="p-4 border-b border-gray-100 space-y-1 flex-shrink-0">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Tax</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-xs text-red-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm border-t border-gray-200 pt-1.5 mt-1.5">
                <span>Total</span>
                <span className="text-primary-600">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Payment</p>
              <div className="grid grid-cols-4 gap-1.5">
                {PAYMENT_METHODS.map((m) => {
                  const Icon = m.icon;
                  const active = paymentMethod === m.value;
                  return (
                    <button
                      key={m.value}
                      onClick={() => {
                        setPaymentMethod(m.value);
                        setReferenceNo('');
                        setBankName('');
                        setAccountName('');
                        if (m.value !== 'CASH') setAmountPaid(total.toFixed(2));
                        else setAmountPaid('');
                      }}
                      className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border transition-all text-xs font-medium ${
                        active
                          ? m.color + ' border-current'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px]">{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Cash */}
              {paymentMethod === 'CASH' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Amount Received</label>
                    <input type="number" min="0" step="0.01" className="input-field text-sm"
                      placeholder={total.toFixed(2)} value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)} />
                  </div>
                  {paid > 0 && paid >= total && (
                    <div className="flex justify-between text-xs bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5">
                      <span className="text-green-700">Change</span>
                      <span className="text-green-700 font-bold">{formatCurrency(change)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Cheque */}
              {paymentMethod === 'CHEQUE' && (
                <div className="space-y-2">
                  <input className="input-field text-sm" placeholder="Cheque Number *"
                    value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
                  <input className="input-field text-sm" placeholder="Bank Name"
                    value={bankName} onChange={(e) => setBankName(e.target.value)} />
                  <input className="input-field text-sm" placeholder="Account Holder"
                    value={accountName} onChange={(e) => setAccountName(e.target.value)} />
                </div>
              )}

              {/* PhonePay */}
              {paymentMethod === 'PHONEPAY' && (
                <input className="input-field text-sm" placeholder="PhonePay Transaction ID *"
                  value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
              )}

              {/* eSewa */}
              {paymentMethod === 'ESEWA' && (
                <input className="input-field text-sm" placeholder="eSewa Transaction ID *"
                  value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
              )}
            </div>

            {/* Submit */}
            <div className="p-4 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={handleSubmit}
                disabled={mutation.isPending || cart.length === 0}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
              >
                {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {mutation.isPending ? 'Processing...' : `Complete Sale · ${formatCurrency(total)}`}
              </button>
            </div>
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
