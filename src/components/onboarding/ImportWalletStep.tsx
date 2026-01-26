import { useState } from "react";
import { ChevronLeft, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { validateSeedPhrase } from "@/utils/seedPhrase";

interface ImportWalletStepProps {
  onImport: (seedPhrase: string[]) => void;
  onBack: () => void;
}

export const ImportWalletStep = ({ onImport, onBack }: ImportWalletStepProps) => {
  const { toast } = useToast();
  const [phraseInput, setPhraseInput] = useState("");
  const [showPhrase, setShowPhrase] = useState(false);
  const [wordCount, setWordCount] = useState<12 | 24>(12);

  const handleInputChange = (value: string) => {
    setPhraseInput(value);
  };

  const getWords = () => {
    return phraseInput
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0);
  };

  const currentWordCount = getWords().length;
  const isValidCount = currentWordCount === wordCount;

  const handleImport = () => {
    const words = getWords();
    
    if (words.length !== wordCount) {
      toast({
        title: "Invalid word count",
        description: `Please enter exactly ${wordCount} words`,
        variant: "destructive",
      });
      return;
    }

    if (!validateSeedPhrase(words)) {
      toast({
        title: "Invalid seed phrase",
        description: "Some words are not valid BIP39 words. Please check your phrase.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Wallet imported successfully!",
      description: "Restoring your wallet...",
    });
    
    onImport(words);
  };

  return (
    <div className="flex flex-col min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={onBack}
          className="p-2 rounded-full bg-card border border-border hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Import Wallet</p>
          <h2 className="text-xl font-bold">Enter Seed Phrase</h2>
        </div>
      </div>

      {/* Word Count Selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setWordCount(12)}
          className={cn(
            "flex-1 py-3 rounded-xl text-sm font-medium transition-all",
            wordCount === 12
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-muted-foreground hover:border-primary/50"
          )}
        >
          12 Words
        </button>
        <button
          onClick={() => setWordCount(24)}
          className={cn(
            "flex-1 py-3 rounded-xl text-sm font-medium transition-all",
            wordCount === 24
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-muted-foreground hover:border-primary/50"
          )}
        >
          24 Words
        </button>
      </div>

      {/* Security Warning */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 mb-6">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-destructive mb-1">Security Warning</p>
          <p className="text-muted-foreground">
            Never share your seed phrase with anyone. Timetrade will never ask for it outside of this import screen.
          </p>
        </div>
      </div>

      {/* Seed Phrase Input */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            Secret Recovery Phrase
          </label>
          <button
            onClick={() => setShowPhrase(!showPhrase)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPhrase ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                Hide
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                Show
              </>
            )}
          </button>
        </div>

        <div className="relative">
          <Textarea
            value={phraseInput}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={`Enter your ${wordCount}-word seed phrase, separated by spaces...`}
            className={cn(
              "min-h-[160px] bg-card border-border font-mono text-sm resize-none",
              !showPhrase && phraseInput && "text-security-disc"
            )}
            style={!showPhrase && phraseInput ? { 
              WebkitTextSecurity: 'disc',
              textSecurity: 'disc'
            } as React.CSSProperties : undefined}
          />
        </div>

        {/* Word Counter */}
        <div className="flex items-center justify-between mt-3">
          <span className={cn(
            "text-sm font-mono",
            currentWordCount === 0 
              ? "text-muted-foreground" 
              : isValidCount 
                ? "text-primary" 
                : "text-destructive"
          )}>
            {currentWordCount} / {wordCount} words
          </span>
          {currentWordCount > 0 && !isValidCount && (
            <span className="text-xs text-destructive">
              {currentWordCount < wordCount 
                ? `${wordCount - currentWordCount} more needed` 
                : `${currentWordCount - wordCount} too many`}
            </span>
          )}
        </div>

        {/* Tips */}
        <div className="mt-6 space-y-2">
          <p className="text-xs text-muted-foreground">
            💡 <span className="font-medium">Tip:</span> Enter words separated by spaces or paste your entire phrase at once
          </p>
          <p className="text-xs text-muted-foreground">
            🔒 Your phrase is stored locally and never leaves your device
          </p>
        </div>
      </div>

      {/* Import Button */}
      <div className="pt-6 pb-8">
        <Button
          onClick={handleImport}
          disabled={!isValidCount}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base disabled:opacity-50"
        >
          Import Wallet
        </Button>
      </div>
    </div>
  );
};
