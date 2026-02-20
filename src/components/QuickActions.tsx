import { useState } from "react";
import { cn } from "@/lib/utils";
import { SendCryptoSheet } from "./send/SendCryptoSheet";
import { ReceiveCryptoSheet } from "./receive/ReceiveCryptoSheet";
import { SwapCryptoSheet } from "./swap/SwapCryptoSheet";

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  action?: string;
}

const ReceiveIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v14m0 0l-5-5m5 5l5-5" />
    <path d="M5 21h14" />
  </svg>
);

const SendIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7 7" />
  </svg>
);

const SwapIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 16V4m0 0L3 8m4-4l4 4" />
    <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
  </svg>
);

const actions: QuickAction[] = [
  { icon: <ReceiveIcon />, label: "Receive", action: "receive" },
  { icon: <SendIcon />, label: "Send", action: "send" },
  { icon: <SwapIcon />, label: "Swap", action: "swap" },
];

export const QuickActions = () => {
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);

  const handleAction = (action?: string) => {
    if (action === "send") setSendOpen(true);
    else if (action === "receive") setReceiveOpen(true);
    else if (action === "swap") setSwapOpen(true);
  };

  return (
    <>
      <div className="flex items-center justify-center gap-10 px-6 py-4">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => handleAction(action.action)}
            className="flex flex-col items-center gap-2.5"
          >
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center",
              "bg-card border border-border/50",
              "hover:bg-secondary transition-all text-foreground"
            )}>
              {action.icon}
            </div>
            <span className="text-xs text-muted-foreground font-medium">{action.label}</span>
          </button>
        ))}
      </div>

      <SendCryptoSheet open={sendOpen} onOpenChange={setSendOpen} />
      <ReceiveCryptoSheet open={receiveOpen} onOpenChange={setReceiveOpen} />
      <SwapCryptoSheet open={swapOpen} onOpenChange={setSwapOpen} />
    </>
  );
};
