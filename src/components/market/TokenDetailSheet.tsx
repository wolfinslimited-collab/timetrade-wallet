import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Bell } from "lucide-react";
import { Token } from "@/pages/MarketPage";
import { cn } from "@/lib/utils";

interface TokenDetailSheetProps {
  token: Token | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onSetPriceAlert?: () => void;
}

type TimeRange = "1H" | "1D" | "1W" | "1M" | "1Y" | "ALL";

const generateChartData = (range: TimeRange, baseData: number[]) => {
  const points = range === "1H" ? 12 : range === "1D" ? 24 : range === "1W" ? 7 : range === "1M" ? 30 : 12;
  const data: number[] = [];
  const base = baseData[baseData.length - 1] || 50;
  
  for (let i = 0; i < points; i++) {
    const variation = (Math.random() - 0.5) * 20;
    const trend = (i / points) * (baseData[baseData.length - 1] - baseData[0]);
    data.push(Math.max(10, Math.min(90, base + variation + trend * 0.3)));
  }
  return data;
};

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

export const TokenDetailSheet = ({
  token,
  isOpen,
  onClose,
  isFavorite,
  onToggleFavorite,
  onSetPriceAlert,
}: TokenDetailSheetProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>("1D");

  if (!token) return null;

  const chartData = generateChartData(timeRange, token.sparklineData);
  const isPositive = token.change24h >= 0;
  const max = Math.max(...chartData);
  const min = Math.min(...chartData);

  // Create SVG path for area chart
  const width = 320;
  const height = 160;
  const padding = 4;
  const points = chartData.map((value, index) => {
    const x = padding + (index / (chartData.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / (max - min || 1)) * (height - padding * 2);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                {token.icon}
              </div>
              <div>
                <SheetTitle className="text-left">{token.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">{token.symbol}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSetPriceAlert}
              className="rounded-full"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleFavorite}
              className="rounded-full"
            >
              <Star
                className={cn(
                  "w-5 h-5",
                  isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                )}
              />
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-6 overflow-auto pb-6">
          {/* Price Display */}
          <div className="text-center py-4">
            <p className="text-4xl font-bold">{formatPrice(token.price)}</p>
            <div
              className={cn(
                "flex items-center justify-center gap-1 mt-2 text-lg",
                isPositive ? "text-emerald-500" : "text-destructive"
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              <span className="font-semibold">{Math.abs(token.change24h).toFixed(2)}%</span>
              <span className="text-muted-foreground text-sm ml-1">24h</span>
            </div>
          </div>

          {/* Chart */}
          <div className="relative bg-card rounded-xl p-4 border border-border">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
              <defs>
                <linearGradient id={`gradient-${token.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop
                    offset="0%"
                    stopColor={isPositive ? "hsl(160, 84%, 39%)" : "hsl(0, 72%, 51%)"}
                    stopOpacity="0.3"
                  />
                  <stop
                    offset="100%"
                    stopColor={isPositive ? "hsl(160, 84%, 39%)" : "hsl(0, 72%, 51%)"}
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>
              <path d={areaPath} fill={`url(#gradient-${token.id})`} />
              <path
                d={linePath}
                fill="none"
                stroke={isPositive ? "hsl(160, 84%, 39%)" : "hsl(0, 72%, 51%)"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Time Range Selector */}
            <Tabs
              value={timeRange}
              onValueChange={(v) => setTimeRange(v as TimeRange)}
              className="mt-4"
            >
              <TabsList className="w-full grid grid-cols-6 bg-background border border-border">
                {(["1H", "1D", "1W", "1M", "1Y", "ALL"] as TimeRange[]).map((range) => (
                  <TabsTrigger key={range} value={range} className="text-xs">
                    {range}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-xl p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Market Cap</p>
              <p className="font-semibold">{formatMarketCap(token.marketCap)}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">24h Volume</p>
              <p className="font-semibold">{formatMarketCap(token.volume24h)}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">24h High</p>
              <p className="font-semibold text-emerald-500">
                {formatPrice(token.price * 1.03)}
              </p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">24h Low</p>
              <p className="font-semibold text-destructive">
                {formatPrice(token.price * 0.97)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button className="h-14 text-base font-semibold bg-emerald-500 hover:bg-emerald-600">
              <ArrowDownRight className="w-5 h-5 mr-2" />
              Buy
            </Button>
            <Button variant="outline" className="h-14 text-base font-semibold border-destructive text-destructive hover:bg-destructive/10">
              <ArrowUpRight className="w-5 h-5 mr-2" />
              Sell
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
