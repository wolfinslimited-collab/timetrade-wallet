import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, Clock, ExternalLink, Loader2, ChevronLeft, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chain, useTransactions, formatAddress } from "@/hooks/useBlockchain";
import { cn } from "@/lib/utils";
import { SendCryptoSheet } from "@/components/send/SendCryptoSheet";
import { ReceiveCryptoSheet } from "@/components/receive/ReceiveCryptoSheet";
import { tronHexToBase58 } from "@/utils/tronAddress";
import { useBlockchainContext } from "@/contexts/BlockchainContext";


// Sparkline mini-chart component
const PriceChart = ({ change24h, symbol }: { change24h: number; symbol: string }) => {
  const isPositive = change24h >= 0;
  
  // Generate synthetic chart data based on the 24h change direction
  const chartData = useMemo(() => {
    const points = 24;
    const data: { time: number; price: number }[] = [];
    let price = 100;
    const trend = change24h / points;
    
    for (let i = 0; i <= points; i++) {
      const noise = (Math.random() - 0.5) * Math.abs(change24h) * 0.3;
      price = 100 + trend * i + noise;
      data.push({ time: i, price: Math.max(price, 0) });
    }
    // Ensure last point reflects actual change
    data[data.length - 1].price = 100 + change24h;
    return data;
  }, [change24h]);

  const minPrice = Math.min(...chartData.map(d => d.price));
  const maxPrice = Math.max(...chartData.map(d => d.price));
  const range = maxPrice - minPrice || 1;

  // Build SVG path
  const width = 320;
  const height = 120;
  const padding = 4;
  const points = chartData.map((d, i) => {
    const x = padding + (i / (chartData.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (d.price - minPrice) / range) * (height - padding * 2);
    return `${x},${y}`;
  });
  const linePath = `M${points.join(' L')}`;
  const areaPath = `${linePath} L${width - padding},${height} L${padding},${height} Z`;

  const color = isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))";
  const colorFaded = isPositive ? "hsl(var(--success) / 0.15)" : "hsl(var(--destructive) / 0.15)";

  return (
    <div className="w-full h-[140px] relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#gradient-${symbol})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/50">24H</div>
    </div>
  );
};

// Get chain explorer URL
const getExplorerUrl = (chain: Chain): string => {
  const urls: Record<Chain, string> = {
    ethereum: "https://etherscan.io",
    arbitrum: "https://arbiscan.io",
    polygon: "https://polygonscan.com",
    solana: "https://explorer.solana.com",
    tron: "https://tronscan.org",
    bitcoin: "https://blockstream.info",
  };
  return urls[chain] || urls.ethereum;
};

const getTxExplorerUrl = (chain: Chain, explorerBase: string, txHash: string) => {
  const base = explorerBase.replace(/\/$/, "");
  if (chain === "tron") return `${base}/#/transaction/${txHash}`;
  return `${base}/tx/${txHash}`;
};

const getNetworkLogoUrl = (chain: Chain): string => {
  const symbols: Record<Chain, string> = {
    ethereum: "eth", arbitrum: "arb", polygon: "matic",
    solana: "sol", tron: "trx", bitcoin: "btc",
  };
  return `https://api.elbstream.com/logos/crypto/${symbols[chain]}`;
};

