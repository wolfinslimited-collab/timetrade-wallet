import { useState } from "react";
import { Send, ArrowDownToLine, ArrowRightLeft, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { SendCryptoSheet } from "./send/SendCryptoSheet";
import { ReceiveCryptoSheet } from "./receive/ReceiveCryptoSheet";
import { SwapCryptoSheet } from "./swap/SwapCryptoSheet";

interface QuickAction {
  icon: React.ElementType;
  label: string;
  color?: string;
  action?: string;
}

const actions: QuickAction[] = [
  { icon: Send, label: "Send", action: "send" },
  { icon: ArrowDownToLine, label: "Receive", action: "receive" },
  { icon: ArrowRightLeft, label: "Swap", action: "swap" },
  { icon: CreditCard, label: "Buy", action: "buy" },
];

export const QuickActions = () => {
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);

  const handleAction = (action?: string) => {
    if (action === "send") {
      setSendOpen(true);
    } else if (action === "receive") {
      setReceiveOpen(true);
    } else if (action === "swap") {
      setSwapOpen(true);
    }
  };

  return (
    <>
      <div className="flex items-center justify-center gap-4 px-4 py-4">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => handleAction(action.action)}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-xl",
              "bg-card border border-border hover:border-primary/50",
              "transition-all duration-200 hover:scale-105 active:scale-95",
              "min-w-[72px]"
            )}
          >
            <div className="p-2 rounded-full bg-primary/10">
              <action.icon className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{action.label}</span>
          </button>
        ))}
      </div>

      <SendCryptoSheet open={sendOpen} onOpenChange={setSendOpen} />
      <ReceiveCryptoSheet open={receiveOpen} onOpenChange={setReceiveOpen} />
      <SwapCryptoSheet open={swapOpen} onOpenChange={setSwapOpen} />
    </>
  );
};
