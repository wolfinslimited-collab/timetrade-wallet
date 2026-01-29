import { motion } from "framer-motion";
import { Plus, Import, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WelcomeStepProps {
  onCreateWallet: () => void;
  onImportWallet: () => void;
  walletName: string;
  setWalletName: (name: string) => void;
}

export const WelcomeStep = ({ onCreateWallet, onImportWallet, walletName, setWalletName }: WelcomeStepProps) => {
  return (
    <div className="h-screen bg-background flex flex-col max-w-md mx-auto overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 min-h-0">
        {/* App Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative mb-8"
        >
          <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-lg ring-1 ring-border/50">
            <img 
              src="/app-logo.png" 
              alt="Timetrade" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-center mb-6"
        >
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Welcome to <span className="gradient-text">Timetrade</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-xs">
            Your AI-powered non-custodial wallet with built-in insurance protection
          </p>
        </motion.div>

        {/* Wallet Name Input */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="w-full max-w-xs mb-8"
        >
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block text-left">
            Wallet Name
          </label>
          <Input
            value={walletName}
            onChange={(e) => setWalletName(e.target.value)}
            placeholder="Main Wallet"
            className="bg-card/80 backdrop-blur-sm border-border/50 text-center font-medium h-12 rounded-xl"
            maxLength={30}
          />
        </motion.div>
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="px-6 pb-8 space-y-3"
      >
        <Button
          onClick={onCreateWallet}
          className="w-full h-14 bg-card/80 backdrop-blur-sm border border-border/50 hover:bg-secondary text-foreground font-semibold text-base rounded-xl transition-all active:scale-[0.98]"
          variant="ghost"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create New Wallet
        </Button>

        <Button
          onClick={onImportWallet}
          className="w-full h-14 bg-card/80 backdrop-blur-sm border border-border/50 hover:bg-secondary text-foreground font-medium text-base rounded-xl transition-all active:scale-[0.98]"
          variant="ghost"
        >
          <Import className="w-5 h-5 mr-2" />
          Import Existing Wallet
        </Button>

        <p className="text-[10px] text-muted-foreground/50 text-center pt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
};
