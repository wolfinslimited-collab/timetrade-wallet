import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, Shield, Zap, CheckCircle2, ArrowRight, ArrowLeft,
  TrendingUp, Target, BarChart3, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WizardProps {
  balance: number;
  onComplete: (profile: TradingProfile) => void | Promise<void>;
  onCancel: () => void;
}

export interface TradingProfile {
  allocatedAmount: number;
  riskLevel: "low" | "balanced" | "high";
  strategyType: "steady_growth" | "momentum" | "adaptive";
  profitTargetPct: number;
  stopLossPct: number;
}

const RECOMMENDED_RISK = "balanced" as const;
const RECOMMENDED_STRATEGY = "adaptive" as const;
const RECOMMENDED_AMOUNT_PCT = 0.5;

const RISK_OPTIONS = [
  { value: "low" as const, label: "Conservative", icon: Shield,
    desc: "The system uses smaller positions and exits quickly when conditions change. Capital protection is the priority.",
    detail: "Careful sizing · Quick exits",
    bg: "bg-card/60 border-border/50",
    activeBg: "bg-card border-foreground/25 ring-1 ring-foreground/10" },
  { value: "balanced" as const, label: "Balanced", icon: Target,
    desc: "A measured approach to sizing and exposure. The system balances opportunity with protection.",
    detail: "Balanced sizing · Steady management",
    bg: "bg-card/60 border-border/50",
    activeBg: "bg-card border-foreground/25 ring-1 ring-foreground/10" },
  { value: "high" as const, label: "Aggressive", icon: Zap,
    desc: "The system allocates more per trade and holds positions longer. Designed for traders comfortable with higher exposure.",
    detail: "Larger sizing · Extended holds",
    bg: "bg-card/60 border-border/50",
    activeBg: "bg-card border-foreground/25 ring-1 ring-foreground/10" },
];

const STRATEGY_OPTIONS = [
  { value: "steady_growth" as const, label: "Steady Growth", icon: TrendingUp,
    desc: "Enters trades frequently on stable, high-liquidity pairs. Prioritises consistency and small, reliable moves.",
    detail: "Frequent entries · Stable pairs",
    bg: "bg-card/60 border-border/50",
    activeBg: "bg-card border-foreground/25 ring-1 ring-foreground/10" },
  { value: "momentum" as const, label: "Momentum", icon: Zap,
    desc: "Waits for strong trend signals before entering. Fewer trades, each backed by volume and directional conviction.",
    detail: "Signal-driven · Selective entries",
    bg: "bg-card/60 border-border/50",
    activeBg: "bg-card border-foreground/25 ring-1 ring-foreground/10" },
  { value: "adaptive" as const, label: "Adaptive", icon: BarChart3,
    desc: "The AI reads market conditions in real time and switches approaches automatically. Fully hands-off.",
    detail: "AI-managed · Dynamic approach",
    bg: "bg-card/60 border-border/50",
    activeBg: "bg-card border-foreground/25 ring-1 ring-foreground/10" },
];

const STEPS = ["Amount", "Risk", "Strategy", "Review"];

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

function RecommendedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 border border-primary/30 px-2 py-0.5 text-[10px] font-semibold text-primary leading-none">
      ★ Recommended
    </span>
  );
}

