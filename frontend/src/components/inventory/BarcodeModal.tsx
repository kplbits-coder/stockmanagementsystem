'use client';
import { useEffect, useRef, useState } from 'react';
import { X, Download, Printer, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  product: {
    id: string;
    name: string;
    sku: string;
    barcode?: string | null;
  };
  onClose: () => void;
  onBarcodeGenerated?: (barcode: string) => void;
}

export default function BarcodeModal({ product, onClose, onBarcodeGenerated }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [barcode, setBarcode] = useState(product.barcode || '');
  const [inputBarcode, setInputBarcode] = useState(product.barcode || '');
  const [error, setError] = useState('');

  // Generate a random EAN-13 barcode from SKU if none exists
  const generateBarcode = () => {
    // Use SKU chars to seed a numeric barcode
    const numeric = product.sku
      .replace(/[^0-9]/g, '')
      .padEnd(12, '0')
      .slice(0, 12);
    // Calculate EAN-13 check digit
    const digits = numeric.split('').map(Number);
    const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
    const checkDigit = (10 - (sum % 10)) % 10;
    const generated = numeric + checkDigit;
    setBarcode(generated);
    setInputBarcode(generated);
    setError('');
  };

  useEffect(() => {
    if (!barcode || !svgRef.current) return;

    const renderBarcode = async () => {
      try {
        const JsBarcode = (await import('jsbarcode')).default;
        JsBarcode(svgRef.current, barcode, {
          format: 'CODE128',
          width: 2,
          height: 80,
          displayValue: true,
          fontSize: 14,
          margin: 10,
          background: '#ffffff',
          lineColor: '#000000',
        });
        setError('');
      } catch {
        setError('Invalid barcode value');
      }
    };

    renderBarcode();
  }, [barcode]);

  const handleApply = () => {
    if (!inputBarcode.trim()) {
      setError('Barcode cannot be empty');
      return;
    }
    setBarcode(inputBarcode.trim());
  };

  const handleSave = () => {
    if (!barcode) return;
    onBarcodeGenerated?.(barcode);
    toast.success('Barcode saved to product');
    onClose();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !svgRef.current) return;

    const svgContent = svgRef.current.outerHTML;
    printWindow.document.write(`
      <html>
        <head>
          <title>Barcode - ${product.name}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 20px; }
            .label { display: inline-block; border: 1px solid #ccc; padding: 16px; border-radius: 8px; }
            h3 { margin: 0 0 4px; font-size: 14px; }
            p { margin: 0 0 8px; font-size: 11px; color: #666; }
          </style>
        </head>
        <body>
          <div class="label">
            <h3>${product.name}</h3>
            <p>SKU: ${product.sku}</p>
            ${svgContent}
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barcode-${product.sku}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Barcode</h2>
            <p className="text-xs text-gray-500 mt-0.5">{product.name} · {product.sku}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Barcode preview */}
          <div className="flex items-center justify-center bg-white border border-gray-200 rounded-xl p-4 min-h-[140px]">
            {barcode ? (
              <svg ref={svgRef} />
            ) : (
              <div className="text-center text-gray-400">
                <p className="text-sm">No barcode assigned</p>
                <p className="text-xs mt-1">Enter a value or auto-generate below</p>
              </div>
            )}
          </div>

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          {/* Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Barcode Value
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input-field flex-1"
                placeholder="Enter barcode..."
                value={inputBarcode}
                onChange={(e) => setInputBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApply()}
              />
              <button onClick={handleApply} className="btn-secondary px-3">
                Apply
              </button>
            </div>
          </div>

          {/* Auto-generate */}
          <button
            onClick={generateBarcode}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Auto-generate from SKU
          </button>

          {/* Actions */}
          {barcode && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={handlePrint}
                className="btn-secondary flex items-center justify-center gap-1.5 text-sm"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={handleDownload}
                className="btn-secondary flex items-center justify-center gap-1.5 text-sm"
              >
                <Download className="w-4 h-4" />
                SVG
              </button>
              {onBarcodeGenerated && (
                <button
                  onClick={handleSave}
                  className="btn-primary flex items-center justify-center gap-1.5 text-sm"
                >
                  Save
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
