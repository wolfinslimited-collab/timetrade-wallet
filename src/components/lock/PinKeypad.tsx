import { motion } from "framer-motion";
import { Fingerprint, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PinKeypadProps {
  isLocked: boolean;
  biometricAvailable: boolean;
  onKeyPress: (digit: string) => void;
  onDelete: () => void;
  onBiometric: () => void;
}

export const PinKeypad = ({
  isLocked,
  biometricAvailable,
  onKeyPress,
  onDelete,
  onBiometric,
}: PinKeypadProps) => {
  const btnStyle = cn(
    "w-[76px] h-[76px] rounded-full flex items-center justify-center text-2xl font-semibold text-foreground/90 transition-all duration-100",
    "bg-white/[0.06]",
    "border border-white/[0.08]",
    "shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.3)]",
  );

  return (
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
            onClick={() => onKeyPress(String(digit))}
            disabled={isLocked}
            className={cn(btnStyle, isLocked && "opacity-25 cursor-not-allowed")}
          >
            {digit}
          </motion.button>
        ))}

        {biometricAvailable && !isLocked ? (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onBiometric}
            className={btnStyle}
          >
            <Fingerprint className="w-6 h-6 text-muted-foreground" />
          </motion.button>
        ) : (
          <div />
        )}

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => onKeyPress("0")}
          disabled={isLocked}
          className={cn(btnStyle, isLocked && "opacity-25 cursor-not-allowed")}
        >
          0
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onDelete}
          disabled={isLocked}
          className={cn(btnStyle, isLocked && "opacity-25 cursor-not-allowed")}
        >
          <ArrowLeft className="w-6 h-6 text-muted-foreground" />
        </motion.button>
      </div>
    </motion.div>
  );
};
