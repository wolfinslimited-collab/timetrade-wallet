import { useState, useEffect, useRef, useCallback } from "react";
import { X, Camera, ScanLine } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Capacitor } from "@capacitor/core";

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (address: string) => void;
}

const SCANNER_ID = "qr-reader";
const isNative = Capacitor.isNativePlatform();

let Html5QrcodeModule: typeof import("html5-qrcode") | null = null;
let BarcodeScannerModule: any = null;

function extractAddress(raw: string): string {
  // Handle ethereum:0x... or bitcoin:bc1... URI schemes
  const colonIdx = raw.indexOf(":");
  if (colonIdx > 0 && colonIdx < 12) {
    const afterColon = raw.substring(colonIdx + 1);
    // Strip query params like ?amount=...
    const qIdx = afterColon.indexOf("?");
    return qIdx > 0 ? afterColon.substring(0, qIdx) : afterColon;
  }
  return raw.trim();
}

export const QRScannerModal = ({ open, onClose, onScan }: QRScannerModalProps) => {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const scannedRef = useRef(false);
  const [nativeScanning, setNativeScanning] = useState(false);

  const stopWebScanner = useCallback(async () => {
    try {
      const scanner = scannerRef.current;
      if (scanner) {
        const state = scanner.getState();
        // 2 = SCANNING, 3 = PAUSED
        if (state === 2 || state === 3) {
          await scanner.stop();
        }
        scanner.clear();
      }
    } catch {
      // ignore cleanup errors
    }
    scannerRef.current = null;
  }, []);

  // Native scanner flow (iOS/Android)
  useEffect(() => {
    if (!open || !isNative) return;

    scannedRef.current = false;
    setError(null);
    let cancelled = false;

    const runNativeScan = async () => {
      try {
        if (!BarcodeScannerModule) {
          BarcodeScannerModule = await import("@capacitor-mlkit/barcode-scanning");
        }
        const { BarcodeScanner, BarcodeFormat } = BarcodeScannerModule;

        const permResult = await BarcodeScanner.requestPermissions();
        if (permResult.camera === "denied") {
          setError("Camera permission denied. Please allow camera access in your device settings.");
          return;
        }

        setNativeScanning(true);
        const { barcodes } = await BarcodeScanner.scan({
          formats: [BarcodeFormat.QrCode],
        });

        if (cancelled) return;
        setNativeScanning(false);

        if (barcodes.length > 0 && !scannedRef.current) {
          scannedRef.current = true;
          const address = extractAddress(barcodes[0].rawValue || "");
          onScan(address);
        }
        onClose();
      } catch (err: unknown) {
        if (cancelled) return;
        setNativeScanning(false);
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("canceled") || msg.includes("cancelled")) {
          onClose();
        } else {
          setError("Could not start camera. " + msg);
        }
      }
    };

    runNativeScan();

    return () => {
      cancelled = true;
      setNativeScanning(false);
    };
  }, [open, onScan, onClose]);

  // Web scanner flow
  useEffect(() => {
    if (!open || isNative) return;

    scannedRef.current = false;
    setError(null);

    // Check if mediaDevices is available (not available in sandboxed iframes)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera scanning isn't available in the in-app preview. Open the published URL or paste the address manually.");
      return;
    }

    // Start immediately (no setTimeout) to stay within user-gesture chain
    let mounted = true;
    const startWebScanner = async () => {
      try {
        if (!Html5QrcodeModule) {
          Html5QrcodeModule = await import("html5-qrcode");
        }
        if (!mounted) return;
        const scanner = new Html5QrcodeModule.Html5Qrcode(SCANNER_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (scannedRef.current) return;
            scannedRef.current = true;
            const address = extractAddress(decodedText);
            onScan(address);
            stopWebScanner();
          },
          () => {}
        );
      } catch (err: unknown) {
        if (!mounted) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
          setError("Camera permission denied. Please allow camera access in your device settings.");
        } else if (msg.includes("NotFoundError") || msg.includes("no camera")) {
          setError("No camera found on this device.");
        } else if (msg.includes("NotReadableError") || msg.includes("in use")) {
          setError("Camera is in use by another app.");
        } else if (msg.includes("not supported") || msg.includes("Camera streaming")) {
          setError("Camera scanning isn't available in this browser. Open the published URL or paste the address manually.");
        } else {
          setError("Could not start camera. " + msg);
        }
      }
    };

    startWebScanner();

    return () => {
      mounted = false;
      stopWebScanner();
    };
  }, [open, onScan, stopWebScanner]);

  const handleClose = () => {
    stopWebScanner();
    onClose();
  };

  // On native, if scanning is active the native UI takes over — show minimal dialog
  if (isNative && nativeScanning) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent hideClose className="sm:max-w-md p-0 bg-background border-border overflow-hidden">
        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold">Scan QR Code</h3>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-secondary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scanner Area */}
          <div className="aspect-square relative bg-black flex items-center justify-center overflow-hidden">
            {/* Live camera feed renders here */}
            <div id={SCANNER_ID} className="absolute inset-0 w-full h-full" />

            {/* Scanner Frame Overlay */}
            <div className="absolute inset-8 border-2 border-primary/50 rounded-2xl pointer-events-none z-10">
              <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
              <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
              <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
              <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />

              {/* Scanning line */}
              {!error && (
                <div className="absolute inset-0 overflow-hidden rounded-2xl">
                  <div
                    className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
                    style={{ animation: "scan 2s ease-in-out infinite" }}
                  />
                </div>
              )}
            </div>

            {/* Error state */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80">
                <div className="text-center px-6">
                  <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Hint */}
          <div className="p-4">
            <p className="text-xs text-muted-foreground text-center">
              Point your camera at a QR code to scan
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
