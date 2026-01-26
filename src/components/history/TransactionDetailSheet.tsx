import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownLeft, ArrowRightLeft, ExternalLink, Copy, Check, Clock, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { Transaction, TransactionType, TransactionStatus } from "@/pages/TransactionHistoryPage";

interface TransactionDetailSheetProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export const TransactionDetailSheet = ({ transaction, onClose }: TransactionDetailSheetProps) => {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!transaction) return null;

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({
      title: "Copied!",
      description: `${field} copied to clipboard`,
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getIcon = (type: TransactionType) => {
    switch (type) {
      case "send": return ArrowUpRight;
      case "receive": return ArrowDownLeft;
      case "swap": return ArrowRightLeft;
    }
  };

  const getStatusIcon = (status: TransactionStatus) => {
    switch (status) {
      case "completed": return CheckCircle;
      case "pending": return Clock;
      case "failed": return XCircle;
    }
  };

  const getStatusColor = (status: TransactionStatus) => {
    switch (status) {
      case "completed": return "text-primary bg-primary/10";
      case "pending": return "text-amber-500 bg-amber-500/10";
      case "failed": return "text-destructive bg-destructive/10";
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 12)}...${addr.slice(-10)}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const Icon = getIcon(transaction.type);
  const StatusIcon = getStatusIcon(transaction.status);

  return (
    <Sheet open={!!transaction} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl bg-background border-border p-0">
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle className="text-xl font-bold capitalize">
            {transaction.type} Details
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full px-6 pb-8 overflow-y-auto">
          {/* Status and Amount */}
          <div className="text-center py-6">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
              transaction.type === "send" ? "bg-red-500/10" :
              transaction.type === "receive" ? "bg-green-500/10" :
              "bg-blue-500/10"
            )}>
              <Icon className={cn(
                "w-8 h-8",
                transaction.type === "send" ? "text-red-500" :
                transaction.type === "receive" ? "text-green-500" :
                "text-blue-500"
              )} />
            </div>

            {transaction.type === "swap" ? (
              <div className="flex items-center justify-center gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {transaction.amount} {transaction.symbol}
                  </p>
                  <p className="text-sm text-muted-foreground">{transaction.icon}</p>
                </div>
                <ArrowRightLeft className="w-5 h-5 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {transaction.swapTo?.amount} {transaction.swapTo?.symbol}
                  </p>
                  <p className="text-sm text-muted-foreground">{transaction.swapTo?.icon}</p>
                </div>
              </div>
            ) : (
              <>
                <p className={cn(
                  "text-3xl font-bold",
                  transaction.type === "send" ? "text-red-500" : "text-green-500"
                )}>
                  {transaction.type === "send" ? "-" : "+"}
                  {transaction.amount} {transaction.symbol}
                </p>
                <p className="text-muted-foreground mt-1">
                  ≈ ${transaction.usdValue.toLocaleString()}
                </p>
              </>
            )}

            {/* Status Badge */}
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-full mt-4",
              getStatusColor(transaction.status)
            )}>
              <StatusIcon className="w-4 h-4" />
              <span className="text-sm font-medium capitalize">{transaction.status}</span>
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {/* Date */}
            <div className="p-4 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Date</span>
              <span className="text-sm font-medium">{formatDate(transaction.timestamp)}</span>
            </div>

            {/* Address (for send/receive) */}
            {transaction.address && (
              <div className="p-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-muted-foreground">
                    {transaction.type === "send" ? "To" : "From"}
                  </span>
                  <button
                    onClick={() => handleCopy(transaction.address!, "Address")}
                    className="text-primary text-xs flex items-center gap-1 hover:underline"
                  >
                    {copiedField === "Address" ? (
                      <><Check className="w-3 h-3" /> Copied</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copy</>
                    )}
                  </button>
                </div>
                <p className="font-mono text-sm break-all">{transaction.address}</p>
              </div>
            )}

            {/* Network Fee */}
            <div className="p-4 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Network Fee</span>
              <span className="text-sm font-mono">
                {transaction.networkFee > 0 ? `${transaction.networkFee} ETH` : "Free"}
              </span>
            </div>

            {/* Transaction Hash */}
            <div className="p-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-muted-foreground">Transaction Hash</span>
                <button
                  onClick={() => handleCopy(transaction.txHash, "Hash")}
                  className="text-primary text-xs flex items-center gap-1 hover:underline"
                >
                  {copiedField === "Hash" ? (
                    <><Check className="w-3 h-3" /> Copied</>
                  ) : (
                    <><Copy className="w-3 h-3" /> Copy</>
                  )}
                </button>
              </div>
              <p className="font-mono text-sm text-muted-foreground">
                {formatAddress(transaction.txHash)}
              </p>
            </div>

            {/* Network */}
            <div className="p-4 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Network</span>
              <span className="text-sm font-medium">Ethereum Mainnet</span>
            </div>
          </div>

          {/* View on Explorer */}
          <Button
            variant="outline"
            onClick={() => window.open(`https://etherscan.io/tx/${transaction.txHash}`, "_blank")}
            className="mt-4 h-12 border-border bg-card hover:bg-secondary"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View on Explorer
          </Button>

          {/* Close Button */}
          <Button
            onClick={onClose}
            className="mt-3 h-12 bg-primary hover:bg-primary/90"
          >
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
