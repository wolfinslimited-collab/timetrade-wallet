import { useState } from "react";
import { Shield, AlertTriangle, Eye, EyeOff, Lock, ChevronLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface SecurityWarningStepProps {
  onContinue: () => void;
  onBack: () => void;
}

const securityTips = [
  {
    icon: Eye,
    title: "Write it down",
    description: "Write your seed phrase on paper and store it in a secure location. Never save it digitally.",
  },
  {
    icon: Lock,
    title: "Keep it secret",
    description: "Never share your seed phrase with anyone. Timetrade will never ask for it.",
  },
  {
    icon: Shield,
    title: "No screenshots",
    description: "Never take screenshots or photos of your seed phrase. This compromises security.",
  },
];

export const SecurityWarningStep = ({ onContinue, onBack }: SecurityWarningStepProps) => {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div className="flex flex-col min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
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

      {/* Warning Banner */}
      <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-accent/20 shrink-0">
            <AlertTriangle className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-accent mb-1">Important Security Notice</h3>
            <p className="text-sm text-muted-foreground">
              Your seed phrase is the <strong>only way</strong> to recover your wallet. If you lose it, your funds are gone forever.
            </p>
          </div>
        </div>
      </div>

      {/* Security Tips */}
      <div className="flex-1 space-y-4">
        {securityTips.map((tip, index) => (
          <div 
            key={index}
            className="flex items-start gap-4 p-4 bg-card rounded-xl border border-border"
          >
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <tip.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium mb-1">{tip.title}</h4>
              <p className="text-sm text-muted-foreground">{tip.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Acknowledgment */}
      <div className="pt-6 pb-8 space-y-4">
        <label 
          className={cn(
            "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all",
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
