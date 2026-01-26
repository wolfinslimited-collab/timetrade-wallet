import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { formatBalance, getChainInfo, Chain } from "@/hooks/useBlockchain";
import { useCryptoPrices, getPriceForSymbol } from "@/hooks/useCryptoPrices";
import { useWalletBalance } from "@/hooks/useBlockchain";
import { Loader2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface AllNetworkBalancesProps {
  className?: string;
}

// All supported chains to show
const DISPLAY_CHAINS: Chain[] = ['ethereum', 'solana', 'polygon'];

export const AllNetworkBalances = ({ className }: AllNetworkBalancesProps) => {
  const { 
    isConnected,
    prices,
    isLoadingPrices,
  } = useBlockchainContext();

  // Get addresses for each chain from context
  const storedEvmAddress = localStorage.getItem('timetrade_wallet_address_evm');
  const storedSolanaAddress = localStorage.getItem('timetrade_wallet_address_solana');
  
  // Derive addresses from the context's derived accounts
  const { derivedAccounts, activeAccountIndex, selectedChain } = useBlockchainContext();
  
  // Get EVM address (Ethereum/Polygon share same address)
  const evmAddress = (() => {
    if (selectedChain === 'solana') {
      // If on Solana, get EVM address from localStorage or first derived account
      return storedEvmAddress || null;
    }
    // Currently on EVM chain
    const account = derivedAccounts[activeAccountIndex];
    return account?.address || null;
  })();
  
  // Get Solana address
  const solanaAddress = (() => {
    if (selectedChain === 'solana') {
      const account = derivedAccounts[activeAccountIndex];
      return account?.address || null;
    }
    return storedSolanaAddress || null;
  })();

  // Fetch balances for all chains
  const ethBalance = useWalletBalance(evmAddress, 'ethereum');
  const solBalance = useWalletBalance(solanaAddress, 'solana');
  const polyBalance = useWalletBalance(evmAddress, 'polygon');

  if (!isConnected) {
    return null;
  }

  const chainBalances = [
    { chain: 'ethereum' as Chain, query: ethBalance, address: evmAddress },
    { chain: 'solana' as Chain, query: solBalance, address: solanaAddress },
    { chain: 'polygon' as Chain, query: polyBalance, address: evmAddress },
  ];

  const isLoading = chainBalances.some(c => c.query.isLoading);

  return (
    <div className={cn("px-4 py-3", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          All Networks
        </h3>
        {(isLoading || isLoadingPrices) && (
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="grid gap-2">
        {chainBalances.map(({ chain, query, address }) => {
          const chainInfo = getChainInfo(chain);
          const balance = query.data;
          const isChainLoading = query.isLoading;
          const hasError = !!query.error;
          
          if (!address) {
            return (
              <div
                key={chain}
                className="flex items-center justify-between p-3 bg-card rounded-xl border border-border opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-muted">
                    {chainInfo.icon}
                  </div>
                  <div>
                    <span className="font-medium">{chainInfo.name}</span>
                    <p className="text-xs text-muted-foreground">No address derived</p>
                  </div>
                </div>
              </div>
            );
          }

          if (isChainLoading) {
            return (
              <div
                key={chain}
                className="flex items-center justify-between p-3 bg-card rounded-xl border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-muted">
                    {chainInfo.icon}
                  </div>
                  <div>
                    <span className="font-medium">{chainInfo.name}</span>
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  </div>
                </div>
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            );
          }

          if (hasError || !balance) {
            return (
              <div
                key={chain}
                className="flex items-center justify-between p-3 bg-card rounded-xl border border-border opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-muted">
                    {chainInfo.icon}
                  </div>
                  <div>
                    <span className="font-medium">{chainInfo.name}</span>
                    <p className="text-xs text-destructive">Failed to load</p>
                  </div>
                </div>
              </div>
            );
          }

          const nativeBalance = parseFloat(balance.native.balance) / Math.pow(10, balance.native.decimals);
          const formattedNative = formatBalance(balance.native.balance, balance.native.decimals);
          const nativePrice = getPriceForSymbol(prices as any, balance.native.symbol);
          const nativeUsd = nativeBalance * nativePrice;
          
          // Calculate total USD including tokens
          let totalUsd = nativeUsd;
          for (const token of balance.tokens || []) {
            const tokenBalance = parseFloat(token.balance) / Math.pow(10, token.decimals);
            const tokenPrice = getPriceForSymbol(prices as any, token.symbol);
            totalUsd += tokenBalance * tokenPrice;
          }

          const tokenCount = balance.tokens?.length || 0;

          return (
            <div
              key={chain}
              className="flex items-center justify-between p-3 bg-card rounded-xl border border-border hover:border-muted-foreground/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-secondary">
                  {chainInfo.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{chainInfo.name}</span>
                    {tokenCount > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        +{tokenCount} tokens
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formattedNative} {chainInfo.symbol}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono font-medium">
                  ${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">{chainInfo.testnetName}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
