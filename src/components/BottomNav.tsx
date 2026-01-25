import { Wallet, BarChart3, Compass, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  active?: boolean;
}

const navItems: NavItem[] = [
  { icon: Wallet, label: "Wallet", active: true },
  { icon: BarChart3, label: "Market" },
  { icon: Compass, label: "Explore" },
  { icon: Settings, label: "Settings" },
];

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border safe-bottom z-50">
      <div className="container max-w-md mx-auto">
        <div className="flex items-center justify-around py-3">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-1 transition-all duration-200",
                item.active
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
};
