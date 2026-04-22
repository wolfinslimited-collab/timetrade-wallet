import { useState, useEffect } from "react";
import { AlertTriangle, Shield, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { projectASupabase } from "@/lib/externalSupabase";

interface RiskData {
  risk_score: number;
  risk_level: "Low" | "Medium" | "High";
  explanation: string;
  flags: string[];
}

interface RiskCheckStepProps {
  address: string;
  chain: string;
  amount?: string;
  senderAddress?: string;
  onProceed: () => void;
  onCancel: () => void;
}

export const RiskCheckStep = ({
  address,
  chain,
  amount,
  senderAddress,
  onProceed,
  onCancel,
}: RiskCheckStepProps) => {
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setRiskData(null);

    projectASupabase.functions
      .invoke("transaction-risk", {
        body: { address, chain, amount, senderAddress },
      })
      .then(({ data, error: fnError }) => {
        if (fnError) {
          setError("Could not analyze address risk");
          setRiskData({
            risk_score: 15,
            risk_level: "Low",
            explanation: "Risk analysis unavailable.",
            flags: [],
          });
        } else {
          setRiskData(data);
        }
        setIsLoading(false);
      });
  }, [address, chain]);

  const isHigh = riskData?.risk_level === "High";
  const isMedium = riskData?.risk_level === "Medium";

  return (
    <div className="flex flex-col items-center px-6 py-8 flex-1">
      {isLoading ? (
        <div className="flex flex-col items-center gap-4 py-16">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analyzing recipient address...</p>
        </div>
      ) : (
        <>
          {/* Icon */}
          <div
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center mb-5",
              isHigh
                ? "bg-destructive/15"
                : isMedium
                ? "bg-amber-500/15"
                : "bg-success/15"
            )}
          >
            {isHigh ? (
              <AlertTriangle className="w-10 h-10 text-destructive" />
            ) : isMedium ? (
              <Shield className="w-10 h-10 text-amber-500" />
            ) : (
              <ShieldCheck className="w-10 h-10 text-success" />
            )}
          </div>

          {/* Title */}
          <h3
            className={cn(
              "text-2xl font-bold text-center mb-2",
              isHigh
                ? "text-destructive"
                : isMedium
                ? "text-amber-500"
                : "text-success"
            )}
          >
            {isHigh
              ? "⚠️ High Risk Address"
              : isMedium
              ? "⚠️ Medium Risk"
              : "✅ Low Risk"}
          </h3>

          {/* Score */}
          <div className="mb-4">
            <span
              className={cn(
                "text-xs px-3 py-1 rounded-full font-medium",
                isHigh
                  ? "bg-destructive/10 text-destructive"
                  : isMedium
                  ? "bg-amber-500/10 text-amber-500"
                  : "bg-success/10 text-success"
              )}
            >
              Risk Score: {riskData?.risk_score || 0}/100
            </span>
          </div>

          {/* Explanation */}
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
            {riskData?.explanation}
          </p>

          {/* Flags */}
          {riskData?.flags && riskData.flags.length > 0 && (
            <div className="mb-6 space-y-2 w-full max-w-xs">
              {riskData.flags.map((flag, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <AlertTriangle className="w-3 h-3 mt-0.5 text-amber-500 shrink-0" />
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 w-full mt-auto px-2" style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}>
            {isHigh && (
              <Button
                variant="outline"
                className="flex-1 h-14 text-base border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
            <Button
              className={cn(
                "flex-1 h-14 text-base",
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
  );
};
