import { motion } from "framer-motion";
import { Plus, Import, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeStepProps {
  onCreateWallet: () => void;
  onImportWallet: () => void;
  walletName: string;
  setWalletName: (name: string) => void;
}

export const WelcomeStep = ({ onCreateWallet, onImportWallet }: WelcomeStepProps) => {
  return (
    <div className="h-screen bg-background flex flex-col max-w-md mx-auto overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0">
        {/* App Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative mb-10"
        >
          <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10">
            <img 
              src="/app-logo.png" 
              alt="Timetrade" 
              className="w-full h-full object-cover"
            />
          </div>
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3, ease: "backOut" }}
            className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-lg ring-2 ring-background"
          >
            <Shield className="w-4.5 h-4.5 text-primary-foreground" />
          </motion.div>
        </motion.div>

        {/* Title & Description */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Welcome to <span className="gradient-text">Timetrade</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-[280px] mx-auto">
            Your secure, non-custodial crypto wallet with multi-chain support
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="flex items-center gap-6 mb-10"
        >
          {[
            { label: "Multi-Chain" },
            { label: "Self-Custody" },
            { label: "Secure" },
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3 text-primary/70" />
              <span>{feature.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="px-6 pb-10 space-y-3"
      >
        <Button
          onClick={onCreateWallet}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base rounded-2xl transition-all active:scale-[0.98] shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create New Wallet
        </Button>

        <Button
          onClick={onImportWallet}
          variant="ghost"
          className="w-full h-14 bg-card/60 backdrop-blur-sm border border-border/50 hover:bg-secondary text-foreground font-medium text-base rounded-2xl transition-all active:scale-[0.98]"
        >
          <Import className="w-5 h-5 mr-2" />
          Import Existing Wallet
        </Button>

        <p className="text-[10px] text-muted-foreground/40 text-center pt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
};
