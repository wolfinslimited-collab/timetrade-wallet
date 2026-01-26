import { useState } from "react";
import { ChevronLeft, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Search, Filter, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransactionDetailSheet } from "@/components/history/TransactionDetailSheet";

export type TransactionType = "send" | "receive" | "swap";
export type TransactionStatus = "completed" | "pending" | "failed";

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  symbol: string;
  icon: string;
  usdValue: number;
  address?: string;
  swapTo?: { amount: number; symbol: string; icon: string };
  timestamp: Date;
  txHash: string;
  networkFee: number;
}

// Mock transaction data
const mockTransactions: Transaction[] = [
  {
    id: "1",
    type: "send",
    status: "completed",
    amount: 0.5,
    symbol: "ETH",
    icon: "⟠",
    usdValue: 1622.84,
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f8c2B1",
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    txHash: "0x1234567890abcdef1234567890abcdef12345678",
    networkFee: 0.002,
  },
  {
    id: "2",
    type: "receive",
    status: "completed",
    amount: 100,
    symbol: "USDT",
    icon: "₮",
    usdValue: 100,
    address: "0xabcd1234efgh5678ijkl9012mnop3456qrst7890",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    txHash: "0xabcdef1234567890abcdef1234567890abcdef12",
    networkFee: 0.001,
  },
  {
    id: "3",
    type: "swap",
    status: "completed",
    amount: 0.1,
    symbol: "ETH",
    icon: "⟠",
    usdValue: 324.57,
    swapTo: { amount: 324.57, symbol: "USDC", icon: "$" },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    txHash: "0x567890abcdef1234567890abcdef1234567890ab",
    networkFee: 0.003,
  },
  {
    id: "4",
    type: "receive",
    status: "pending",
    amount: 0.05,
    symbol: "BTC",
    icon: "₿",
    usdValue: 3394.51,
    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    timestamp: new Date(Date.now() - 1000 * 60 * 10), // 10 min ago
    txHash: "0x890abcdef1234567890abcdef1234567890abcde",
    networkFee: 0,
  },
  {
    id: "5",
    type: "send",
    status: "failed",
    amount: 50,
    symbol: "USDC",
    icon: "$",
    usdValue: 50,
    address: "0x9999888877776666555544443333222211110000",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    txHash: "0xcdef1234567890abcdef1234567890abcdef1234",
    networkFee: 0.001,
  },
  {
    id: "6",
    type: "swap",
    status: "completed",
    amount: 500,
    symbol: "USDT",
    icon: "₮",
    usdValue: 500,
    swapTo: { amount: 0.154, symbol: "ETH", icon: "⟠" },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    txHash: "0xef1234567890abcdef1234567890abcdef123456",
    networkFee: 0.002,
  },
];

type FilterType = "all" | TransactionType;

interface TransactionHistoryPageProps {
  onBack: () => void;
}

export const TransactionHistoryPage = ({ onBack }: TransactionHistoryPageProps) => {
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const filteredTransactions = mockTransactions.filter((tx) => {
    if (filter !== "all" && tx.type !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        tx.symbol.toLowerCase().includes(query) ||
        tx.address?.toLowerCase().includes(query) ||
        tx.txHash.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Group transactions by date
  const groupedTransactions = filteredTransactions.reduce((groups, tx) => {
    const date = tx.timestamp.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: tx.timestamp.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(tx);
    return groups;
  }, {} as Record<string, Transaction[]>);

  const getIcon = (type: TransactionType) => {
    switch (type) {
      case "send": return ArrowUpRight;
      case "receive": return ArrowDownLeft;
      case "swap": return ArrowRightLeft;
    }
  };

  const getStatusColor = (status: TransactionStatus) => {
    switch (status) {
      case "completed": return "text-primary";
      case "pending": return "text-amber-500";
      case "failed": return "text-destructive";
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button 
          onClick={onBack}
          className="p-2 rounded-full bg-card border border-border hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex-1">Transaction History</h1>
      </div>

      {/* Search Bar */}
      <div className="px-4 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transactions..."
            className="w-full h-12 pl-10 pr-4 rounded-xl bg-card border border-border focus:border-primary/50 focus:outline-none text-sm"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 px-4 py-4 overflow-x-auto">
        {(["all", "send", "receive", "swap"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:border-primary/50"
            )}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="flex-1 px-4 pb-8">
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Filter className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No transactions found</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-primary text-sm mt-2 hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          Object.entries(groupedTransactions).map(([date, transactions]) => (
            <div key={date} className="mb-6">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                {date}
              </h3>
              <div className="space-y-2">
                {transactions.map((tx) => {
                  const Icon = getIcon(tx.type);
                  return (
                    <button
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors text-left"
                    >
                      {/* Icon */}
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        tx.type === "send" ? "bg-red-500/10" :
                        tx.type === "receive" ? "bg-green-500/10" :
                        "bg-blue-500/10"
                      )}>
                        <Icon className={cn(
                          "w-5 h-5",
                          tx.type === "send" ? "text-red-500" :
                          tx.type === "receive" ? "text-green-500" :
                          "text-blue-500"
                        )} />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium capitalize">{tx.type}</p>
                          {tx.status !== "completed" && (
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              tx.status === "pending" ? "bg-amber-500/10 text-amber-500" : "bg-destructive/10 text-destructive"
                            )}>
                              {tx.status}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tx.type === "swap" 
                            ? `${tx.symbol} → ${tx.swapTo?.symbol}`
                            : formatTime(tx.timestamp)}
                        </p>
                      </div>

                      {/* Amount */}
                      <div className="text-right">
                        <p className={cn(
                          "font-mono font-medium",
                          tx.type === "send" ? "text-red-500" :
                          tx.type === "receive" ? "text-green-500" :
                          "text-foreground"
                        )}>
                          {tx.type === "send" ? "-" : tx.type === "receive" ? "+" : ""}
                          {tx.amount} {tx.symbol}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ${tx.usdValue.toLocaleString()}
                        </p>
                      </div>

                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Transaction Detail Sheet */}
      <TransactionDetailSheet
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </div>
  );
};
