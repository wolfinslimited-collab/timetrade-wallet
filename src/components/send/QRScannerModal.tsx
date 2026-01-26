import { useState, useEffect } from "react";
import { X, Camera, Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (address: string) => void;
}

export const QRScannerModal = ({ open, onClose, onScan }: QRScannerModalProps) => {
  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (open) {
      // Check camera permission
      navigator.mediaDevices?.getUserMedia({ video: true })
        .then(() => setHasPermission(true))
        .catch(() => setHasPermission(false));
    }
  }, [open]);

  const handleSimulateScan = () => {
    setScanning(true);
    // Simulate QR scan with a demo address
    setTimeout(() => {
      const demoAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f8c2B1";
      onScan(demoAddress);
      setScanning(false);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 bg-background border-border overflow-hidden">
        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold">Scan QR Code</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scanner Area */}
          <div className="aspect-square relative bg-black/90 flex items-center justify-center">
            {/* Scanner Frame */}
            <div className="absolute inset-8 border-2 border-primary/50 rounded-2xl">
              {/* Corner accents */}
              <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
              <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
              <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
              <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
              
              {/* Scanning line animation */}
              {scanning && (
                <div className="absolute inset-0 overflow-hidden rounded-2xl">
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-[scan_2s_ease-in-out_infinite]" 
                    style={{ 
                      animation: "scan 2s ease-in-out infinite",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Camera placeholder or status */}
            <div className="text-center z-10">
              {hasPermission === false ? (
                <>
                  <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">Camera access required</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Please enable camera permissions
                  </p>
                </>
              ) : scanning ? (
                <>
                  <Scan className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
                  <p className="text-primary text-sm">Scanning...</p>
                </>
              ) : (
                <>
                  <Scan className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">Position QR code in frame</p>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 space-y-3">
            <Button
              onClick={handleSimulateScan}
              disabled={scanning}
              className="w-full h-12 bg-primary hover:bg-primary/90"
            >
              {scanning ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  Scanning...
                </>
              ) : (
                <>
                  <Scan className="w-5 h-5 mr-2" />
                  Simulate QR Scan
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              In production, this would use the device camera
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
