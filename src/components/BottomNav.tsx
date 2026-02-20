import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { HomeIcon, TransactionHistoryIcon, UsdtIcon, AccountSettingsIcon } from "./icons/NavIcons";

export type NavTab = "wallet" | "history" | "staking" | "settings";

interface NavItem {
  icon: (color: string) => React.ReactNode;
  label: string;
  tab: NavTab;
}

const navItems: NavItem[] = [
  { icon: (c) => <HomeIcon className="w-5 h-5" color={c} />, label: "Wallet", tab: "wallet" },
  { icon: (c) => <TransactionHistoryIcon className="w-5 h-5" color={c} />, label: "History", tab: "history" },
  { icon: (c) => <UsdtIcon className="w-[22px] h-[22px]" color={c} />, label: "Staking", tab: "staking" },
  { icon: (c) => <AccountSettingsIcon className="w-5 h-5" color={c} />, label: "Settings", tab: "settings" },
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
        <div className="bg-muted/40 backdrop-blur-3xl border border-border/20 rounded-full px-3 py-2.5 shadow-2xl shadow-black/40"
          style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}
        >
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const isActive = activeTab === item.tab;
              
              return (
                <button
                  key={item.label}
                  onClick={() => onTabChange?.(item.tab)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full transition-all duration-200",
                      isActive
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground/70"
                    )}
                >
                  {item.icon(isActive ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))")}
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
