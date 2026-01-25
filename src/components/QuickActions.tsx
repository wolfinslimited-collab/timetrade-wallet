import { Send, ArrowDownToLine, ArrowRightLeft, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  icon: React.ElementType;
  label: string;
  color?: string;
}

const actions: QuickAction[] = [
  { icon: Send, label: "Send" },
  { icon: ArrowDownToLine, label: "Receive" },
  { icon: ArrowRightLeft, label: "Swap" },
  { icon: CreditCard, label: "Buy" },
];

export const QuickActions = () => {
  return (
    <div className="flex items-center justify-center gap-4 px-4 py-4">
      {actions.map((action) => (
        <button
          key={action.label}
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
  );
};
