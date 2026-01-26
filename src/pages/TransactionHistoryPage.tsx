import { useState } from "react";
import { ChevronLeft, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Search, Filter, ChevronRight, Loader2, ExternalLink, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { getChainInfo, formatBalance, formatAddress, Transaction as BlockchainTransaction } from "@/hooks/useBlockchain";

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
  explorerUrl?: string;
}

// Mock transaction data for demo mode
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
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
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
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
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
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    txHash: "0x567890abcdef1234567890abcdef1234567890ab",
    networkFee: 0.003,
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
  
  const { 
    isConnected, 
    walletAddress, 
    transactions: blockchainTx, 
    transactionsExplorerUrl,
    isLoadingTransactions, 
    transactionsError,
    selectedChain,
  } = useBlockchainContext();

  const chainInfo = getChainInfo(selectedChain);

  // Convert blockchain transactions to display format
  const convertBlockchainTx = (tx: BlockchainTransaction): Transaction => {
    const isSend = tx.from?.toLowerCase() === walletAddress?.toLowerCase();
    const amount = parseFloat(tx.value || '0') / Math.pow(10, chainInfo.decimals);
    
    return {
      id: tx.hash,
      type: isSend ? "send" : "receive",
      status: tx.status === 'confirmed' ? 'completed' : tx.status === 'pending' ? 'pending' : 'failed',
      amount,
      symbol: chainInfo.symbol,
      icon: chainInfo.icon,
      usdValue: 0, // Would need price API
      address: isSend ? tx.to : tx.from,
      timestamp: new Date(tx.timestamp * 1000),
      txHash: tx.hash,
      networkFee: 0,
      explorerUrl: transactionsExplorerUrl,
    };
  };

  // Use real transactions if connected, otherwise use mock
  const displayTransactions = isConnected && blockchainTx?.length 
    ? blockchainTx.map(convertBlockchainTx)
    : mockTransactions;

  const filteredTransactions = displayTransactions.filter((tx) => {
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

  const openInExplorer = (tx: Transaction) => {
    const baseUrl = tx.explorerUrl || transactionsExplorerUrl || chainInfo.id === 'ethereum' 
      ? 'https://sepolia.etherscan.io' 
      : 'https://etherscan.io';
    window.open(`${baseUrl}/tx/${tx.txHash}`, '_blank');
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
        {isConnected && (
          <div 
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
            style={{ 
              backgroundColor: `${chainInfo.color}20`,
              color: chainInfo.color,
            }}
          >
            {chainInfo.icon} {chainInfo.testnetName}
          </div>
        )}
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

      {/* Connection Status Banner */}
      {!isConnected && (
        <div className="mx-4 mb-4 p-3 rounded-xl bg-muted/50 border border-border flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Demo Mode</p>
            <p className="text-xs text-muted-foreground">Connect wallet to see real transactions</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isConnected && isLoadingTransactions && (
        <div className="flex-1 flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading transactions...</p>
        </div>
      )}

      {/* Error State */}
      {isConnected && transactionsError && !isLoadingTransactions && (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-4">
          <Filter className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">Failed to load transactions</p>
          <p className="text-xs text-muted-foreground">{transactionsError.message}</p>
        </div>
      )}

      {/* Transaction List */}
      {(!isConnected || (!isLoadingTransactions && !transactionsError)) && (
        <div className="flex-1 px-4 pb-8">
          {Object.keys(groupedTransactions).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Filter className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {isConnected ? "No transactions found on this network" : "No transactions found"}
              </p>
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
                        onClick={() => openInExplorer(tx)}
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
                            {tx.amount.toFixed(6)} {tx.symbol}
                          </p>
                          {tx.address && (
                            <p className="text-xs text-muted-foreground font-mono">
                              {formatAddress(tx.address)}
                            </p>
                          )}
                        </div>

                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
