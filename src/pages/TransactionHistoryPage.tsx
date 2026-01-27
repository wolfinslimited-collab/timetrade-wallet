import { useState, useMemo } from "react";
import { ChevronLeft, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Search, Filter, SlidersHorizontal, Loader2, ExternalLink, WifiOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { getChainInfo, formatBalance, formatAddress, Transaction as BlockchainTransaction } from "@/hooks/useBlockchain";
import { TransactionFilterSheet, TransactionFilters } from "@/components/history/TransactionFilterSheet";
import { SolanaTransactionDetailSheet } from "@/components/history/SolanaTransactionDetailSheet";
import { Badge } from "@/components/ui/badge";

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
  {
    id: "4",
    type: "receive",
    status: "pending",
    amount: 0.25,
    symbol: "ETH",
    icon: "⟠",
    usdValue: 811.42,
    address: "0x9876543210fedcba9876543210fedcba98765432",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    txHash: "0xdef1234567890abcdef1234567890abcdef12345",
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
    address: "0x1111222233334444555566667777888899990000",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
    txHash: "0x0000111122223333444455556666777788889999",
    networkFee: 0.001,
  },
];

type QuickFilter = "all" | TransactionType;

interface TransactionHistoryPageProps {
  onBack: () => void;
}

const defaultFilters: TransactionFilters = {
  dateFrom: undefined,
  dateTo: undefined,
  types: [],
  statuses: [],
  tokens: [],
};

export const TransactionHistoryPage = ({ onBack }: TransactionHistoryPageProps) => {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [selectedBlockchainTx, setSelectedBlockchainTx] = useState<BlockchainTransaction | null>(null);
  const [filters, setFilters] = useState<TransactionFilters>(defaultFilters);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  
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

  // Get available tokens for filter
  const availableTokens = useMemo(() => {
    const tokens = new Set<string>();
    displayTransactions.forEach((tx) => {
      tokens.add(tx.symbol);
      if (tx.swapTo) tokens.add(tx.swapTo.symbol);
    });
    return Array.from(tokens);
  }, [displayTransactions]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.types.length > 0) count++;
    if (filters.statuses.length > 0) count++;
    if (filters.tokens.length > 0) count++;
    return count;
  }, [filters]);

  // Apply all filters
  const filteredTransactions = useMemo(() => {
    return displayTransactions.filter((tx) => {
      // Quick filter (type tabs)
      if (quickFilter !== "all" && tx.type !== quickFilter) return false;

      // Advanced filters
      if (filters.types.length > 0 && !filters.types.includes(tx.type)) return false;
      if (filters.statuses.length > 0 && !filters.statuses.includes(tx.status)) return false;
      if (filters.tokens.length > 0 && !filters.tokens.includes(tx.symbol)) return false;
      
      // Date filters
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (tx.timestamp < fromDate) return false;
      }
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (tx.timestamp > toDate) return false;
      }

      // Search query
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
  }, [displayTransactions, quickFilter, filters, searchQuery]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    return filteredTransactions.reduce((groups, tx) => {
      const date = tx.timestamp.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: tx.timestamp.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(tx);
      return groups;
    }, {} as Record<string, Transaction[]>);
  }, [filteredTransactions]);

  const clearFilters = () => {
    setFilters(defaultFilters);
    setQuickFilter("all");
    setSearchQuery("");
  };

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

  const handleTxClick = (tx: Transaction) => {
    // For Solana, open the detailed sheet with parsed instructions
    if (selectedChain === 'solana' && isConnected && blockchainTx) {
      const originalTx = blockchainTx.find(t => t.hash === tx.txHash);
      if (originalTx) {
        setSelectedBlockchainTx(originalTx);
        return;
      }
    }
    // For other chains or mock data, open in explorer
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

      {/* Search Bar with Filter Button */}
      <div className="px-4 pt-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions..."
              className="w-full h-12 pl-10 pr-4 rounded-xl bg-card border border-border focus:border-primary/50 focus:outline-none text-sm"
            />
          </div>
          <button
            onClick={() => setFilterSheetOpen(true)}
            className={cn(
              "h-12 w-12 rounded-xl border flex items-center justify-center transition-colors relative",
              activeFilterCount > 0
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:border-primary/50"
            )}
          >
            <SlidersHorizontal className="w-5 h-5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && (
        <div className="px-4 pt-3 flex flex-wrap gap-2">
          {filters.dateFrom && (
            <Badge variant="secondary" className="gap-1">
              From: {filters.dateFrom.toLocaleDateString()}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => setFilters(f => ({ ...f, dateFrom: undefined }))}
              />
            </Badge>
          )}
          {filters.dateTo && (
            <Badge variant="secondary" className="gap-1">
              To: {filters.dateTo.toLocaleDateString()}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => setFilters(f => ({ ...f, dateTo: undefined }))}
              />
            </Badge>
          )}
          {filters.types.map((type) => (
            <Badge key={type} variant="secondary" className="gap-1 capitalize">
              {type}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => setFilters(f => ({ ...f, types: f.types.filter(t => t !== type) }))}
              />
            </Badge>
          ))}
          {filters.statuses.map((status) => (
            <Badge key={status} variant="secondary" className="gap-1 capitalize">
              {status}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => setFilters(f => ({ ...f, statuses: f.statuses.filter(s => s !== status) }))}
              />
            </Badge>
          ))}
          {filters.tokens.map((token) => (
            <Badge key={token} variant="secondary" className="gap-1">
              {token}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => setFilters(f => ({ ...f, tokens: f.tokens.filter(t => t !== token) }))}
              />
            </Badge>
          ))}
          <button
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Quick Filter Tabs */}
      <div className="flex gap-2 px-4 py-4 overflow-x-auto">
        {(["all", "send", "receive", "swap"] as QuickFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setQuickFilter(f)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              quickFilter === f
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
                {activeFilterCount > 0 || searchQuery
                  ? "No transactions match your filters"
                  : isConnected 
                    ? "No transactions found on this network" 
                    : "No transactions found"}
              </p>
              {(searchQuery || activeFilterCount > 0) && (
                <button
                  onClick={clearFilters}
                  className="text-primary text-sm mt-2 hover:underline"
                >
                  Clear all filters
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
                        onClick={() => handleTxClick(tx)}
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors text-left"
                      >
                        {/* Icon */}
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-secondary">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium capitalize">{tx.type}</p>
                            {tx.status !== "completed" && (
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground"
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
                          <p className="font-mono font-medium text-foreground">
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

      {/* Filter Sheet */}
      <TransactionFilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filters={filters}
        onApply={setFilters}
        availableTokens={availableTokens}
      />

      {/* Solana Transaction Detail Sheet */}
      <SolanaTransactionDetailSheet
        transaction={selectedBlockchainTx}
        userAddress={walletAddress}
        onClose={() => setSelectedBlockchainTx(null)}
      />
    </div>
  );
};
