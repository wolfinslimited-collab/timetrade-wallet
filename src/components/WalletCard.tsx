import { ArrowUpRight } from "lucide-react";
import { Sparkline } from "./Sparkline";
import { cn } from "@/lib/utils";

interface WalletCardProps {
  address: string;
  balance: number;
  transactions?: number;
  avatarGradient?: string;
  showSparkline?: boolean;
}

export const WalletCard = ({ 
  address, 
  balance, 
  transactions,
  avatarGradient = "from-primary/50 to-accent/50",
  showSparkline = true 
}: WalletCardProps) => {
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-3)}`;
  };

  const formatBalance = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border hover:border-primary/30 transition-all duration-200 group">
      {/* Avatar */}
      <div className={cn(
        "w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center overflow-hidden shrink-0",
        avatarGradient
      )}>
        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <span className="text-xl">🔮</span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-mono tracking-wider">
          [ {formatAddress(address)} ]
        </p>
        <p className="text-lg font-bold font-mono tracking-tight mt-0.5">
          {formatBalance(balance)}
        </p>
      </div>

      {/* Sparkline or Transactions */}
      <div className="flex items-center gap-2">
        {showSparkline ? (
          <Sparkline positive={true} />
        ) : transactions !== undefined ? (
          <span className="tx-badge">{transactions} transaction{transactions !== 1 ? 's' : ''}</span>
        ) : null}
        <button className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors opacity-0 group-hover:opacity-100">
          <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};
