import { useNavigate } from "react-router-dom";
import { ArrowDownToLine, Send, ArrowLeftRight } from "lucide-react";
import { haptics } from "@/lib/haptics";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  action?: string;
  color: string;
}

export const QuickActions = () => {
  const navigate = useNavigate();
  const flags = useFeatureFlags();

  const actions: QuickAction[] = [
    {
      icon: <ArrowDownToLine className="w-5 h-5" />,
      label: "Receive",
      action: "receive",
      color: "bg-primary/15 text-primary",
    },
    {
      icon: <Send className="w-5 h-5" />,
      label: "Send",
      action: "send",
      color: "bg-primary/15 text-primary",
    },
    ...(flags.showSwap
      ? [{
          icon: <ArrowLeftRight className="w-5 h-5" />,
          label: "Swap",
          action: "swap",
          color: "bg-primary/15 text-primary",
        }]
      : []),
  ];

  const handleAction = (action?: string) => {
    void haptics.impact("light");
    if (action === "send") navigate("/send");
    else if (action === "receive") navigate("/receive");
    else if (action === "swap") navigate("/swap");
  };

  return (
    <div className="flex items-center justify-center gap-6 px-8 py-4">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={() => handleAction(action.action)}
          className="flex flex-col items-center gap-2.5 transition-transform duration-150 active:scale-90 active:opacity-80"
        >
          <div className={`w-14 h-14 rounded-2xl ${action.color} flex items-center justify-center transition-transform duration-150 group-active:scale-95`}>
            {action.icon}
          </div>
          <span className="text-[12px] text-foreground/70 font-semibold">{action.label}</span>
        </button>
      ))}
    </div>
  );
};
