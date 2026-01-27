import { cn } from "@/lib/utils";

export type DashboardTab = "wallet" | "watchlist" | "smartmoney";

interface DashboardTabsProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

const TABS: { id: DashboardTab; label: string }[] = [
  { id: "wallet", label: "MY WALLET" },
  { id: "watchlist", label: "WATCHLIST" },
  { id: "smartmoney", label: "SMARTMONEY" },
];

export const DashboardTabs = ({ activeTab, onTabChange }: DashboardTabsProps) => {
  return (
    <div className="flex items-center gap-6 px-4 py-3 border-b border-border/50">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={cn(
            "text-sm font-semibold tracking-wider transition-colors",
            activeTab === id
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground/70"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
