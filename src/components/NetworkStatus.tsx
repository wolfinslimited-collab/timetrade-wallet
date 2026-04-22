import { useState, useEffect } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

export const NetworkStatus = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
        <WifiOff className="w-10 h-10 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">No Internet Connection</h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-xs">
        Please check your Wi-Fi or mobile data and try again.
      </p>
      <button
        onClick={() => {
          if (navigator.onLine) {
            setIsOffline(false);
          }
        }}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm active:scale-95 transition-transform"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  );
};