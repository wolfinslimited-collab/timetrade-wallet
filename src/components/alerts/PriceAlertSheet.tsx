import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellRing, TrendingUp, TrendingDown, Plus, Trash2, Check, X, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { PriceAlert, AlertCondition } from "@/hooks/usePriceAlerts";

interface Token {
  id: string;
  symbol: string;
  name: string;
  price: number;
  icon: string;
}

interface PriceAlertSheetProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: Token[];
  alerts: PriceAlert[];
  onAddAlert: (alert: Omit<PriceAlert, "id" | "createdAt" | "triggered">) => void;
  onDeleteAlert: (id: string) => void;
  preselectedToken?: Token | null;
}

const formatPrice = (price: number) => {
  if (price >= 1000) {
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (price >= 1) {
    return price.toFixed(2);
  } else {
    return price.toFixed(4);
  }
};

export const PriceAlertSheet = ({
  isOpen,
  onClose,
  tokens,
  alerts,
  onAddAlert,
  onDeleteAlert,
  preselectedToken,
}: PriceAlertSheetProps) => {
  const [view, setView] = useState<"list" | "create">("list");
  const [selectedToken, setSelectedToken] = useState<Token | null>(preselectedToken || null);
  const [targetPrice, setTargetPrice] = useState("");
  const [condition, setCondition] = useState<AlertCondition>("above");
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Reset form when opening with preselected token
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      // Reset after animation
      setTimeout(() => {
        setView("list");
        setSelectedToken(null);
        setTargetPrice("");
        setCondition("above");
      }, 300);
    }
  };

  // Set preselected token when sheet opens
  useMemo(() => {
    if (isOpen && preselectedToken) {
      setSelectedToken(preselectedToken);
      setTargetPrice(formatPrice(preselectedToken.price));
      setView("create");
    }
  }, [isOpen, preselectedToken]);

  const filteredTokens = useMemo(() => {
    if (!searchQuery) return tokens;
    const query = searchQuery.toLowerCase();
    return tokens.filter(
      (t) => t.name.toLowerCase().includes(query) || t.symbol.toLowerCase().includes(query)
    );
  }, [tokens, searchQuery]);

  const handleCreateAlert = () => {
    if (!selectedToken || !targetPrice) return;

    const price = parseFloat(targetPrice.replace(/,/g, ""));
    if (isNaN(price) || price <= 0) return;

    onAddAlert({
      tokenId: selectedToken.id,
      tokenSymbol: selectedToken.symbol,
      tokenIcon: selectedToken.icon,
      targetPrice: price,
      condition,
      currentPrice: selectedToken.price,
    });

    // Reset and go back to list
    setView("list");
    setSelectedToken(null);
    setTargetPrice("");
    setCondition("above");
  };

  const priceChangePercent = useMemo(() => {
    if (!selectedToken || !targetPrice) return null;
    const target = parseFloat(targetPrice.replace(/,/g, ""));
    if (isNaN(target)) return null;
    return ((target - selectedToken.price) / selectedToken.price) * 100;
  }, [selectedToken, targetPrice]);

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
        <SheetHeader className="p-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {view === "create" && (
                <button
                  onClick={() => {
                    setView("list");
                    setSelectedToken(null);
                    setTargetPrice("");
                  }}
                  className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <BellRing className="w-5 h-5 text-primary" />
              </div>
              <SheetTitle>
                {view === "list" ? "Price Alerts" : "Create Alert"}
              </SheetTitle>
            </div>
            {view === "list" && (
              <Button
                size="sm"
                onClick={() => setView("create")}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                New Alert
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-auto p-4">
          <AnimatePresence mode="wait">
            {view === "list" ? (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                      <Bell className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">No price alerts</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Get notified when prices hit your targets
                    </p>
                    <Button
                      onClick={() => setView("create")}
                      className="mt-4 gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Create First Alert
                    </Button>
                  </div>
                ) : (
                  alerts.map((alert, index) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "relative p-4 rounded-xl border transition-all group",
                        alert.triggered
                          ? "bg-primary/5 border-primary/30"
                          : "bg-card border-border"
                      )}
                    >
                      <button
                        onClick={() => onDeleteAlert(alert.id)}
                        className="absolute top-3 right-3 p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>

                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg shrink-0">
                          {alert.tokenIcon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{alert.tokenSymbol}</span>
                            <span
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full",
                                alert.condition === "above"
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : "bg-destructive/10 text-destructive"
                              )}
                            >
                              {alert.condition === "above" ? (
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" />
                                  Above
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <TrendingDown className="w-3 h-3" />
                                  Below
                                </span>
                              )}
                            </span>
                          </div>
                          <p className="text-lg font-bold mt-1">
                            ${formatPrice(alert.targetPrice)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Created {formatDistanceToNow(alert.createdAt, { addSuffix: true })}
                          </p>
                        </div>
                      </div>

                      {alert.triggered && (
                        <div className="mt-3 pt-3 border-t border-primary/20 flex items-center gap-2 text-xs text-primary">
                          <Check className="w-4 h-4" />
                          <span>Alert triggered!</span>
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div
                key="create"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Token Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Select Token
                  </label>
                  <button
                    onClick={() => setShowTokenSelector(!showTokenSelector)}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                  >
                    {selectedToken ? (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                          {selectedToken.icon}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold">{selectedToken.symbol}</p>
                          <p className="text-xs text-muted-foreground">
                            Current: ${formatPrice(selectedToken.price)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Choose a token</span>
                    )}
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-muted-foreground transition-transform",
                        showTokenSelector && "rotate-180"
                      )}
                    />
                  </button>

                  <AnimatePresence>
                    {showTokenSelector && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-card border border-border rounded-xl p-2 mt-2 space-y-1 max-h-48 overflow-auto">
                          <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search tokens..."
                            className="mb-2 bg-background"
                          />
                          {filteredTokens.map((token) => (
                            <button
                              key={token.id}
                              onClick={() => {
                                setSelectedToken(token);
                                setTargetPrice(formatPrice(token.price));
                                setShowTokenSelector(false);
                                setSearchQuery("");
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
                                selectedToken?.id === token.id
                                  ? "bg-primary/10"
                                  : "hover:bg-secondary"
                              )}
                            >
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                                {token.icon}
                              </div>
                              <div className="flex-1 text-left">
                                <p className="font-medium text-sm">{token.symbol}</p>
                                <p className="text-xs text-muted-foreground">{token.name}</p>
                              </div>
                              <p className="text-sm font-medium">${formatPrice(token.price)}</p>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Condition Toggle */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Alert When Price Is
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCondition("above")}
                      className={cn(
                        "flex items-center justify-center gap-2 p-4 rounded-xl border transition-all",
                        condition === "above"
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                          : "bg-card border-border text-muted-foreground hover:border-emerald-500/50"
                      )}
                    >
                      <TrendingUp className="w-5 h-5" />
                      <span className="font-medium">Above</span>
                    </button>
                    <button
                      onClick={() => setCondition("below")}
                      className={cn(
                        "flex items-center justify-center gap-2 p-4 rounded-xl border transition-all",
                        condition === "below"
                          ? "bg-destructive/10 border-destructive text-destructive"
                          : "bg-card border-border text-muted-foreground hover:border-destructive/50"
                      )}
                    >
                      <TrendingDown className="w-5 h-5" />
                      <span className="font-medium">Below</span>
                    </button>
                  </div>
                </div>

                {/* Target Price Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Target Price (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={targetPrice}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.,]/g, "");
                        setTargetPrice(value);
                      }}
                      placeholder="0.00"
                      className="pl-10 text-2xl h-16 font-bold bg-card border-border"
                    />
                  </div>

                  {/* Price Change Preview */}
                  {selectedToken && priceChangePercent !== null && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg mt-2",
                        priceChangePercent >= 0
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-destructive/10 text-destructive"
                      )}
                    >
                      <span className="text-sm">
                        {priceChangePercent >= 0 ? "+" : ""}
                        {priceChangePercent.toFixed(2)}% from current
                      </span>
                      <span className="text-sm font-medium">
                        ${formatPrice(selectedToken.price)} → ${targetPrice}
                      </span>
                    </motion.div>
                  )}
                </div>

                {/* Quick Adjustments */}
                {selectedToken && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Quick Set
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[5, 10, 25, 50].map((percent) => (
                        <button
                          key={percent}
                          onClick={() => {
                            const multiplier = condition === "above" ? 1 + percent / 100 : 1 - percent / 100;
                            setTargetPrice(formatPrice(selectedToken.price * multiplier));
                          }}
                          className="py-2 px-3 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors"
                        >
                          {condition === "above" ? "+" : "-"}{percent}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Create Button */}
                <Button
                  onClick={handleCreateAlert}
                  disabled={!selectedToken || !targetPrice}
                  className="w-full h-14 text-base font-semibold gap-2"
                >
                  <BellRing className="w-5 h-5" />
                  Create Price Alert
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
};
