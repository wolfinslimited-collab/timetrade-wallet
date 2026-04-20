import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Fingerprint, ShieldCheck, Zap, ChevronLeft, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface BiometricSetupStepProps {
  pin: string;
  onComplete: (enabled: boolean) => void;
  onSkip: () => void;
  onBack?: () => void;
}

export const BiometricSetupStep = ({
  pin,
  onComplete,
  onSkip,
  onBack,
}: BiometricSetupStepProps) => {
  const { toast } = useToast();
  const { isAvailable, registerBiometric } = useBiometricAuth();
  const [isEnabling, setIsEnabling] = useState(false);
  const [success, setSuccess] = useState(false);

  // Detect platform label
  const [label, setLabel] = useState<{ name: string; icon: "face" | "touch" }>({
    name: "Biometrics",
    icon: "touch",
  });

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod|mac/.test(ua);
    const isAndroid = /android/.test(ua);
    if (isApple) setLabel({ name: "Face ID", icon: "face" });
    else if (isAndroid) setLabel({ name: "Fingerprint", icon: "touch" });
    else setLabel({ name: "Biometrics", icon: "touch" });
  }, []);

  const handleEnable = async () => {
    if (isEnabling || success) return;
    setIsEnabling(true);
    haptics.selection();
    try {
      const ok = await registerBiometric(pin);
      if (ok) {
        setSuccess(true);
        haptics.impact("medium");
        toast({
          title: `${label.name} enabled`,
          description: "You can now unlock instantly",
        });
        setTimeout(() => onComplete(true), 600);
      } else {
        haptics.impact("heavy");
        toast({
          title: "Setup cancelled",
          description: "You can enable this later from Settings",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Couldn't enable biometrics",
        description: "You can enable this later from Settings",
        variant: "destructive",
      });
    } finally {
      setIsEnabling(false);
    }
  };

  const handleSkip = () => {
    haptics.selection();
    onSkip();
  };

  return (
    <div
      className="flex flex-col h-[100dvh] overflow-hidden bg-background"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 12px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-2 pb-1 shrink-0">
        <button
          onClick={onBack}
          disabled={!onBack || isEnabling}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.05] border border-white/[0.08] active:scale-90 transition-transform disabled:opacity-0"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Optional · Recommended
        </div>
        <div className="w-9 h-9" />
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-8"
        >
          {/* Glow rings */}
          <div className="absolute inset-0 rounded-full bg-primary/15 blur-2xl scale-150" />
          <motion.div
            animate={
              isEnabling
                ? { scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }
                : {}
            }
            transition={{
              duration: 1.4,
              repeat: isEnabling ? Infinity : 0,
              ease: "easeInOut",
            }}
            className={cn(
              "relative w-32 h-32 rounded-full flex items-center justify-center",
              "bg-gradient-to-br from-primary/25 to-primary/5",
              "border-2",
              success ? "border-primary" : "border-primary/40"
            )}
          >
            {success ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Check className="w-14 h-14 text-primary" strokeWidth={3} />
              </motion.div>
            ) : (
              <Fingerprint className="w-16 h-16 text-primary" strokeWidth={1.5} />
            )}
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="text-[26px] font-bold tracking-tight text-center text-foreground"
        >
          {success ? `${label.name} Enabled` : `Enable ${label.name}`}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-sm text-muted-foreground mt-2 text-center max-w-[300px]"
        >
          {!isAvailable
            ? "Biometric unlock isn't available on this device. You can continue with PIN."
            : success
            ? "You can now unlock your wallet instantly"
            : `Use ${label.name} to unlock your wallet without typing your PIN`}
        </motion.p>

        {/* Benefits */}
        {isAvailable && !success && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="w-full max-w-[340px] mt-8 space-y-2.5"
          >
            <BenefitRow
              icon={<ShieldCheck className="w-4 h-4 text-primary" />}
              title="Secure by design"
              subtitle="Biometric data never leaves your device"
            />
            <BenefitRow
              icon={<Zap className="w-4 h-4 text-primary" />}
              title="Unlock in a tap"
              subtitle="Skip typing your PIN every time"
            />
          </motion.div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 pb-2 shrink-0 space-y-2.5">
        {isAvailable && !success && (
          <button
            onClick={handleEnable}
            disabled={isEnabling}
            className={cn(
              "w-full h-14 rounded-2xl bg-primary text-primary-foreground",
              "font-semibold text-[15px]",
              "flex items-center justify-center gap-2",
              "active:scale-[0.98] transition-transform",
              "disabled:opacity-70"
            )}
          >
            {isEnabling ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                Verifying…
              </>
            ) : (
              <>
                <Fingerprint className="w-5 h-5" />
                Enable {label.name}
              </>
            )}
          </button>
        )}

        {!success && (
          <button
            onClick={handleSkip}
            disabled={isEnabling}
            className={cn(
              "w-full h-12 rounded-2xl",
              "text-[14px] font-medium text-muted-foreground",
              "active:scale-[0.98] transition-transform",
              "disabled:opacity-50"
            )}
          >
            {isAvailable ? "Skip for now" : "Continue with PIN"}
          </button>
        )}
      </div>
    </div>
  );
};

const BenefitRow = ({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[13.5px] font-semibold text-foreground leading-tight">{title}</p>
      <p className="text-[12px] text-muted-foreground leading-tight mt-0.5">{subtitle}</p>
    </div>
  </div>
);
