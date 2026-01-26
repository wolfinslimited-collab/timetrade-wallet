import { useState, useMemo } from "react";
import { ArrowLeft, Search, Star, TrendingUp, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkline } from "@/components/Sparkline";
import { TokenDetailSheet } from "@/components/market/TokenDetailSheet";
import { cn } from "@/lib/utils";

interface MarketPageProps {
  onBack: () => void;
}

export interface Token {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  icon: string;
  sparklineData: number[];
}

const mockTokens: Token[] = [
  {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    price: 67234.52,
    change24h: 2.34,
    marketCap: 1320000000000,
    volume24h: 28500000000,
    icon: "₿",
    sparklineData: [45, 52, 48, 61, 55, 67, 62, 70, 65, 72, 68, 75],
  },
  {
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    price: 3456.78,
    change24h: -1.23,
    marketCap: 415000000000,
    volume24h: 15200000000,
    icon: "Ξ",
    sparklineData: [60, 55, 58, 52, 48, 45, 50, 47, 52, 48, 45, 42],
  },
  {
    id: "solana",
    symbol: "SOL",
    name: "Solana",
    price: 178.45,
    change24h: 5.67,
    marketCap: 82000000000,
    volume24h: 3400000000,
    icon: "◎",
    sparklineData: [30, 35, 42, 48, 55, 62, 58, 65, 72, 78, 82, 88],
  },
  {
    id: "tether",
    symbol: "USDT",
    name: "Tether",
    price: 1.0,
    change24h: 0.01,
    marketCap: 120000000000,
    volume24h: 65000000000,
    icon: "₮",
    sparklineData: [50, 50, 51, 50, 50, 49, 50, 50, 51, 50, 50, 50],
  },
  {
    id: "bnb",
    symbol: "BNB",
    name: "BNB",
    price: 612.34,
    change24h: 1.89,
    marketCap: 89000000000,
    volume24h: 1800000000,
    icon: "⬡",
    sparklineData: [40, 45, 48, 52, 55, 58, 54, 60, 63, 58, 62, 65],
  },
  {
    id: "xrp",
    symbol: "XRP",
    name: "XRP",
    price: 0.5234,
    change24h: -2.45,
    marketCap: 29000000000,
    volume24h: 1200000000,
    icon: "✕",
    sparklineData: [55, 52, 48, 45, 50, 46, 42, 45, 40, 38, 42, 40],
  },
  {
    id: "cardano",
    symbol: "ADA",
    name: "Cardano",
    price: 0.4567,
    change24h: 3.21,
    marketCap: 16000000000,
    volume24h: 450000000,
    icon: "₳",
    sparklineData: [35, 38, 42, 45, 50, 55, 52, 58, 62, 65, 60, 68],
  },
  {
    id: "dogecoin",
    symbol: "DOGE",
    name: "Dogecoin",
    price: 0.1234,
    change24h: -0.87,
    marketCap: 18000000000,
    volume24h: 890000000,
    icon: "Ð",
    sparklineData: [50, 48, 52, 49, 47, 50, 48, 45, 48, 46, 44, 47],
  },
  {
    id: "avalanche",
    symbol: "AVAX",
    name: "Avalanche",
    price: 35.67,
    change24h: 4.56,
    marketCap: 14000000000,
    volume24h: 520000000,
    icon: "🔺",
    sparklineData: [30, 35, 40, 45, 50, 55, 60, 58, 65, 70, 68, 75],
  },
  {
    id: "polkadot",
    symbol: "DOT",
    name: "Polkadot",
    price: 7.89,
    change24h: -1.56,
    marketCap: 11000000000,
    volume24h: 280000000,
    icon: "●",
    sparklineData: [60, 58, 55, 52, 50, 48, 52, 49, 46, 48, 45, 47],
  },
];

