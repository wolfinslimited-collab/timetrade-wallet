import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Shield, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface RiskData {
  risk_score: number;
  risk_level: "Low" | "Medium" | "High";
  explanation: string;
  flags: string[];
}

interface TransactionRiskModalProps {
  open: boolean;
  address: string;
  chain: string;
  amount?: string;
  senderAddress?: string;
  onProceed: () => void;
  onCancel: () => void;
}

export const TransactionRiskModal = ({
  open,
  address,
  chain,
  amount,
  senderAddress,
  onProceed,
  onCancel,
}: TransactionRiskModalProps) => {
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch risk data when modal opens
  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    setError(null);
    setRiskData(null);
    
    supabase.functions.invoke("transaction-risk", {
      body: { address, chain, amount, senderAddress },
    }).then(({ data, error: fnError }) => {
      if (fnError) {
        setError("Could not analyze address risk");
        setRiskData({ risk_score: 15, risk_level: "Low", explanation: "Risk analysis unavailable.", flags: [] });
      } else {
        setRiskData(data);
      }
      setIsLoading(false);
    });
  }, [open, address, chain]);

  if (!open) return null;

  const isHigh = riskData?.risk_level === "High";
  const isMedium = riskData?.risk_level === "Medium";

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-background border border-border rounded-3xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {isLoading ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing recipient address...</p>
          </div>
        ) : (
          <>
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center",
                isHigh ? "bg-destructive/15" : isMedium ? "bg-amber-500/15" : "bg-success/15"
              )}>
                {isHigh ? (
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                ) : isMedium ? (
                  <Shield className="w-8 h-8 text-amber-500" />
                ) : (
                  <ShieldCheck className="w-8 h-8 text-success" />
                )}
              </div>
            </div>

            {/* Title */}
            <h3 className={cn(
              "text-xl font-bold text-center mb-1",
              isHigh ? "text-destructive" : isMedium ? "text-amber-500" : "text-success"
            )}>
              {isHigh ? "⚠️ High Risk Address" : isMedium ? "⚠️ Medium Risk" : "✅ Low Risk"}
            </h3>

            {/* Score */}
            <div className="flex justify-center mb-3">
              <span className={cn(
                "text-xs px-3 py-1 rounded-full font-medium",
                isHigh ? "bg-destructive/10 text-destructive" : isMedium ? "bg-amber-500/10 text-amber-500" : "bg-success/10 text-success"
              )}>
                Risk Score: {riskData?.risk_score || 0}/100
              </span>
            </div>

            {/* Explanation */}
            <p className="text-sm text-muted-foreground text-center mb-4">
              {riskData?.explanation}
            </p>

            {/* Flags */}
            {riskData?.flags && riskData.flags.length > 0 && (
              <div className="mb-4 space-y-1.5">
                {riskData.flags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertTriangle className="w-3 h-3 mt-0.5 text-amber-500 shrink-0" />
                    <span>{flag}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {isHigh && (
                <Button
                  variant="outline"
                  className="flex-1 h-12 border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              )}
              <Button
                className={cn(
                  "flex-1 h-12",
                  isHigh ? "bg-destructive hover:bg-destructive/90" : ""
                )}
                onClick={onProceed}
              >
                {isHigh ? "Proceed Anyway" : "Continue"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
