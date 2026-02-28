import { useNavigate } from "react-router-dom";
import { ArrowDownToLine, Send, ArrowLeftRight } from "lucide-react";

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  action?: string;
}

const actions: QuickAction[] = [
  { icon: <ArrowDownToLine className="w-[18px] h-[18px]" />, label: "Receive", action: "receive" },
  { icon: <Send className="w-[18px] h-[18px]" />, label: "Send", action: "send" },
  { icon: <ArrowLeftRight className="w-[18px] h-[18px]" />, label: "Swap", action: "swap" },
];

export const QuickActions = () => {
  const navigate = useNavigate();

  const handleAction = (action?: string) => {
    if (action === "send") navigate("/send");
    else if (action === "receive") navigate("/receive");
    else if (action === "swap") navigate("/swap");
  };

  return (
    <div className="flex items-center justify-center gap-5 px-6 py-3">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={() => handleAction(action.action)}
          className="flex flex-col items-center gap-2 active:scale-95"
        >
          <div className="w-12 h-12 rounded-full bg-card border border-border/40 flex items-center justify-center text-foreground">
            {action.icon}
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">{action.label}</span>
        </button>
      ))}
    </div>
  );
};