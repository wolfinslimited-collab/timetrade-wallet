import { motion } from "framer-motion";
import { Plus, Import, Shield, Fingerprint, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeStepProps {
  onCreateWallet: () => void;
  onImportWallet: () => void;
  walletName: string;
  setWalletName: (name: string) => void;
}

export const WelcomeStep = ({ onCreateWallet, onImportWallet }: WelcomeStepProps) => {
  return (
    <div className="h-screen flex flex-col max-w-md mx-auto overflow-hidden relative">
      {/* Subtle ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-primary/[0.03] blur-[100px] pointer-events-none" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0">
        {/* App Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-12"
        >
          <div className="w-24 h-24 overflow-hidden">
            <img 
              src="/app-logo.png" 
              alt="Timetrade" 
              className="w-full h-full object-contain"
            />
          </div>
        </motion.div>

        {/* Title & Description */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <h1 className="text-[32px] font-bold tracking-tight leading-tight mb-3">
            Welcome to{" "}
            <span className="gradient-text">Timetrade</span>
          </h1>
          <p className="text-muted-foreground/70 text-[15px] leading-relaxed max-w-[260px] mx-auto">
            Your gateway to multi-chain crypto, secured by you.
          </p>
        </motion.div>

        {/* Feature Pills */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-2.5"
        >
          {[
            { icon: Globe, label: "Multi-Chain" },
            { icon: Lock, label: "Self-Custody" },
            { icon: Fingerprint, label: "Biometric" },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.35 + i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/40 bg-card/30"
            >
              <feature.icon className="w-3 h-3 text-muted-foreground/60" />
              <span className="text-[11px] font-medium text-muted-foreground/80">{feature.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="px-6 pb-10 space-y-3"
      >
        <Button
          onClick={onCreateWallet}
          className="w-full h-[56px] bg-foreground hover:bg-foreground/90 text-background font-semibold text-[15px] rounded-2xl transition-all active:scale-[0.98]"
        >
          <Plus className="w-5 h-5 mr-2.5" />
          Create New Wallet
        </Button>

        <Button
          onClick={onImportWallet}
          variant="ghost"
          className="w-full h-[56px] border border-border/40 hover:bg-card/50 text-foreground/80 font-medium text-[15px] rounded-2xl transition-all active:scale-[0.98]"
        >
          <Import className="w-5 h-5 mr-2.5" />
          Import Existing Wallet
        </Button>

        <p className="text-[10px] text-muted-foreground/30 text-center pt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
};
