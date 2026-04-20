import { useState, useCallback } from "react";
import { ChevronLeft, ShieldAlert, Trash2, QrCode, Clipboard, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { validateSeedPhrase, isValidBip39Word } from "@/utils/seedPhrase";
import { SeedWordInput } from "./SeedWordInput";
import { QRScannerModal } from "@/components/send/QRScannerModal";
import { haptics } from "@/lib/haptics";

interface ImportWalletStepProps {
  onImport: (seedPhrase: string[]) => void;
  onBack: () => void;
}

export const ImportWalletStep = ({ onImport, onBack }: ImportWalletStepProps) => {
  const { toast } = useToast();
  const [wordCount, setWordCount] = useState<12 | 24>(12);
  const [words, setWords] = useState<string[]>(Array(12).fill(""));
  const [showQRScanner, setShowQRScanner] = useState(false);

  const handleWordCountChange = (count: 12 | 24) => {
    haptics.selection();
    setWordCount(count);
    setWords(prev =>
      count === 12
        ? prev.slice(0, 12)
        : [...prev.slice(0, 12), ...Array(12).fill("")]
    );
  };

  const handleWordChange = useCallback((index: number, value: string) => {
    setWords(prev => {
      const newWords = [...prev];
      newWords[index] = value;
      return newWords;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    haptics.impact("light");
    setWords(Array(wordCount).fill(""));
  }, [wordCount]);

  const handleQRScan = useCallback((scannedData: string) => {
    const scannedWords = scannedData.toLowerCase().trim().split(/\s+/).filter(w => w.length > 0);
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
    const pastedWords = pastedText.toLowerCase().trim().split(/\s+/).filter(w => w.length > 0);
    if (pastedWords.length >= 12) {
      e.preventDefault();
      const targetCount = pastedWords.length >= 24 ? 24 : 12;
      setWordCount(targetCount);
      setWords(pastedWords.slice(0, targetCount).concat(Array(Math.max(0, targetCount - pastedWords.length)).fill("")));
      toast({ title: "Pasted", description: `${Math.min(pastedWords.length, targetCount)} words detected` });
    }
  }, [toast]);

  const handlePasteFromClipboard = useCallback(async () => {
    haptics.selection();
    try {
      const text = await navigator.clipboard.readText();
      const pastedWords = text.toLowerCase().trim().split(/\s+/).filter(w => w.length > 0);
      if (pastedWords.length >= 12) {
        const targetCount = pastedWords.length >= 24 ? 24 : 12;
        setWordCount(targetCount);
        setWords(pastedWords.slice(0, targetCount).concat(Array(Math.max(0, targetCount - pastedWords.length)).fill("")));
        toast({ title: "Pasted", description: `${Math.min(pastedWords.length, targetCount)} words detected` });
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
      toast({ title: "Invalid words detected", description: `Words at positions ${invalidIndices.join(", ")} are not valid`, variant: "destructive" });
      return;
    }
    if (!validateSeedPhrase(words)) {
      toast({ title: "Invalid seed phrase", description: "The checksum doesn't match. Please verify your words and order.", variant: "destructive" });
      return;
    }
    haptics.impact("medium");
    onImport(words);
  };

  const progress = validWords.length / wordCount;
  const hasAny = words.some(w => w.length > 0);

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-gradient-to-b from-[hsl(220_14%_12%)] via-[hsl(220_14%_9%)] to-background" onPaste={handlePaste}>
      {/* ── Header ── */}
      <div
        className="shrink-0 px-5 pt-3 pb-3"
        style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => { haptics.selection(); onBack(); }}
            className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center transition-transform duration-150 active:scale-90"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex flex-col items-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Import</p>
            <h2 className="text-[15px] font-bold text-foreground leading-tight">Recovery Phrase</h2>
          </div>
          <div className="w-9 h-9" />
        </div>
      </div>

      {/* ── Progress + counter ── */}
      <div className="shrink-0 px-5 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] font-medium text-muted-foreground">Words entered</p>
          <p className="text-[11px] font-bold tabular-nums text-foreground/80">
            <span className={cn(allValid && "text-emerald-500")}>{validWords.length}</span>
            <span className="text-muted-foreground/60">/{wordCount}</span>
          </p>
        </div>
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              allValid ? "bg-emerald-400" : "bg-primary"
            )}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* ── Segmented control: 12 / 24 ── */}
      <div className="shrink-0 px-5 pb-3">
        <div className="flex p-1 rounded-xl bg-white/[0.06] border border-white/10">
          {([12, 24] as const).map(count => (
            <button
              key={count}
              onClick={() => handleWordCountChange(count)}
              className={cn(
                "flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200",
                wordCount === count
                  ? "bg-white/[0.12] text-foreground shadow-sm shadow-black/30"
                  : "text-foreground/50"
              )}
            >
              {count} words
            </button>
          ))}
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="shrink-0 px-5 pb-3 grid grid-cols-3 gap-2">
        <button
          onClick={handlePasteFromClipboard}
          className="flex items-center justify-center gap-1.5 h-10 rounded-xl bg-white/[0.08] border border-white/10 text-[12.5px] font-semibold text-foreground transition-transform duration-150 active:scale-[0.97]"
        >
          <Clipboard className="w-3.5 h-3.5 text-primary" />
          Paste
        </button>
        <button
          onClick={() => { haptics.selection(); setShowQRScanner(true); }}
          className="flex items-center justify-center gap-1.5 h-10 rounded-xl bg-white/[0.08] border border-white/10 text-[12.5px] font-semibold text-foreground transition-transform duration-150 active:scale-[0.97]"
        >
          <QrCode className="w-3.5 h-3.5 text-primary" />
          Scan
        </button>
        <button
          onClick={handleClearAll}
          disabled={!hasAny}
          className="flex items-center justify-center gap-1.5 h-10 rounded-xl bg-white/[0.08] border border-white/10 text-[12.5px] font-semibold text-foreground transition-transform duration-150 active:scale-[0.97] disabled:opacity-35 disabled:active:scale-100"
        >
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
          Clear
        </button>
      </div>

      {/* ── Word grid (scrollable area) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-4">
        <div className="grid grid-cols-2 gap-2">
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

        {/* Security notice */}
        <div className="mt-4 flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-destructive/[0.08] border border-destructive/20">
          <ShieldAlert className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-[11.5px] leading-snug text-foreground/75">
            <span className="font-semibold text-destructive">Never share your seed phrase.</span>{" "}
            Timetrade Wallet will never ask for it outside this screen.
          </p>
        </div>

        {/* Tips */}
        <div className="mt-3 space-y-1 px-1">
          <p className="text-[11px] text-muted-foreground/80">
            • Paste your full phrase to auto-fill all fields
          </p>
          <p className="text-[11px] text-muted-foreground/80">
            • Tap or press Tab/Space to move between words
          </p>
        </div>
      </div>

      {/* ── Sticky CTA ── */}
      <div
        className="shrink-0 px-5 pt-3 pb-5 bg-gradient-to-t from-background via-background to-background/80 backdrop-blur"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          onClick={handleImport}
          disabled={!allValid}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-2xl h-[52px] transition-all duration-150",
            allValid
              ? "bg-primary active:scale-[0.98] shadow-lg shadow-primary/25"
              : "bg-muted/40 cursor-not-allowed"
          )}
        >
          <span
            className={cn(
              "text-[15px] font-bold",
              allValid ? "text-primary-foreground" : "text-muted-foreground/60"
            )}
          >
            Import Wallet
          </span>
          {allValid && <ArrowRight className="w-4 h-4 text-primary-foreground" />}
        </button>
      </div>

      <QRScannerModal
        open={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScan}
      />
    </div>
  );
};
