import { forwardRef } from "react";
import { Wallet, BarChart3, Clock, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavTab = "wallet" | "history" | "market" | "settings";

interface NavItem {
  icon: React.ElementType;
  label: string;
  tab: NavTab;
}

const navItems: NavItem[] = [
  { icon: Wallet, label: "Wallet", tab: "wallet" },
  { icon: Clock, label: "History", tab: "history" },
  { icon: BarChart3, label: "Market", tab: "market" },
  { icon: Settings, label: "Settings", tab: "settings" },
];

interface BottomNavProps {
  activeTab?: NavTab;
  onTabChange?: (tab: NavTab) => void;
}

export const BottomNav = forwardRef<HTMLElement, BottomNavProps>(
  ({ activeTab = "wallet", onTabChange }, ref) => {
    return (
      <nav 
        ref={ref}
        className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border safe-bottom z-50"
      >
        <div className="container max-w-md mx-auto">
          <div className="flex items-center justify-around py-3">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => onTabChange?.(item.tab)}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-1 transition-all duration-200",
                  activeTab === item.tab
                    ? "text-primary nav-active"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="w-5 h-5" strokeWidth={1.5} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    );
  }
);

BottomNav.displayName = "BottomNav";
