import { motion } from "framer-motion";
import { Plus, Import, Fingerprint, Globe, Lock, ArrowRight, Wallet, Download } from "lucide-react";

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
            <span className="gradient-text">AI Wallet</span>
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

      {/* Action Buttons — rich card style */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="px-5 pb-10 space-y-3"
      >
        {/* Create Wallet — primary CTA */}
        <motion.button
          onClick={onCreateWallet}
          whileTap={{ scale: 0.97 }}
          className="w-full group relative overflow-hidden rounded-2xl bg-foreground p-[1px]"
        >
          <div className="relative flex items-center gap-4 rounded-[15px] bg-foreground px-5 py-4">
            <div className="w-11 h-11 rounded-full bg-background/15 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-background" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[15px] font-semibold text-background">Create New Wallet</p>
              <p className="text-[12px] text-background/50">Generate a fresh seed phrase</p>
            </div>
            <ArrowRight className="w-5 h-5 text-background/40 group-hover:text-background/70 transition-colors shrink-0" />
          </div>
        </motion.button>

        {/* Import Wallet — secondary CTA */}
        <motion.button
          onClick={onImportWallet}
          whileTap={{ scale: 0.97 }}
          className="w-full group relative overflow-hidden rounded-2xl bg-muted/30 border border-border/40 hover:border-border/60 transition-colors"
        >
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-11 h-11 rounded-full bg-card/60 border border-border/30 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-foreground/70" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[15px] font-semibold text-foreground/90">Import Existing Wallet</p>
              <p className="text-[12px] text-muted-foreground/50">Use seed phrase or private key</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors shrink-0" />
          </div>
        </motion.button>

        <p className="text-[10px] text-muted-foreground/30 text-center pt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
};
