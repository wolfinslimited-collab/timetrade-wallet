import { motion } from "framer-motion";
import { Check, Shield, Wallet, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuccessStepProps {
  walletName: string;
  onFinish: () => void;
}

export const SuccessStep = ({ walletName, onFinish }: SuccessStepProps) => {
  return (
    <div className="flex flex-col min-h-screen p-6">
      {/* Success Animation */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Animated Checkmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 200, 
            damping: 15,
            delay: 0.2 
          }}
          className="relative mb-8"
        >
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center glow-green">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="w-16 h-16 rounded-full bg-primary flex items-center justify-center"
            >
              <Check className="w-8 h-8 text-primary-foreground" strokeWidth={3} />
            </motion.div>
          </div>
          
          {/* Floating icons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="absolute -left-4 top-0 p-2 rounded-lg bg-card border border-border"
          >
            <Shield className="w-4 h-4 text-primary" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="absolute -right-4 top-0 p-2 rounded-lg bg-card border border-border"
          >
            <Wallet className="w-4 h-4 text-accent" />
          </motion.div>
        </motion.div>

        {/* Success Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h1 className="text-2xl font-bold mb-2">Wallet Created!</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Your wallet "<span className="text-foreground font-medium">{walletName}</span>" is ready to use
          </p>
        </motion.div>

        {/* Features List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="w-full max-w-xs space-y-3"
        >
          {[
            { icon: Shield, text: "Insurance protection active" },
            { icon: Wallet, text: "Non-custodial & secure" },
          ].map((item, index) => (
            <div 
              key={index}
              className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <item.icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium">{item.text}</span>
              <Check className="w-4 h-4 text-primary ml-auto" />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="pb-8"
      >
        <Button
          onClick={onFinish}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base"
        >
          Go to Wallet
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
};
