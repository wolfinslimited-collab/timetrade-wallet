import { useState } from "react";
import { Copy, Eye, EyeOff, ChevronLeft, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface SeedPhraseStepProps {
  seedPhrase: string[];
  onContinue: () => void;
  onBack: () => void;
}

export const SeedPhraseStep = ({ seedPhrase, onContinue, onBack }: SeedPhraseStepProps) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(seedPhrase.join(" "));
      setHasCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Remember to clear your clipboard after writing it down!",
      });
      setTimeout(() => setHasCopied(false), 3000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please manually copy the seed phrase",
        variant: "destructive",
      });
    }
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
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Step 2 of 3</p>
          <h2 className="text-xl font-bold">Your Seed Phrase</h2>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Write down these 12 words in order and store them safely. This is your wallet backup.
      </p>

      {/* Seed Phrase Grid */}
      <div className="relative">
        {/* Blur Overlay */}
        {!isRevealed && (
          <div 
            className="absolute inset-0 bg-card/80 backdrop-blur-md rounded-xl z-10 flex flex-col items-center justify-center cursor-pointer border border-border"
            onClick={() => setIsRevealed(true)}
          >
            <div className="p-3 rounded-full bg-primary/10 mb-3">
              <Eye className="w-6 h-6 text-primary" />
            </div>
            <p className="font-medium">Tap to reveal</p>
            <p className="text-xs text-muted-foreground">Make sure no one is watching</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 p-4 bg-card rounded-xl border border-border">
          {seedPhrase.map((word, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg bg-secondary/50 border border-border",
                !isRevealed && "opacity-0"
              )}
            >
              <span className="text-xs text-muted-foreground w-5">{index + 1}.</span>
              <span className="font-mono text-sm font-medium">{word}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {isRevealed && (
        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            onClick={handleCopy}
            className="flex-1 border-border bg-card hover:bg-secondary"
          >
            {hasCopied ? (
              <>
                <Check className="w-4 h-4 mr-2 text-primary" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsRevealed(false)}
            className="border-border bg-card hover:bg-secondary"
          >
            <EyeOff className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Warning Box */}
      <div className="mt-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
        <div className="flex items-start gap-3">
          <RefreshCw className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            <strong className="text-destructive">Never share</strong> your seed phrase with anyone. 
            Timetrade support will <strong>never</strong> ask for it.
          </p>
        </div>
      </div>

      {/* Continue Button */}
      <div className="flex-1" />
      <div className="pt-6 pb-8">
        <Button
          onClick={onContinue}
          disabled={!isRevealed}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base disabled:opacity-50"
        >
          I've Written It Down
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-3">
          You'll need to verify your seed phrase next
        </p>
      </div>
    </div>
  );
};
