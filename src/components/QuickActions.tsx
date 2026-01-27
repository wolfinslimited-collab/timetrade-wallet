import { useState } from "react";
import { QrCode, Send, ArrowRightLeft, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { SendCryptoSheet } from "./send/SendCryptoSheet";
import { ReceiveCryptoSheet } from "./receive/ReceiveCryptoSheet";
import { SwapCryptoSheet } from "./swap/SwapCryptoSheet";

interface QuickAction {
  icon: React.ElementType;
  label: string;
  action?: string;
}

const actions: QuickAction[] = [
  { icon: QrCode, label: "Receive", action: "receive" },
  { icon: Send, label: "Send", action: "send" },
  { icon: ArrowRightLeft, label: "Swap", action: "swap" },
  { icon: DollarSign, label: "Buy", action: "buy" },
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
      <div className="flex items-center justify-center gap-6 px-6 py-4">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => handleAction(action.action)}
            className="flex flex-col items-center gap-2"
          >
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center",
              "bg-secondary border border-border",
              "hover:border-primary/50 transition-all"
            )}>
              <action.icon className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">{action.label}</span>
          </button>
        ))}
      </div>

      <SendCryptoSheet open={sendOpen} onOpenChange={setSendOpen} />
      <ReceiveCryptoSheet open={receiveOpen} onOpenChange={setReceiveOpen} />
      <SwapCryptoSheet open={swapOpen} onOpenChange={setSwapOpen} />
    </>
  );
};
