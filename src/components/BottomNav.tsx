import { forwardRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { HomeIcon, TransactionHistoryIcon, UsdtIcon, AccountSettingsIcon } from "./icons/NavIcons";

export type NavTab = "wallet" | "history" | "staking" | "ai" | "settings";

interface NavItem {
  icon: (color: string) => React.ReactNode;
  label: string;
  tab: NavTab;
}

const navItems: NavItem[] = [
  { icon: (c) => <HomeIcon className="w-6 h-6" color={c} />, label: "Home", tab: "wallet" },
  { icon: (c) => <TransactionHistoryIcon className="w-6 h-6" color={c} />, label: "History", tab: "history" },
  { icon: (c) => <UsdtIcon className="w-7 h-7" color={c} />, label: "Staking", tab: "staking" },
  { icon: (c) => <AccountSettingsIcon className="w-6 h-6" color={c} />, label: "Settings", tab: "settings" },
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
        className="fixed bottom-0 left-0 right-0 z-[9999]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="max-w-md mx-auto px-2 pb-2">
          <div 
            className="bg-card/70 border border-border/20 rounded-2xl px-2 py-2 shadow-lg shadow-black/30"
            style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}
          >
            <div className="flex items-center justify-around">
              {navItems.filter(item => !hiddenTabs.includes(item.tab)).map((item) => {
                const isActive = activeTab === item.tab;
                return (
                  <button
                    key={item.label}
                    onClick={() => onTabChange?.(item.tab)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl active:scale-95",
                      isActive ? "opacity-100" : "opacity-40"
                    )}
                  >
                    {item.icon(isActive ? "#FAFAFA" : "#FAFAFA")}
                    <span className={cn(
                      "text-[10px] font-medium",
                      isActive ? "text-foreground" : "text-foreground/40"
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