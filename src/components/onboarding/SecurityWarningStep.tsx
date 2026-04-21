import { useState } from "react";
import { ShieldCheck, PenLine, EyeOff, Camera, ChevronLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface SecurityWarningStepProps {
  onContinue: () => void;
  onBack: () => void;
}

const securityTips = [
  {
    icon: PenLine,
    title: "Write it down",
    description: "Store your seed phrase on paper in a secure, offline location.",
  },
  {
    icon: EyeOff,
    title: "Keep it private",
    description: "Never share your phrase. Timetrade will never ask for it.",
  },
  {
    icon: Camera,
    title: "No screenshots",
    description: "Avoid digital copies — they can be stolen by malware.",
  },
];

export const SecurityWarningStep = ({ onContinue, onBack }: SecurityWarningStepProps) => {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div className="flex flex-col h-screen">
      {/* Fixed header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 rounded-full bg-card border border-border hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Step 1 of 3</p>
            <h2 className="text-xl font-bold">Security First</h2>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">

      {/* Hero icon + intro */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="relative mb-5">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center">
            <ShieldCheck className="w-10 h-10 text-primary" strokeWidth={1.8} />
          </div>
        </div>
        <h3 className="text-2xl font-bold mb-2">Protect your wallet</h3>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Your seed phrase is the master key to your funds. Read these guidelines carefully before continuing.
        </p>
      </div>

      {/* Security Rules */}
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
        Security Rules
      </p>
      <div className="space-y-2 mb-2">
        {securityTips.map((tip, index) => (
          <div 
            key={index}
            className="group flex items-start gap-3 p-3.5 bg-card/50 rounded-xl border border-border/60 hover:border-border transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 shrink-0 flex items-center justify-center">
              <tip.icon className="w-4 h-4 text-primary" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm mb-0.5">{tip.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{tip.description}</p>
            </div>
          </div>
        ))}
      </div>

      </div>

      {/* Fixed bottom: acknowledgment + button */}
      <div className="shrink-0 px-6 py-4 border-t border-border bg-background space-y-3" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}>
        <label 
          className={cn(
            "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors",
            acknowledged 
              ? "bg-primary/10 border-primary/50" 
              : "bg-card border-border hover:border-primary/30"
          )}
        >
          <Checkbox
            checked={acknowledged}
            onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
            className="mt-0.5"
          />
          <span className="text-sm">
            I understand that if I lose my seed phrase, I will <strong>permanently lose access</strong> to my wallet and all funds.
          </span>
        </label>
        <Button
          onClick={onContinue}
          disabled={!acknowledged}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base disabled:opacity-50"
        >
          <Check className="w-5 h-5 mr-2" />
          I Understand, Show Seed Phrase
        </Button>
      </div>
    </div>
  );
};
