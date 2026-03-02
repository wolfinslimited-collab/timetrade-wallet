import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, AlertTriangle, Trash2, QrCode, Download, ArrowRight, Clipboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { validateSeedPhrase, isValidBip39Word } from "@/utils/seedPhrase";
import { SeedWordInput } from "./SeedWordInput";
import { QRScannerModal } from "@/components/send/QRScannerModal";

interface ImportWalletStepProps {
  onImport: (seedPhrase: string[]) => void;
  onBack: () => void;
}

export const ImportWalletStep = ({ onImport, onBack }: ImportWalletStepProps) => {
  const { toast } = useToast();
  const [wordCount, setWordCount] = useState<12 | 24>(12);
  const [words, setWords] = useState<string[]>(Array(12).fill(""));
  const [showQRScanner, setShowQRScanner] = useState(false);

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

  const handleClearAll = useCallback(() => {
    setWords(Array(wordCount).fill(""));
    toast({ title: "Cleared", description: "All words have been cleared" });
  }, [wordCount, toast]);

  const handleQRScan = useCallback((scannedData: string) => {
    const scannedWords = scannedData.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0);
    if (scannedWords.length >= 12) {
      const targetCount = scannedWords.length >= 24 ? 24 : 12;
      setWordCount(targetCount);
      setWords(scannedWords.slice(0, targetCount).concat(Array(Math.max(0, targetCount - scannedWords.length)).fill("")));
      setShowQRScanner(false);
      toast({ title: "Seed phrase scanned", description: `${Math.min(scannedWords.length, targetCount)} words detected` });
    } else {
      toast({ title: "Invalid QR code", description: "The QR code doesn't contain a valid seed phrase", variant: "destructive" });
    }
  }, [toast]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === "v" && (e.ctrlKey || e.metaKey)) return;
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const next = index + 1;
      if (next < wordCount) (document.querySelector(`[data-word-index="${next}"]`) as HTMLInputElement)?.focus();
    }
    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      const prev = index - 1;
      if (prev >= 0) (document.querySelector(`[data-word-index="${prev}"]`) as HTMLInputElement)?.focus();
    }
    if (e.key === "Backspace" && words[index] === "") {
      e.preventDefault();
      if (index > 0) (document.querySelector(`[data-word-index="${index - 1}"]`) as HTMLInputElement)?.focus();
    }
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      const next = index + 1;
      if (next < wordCount) (document.querySelector(`[data-word-index="${next}"]`) as HTMLInputElement)?.focus();
    }
  }, [wordCount, words]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData("text");
    const pastedWords = pastedText.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0);
    if (pastedWords.length >= 12) {
      e.preventDefault();
      const targetCount = pastedWords.length >= 24 ? 24 : 12;
      setWordCount(targetCount);
      setWords(pastedWords.slice(0, targetCount).concat(Array(Math.max(0, targetCount - pastedWords.length)).fill("")));
      toast({ title: "Seed phrase pasted", description: `${Math.min(pastedWords.length, targetCount)} words detected` });
    }
  }, [toast]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const pastedWords = text.toLowerCase().trim().split(/\s+/).filter(w => w.length > 0);
      if (pastedWords.length >= 12) {
        const targetCount = pastedWords.length >= 24 ? 24 : 12;
        setWordCount(targetCount);
        setWords(pastedWords.slice(0, targetCount).concat(Array(Math.max(0, targetCount - pastedWords.length)).fill("")));
        toast({ title: "Seed phrase pasted", description: `${Math.min(pastedWords.length, targetCount)} words detected` });
      } else {
        toast({ title: "Invalid clipboard", description: "Clipboard doesn't contain a valid seed phrase", variant: "destructive" });
      }
    } catch {
      toast({ title: "Cannot access clipboard", description: "Please paste manually into the first word field", variant: "destructive" });
    }
  }, [toast]);

  const filledWords = words.filter(w => w.length > 0);
  const validWords = words.filter(w => isValidBip39Word(w));
  const allFilled = filledWords.length === wordCount;
  const allValid = validWords.length === wordCount;

  const handleImport = () => {
    if (!allFilled) {
      toast({ title: "Incomplete seed phrase", description: `Please enter all ${wordCount} words`, variant: "destructive" });
      return;
    }
    if (!allValid) {
      const invalidIndices = words.map((w, i) => (!isValidBip39Word(w) ? i + 1 : null)).filter(Boolean);
      toast({ title: "Invalid words detected", description: `Words at positions ${invalidIndices.join(", ")} are not valid BIP39 words`, variant: "destructive" });
      return;
    }
    if (!validateSeedPhrase(words)) {
      toast({ title: "Invalid seed phrase", description: "The checksum doesn't match. Please verify your words are in the correct order.", variant: "destructive" });
      return;
    }
    toast({ title: "Wallet imported successfully!", description: "Restoring your wallet..." });
    onImport(words);
  };

  const progress = validWords.length / wordCount;

  return (
    <div className="flex flex-col min-h-screen w-full" onPaste={handlePaste}>
      {/* Header */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="px-5 pt-6 pb-4"
      >
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-muted/40 border border-border/40 flex items-center justify-center hover:bg-muted/60 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">Import Wallet</p>
            <h2 className="text-xl font-bold text-foreground">Enter Seed Phrase</h2>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-1.5 rounded-full bg-muted/30 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5 text-right font-mono font-medium">
          {validWords.length}/{wordCount} valid
        </p>
      </motion.div>

      {/* Word Count Toggle */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="px-5 mb-3"
      >
        <div className="flex gap-1.5 p-1 rounded-xl bg-muted/25 border border-border/30">
          {([12, 24] as const).map(count => (
            <button
              key={count}
              onClick={() => handleWordCountChange(count)}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200",
                wordCount === count
                  ? "bg-foreground text-background shadow-sm"
                  : "text-foreground/60 hover:text-foreground/80"
              )}
            >
              {count} Words
            </button>
          ))}
        </div>
      </motion.div>

      {/* Quick Actions Row */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="px-5 mb-4 flex gap-2"
      >
        <button
          onClick={handlePasteFromClipboard}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-muted/25 border border-border/30 text-[12px] font-semibold text-foreground/80 hover:bg-muted/40 transition-colors"
        >
          <Clipboard className="w-3.5 h-3.5" />
          Paste
        </button>
        <button
          onClick={() => setShowQRScanner(true)}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-muted/25 border border-border/30 text-[12px] font-semibold text-foreground/80 hover:bg-muted/40 transition-colors"
        >
          <QrCode className="w-3.5 h-3.5" />
          Scan
        </button>
        <button
          onClick={handleClearAll}
          disabled={words.every(w => w === "")}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-muted/25 border border-border/30 text-[12px] font-semibold text-foreground/80 hover:bg-muted/40 transition-colors disabled:opacity-30"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>
      </motion.div>

      {/* Scrollable Word Grid */}
      <div className="flex-1 overflow-auto px-5">
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-1.5"
        >
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
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-4 flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-destructive/[0.08] border border-destructive/15"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-foreground/60">
            <span className="font-semibold text-destructive">Security:</span> Never share your seed phrase. AI Wallet will never ask for it outside this screen.
          </p>
        </motion.div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-3 mb-4 space-y-1"
        >
          <p className="text-[11px] text-muted-foreground">
            💡 Paste your entire phrase to auto-fill all words
          </p>
          <p className="text-[11px] text-muted-foreground">
            ⌨️ Use Tab or Space to move between words
          </p>
        </motion.div>
      </div>

      {/* Import Button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="px-5 pt-3 pb-8"
      >
        <motion.button
          onClick={handleImport}
          disabled={!allValid}
          whileTap={{ scale: 0.97 }}
          className={cn(
            "w-full group relative overflow-hidden rounded-2xl transition-all",
            allValid
              ? "bg-foreground"
              : "bg-muted/40 border border-border/30"
          )}
        >
          <div className={cn(
            "flex items-center justify-center gap-3 px-5 py-4",
            allValid ? "text-background" : "text-muted-foreground/50"
          )}>
            <Download className="w-5 h-5" />
            <span className="text-[15px] font-semibold">Import Wallet</span>
            {allValid && <ArrowRight className="w-4 h-4 opacity-50" />}
          </div>
        </motion.button>
      </motion.div>

      <QRScannerModal
        open={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScan}
      />
    </div>
  );
};
