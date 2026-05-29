'use client';
import { useEffect, useRef, useState } from 'react';
import { X, Camera, Keyboard } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const [manualBarcode, setManualBarcode] = useState('');
  const [mode, setMode] = useState<'camera' | 'manual'>('manual');
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef<HTMLDivElement>(null);
  const quaggaRef = useRef<any>(null);
  const detectedRef = useRef(false);

  useEffect(() => {
    if (mode !== 'camera') return;

    detectedRef.current = false;
    setCameraError('');

    const initScanner = async () => {
      try {
        // Dynamic import with webpackIgnore so Next.js never statically analyses
        // this import and tries to bundle sharp/native deps at build time
        const Quagga = (
          await import(/* webpackIgnore: true */ '@ericblade/quagga2')
        ).default;

        quaggaRef.current = Quagga;

        await new Promise<void>((resolve, reject) => {
          Quagga.init(
            {
              inputStream: {
                type: 'LiveStream',
                target: scannerRef.current!,
                constraints: {
                  width: { min: 320 },
                  height: { min: 240 },
                  facingMode: 'environment',
                },
              } as any,
              decoder: {
                readers: [
                  'ean_reader',
                  'ean_8_reader',
                  'code_128_reader',
                  'code_39_reader',
                  'upc_reader',
                  'upc_e_reader',
                ],
              },
              locate: true,
            },
            (err: any) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        Quagga.start();

        Quagga.onDetected((result: any) => {
          const code = result?.codeResult?.code;
          if (code && !detectedRef.current) {
            detectedRef.current = true;
            Quagga.stop();
            onDetected(code);
          }
        });
      } catch (err: any) {
        const msg =
          err?.name === 'NotAllowedError'
            ? 'Camera permission denied. Please allow camera access.'
            : err?.name === 'NotFoundError'
            ? 'No camera found on this device.'
            : 'Camera unavailable. Use manual entry.';
        setCameraError(msg);
        toast.error(msg);
        setMode('manual');
      }
    };

    initScanner();

    return () => {
      if (quaggaRef.current) {
        try { quaggaRef.current.stop(); } catch {}
        quaggaRef.current = null;
      }
    };
  }, [mode, onDetected]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      onDetected(manualBarcode.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Barcode Scanner</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Mode toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('camera')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === 'camera'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Camera className="w-4 h-4" />
              Camera
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === 'manual'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Keyboard className="w-4 h-4" />
              Manual Entry
            </button>
          </div>

          {mode === 'camera' ? (
            <div>
              <div
                ref={scannerRef}
                className="w-full h-56 bg-black rounded-lg overflow-hidden relative"
              >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="w-52 h-20 border-2 border-primary-400 rounded-lg" />
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">
                Point camera at barcode to scan automatically
              </p>
              {cameraError && (
                <p className="text-xs text-red-500 text-center mt-1">{cameraError}</p>
              )}
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter Barcode
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Type or scan barcode here..."
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">
                  You can also plug in a USB barcode scanner and scan directly into this field.
                </p>
              </div>
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={!manualBarcode.trim()}
              >
                Search Product
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
