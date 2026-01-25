import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface BalanceDisplayProps {
  balance: number;
  changePercent: number;
}

export const BalanceDisplay = ({ balance, changePercent }: BalanceDisplayProps) => {
  const isPositive = changePercent >= 0;
  
  const formatBalance = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value).replace('$', '');
  };

  return (
    <div className="px-4 py-2">
      <p className="text-xs text-muted-foreground tracking-widest uppercase mb-1">
        Total Balance
      </p>
      <div className="flex items-baseline gap-3">
        <h1 className="text-4xl font-bold font-mono tracking-tight">
          <span className="text-muted-foreground">$</span>
          {formatBalance(balance)}
        </h1>
        <div className={cn(
          "flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium",
          isPositive 
            ? "text-primary bg-primary/10" 
            : "text-destructive bg-destructive/10"
        )}>
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>{isPositive ? "+" : ""}{changePercent.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};
