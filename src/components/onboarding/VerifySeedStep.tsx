import { useState, useMemo } from "react";
import { ChevronLeft, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface VerifySeedStepProps {
  seedPhrase: string[];
  onComplete: () => void;
  onBack: () => void;
}

export const VerifySeedStep = ({ seedPhrase, onComplete, onBack }: VerifySeedStepProps) => {
  const { toast } = useToast();
  
  // Generate verification challenge: pick 3 random positions
  const verificationIndices = useMemo(() => {
    const indices: number[] = [];
    while (indices.length < 3) {
      const idx = Math.floor(Math.random() * seedPhrase.length);
      if (!indices.includes(idx)) indices.push(idx);
    }
    return indices.sort((a, b) => a - b);
  }, [seedPhrase.length]);

  const [selectedWords, setSelectedWords] = useState<(string | null)[]>([null, null, null]);
  const [currentSlot, setCurrentSlot] = useState(0);

  // Shuffle word options
  const wordOptions = useMemo(() => {
    const correctWords = verificationIndices.map(i => seedPhrase[i]);
    const otherWords = seedPhrase.filter((_, i) => !verificationIndices.includes(i));
    const shuffled = [...otherWords].sort(() => Math.random() - 0.5).slice(0, 6);
    return [...correctWords, ...shuffled].sort(() => Math.random() - 0.5);
  }, [seedPhrase, verificationIndices]);

  const handleWordSelect = (word: string) => {
    if (currentSlot >= 3) return;
    
    const newSelected = [...selectedWords];
    newSelected[currentSlot] = word;
    setSelectedWords(newSelected);
    
    if (currentSlot < 2) {
      setCurrentSlot(currentSlot + 1);
    }
  };

  const handleClearSlot = (slotIndex: number) => {
    const newSelected = [...selectedWords];
    newSelected[slotIndex] = null;
    setSelectedWords(newSelected);
    setCurrentSlot(slotIndex);
  };

  const handleVerify = () => {
    const isCorrect = verificationIndices.every(
      (phraseIndex, slotIndex) => selectedWords[slotIndex] === seedPhrase[phraseIndex]
    );

    if (isCorrect) {
      toast({
        title: "Verification successful!",
        description: "Your wallet is being created...",
      });
      onComplete();
    } else {
      toast({
        title: "Incorrect words",
        description: "Please check your seed phrase and try again",
        variant: "destructive",
      });
      setSelectedWords([null, null, null]);
      setCurrentSlot(0);
    }
  };

  const allFilled = selectedWords.every(w => w !== null);

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
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Step 3 of 3</p>
          <h2 className="text-xl font-bold">Verify Seed Phrase</h2>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Select the correct word for each position to verify you've saved your seed phrase.
      </p>

      {/* Verification Slots */}
      <div className="space-y-3 mb-8">
        {verificationIndices.map((phraseIndex, slotIndex) => (
          <div 
            key={slotIndex}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border transition-all",
              currentSlot === slotIndex 
                ? "bg-primary/10 border-primary/50" 
                : selectedWords[slotIndex] 
                  ? "bg-card border-primary/30"
                  : "bg-card border-border"
            )}
          >
            <span className="text-sm text-muted-foreground font-mono w-10">
              Word #{phraseIndex + 1}
            </span>
            
            {selectedWords[slotIndex] ? (
              <div className="flex-1 flex items-center justify-between">
                <span className="font-mono font-medium">{selectedWords[slotIndex]}</span>
                <button
                  onClick={() => handleClearSlot(slotIndex)}
                  className="p-1 rounded-full hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">
                {currentSlot === slotIndex ? "Select word below..." : "—"}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Word Options */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Tap the correct word for position #{verificationIndices[currentSlot] + 1}</span>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {wordOptions.map((word, index) => {
            const isSelected = selectedWords.includes(word);
            return (
              <button
                key={index}
                onClick={() => handleWordSelect(word)}
                disabled={isSelected}
                className={cn(
                  "p-3 rounded-lg text-sm font-mono font-medium transition-all",
                  isSelected
                    ? "bg-secondary/50 text-muted-foreground cursor-not-allowed opacity-50"
                    : "bg-card border border-border hover:border-primary/50 hover:bg-primary/5"
                )}
              >
                {word}
              </button>
            );
          })}
        </div>
      </div>

      {/* Verify Button */}
      <div className="pt-6 pb-8">
        <Button
          onClick={handleVerify}
          disabled={!allFilled}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base disabled:opacity-50"
        >
          Verify & Create Wallet
        </Button>
      </div>
    </div>
  );
};