const formatPrice = (price: number) => {
  if (price >= 1000) {
    return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (price >= 1) {
    return `$${price.toFixed(2)}`;
  } else {
    return `$${price.toFixed(4)}`;
  }
};

const formatMarketCap = (cap: number) => {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
  return `$${cap.toLocaleString()}`;
};

export const MarketPage = ({ onBack }: MarketPageProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "favorites" | "gainers" | "losers">("all");
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("timetrade_favorites");
    return saved ? new Set(JSON.parse(saved)) : new Set(["bitcoin", "ethereum"]);
  });
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);

  const toggleFavorite = (tokenId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(tokenId)) {
        next.delete(tokenId);
      } else {
        next.add(tokenId);
      }
      localStorage.setItem("timetrade_favorites", JSON.stringify([...next]));
      return next;
    });
  };

  const filteredTokens = useMemo(() => {
    let tokens = mockTokens;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      tokens = tokens.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.symbol.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    switch (activeFilter) {
      case "favorites":
        tokens = tokens.filter((t) => favorites.has(t.id));
        break;
      case "gainers":
        tokens = tokens.filter((t) => t.change24h > 0).sort((a, b) => b.change24h - a.change24h);
        break;
      case "losers":
        tokens = tokens.filter((t) => t.change24h < 0).sort((a, b) => a.change24h - b.change24h);
        break;
    }

    return tokens;
  }, [searchQuery, activeFilter, favorites]);

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Market</h1>
          <p className="text-xs text-muted-foreground">Live crypto prices</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tokens..."
            className="pl-10 bg-card border-border"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-6 pb-4">
        <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as typeof activeFilter)}>
          <TabsList className="w-full grid grid-cols-4 bg-card border border-border">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="favorites" className="text-xs">
              <Star className="w-3 h-3 mr-1" />
              Favorites
            </TabsTrigger>
            <TabsTrigger value="gainers" className="text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              Gainers
            </TabsTrigger>
            <TabsTrigger value="losers" className="text-xs">
              <TrendingDown className="w-3 h-3 mr-1" />
              Losers
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Token List */}
      <div className="flex-1 px-6 space-y-3 overflow-auto">
        {filteredTokens.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No tokens found</p>
          </div>
        ) : (
          filteredTokens.map((token) => (
            <button
              key={token.id}
              onClick={() => setSelectedToken(token)}
              className="w-full bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all"
            >
              <div className="flex items-center gap-3">
                {/* Token Icon */}
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                  {token.icon}
                </div>

                {/* Token Info */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{token.symbol}</span>
                    <button
                      onClick={(e) => toggleFavorite(token.id, e)}
                      className="p-1 -m-1"
                    >
                      <Star
                        className={cn(
                          "w-4 h-4 transition-colors",
                          favorites.has(token.id)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        )}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{token.name}</p>
                </div>

                {/* Sparkline */}
                <div className="w-16 h-8">
                  <Sparkline data={token.sparklineData} positive={token.change24h >= 0} />
                </div>

                {/* Price & Change */}
                <div className="text-right min-w-[80px]">
                  <p className="font-semibold text-sm">{formatPrice(token.price)}</p>
                  <div
                    className={cn(
                      "flex items-center justify-end gap-1 text-xs",
                      token.change24h >= 0 ? "text-emerald-500" : "text-destructive"
                    )}
                  >
                    {token.change24h >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>{Math.abs(token.change24h).toFixed(2)}%</span>
                  </div>
                </div>
              </div>

              {/* Market Cap Row */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                <span>Market Cap: {formatMarketCap(token.marketCap)}</span>
                <span>Vol: {formatMarketCap(token.volume24h)}</span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Token Detail Sheet */}
      <TokenDetailSheet
        token={selectedToken}
        isOpen={!!selectedToken}
        onClose={() => setSelectedToken(null)}
        isFavorite={selectedToken ? favorites.has(selectedToken.id) : false}
        onToggleFavorite={() => {
          if (selectedToken) {
            toggleFavorite(selectedToken.id, { stopPropagation: () => {} } as React.MouseEvent);
          }
        }}
      />
    </div>
  );
};
