import { useState } from "react";
import { ChevronLeft, ChevronDown, ArrowDownUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TokenInfo } from "./SendCryptoSheet";

// Get crypto logo URL from external API
const getCryptoLogoUrl = (symbol: string): string => {
  return `https://api.elbstream.com/logos/crypto/${symbol.toLowerCase()}`;
};

interface AmountInputStepProps {
  recipient: string;
  selectedToken: TokenInfo;
  onSubmit: (amount: string, token: TokenInfo) => void;
  onBack: () => void;
}

const availableTokens: TokenInfo[] = [
  { symbol: "ETH", name: "Ethereum", balance: 2.5847, price: 3245.67, icon: "eth" },
  { symbol: "BTC", name: "Bitcoin", balance: 0.1523, price: 67890.12, icon: "btc" },
  { symbol: "USDT", name: "Tether", balance: 1500.00, price: 1.00, icon: "usdt" },
  { symbol: "USDC", name: "USD Coin", balance: 2350.50, price: 1.00, icon: "usdc" },
];

export const AmountInputStep = ({ recipient, selectedToken, onSubmit, onBack }: AmountInputStepProps) => {
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState<TokenInfo>(selectedToken);
  const [showInUSD, setShowInUSD] = useState(false);
  const [showTokens, setShowTokens] = useState(false);

  const numericAmount = parseFloat(amount) || 0;
  const usdValue = numericAmount * token.price;
  const cryptoFromUsd = showInUSD ? numericAmount / token.price : numericAmount;
  
  const isInsufficientBalance = cryptoFromUsd > token.balance;
  const isValidAmount = numericAmount > 0 && !isInsufficientBalance;

  const handleKeyPress = (key: string) => {
    if (key === "." && amount.includes(".")) return;
    if (key === "." && amount === "") {
      setAmount("0.");
      return;
    }
    
    // Limit decimals
    if (amount.includes(".")) {
      const decimals = amount.split(".")[1];
      if (decimals && decimals.length >= (showInUSD ? 2 : 8)) return;
    }
    
    setAmount(amount + key);
  };

  const handleDelete = () => {
    setAmount(amount.slice(0, -1));
  };

  const handleMax = () => {
    if (showInUSD) {
      setAmount((token.balance * token.price).toFixed(2));
    } else {
      setAmount(token.balance.toString());
    }
  };

  const handleToggleCurrency = () => {
    if (showInUSD && numericAmount > 0) {
      // Convert USD to crypto
      setAmount((numericAmount / token.price).toFixed(8).replace(/\.?0+$/, ""));
    } else if (!showInUSD && numericAmount > 0) {
      // Convert crypto to USD
      setAmount((numericAmount * token.price).toFixed(2));
    }
    setShowInUSD(!showInUSD);
  };

  const handleSubmit = () => {
    if (isValidAmount) {
      const finalAmount = showInUSD 
        ? (numericAmount / token.price).toFixed(8) 
        : amount;
      onSubmit(finalAmount, token);
    }
  };

  const formatRecipient = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="flex flex-col h-full px-6 pb-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 p-2 rounded-full bg-card border border-border hover:bg-secondary transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Recipient Preview */}
      <div className="mt-4 p-3 rounded-xl bg-card border border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm">
          👤
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Sending to</p>
          <p className="font-mono text-sm truncate">{formatRecipient(recipient)}</p>
        </div>
      </div>

      {/* Token Selector */}
      <button
        onClick={() => setShowTokens(!showTokens)}
        className="mt-4 flex items-center justify-center gap-2 py-2"
      >
        <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary">
          <img 
            src={getCryptoLogoUrl(token.symbol)}
            alt={token.symbol}
            className="w-full h-full object-contain p-1"
          />
        </div>
        <span className="font-semibold">{token.symbol}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", showTokens && "rotate-180")} />
      </button>

      {/* Token Dropdown */}
      {showTokens && (
        <div className="bg-card border border-border rounded-xl p-2 space-y-1">
          {availableTokens.map((t) => (
            <button
              key={t.symbol}
              onClick={() => {
                setToken(t);
                setShowTokens(false);
                setAmount("");
              }}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
                t.symbol === token.symbol ? "bg-primary/10" : "hover:bg-secondary"
              )}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary">
                <img 
                  src={getCryptoLogoUrl(t.symbol)}
                  alt={t.symbol}
                  className="w-full h-full object-contain p-1"
                />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-sm">{t.symbol}</p>
                <p className="text-xs text-muted-foreground">{t.name}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm">{t.balance}</p>
                <p className="text-xs text-muted-foreground">
                  ${(t.balance * t.price).toLocaleString()}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Amount Display */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center mb-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl text-muted-foreground">
              {showInUSD ? "$" : ""}
            </span>
            <span className={cn(
              "font-bold transition-all",
              amount.length > 8 ? "text-3xl" : "text-5xl",
              isInsufficientBalance && "text-destructive"
            )}>
              {amount || "0"}
            </span>
            {!showInUSD && (
              <span className="text-2xl text-muted-foreground">{token.symbol}</span>
            )}
          </div>
          
          {/* Secondary amount */}
          <button 
            onClick={handleToggleCurrency}
            className="flex items-center gap-2 mx-auto mt-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowDownUp className="w-4 h-4" />
            <span className="text-sm">
              {showInUSD 
                ? `${cryptoFromUsd.toFixed(6)} ${token.symbol}`
                : `$${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              }
            </span>
          </button>
        </div>

        {/* Balance */}
        <div className="flex items-center gap-2 mt-4">
          <span className="text-sm text-muted-foreground">
            Balance: {token.balance} {token.symbol}
          </span>
          <button
            onClick={handleMax}
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            MAX
          </button>
        </div>

        {isInsufficientBalance && (
          <p className="text-sm text-destructive mt-2">Insufficient balance</p>
        )}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, ".", 0].map((key) => (
          <button
            key={key}
            onClick={() => handleKeyPress(String(key))}
            className="h-14 rounded-xl bg-card border border-border text-xl font-semibold hover:bg-secondary active:scale-95 transition-all"
          >
            {key}
          </button>
        ))}
        <button
          onClick={handleDelete}
          className="h-14 rounded-xl bg-card border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-all"
        >
          Delete
        </button>
      </div>

      {/* Continue Button */}
      <Button
        onClick={handleSubmit}
        disabled={!isValidAmount}
        className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base"
      >
        Preview Transaction
      </Button>
    </div>
  );
};
