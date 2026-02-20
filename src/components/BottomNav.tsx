import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Wallet, History, Layers, Settings } from "lucide-react";

export type NavTab = "wallet" | "history" | "staking" | "settings";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  tab: NavTab;
  isCenter?: boolean;
}

const navItems: NavItem[] = [
  { icon: <Wallet className="w-5 h-5" />, label: "Wallet", tab: "wallet" },
  { icon: <History className="w-5 h-5" />, label: "History", tab: "history" },
  { icon: <Layers className="w-[22px] h-[22px]" />, label: "Staking", tab: "staking", isCenter: true },
  { icon: <Settings className="w-5 h-5" />, label: "Settings", tab: "settings" },
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
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[398px]"
      >
        <div className="bg-card/90 backdrop-blur-xl border border-border/50 rounded-full px-2 py-1.5">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const isActive = activeTab === item.tab;
              
              if (item.isCenter) {
                return (
                  <button
                    key={item.label}
                    onClick={() => onTabChange?.(item.tab)}
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 -my-1",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                        : "bg-primary/20 text-primary hover:bg-primary/30"
                    )}
                  >
                    {item.icon}
                  </button>
                );
              }
              
              return (
                <button
                  key={item.label}
                  onClick={() => onTabChange?.(item.tab)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full transition-all duration-200",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground/70"
                  )}
                >
                  {item.icon}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    );
  }
);

BottomNav.displayName = "BottomNav";
