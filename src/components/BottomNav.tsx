import { forwardRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { HomeIcon, TransactionHistoryIcon, UsdtIcon, AccountSettingsIcon, AITradingIcon } from "./icons/NavIcons";

export type NavTab = "wallet" | "history" | "staking" | "trading" | "ai" | "settings";

interface NavItem {
  icon: (color: string) => React.ReactNode;
  label: string;
  tab: NavTab;
}

const navItems: NavItem[] = [
  { icon: (c) => <HomeIcon className="w-[22px] h-[22px]" color={c} />, label: "Home", tab: "wallet" },
  { icon: (c) => <TransactionHistoryIcon className="w-[22px] h-[22px]" color={c} />, label: "History", tab: "history" },
  { icon: (c) => <UsdtIcon className="w-[22px] h-[22px]" color={c} />, label: "Stake", tab: "staking" },
  { icon: (c) => <AITradingIcon className="w-[22px] h-[22px]" color={c} />, label: "AI Trade", tab: "trading" },
  { icon: (c) => <AccountSettingsIcon className="w-[22px] h-[22px]" color={c} />, label: "Settings", tab: "settings" },
];

interface BottomNavProps {
  activeTab?: NavTab;
  onTabChange?: (tab: NavTab) => void;
  hiddenTabs?: NavTab[];
}

export const BottomNav = forwardRef<HTMLElement, BottomNavProps>(
  ({ activeTab = "wallet", onTabChange, hiddenTabs = [] }, ref) => {
    const nav = (
      <nav 
        ref={ref}
        className="fixed bottom-0 left-0 right-0 z-[9999] bg-background"
      >
        <div
          className="w-full px-3 pt-2 pb-[5px] nav-safe-inset"
        >
          <div 
            className="bg-card/90 border border-border/30 rounded-2xl px-1 py-1.5"
          >
            <div className="flex items-center justify-around">
              {navItems.filter(item => !hiddenTabs.includes(item.tab)).map((item) => {
                const isActive = activeTab === item.tab;
                return (
                  <button
                    key={item.label}
                    onClick={() => onTabChange?.(item.tab)}
                    className={cn(
                      "flex flex-col items-center gap-1 py-2 px-5 rounded-xl active:scale-95",
                      isActive ? "bg-primary/10" : "opacity-40"
                    )}
                  >
                    {item.icon(isActive ? "hsl(217, 91%, 60%)" : "#FAFAFA")}
                    <span className={cn(
                      "text-[10px] font-semibold",
                      isActive ? "text-primary" : "text-foreground/50"
                    )}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    );

    return createPortal(nav, document.body);
  }
);

BottomNav.displayName = "BottomNav";