export function TradingOnboardingWizard({ balance, onComplete, onCancel }: WizardProps) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const floor2 = (n: number) => Math.floor(n * 100) / 100;
  const safeMax = floor2(balance);
  const defaultAmount = floor2(balance * RECOMMENDED_AMOUNT_PCT);
  const [amount, setAmount] = useState<string>(String(defaultAmount));
  const [riskLevel, setRiskLevel] = useState<"low" | "balanced" | "high">(RECOMMENDED_RISK);
  const [strategyType, setStrategyType] = useState<"steady_growth" | "momentum" | "adaptive">(RECOMMENDED_STRATEGY);

  const numAmount = parseFloat(amount) || 0;
  const amountValid = numAmount > 0 && numAmount <= safeMax;
  const profitTarget = 5;

  const presets = [
    { label: "25%",  val: floor2(balance * 0.25) },
    { label: "50%",  val: floor2(balance * 0.5) },
    { label: "75%",  val: floor2(balance * 0.75) },
    { label: "100%", val: safeMax },
  ];

  const next = useCallback(() => { setDir(1); setStep(s => Math.min(s + 1, 3)); }, []);
  const prev = useCallback(() => { setDir(-1); setStep(s => Math.max(s - 1, 0)); }, []);
  const canNext = step === 0 ? amountValid : true;

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      await onComplete({
        allocatedAmount: numAmount,
        riskLevel, strategyType,
        profitTargetPct: profitTarget,
        stopLossPct: 3,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full mx-auto border-border/60 shadow-2xl bg-card/95 relative">
      <CardContent className="p-6 space-y-6">
        {/* Header / step indicators */}
        <div className="space-y-2">
          <div className="flex items-center">
            <div className="flex-1 flex items-center">
              {STEPS.map((s, i) => (
                <div key={s} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className={cn("text-xs transition-colors", i <= step ? "text-primary font-medium" : "text-muted-foreground")}>{s}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-muted/40">
                <motion.div className="h-full bg-primary rounded-full" initial={false}
                  animate={{ width: i <= step ? "100%" : "0%" }} transition={{ duration: 0.3, ease: "easeInOut" }} />
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={step} custom={dir} variants={variants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }} className="min-h-[280px]">
            {step === 0 && <StepAmount maxAmount={safeMax} amount={amount} setAmount={setAmount} presets={presets} valid={amountValid} />}
            {step === 1 && <StepRisk riskLevel={riskLevel} setRiskLevel={setRiskLevel} />}
            {step === 2 && <StepStrategy strategyType={strategyType} setStrategyType={setStrategyType} />}
            {step === 3 && <StepReview amount={numAmount} riskLevel={riskLevel} strategyType={strategyType} profitTarget={profitTarget} />}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center gap-3">
          {step === 0 ? (
            <Button variant="ghost" onClick={onCancel} className="flex-1 text-muted-foreground hover:bg-transparent hover:text-foreground">Cancel</Button>
          ) : (
            <Button variant="ghost" onClick={prev} className="flex-1 text-muted-foreground hover:bg-transparent hover:text-foreground"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
          )}
          {step < 3 ? (
            <Button onClick={next} disabled={!canNext} className="flex-1">Continue <ArrowRight className="w-4 h-4 ml-1" /></Button>
          ) : (
            <Button onClick={handleComplete} disabled={submitting} className="flex-1">
              {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Start Trading
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Step components ─── */

function StepAmount({ maxAmount, amount, setAmount, presets, valid }:{
  maxAmount:number; amount:string; setAmount:(v:string)=>void;
  presets:{label:string;val:number}[]; valid:boolean;
}) {
  const num = parseFloat(amount) || 0;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" /> Select Trading Amount
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose how much of your <span className="text-foreground font-medium">${maxAmount.toFixed(2)}</span> available balance to allocate.
        </p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {presets.map(p => {
          const isRecommended = p.label === "50%";
          return (
            <button key={p.label} onClick={() => setAmount(String(p.val))}
              className={cn("rounded-lg border px-3 py-2 text-sm font-medium transition-all relative",
                num === p.val ? "bg-primary/20 border-primary/50 text-primary"
                  : "bg-muted/30 border-border hover:bg-muted/60 text-muted-foreground")}>
              {p.label}
              {isRecommended && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary/15 border border-primary/30 px-1.5 py-px text-[9px] font-semibold text-primary leading-none whitespace-nowrap">★</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Custom amount ($)</label>
        <Input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
          min={0} max={maxAmount} step={0.01} className="text-lg font-mono" />
        {amount && !valid ? (
          <p className="text-xs text-destructive">{num <= 0 ? "Enter a positive amount" : `Max available: $${maxAmount.toFixed(2)}`}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Max available: ${maxAmount.toFixed(2)}</p>
        )}
      </div>
    </div>
  );
}

function StepRisk({ riskLevel, setRiskLevel }:{ riskLevel:string; setRiskLevel:(v:"low"|"balanced"|"high")=>void; }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> Select Risk Level
        </h2>
        <p className="text-sm text-muted-foreground mt-1">How carefully the system manages your positions and exposure.</p>
      </div>
      <div className="space-y-3">
        {RISK_OPTIONS.map(opt => {
          const active = riskLevel === opt.value;
          const isRecommended = opt.value === RECOMMENDED_RISK;
          const Icon = opt.icon;
          return (
            <button key={opt.value} onClick={() => setRiskLevel(opt.value)}
              className={cn("w-full rounded-xl border p-4 text-left transition-colors", active ? opt.activeBg : opt.bg + " hover:opacity-80")}>
              <div className="flex items-start gap-3">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", active ? "bg-primary/15" : "bg-muted/50")}>
                  <Icon className={cn("w-4.5 h-4.5", active ? "text-primary" : "text-muted-foreground")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground flex items-center gap-2">
                      {opt.label}{isRecommended && <RecommendedBadge />}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{opt.detail}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepStrategy({ strategyType, setStrategyType }:{ strategyType:string; setStrategyType:(v:"steady_growth"|"momentum"|"adaptive")=>void; }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" /> Select Trading Style
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Choose how the AI finds and enters trades.</p>
      </div>
      <div className="space-y-3">
        {STRATEGY_OPTIONS.map(opt => {
          const active = strategyType === opt.value;
          const isRecommended = opt.value === RECOMMENDED_STRATEGY;
          const Icon = opt.icon;
          return (
            <button key={opt.value} onClick={() => setStrategyType(opt.value)}
              className={cn("w-full rounded-xl border p-4 text-left transition-colors", active ? opt.activeBg : opt.bg + " hover:opacity-80")}>
              <div className="flex items-start gap-3">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", active ? "bg-primary/15" : "bg-muted/50")}>
                  <Icon className={cn("w-4.5 h-4.5", active ? "text-primary" : "text-muted-foreground")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground flex items-center gap-2">
                      {opt.label}{isRecommended && <RecommendedBadge />}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{opt.detail}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepReview({ amount, riskLevel, strategyType }:{
  amount:number; riskLevel:string; strategyType:string; profitTarget:number;
}) {
  const risk  = RISK_OPTIONS.find(r => r.value === riskLevel)!;
  const strat = STRATEGY_OPTIONS.find(s => s.value === strategyType)!;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary" /> Review & Start
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Confirm your trading setup before going live.</p>
      </div>
      <div className="rounded-xl border border-border/60 bg-muted/20 divide-y divide-border/40">
        <div className="flex items-center justify-between p-4">
          <span className="text-sm text-muted-foreground">Trading Amount</span>
          <span className="text-sm font-medium font-mono text-foreground">${amount.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between p-4">
          <span className="text-sm text-muted-foreground">Risk Level</span>
          <div className="text-right">
            <span className="text-sm font-medium text-foreground">{risk.label}</span>
            <p className="text-[11px] text-muted-foreground">{risk.detail}</p>
          </div>
        </div>
        <div className="flex items-center justify-between p-4">
          <span className="text-sm text-muted-foreground">Trading Style</span>
          <div className="text-right">
            <span className="text-sm font-medium text-foreground">{strat.label}</span>
            <p className="text-[11px] text-muted-foreground">{strat.detail}</p>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        The AI targets controlled, small gains and automatically limits your downside.
        <br />You can adjust these settings later.
      </p>
    </div>
  );
}
