import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ArrowDownToLine, Send, ArrowLeftRight } from "lucide-react";

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  action?: string;
}

const actions: QuickAction[] = [
  { icon: <ArrowDownToLine className="w-5 h-5" />, label: "Receive", action: "receive" },
  { icon: <Send className="w-5 h-5" />, label: "Send", action: "send" },
  { icon: <ArrowLeftRight className="w-5 h-5" />, label: "Swap", action: "swap" },
];

export const QuickActions = () => {
  const navigate = useNavigate();

  const handleAction = (action?: string) => {
    if (action === "send") navigate("/send");
    else if (action === "receive") navigate("/receive");
    else if (action === "swap") navigate("/swap");
  };

  return (
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
            "active:bg-secondary text-foreground"
          )}>
            {action.icon}
          </div>
          <span className="text-xs text-muted-foreground font-medium">{action.label}</span>
        </button>
      ))}
    </div>
  );
};
