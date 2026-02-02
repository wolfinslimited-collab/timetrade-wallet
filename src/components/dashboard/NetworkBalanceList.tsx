import { useState } from "react";
import { Chain, getChainInfo } from "@/hooks/useBlockchain";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/Sparkline";

interface NetworkBalance {
  chain: Chain;
  address: string | null;
  balance: number;
  change24h: number;
}

interface NetworkBalanceListProps {
  networks: NetworkBalance[];
  onNetworkClick?: (chain: Chain) => void;
}

// Get network logo URL
const getNetworkLogoUrl = (chain: Chain): string => {
  const symbols: Record<Chain, string> = {
    ethereum: "eth",
    arbitrum: "arb",
    polygon: "matic",
    solana: "sol",
    tron: "trx",
    bitcoin: "btc",
  };
  return `https://api.elbstream.com/logos/crypto/${symbols[chain]}`;
};

const formatAddress = (address: string | null): string => {
  if (!address) return "Not connected";
  if (address.length <= 13) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatBalance = (balance: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(balance);
};

// Generate sparkline data based on change
const generateSparklineData = (change: number): number[] => {
  const points = 12;
  const data: number[] = [];
  const isPositive = change >= 0;
  
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const trend = isPositive 
      ? 50 + progress * 30 
      : 80 - progress * 30;
    const noise = (Math.random() - 0.5) * 15;
    data.push(Math.max(10, Math.min(90, trend + noise)));
  }
  
  return data;
};

export const NetworkBalanceList = ({ networks, onNetworkClick }: NetworkBalanceListProps) => {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleImageError = (chain: Chain) => {
    setImageErrors(prev => ({ ...prev, [chain]: true }));
  };

  // Filter and sort by balance
  const sortedNetworks = [...networks]
    .filter(n => n.address && n.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  if (sortedNetworks.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">No network balances found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-4">
      {sortedNetworks.map(({ chain, address, balance, change24h }) => {
        const chainInfo = getChainInfo(chain);
        const logoUrl = getNetworkLogoUrl(chain);
        const sparklineData = generateSparklineData(change24h);
        const isPositive = change24h >= 0;

        return (
          <button
            key={chain}
            onClick={() => onNetworkClick?.(chain)}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:bg-secondary/50 transition-colors"
          >
            {/* Network Logo */}
            <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary flex items-center justify-center">
              {imageErrors[chain] ? (
                <span className="text-lg font-bold text-muted-foreground">
                  {chainInfo.symbol.slice(0, 2)}
                </span>
              ) : (
                <img
                  src={logoUrl}
                  alt={chainInfo.name}
                  className="w-full h-full object-contain p-2"
                  onError={() => handleImageError(chain)}
                />
              )}
            </div>

            {/* Network Info */}
            <div className="flex-1 text-left">
              <p className="text-xs text-muted-foreground font-mono">
                [ {formatAddress(address)} ]
              </p>
              <p className="text-xl font-bold tracking-tight">
                {formatBalance(balance)}
              </p>
            </div>

            {/* Sparkline */}
            <div className="w-16 h-10">
              <Sparkline
                data={sparklineData}
                positive={isPositive}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
};
