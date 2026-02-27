import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PinSetupStepProps {
  onComplete: (pin: string) => void;
  onBack: () => void;
}

export const PinSetupStep = ({ onComplete, onBack }: PinSetupStepProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"create" | "confirm">("create");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  

  const currentPin = step === "create" ? pin : confirmPin;
  const setCurrentPin = step === "create" ? setPin : setConfirmPin;


  const handleKeyPress = (digit: string) => {
    if (currentPin.length >= 6) return;
    
    const newPin = currentPin + digit;
    setCurrentPin(newPin);

    if (newPin.length === 6) {
      if (step === "create") {
        setTimeout(() => setStep("confirm"), 300);
      } else {
        if (newPin === pin) {
          toast({
            title: "PIN created successfully!",
            description: "Your wallet is now secured",
          });
          onComplete(newPin);
        } else {
          toast({
            title: "PINs don't match",
            description: "Please try again",
            variant: "destructive",
          });
          setConfirmPin("");
          setPin("");
          setStep("create");
        }
      }
    }
  };

  const handleDelete = () => {
    setCurrentPin(currentPin.slice(0, -1));
  };

  const handleClear = () => {
    setCurrentPin("");
  };

  const btnStyle = cn(
    "w-[76px] h-[76px] rounded-full flex items-center justify-center text-2xl font-semibold text-foreground/90 transition-all duration-100",
    "bg-white/[0.06]",
    "border border-white/[0.08]",
    "shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.3)]",
  );

  return (
    <div className="flex flex-col min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={onBack}
          className="p-2 rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Security Setup</p>
          <h2 className="text-xl font-bold">
            {step === "create" ? "Create PIN" : "Confirm PIN"}
          </h2>
        </div>
      </div>

      {/* PIN Display */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-muted-foreground text-center mb-6 max-w-xs"
        >
          {step === "create" 
            ? "Create a 6-digit PIN to secure your wallet" 
            : "Re-enter your PIN to confirm"}
        </motion.p>

        {/* PIN Dots - same as lock screen */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex gap-3 mb-10"
        >
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <motion.div
              key={index}
              animate={
                index < currentPin.length
                  ? { scale: [1, 1.2, 1] }
                  : {}
              }
              transition={{ duration: 0.25 }}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full transition-all duration-200",
                  index < currentPin.length
                    ? "bg-foreground"
                    : "bg-muted-foreground/30"
                )}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Keypad - matching lock screen embossed style */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="grid grid-cols-3 gap-3 mx-auto w-fit">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <motion.button
                key={digit}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleKeyPress(String(digit))}
                className={btnStyle}
              >
                {digit}
              </motion.button>
            ))}

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleClear}
              className={cn(btnStyle, "text-sm text-muted-foreground")}
            >
              Clear
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => handleKeyPress("0")}
              className={btnStyle}
            >
              0
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleDelete}
              className={btnStyle}
            >
              <ArrowLeft className="w-6 h-6 text-muted-foreground" />
            </motion.button>
          </div>
        </motion.div>
      </div>

    </div>
  );
};