export const AssetDetailPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showSend, setShowSend] = useState(false);
  const [showReceive, setShowReceive] = useState(false);

  const { unifiedAssets, prices } = useBlockchainContext();

  // Parse asset from URL params
  const symbol = searchParams.get("symbol") || "";
  const chain = (searchParams.get("chain") || "ethereum") as Chain;
  const contractAddress = searchParams.get("contract") || undefined;

  // Find asset from context
  const asset = useMemo(() => {
    if (!unifiedAssets) return null;
    return unifiedAssets.find(a =>
      a.symbol.toUpperCase() === symbol.toUpperCase() &&
      a.chain === chain &&
      (contractAddress ? a.contractAddress === contractAddress : a.isNative)
    ) || null;
  }, [unifiedAssets, symbol, chain, contractAddress]);

  const priceData = prices?.find(p => p.symbol.toUpperCase() === symbol.toUpperCase());
  const change24h = priceData?.change24h || 0;

  // Get address for chain
  const address = chain === 'solana'
    ? localStorage.getItem('timetrade_wallet_address_solana')
    : chain === 'tron'
      ? localStorage.getItem('timetrade_wallet_address_tron')
      : localStorage.getItem('timetrade_wallet_address_evm');

  const { data: txData, isLoading: isLoadingTx } = useTransactions(address, chain);

  if (!asset) {
    return (
      <div className="min-h-screen flex items-center justify-center max-w-md mx-auto">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading asset...</p>
        </div>
      </div>
    );
  }

  const assetLogoUrl = `https://api.elbstream.com/logos/crypto/${asset.symbol.toLowerCase()}`;
  const networkLogoUrl = getNetworkLogoUrl(chain);
  const explorerUrl = getExplorerUrl(chain);
  const isPositive = change24h >= 0;
  const usdValue = asset.valueUsd;

  const transactions = txData?.transactions || [];
  const filteredTx = (() => {
    const tokenContract = asset.contractAddress;
    if (chain === 'solana') {
      if (asset.isNative) {
        return transactions.filter((tx) => !tx.tokenTransfers?.some((tt: any) => tt.mint));
      } else {
        return transactions.filter((tx) => tx.tokenTransfers?.some((tt: any) => tt.mint === tokenContract));
      }
    }
    if (chain === 'tron') {
      return transactions.filter((tx) => {
        const type = tx.contractType;
        if (asset.isNative) return type ? type === 'TransferContract' : true;
        if (!tokenContract) return type === 'TriggerSmartContract';
        const txContract = tx.contractAddressBase58 || tronHexToBase58(tx.contractAddress) || tx.contractAddress;
        return type === 'TriggerSmartContract' && txContract === tokenContract;
      });
    }
    return transactions;
  })();

  const preSelectedForSend = {
    symbol: asset.symbol,
    name: asset.name,
    balance: asset.amount,
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
      <motion.div
        className="min-h-screen flex flex-col max-w-md mx-auto pb-8"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -30 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-card/50 border border-border/40 hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="relative">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary">
                <img src={assetLogoUrl} alt={asset.symbol} className="w-full h-full object-contain p-1" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background overflow-hidden bg-card">
                <img src={networkLogoUrl} alt={chain} className="w-full h-full object-contain" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold">{asset.name}</h1>
              <p className="text-xs text-muted-foreground capitalize">{chain}</p>
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className="text-center pt-2 pb-1 px-4">
          <p className="text-4xl font-bold font-mono">
            {asset.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
          </p>
          <p className="text-muted-foreground text-lg">{asset.symbol}</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="text-2xl font-semibold">
              ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={cn(
              "text-sm px-2 py-0.5 rounded-full font-medium",
              isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              {isPositive ? "+" : ""}{change24h.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Price Chart */}
        <div className="px-4 mt-2">
          <div className="bg-card/50 border border-border/30 rounded-2xl overflow-hidden">
            <PriceChart change24h={change24h} symbol={asset.symbol} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex justify-center gap-3 px-4 py-5">
          <Button
            variant="outline"
            className="flex-1 h-14 flex-col gap-0.5 rounded-2xl border-border/40 bg-card/50"
            onClick={() => setShowReceive(true)}
          >
            <ArrowDownLeft className="w-5 h-5" />
            <span className="text-[11px]">Receive</span>
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-14 flex-col gap-0.5 rounded-2xl border-border/40 bg-card/50"
            onClick={() => setShowSend(true)}
          >
            <ArrowUpRight className="w-5 h-5" />
            <span className="text-[11px]">Send</span>
          </Button>
        </div>

        {/* Contract Address */}
        {asset.contractAddress && (
          <div className="px-4 pb-3">
            <div className="bg-card/50 border border-border/30 rounded-2xl p-3">
              <p className="text-[11px] text-muted-foreground mb-1">Contract Address</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-foreground">{formatAddress(asset.contractAddress)}</code>
                <a href={`${explorerUrl}/token/${asset.contractAddress}`} target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-foreground">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div className="px-4 pt-2 flex-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Recent Activity
            </h3>
            {txData?.explorerUrl && (
              <a
                href={`${txData.explorerUrl}/address/${address}`}
                target="_blank" rel="noopener noreferrer"
                className="text-[11px] text-foreground/60 hover:underline flex items-center gap-1"
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
              <Clock className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTx.map((tx, index) => {
                const txFrom = chain === 'tron' ? (tronHexToBase58(tx.from) || tx.from) : tx.from;
                const txTo = chain === 'tron' ? (tronHexToBase58(tx.to) || tx.to) : tx.to;

                const solanaTransfer = chain === 'solana'
                  ? (asset.isNative
                      ? tx.tokenTransfers?.find((tt: any) => !tt.mint && (tt.symbol === 'SOL' || tt.decimals === 9))
                      : tx.tokenTransfers?.find((tt: any) => tt.mint === asset.contractAddress))
                  : undefined;

                const isSend = chain === 'solana'
                  ? (solanaTransfer?.source ? solanaTransfer.source === address : txFrom?.toLowerCase() === address?.toLowerCase())
                  : chain === 'tron' ? txFrom === address : txFrom?.toLowerCase() === address?.toLowerCase();

                const isOutgoing = isSend;
                const Icon = isOutgoing ? ArrowUpRight : ArrowDownLeft;

                const displayBaseUnits = chain === 'solana' && solanaTransfer
                  ? String(solanaTransfer.amount ?? '0') : String(tx.value || '0');
                const displayDecimals = chain === 'solana' && solanaTransfer
                  ? (typeof solanaTransfer.decimals === 'number' ? solanaTransfer.decimals : asset.decimals)
                  : asset.decimals;
                const formattedValue = parseFloat(displayBaseUnits || '0') / Math.pow(10, displayDecimals);
                const dateLabel = Number.isFinite(tx.timestamp) ? new Date(tx.timestamp * 1000).toLocaleDateString() : "—";
                const txHref = tx.hash ? getTxExplorerUrl(chain, txData?.explorerUrl || explorerUrl, tx.hash) : undefined;

                return (
                  <a
                    key={`${tx.hash}-${index}`}
                    href={txHref}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-2xl bg-card/50 border border-border/30 hover:border-foreground/10 transition-colors"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      isOutgoing ? "bg-destructive/10" : "bg-success/10"
                    )}>
                      <Icon className={cn("w-5 h-5", isOutgoing ? "text-destructive" : "text-success")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{isOutgoing ? "Sent" : "Received"}</p>
                      <p className="text-xs text-muted-foreground">{dateLabel}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-mono text-sm font-medium", isOutgoing ? "text-destructive" : "text-success")}>
                        {isOutgoing ? "-" : "+"}{formattedValue.toFixed(6)}
                      </p>
                      <p className="text-xs text-muted-foreground">{asset.symbol}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      <SendCryptoSheet open={showSend} onOpenChange={setShowSend} preSelectedAsset={preSelectedForSend} />
      <ReceiveCryptoSheet open={showReceive} onOpenChange={setShowReceive} preSelectedToken={preSelectedForReceive} />
    </>
  );
};
