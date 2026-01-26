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
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => handleAction(action.action)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl",
              "bg-primary/10 hover:bg-primary/15",
              "transition-all duration-200 active:scale-95"
            )}
          >
            <action.icon className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium text-primary">{action.label}</span>
          </button>
        ))}
      </div>

      <SendCryptoSheet open={sendOpen} onOpenChange={setSendOpen} />
      <ReceiveCryptoSheet open={receiveOpen} onOpenChange={setReceiveOpen} />
      <SwapCryptoSheet open={swapOpen} onOpenChange={setSwapOpen} />
    </>
  );
};
