import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Wallet, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TradeAccountWalletProps {
  solWallet: string | null;
  solBalance: number;
}

/**
 * Deposit / wallet card for the Trade Account tab.
 * Shows the user's SOL deposit address from the Timetrade Mobile API,
 * with a copy button, expandable QR code, and on-chain explorer link.
 * No withdrawals — this is read-only for now.
 */
export const TradeAccountWallet = ({ solWallet, solBalance }: TradeAccountWalletProps) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const handleCopy = async () => {
    if (!solWallet) return;
    try {
      await navigator.clipboard.writeText(solWallet);
      setCopied(true);
      toast.success("Address copied", { description: "Solana deposit address ready to paste." });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Copy failed");
    }
  };

  const truncated = solWallet
    ? `${solWallet.slice(0, 6)}...${solWallet.slice(-6)}`
    : "Not yet generated";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-card via-card to-card/40 p-4 shadow-xl shadow-black/5">
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary/10 blur-3xl -translate-y-1/2 translate-x-1/4" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.15em]">
                Deposit Address
              </p>
              <p className="text-[13px] font-bold text-foreground tracking-tight leading-tight">
                Solana Network
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">SOL Balance</p>
            <p className="text-[13px] font-bold font-mono text-foreground tabular-nums">
              {solBalance.toFixed(4)}
            </p>
          </div>
        </div>

        {/* Address pill */}
        <button
          onClick={handleCopy}
          disabled={!solWallet}
          className={cn(
            "w-full flex items-center justify-between gap-2 rounded-2xl border border-border/40 bg-background/60 px-3.5 py-3 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed",
            "hover:border-border/70 transition-colors"
          )}
        >
          <span className="text-[13px] font-mono text-foreground/90 truncate tracking-tight">
            {truncated}
          </span>
          <div
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
              copied
                ? "bg-success/15 border-success/30 text-success"
                : "bg-card/60 border-border/40 text-muted-foreground"
            )}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </div>
        </button>

        {/* Action row */}
        {solWallet && (
          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={() => setShowQR((v) => !v)}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-card/60 border border-border/40 text-[11px] font-semibold text-foreground active:scale-[0.99] hover:border-border/70 transition-colors"
            >
              {showQR ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Hide QR
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  Show QR
                </>
              )}
            </button>
            <a
              href={`https://solscan.io/account/${solWallet}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-card/60 border border-border/40 text-[11px] font-semibold text-foreground active:scale-[0.99] hover:border-border/70 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Explorer
            </a>
          </div>
        )}

        {/* QR */}
        {showQR && solWallet && (
          <div className="mt-3 flex flex-col items-center gap-2 rounded-2xl border border-border/40 bg-background/60 p-4">
            <div className="rounded-xl bg-white p-3">
              <QRCodeSVG value={solWallet} size={160} level="M" includeMargin={false} />
            </div>
            <p className="text-[10px] text-muted-foreground text-center max-w-[220px] leading-snug">
              Send only <span className="font-bold text-foreground">SOL</span> or{" "}
              <span className="font-bold text-foreground">SPL tokens</span> on Solana to this address.
            </p>
          </div>
        )}

        {!solWallet && (
          <p className="text-[10px] text-muted-foreground text-center mt-2.5 leading-snug">
            Deposit address is being generated. Pull to refresh in a moment.
          </p>
        )}
      </div>
    </div>
  );
};
