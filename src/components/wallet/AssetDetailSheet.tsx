import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownLeft, Clock, ExternalLink, Loader2 } from "lucide-react";
import { Chain, useTransactions, formatAddress } from "@/hooks/useBlockchain";
import { cn } from "@/lib/utils";
import { SendCryptoSheet } from "@/components/send/SendCryptoSheet";
import { ReceiveCryptoSheet } from "@/components/receive/ReceiveCryptoSheet";

interface AssetDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: {
    symbol: string;
    name: string;
    balance: string;
    numericBalance: number;
    decimals: number;
    chain: Chain;
    isNative: boolean;
    contractAddress?: string;
    price: number;
    usdValue: number;
    change24h: number;
  } | null;
  address: string | null;
}

// Get chain explorer URL
const getExplorerUrl = (chain: Chain): string => {
  const urls: Record<Chain, string> = {
    ethereum: "https://etherscan.io",
    polygon: "https://polygonscan.com",
    solana: "https://explorer.solana.com",
    tron: "https://tronscan.org",
    bitcoin: "https://blockstream.info",
  };
  return urls[chain] || urls.ethereum;
};

// Get network logo URL
const getNetworkLogoUrl = (chain: Chain): string => {
  const symbols: Record<Chain, string> = {
    ethereum: "eth",
    polygon: "matic",
    solana: "sol",
    tron: "trx",
    bitcoin: "btc",
  };
  return `https://api.elbstream.com/logos/crypto/${symbols[chain]}`;
};

export const AssetDetailSheet = ({ open, onOpenChange, asset, address }: AssetDetailSheetProps) => {
  const [showSend, setShowSend] = useState(false);
  const [showReceive, setShowReceive] = useState(false);

  // Fetch transactions for this chain
  const { data: txData, isLoading: isLoadingTx } = useTransactions(address, asset?.chain || "ethereum");

  if (!asset) return null;

  const assetLogoUrl = `https://api.elbstream.com/logos/crypto/${asset.symbol.toLowerCase()}`;
  const networkLogoUrl = getNetworkLogoUrl(asset.chain);
  const explorerUrl = getExplorerUrl(asset.chain);
  const isPositive = asset.change24h >= 0;

  // Filter transactions for this asset
  const transactions = txData?.transactions || [];
  const filteredTx = transactions.slice(0, 10); // Show last 10 transactions

  // Pre-selected data to pass to Send/Receive sheets
  const preSelectedForSend = {
    symbol: asset.symbol,
    name: asset.name,
    balance: asset.numericBalance,
    decimals: asset.decimals,
    chain: asset.chain,
    isNative: asset.isNative,
    contractAddress: asset.contractAddress,
    price: asset.price,
  };

  const preSelectedForReceive = {
    symbol: asset.symbol,
    chain: asset.chain,
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl bg-background border-border overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-center justify-center gap-3">
              {/* Asset Logo with Network Badge */}
              <div className="relative">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-secondary">
                  <img 
                    src={assetLogoUrl} 
                    alt={asset.symbol}
                    className="w-full h-full object-contain p-2"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                {/* Network Badge */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-background overflow-hidden bg-secondary">
                  <img 
                    src={networkLogoUrl} 
                    alt={asset.chain}
                    className="w-full h-full object-contain p-0.5"
                  />
                </div>
              </div>
            </div>
            <SheetTitle className="text-center text-xl">{asset.name}</SheetTitle>
            <p className="text-center text-muted-foreground text-sm capitalize">{asset.chain}</p>
          </SheetHeader>

          {/* Balance Display */}
          <div className="text-center py-6 border-b border-border">
            <p className="text-4xl font-bold font-mono">
              {asset.numericBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })}
            </p>
            <p className="text-muted-foreground text-lg">{asset.symbol}</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="text-2xl font-semibold">
                ${asset.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={cn(
                "text-sm px-2 py-0.5 rounded-full",
                isPositive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
              )}>
                {isPositive ? "+" : ""}{asset.change24h.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex justify-center gap-4 py-6 border-b border-border">
            <Button 
              variant="outline" 
              size="lg" 
              className="flex-1 max-w-32 h-16 flex-col gap-1"
              onClick={() => setShowReceive(true)}
            >
              <ArrowDownLeft className="w-5 h-5" />
              <span className="text-xs">Receive</span>
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="flex-1 max-w-32 h-16 flex-col gap-1"
              onClick={() => setShowSend(true)}
            >
              <ArrowUpRight className="w-5 h-5" />
              <span className="text-xs">Send</span>
            </Button>
          </div>

          {/* Token Info */}
          {asset.contractAddress && (
            <div className="py-4 border-b border-border">
              <p className="text-xs text-muted-foreground mb-1">Contract Address</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-foreground">
                  {formatAddress(asset.contractAddress)}
                </code>
                <a 
                  href={`${explorerUrl}/token/${asset.contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* Transaction History */}
          <div className="py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Recent Activity
              </h3>
              {txData?.explorerUrl && (
                <a 
                  href={`${txData.explorerUrl}/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  View All <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {isLoadingTx ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTx.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTx.map((tx, index) => {
                  const isSend = tx.from?.toLowerCase() === address?.toLowerCase();
                  const Icon = isSend ? ArrowUpRight : ArrowDownLeft;
                  const formattedValue = parseFloat(tx.value || '0') / Math.pow(10, asset.decimals);
                  
                  return (
                    <a
                      key={`${tx.hash}-${index}`}
                      href={`${explorerUrl}/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium capitalize">{isSend ? "Sent" : "Received"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.timestamp * 1000).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm">
                          {isSend ? "-" : "+"}{formattedValue.toFixed(6)}
                        </p>
                        <p className="text-xs text-muted-foreground">{asset.symbol}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Sub-sheets with pre-selected asset */}
      <SendCryptoSheet 
        open={showSend} 
        onOpenChange={setShowSend} 
        preSelectedAsset={preSelectedForSend}
      />
      <ReceiveCryptoSheet 
        open={showReceive} 
        onOpenChange={setShowReceive} 
        preSelectedToken={preSelectedForReceive}
      />
    </>
  );
};
