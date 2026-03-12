import { useNavigate } from "react-router-dom";
import { ArrowDownToLine, Send, ArrowLeftRight } from "lucide-react";

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  action?: string;
  color: string;
}

const actions: QuickAction[] = [
  { 
    icon: <ArrowDownToLine className="w-5 h-5" />, 
    label: "Receive", 
    action: "receive",
    color: "bg-primary/15 text-primary"
  },
  { 
    icon: <Send className="w-5 h-5" />, 
    label: "Send", 
    action: "send",
    color: "bg-primary/15 text-primary"
  },
  { 
    icon: <ArrowLeftRight className="w-5 h-5" />, 
    label: "Swap", 
    action: "swap",
    color: "bg-primary/15 text-primary"
  },
];

export const QuickActions = ({ showSwap = true }: { showSwap?: boolean }) => {
  const navigate = useNavigate();

  const handleAction = (action?: string) => {
    if (action === "send") navigate("/send");
    else if (action === "receive") navigate("/receive");
    else if (action === "swap") navigate("/swap");
  };

  const visibleActions = showSwap ? actions : actions.filter(a => a.action !== "swap");

  return (
    <div className="flex items-center justify-center gap-6 px-8 py-4">
      {visibleActions.map((action) => (
        <button
          key={action.label}
          onClick={() => handleAction(action.action)}
          className="flex flex-col items-center gap-2.5 active:scale-95 active:opacity-80"
        >
          <div className={`w-14 h-14 rounded-2xl ${action.color} flex items-center justify-center`}>
            {action.icon}
          </div>
          <span className="text-[12px] text-foreground/70 font-semibold">{action.label}</span>
        </button>
      ))}
    </div>
  );
};
