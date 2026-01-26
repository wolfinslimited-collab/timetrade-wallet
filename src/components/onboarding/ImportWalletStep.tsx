import { useState, useRef, useCallback } from "react";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { validateSeedPhrase, isValidBip39Word } from "@/utils/seedPhrase";
import { SeedWordInput } from "./SeedWordInput";

interface ImportWalletStepProps {
  onImport: (seedPhrase: string[]) => void;
  onBack: () => void;
}

export const ImportWalletStep = ({ onImport, onBack }: ImportWalletStepProps) => {
  const { toast } = useToast();
  const [wordCount, setWordCount] = useState<12 | 24>(12);
  const [words, setWords] = useState<string[]>(Array(12).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Update words array when word count changes
  const handleWordCountChange = (count: 12 | 24) => {
    setWordCount(count);
    setWords(prev => {
      if (count === 12) {
        return prev.slice(0, 12);
      } else {
        return [...prev.slice(0, 12), ...Array(12).fill("")];
      }
    });
  };

  const handleWordChange = useCallback((index: number, value: string) => {
    setWords(prev => {
      const newWords = [...prev];
      newWords[index] = value;
      return newWords;
    });
  }, []);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    // Handle paste of full seed phrase
    if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      return; // Let the paste event handle it
    }

    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const nextIndex = index + 1;
      if (nextIndex < wordCount) {
        const nextInput = document.querySelector(
          `[data-word-index="${nextIndex}"]`
        ) as HTMLInputElement;
        nextInput?.focus();
      }
    }

    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      const prevIndex = index - 1;
      if (prevIndex >= 0) {
        const prevInput = document.querySelector(
          `[data-word-index="${prevIndex}"]`
        ) as HTMLInputElement;
        prevInput?.focus();
      }
    }

    if (e.key === "Backspace" && words[index] === "") {
      e.preventDefault();
      if (index > 0) {
        const prevInput = document.querySelector(
          `[data-word-index="${index - 1}"]`
        ) as HTMLInputElement;
        prevInput?.focus();
      }
    }

    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      const nextIndex = index + 1;
      if (nextIndex < wordCount) {
        const nextInput = document.querySelector(
          `[data-word-index="${nextIndex}"]`
        ) as HTMLInputElement;
        nextInput?.focus();
      }
    }
  }, [wordCount, words]);

  // Handle paste of full seed phrase
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData("text");
    const pastedWords = pastedText
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0);

    if (pastedWords.length >= 12) {
      e.preventDefault();
      const targetCount = pastedWords.length >= 24 ? 24 : 12;
      setWordCount(targetCount);
      setWords(pastedWords.slice(0, targetCount).concat(
        Array(Math.max(0, targetCount - pastedWords.length)).fill("")
      ));
      toast({
        title: "Seed phrase pasted",
        description: `${Math.min(pastedWords.length, targetCount)} words detected`,
      });
    }
  }, [toast]);

  const filledWords = words.filter(w => w.length > 0);
  const validWords = words.filter(w => isValidBip39Word(w));
  const allFilled = filledWords.length === wordCount;
  const allValid = validWords.length === wordCount;

  const handleImport = () => {
    if (!allFilled) {
      toast({
        title: "Incomplete seed phrase",
        description: `Please enter all ${wordCount} words`,
        variant: "destructive",
      });
      return;
    }

    if (!allValid) {
      const invalidIndices = words
        .map((w, i) => (!isValidBip39Word(w) ? i + 1 : null))
        .filter(Boolean);
      toast({
        title: "Invalid words detected",
        description: `Words at positions ${invalidIndices.join(", ")} are not valid BIP39 words`,
        variant: "destructive",
      });
      return;
    }

    if (!validateSeedPhrase(words)) {
      toast({
        title: "Invalid seed phrase",
        description: "The checksum doesn't match. Please verify your words are in the correct order.",
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
    <div className="flex flex-col min-h-screen p-6" onPaste={handlePaste}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
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
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => handleWordCountChange(12)}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all",
            wordCount === 12
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-muted-foreground hover:border-primary/50"
          )}
        >
          12 Words
        </button>
        <button
          onClick={() => handleWordCountChange(24)}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all",
            wordCount === 24
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-muted-foreground hover:border-primary/50"
          )}
        >
          24 Words
        </button>
      </div>

      {/* Security Warning */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 mb-4">
        <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-destructive">Security:</span> Never share your seed phrase. Timetrade will never ask for it outside this screen.
        </p>
      </div>

      {/* Word Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-3 gap-2">
          {words.map((word, index) => (
            <div key={index} data-word-index={index}>
              <SeedWordInput
                index={index}
                value={word}
                onChange={handleWordChange}
                onKeyDown={handleKeyDown}
                autoFocus={index === 0}
              />
            </div>
          ))}
        </div>

        {/* Status */}
        <div className="flex items-center justify-between mt-4 px-1">
          <span className={cn(
            "text-sm font-mono",
            filledWords.length === 0 
              ? "text-muted-foreground" 
              : allValid 
                ? "text-primary" 
                : "text-foreground"
          )}>
            {validWords.length} / {wordCount} valid
          </span>
          {filledWords.length > 0 && !allValid && (
            <span className="text-xs text-destructive">
              {wordCount - validWords.length} invalid
            </span>
          )}
        </div>

        {/* Tips */}
        <div className="mt-4 space-y-1.5">
          <p className="text-xs text-muted-foreground">
            💡 Paste your entire phrase to auto-fill all words
          </p>
          <p className="text-xs text-muted-foreground">
            ⌨️ Use Tab or Space to move between words
          </p>
        </div>
      </div>

      {/* Import Button */}
      <div className="pt-4 pb-6">
        <Button
          onClick={handleImport}
          disabled={!allValid}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base disabled:opacity-50"
        >
          Import Wallet
        </Button>
      </div>
    </div>
  );
};
