'use client';
import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  X, Plus, Minus, Trash2, Search, Loader2, Camera,
  Banknote, Smartphone, Wallet, FileCheck,
} from 'lucide-react';
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
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountPaid, setAmountPaid] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');

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

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const taxAmount = cart.reduce((sum, i) => sum + (i.price * i.quantity * i.taxRate) / 100, 0);
  const total = subtotal + taxAmount - discount;
  const paid = Number(amountPaid) || 0;
  const change = Math.max(0, paid - total);

  // Auto-fill amount paid when total changes
  useEffect(() => {
    if (paymentMethod !== 'CASH') {
      setAmountPaid(total.toFixed(2));
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
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const newQty = i.quantity + delta;
        if (newQty > i.maxQty) { toast.error('Insufficient stock'); return i; }
        return { ...i, quantity: newQty };
      }).filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (productId: string) => setCart((prev) => prev.filter((i) => i.productId !== productId));

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
    if (paymentMethod === 'CASH' && paid < total) {
      toast.error(`Amount paid ($${paid.toFixed(2)}) is less than total ($${total.toFixed(2)})`);
      return;
    }
    if ((paymentMethod === 'PHONEPAY' || paymentMethod === 'ESEWA') && !referenceNo.trim()) {
      toast.error(`Please enter a transaction ID for ${paymentMethod === 'PHONEPAY' ? 'PhonePay' : 'eSewa'} payment`);
      return;
    }
    if (paymentMethod === 'CHEQUE' && !referenceNo.trim()) {
      toast.error('Please enter the cheque number'); return;
    }

    mutation.mutate({
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      discount,
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      paymentMethod,
      amountPaid: paid,
      referenceNo: referenceNo || undefined,
      bankName: bankName || undefined,
      accountName: accountName || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col">
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
                        <p className="text-xs text-gray-400">{formatCurrency(item.price)} each · Tax {item.taxRate}%</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.productId, -1)}
                          className="w-7 h-7 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button onClick={() => updateQty(item.productId, 1)}
                          className="w-7 h-7 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-sm font-semibold w-20 text-right">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                      <button onClick={() => removeItem(item.productId)} className="p-1 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Summary + Payment */}
          <div className="w-80 border-l border-gray-200 flex flex-col overflow-y-auto">
            <div className="p-5 space-y-4 flex-1">
              <h3 className="font-semibold text-gray-900">Order Summary</h3>

              {/* Customer */}
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name</label>
                  <input className="input-field text-sm" placeholder="Walk-in customer"
                    value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input className="input-field text-sm" placeholder="Optional"
                    value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Discount ($)</label>
                  <input type="number" min="0" className="input-field text-sm"
                    value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 pt-3 space-y-1.5">
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
                <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
                  <span>Total</span>
                  <span className="text-primary-600">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="border-t border-gray-200 pt-3">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Payment Method
                </p>
                <div className="grid grid-cols-3 gap-2">
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
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all text-xs font-medium ${
                          active
                            ? m.color + ' border-current'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment Details — dynamic by method */}
              <div className="space-y-2">
                {/* Cash: amount paid + change */}
                {paymentMethod === 'CASH' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Amount Received ($)
                      </label>
                      <input
                        type="number"
                        min={total}
                        step="0.01"
                        className="input-field text-sm"
                        placeholder={total.toFixed(2)}
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                      />
                    </div>
                    {paid > 0 && paid >= total && (
                      <div className="flex justify-between text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <span className="text-green-700 font-medium">Change</span>
                        <span className="text-green-700 font-bold">{formatCurrency(change)}</span>
                      </div>
                    )}
                    {paid > 0 && paid < total && (
                      <div className="flex justify-between text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        <span className="text-red-600 font-medium">Remaining</span>
                        <span className="text-red-600 font-bold">{formatCurrency(total - paid)}</span>
                      </div>
                    )}
                  </>
                )}

                {/* Cheque */}
                {paymentMethod === 'CHEQUE' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Cheque Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        className="input-field text-sm"
                        placeholder="e.g. CHQ-001234"
                        value={referenceNo}
                        onChange={(e) => setReferenceNo(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Bank Name
                      </label>
                      <input
                        className="input-field text-sm"
                        placeholder="e.g. Nepal Bank Ltd"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Account Holder Name
                      </label>
                      <input
                        className="input-field text-sm"
                        placeholder="Name on cheque"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* PhonePay */}
                {paymentMethod === 'PHONEPAY' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      PhonePay Transaction ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      className="input-field text-sm"
                      placeholder="e.g. PP-TXN123456789"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Enter the transaction ID from the PhonePay confirmation.
                    </p>
                  </div>
                )}

                {/* eSewa */}
                {paymentMethod === 'ESEWA' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      eSewa Transaction ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      className="input-field text-sm"
                      placeholder="e.g. ESW-TXN123456789"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Enter the transaction ID from the eSewa confirmation.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Complete Sale button */}
            <div className="p-5 border-t border-gray-200">
              <button
                onClick={handleSubmit}
                disabled={mutation.isPending || cart.length === 0}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
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
