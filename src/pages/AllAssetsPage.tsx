import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { UnifiedTokenList } from "@/components/wallet/UnifiedTokenList";
import { BottomNav } from "@/components/BottomNav";

export const AllAssetsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border/20">
        <div className="flex items-center gap-3 px-4 py-4">
          <h1 className="text-lg font-semibold text-foreground">All Assets</h1>
        </div>
      </div>

      {/* Full token list */}
      <div className="flex-1 pt-2">
        <UnifiedTokenList />
      </div>

      <BottomNav activeTab="wallet" onTabChange={(tab) => navigate(`/?tab=${tab}`)} />
    </div>
  );
};
