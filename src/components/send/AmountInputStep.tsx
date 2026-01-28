import { useState, useEffect } from "react";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chain, getChainInfo } from "@/hooks/useBlockchain";
import { AvailableAsset } from "./NetworkAssetSelector";

// Logo helper
const getCryptoLogoUrl = (symbol: string) => 
  `https://api.elbstream.com/logos/crypto/${symbol.toLowerCase()}`;

interface AmountInputStepProps {
  recipient: string;
  selectedAsset: AvailableAsset;
  selectedChain: Chain;
  onSubmit: (amount: string) => void;
}

export const AmountInputStep = ({
  recipient,
  selectedAsset,
  selectedChain,
  onSubmit,
}: AmountInputStepProps) => {
  const [amount, setAmount] = useState("");
  const [isUsdMode, setIsUsdMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chainInfo = getChainInfo(selectedChain);

  // Calculate display values
  const numericAmount = parseFloat(amount) || 0;
  const cryptoAmount = isUsdMode 
    ? (selectedAsset.price > 0 ? numericAmount / selectedAsset.price : 0)
    : numericAmount;
  const usdAmount = isUsdMode 
    ? numericAmount 
    : numericAmount * selectedAsset.price;

  // Validate amount
  useEffect(() => {
    if (!amount) {
      setError(null);
      return;
    }
    
    if (cryptoAmount > selectedAsset.balance) {
      setError("Insufficient balance");
    } else if (cryptoAmount <= 0) {
      setError("Enter a valid amount");
    } else {
      setError(null);
    }
  }, [amount, cryptoAmount, selectedAsset.balance]);

  const handlePercentage = (percent: number) => {
    const value = selectedAsset.balance * (percent / 100);
    if (isUsdMode) {
      setAmount((value * selectedAsset.price).toFixed(2));
    } else {
      setAmount(value.toFixed(6));
    }
  };

  const handleSubmit = () => {
    if (cryptoAmount <= 0 || cryptoAmount > selectedAsset.balance) {
      setError("Invalid amount");
      return;
    }
    // Always submit in crypto amount
    onSubmit(cryptoAmount.toString());
  };

  const toggleMode = () => {
    if (isUsdMode) {
      // Convert USD to crypto
      setAmount(cryptoAmount.toFixed(6));
    } else {
      // Convert crypto to USD
      setAmount(usdAmount.toFixed(2));
    }
    setIsUsdMode(!isUsdMode);
  };

  return (
    <div className="flex flex-col h-full px-6 pb-8">
      {/* Asset Info */}
      <div className="mt-4 flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary">
          <img 
            src={getCryptoLogoUrl(selectedAsset.symbol)} 
            alt={selectedAsset.symbol}
            className="w-full h-full object-contain p-1"
          />
        </div>
        <div className="flex-1">
          <p className="font-medium">{selectedAsset.symbol}</p>
          <p className="text-xs text-muted-foreground">on {chainInfo.name}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">
            {selectedAsset.balance.toLocaleString(undefined, { maximumFractionDigits: 6 })}
          </p>
          <p className="text-xs text-muted-foreground">Available</p>
        </div>
      </div>

      {/* Recipient display */}
      <div className="mt-4 p-3 bg-card/50 border border-border rounded-xl">
        <p className="text-xs text-muted-foreground mb-1">Sending to</p>
        <p className="font-mono text-sm truncate">{recipient}</p>
      </div>

      {/* Amount Input */}
      <div className="mt-6 text-center">
        <div className="relative inline-block w-full max-w-full mx-auto">
          <div className="flex items-end justify-center gap-2 flex-wrap">
            <span className="text-2xl text-muted-foreground">
              {isUsdMode ? "$" : ""}
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="bg-transparent text-[clamp(2.5rem,9vw,3.5rem)] font-bold text-center outline-none w-full max-w-[20rem] min-w-[10rem] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            {!isUsdMode && (
              <span className="text-2xl text-muted-foreground leading-none pb-1">
                {selectedAsset.symbol}
              </span>
            )}
          </div>
          
          {/* Converted value */}
          <button
            onClick={toggleMode}
            className="mt-2 flex items-center justify-center gap-2 mx-auto text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="text-lg">
              {isUsdMode 
                ? `${cryptoAmount.toFixed(6)} ${selectedAsset.symbol}`
                : `$${usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              }
            </span>
          </button>
        </div>

        {error && (
          <p className="text-destructive text-sm mt-2">{error}</p>
        )}
      </div>

      {/* Quick Percentage Buttons */}
      <div className="mt-6 grid grid-cols-4 gap-2">
        {[25, 50, 75, 100].map((percent) => (
          <button
            key={percent}
            onClick={() => handlePercentage(percent)}
            className="py-3 rounded-xl bg-card border border-border hover:border-primary/50 text-sm font-medium transition-colors"
          >
            {percent}%
          </button>
        ))}
      </div>

      {/* Balance Display */}
      <div className="mt-4 text-center text-sm text-muted-foreground">
        Balance: {selectedAsset.balance.toLocaleString(undefined, { maximumFractionDigits: 6 })} {selectedAsset.symbol}
        {selectedAsset.price > 0 && (
          <span className="ml-2">
            (${(selectedAsset.balance * selectedAsset.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
          </span>
        )}
      </div>

      {/* Continue Button */}
      <div className="mt-auto pt-6">
        <Button
          onClick={handleSubmit}
          disabled={!amount || !!error}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base"
        >
          Review Transaction
        </Button>
      </div>
    </div>
  );
};
