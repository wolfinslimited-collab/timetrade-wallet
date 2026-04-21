import { useState, useEffect, useRef, useCallback } from "react";
import { X, Camera } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (address: string) => void;
}

const SCANNER_ID = "qr-reader";

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
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false);

  const stopScanner = useCallback(async () => {
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

  useEffect(() => {
    if (!open) return;

    scannedRef.current = false;
    setError(null);

    // Small delay to let the DOM element render
    const timeout = setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode(SCANNER_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (scannedRef.current) return;
            scannedRef.current = true;
            const address = extractAddress(decodedText);
            onScan(address);
            stopScanner();
          },
          () => {
            // ignore non-match frames
          }
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
          setError("Camera permission denied. Please allow camera access in your device settings.");
        } else if (msg.includes("NotFoundError") || msg.includes("no camera")) {
          setError("No camera found on this device.");
        } else if (msg.includes("NotReadableError") || msg.includes("in use")) {
          setError("Camera is in use by another app.");
        } else {
          setError("Could not start camera. " + msg);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      stopScanner();
    };
  }, [open, onScan, stopScanner]);

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 bg-background border-border overflow-hidden">
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
