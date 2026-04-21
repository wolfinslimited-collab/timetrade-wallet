import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { LiveTradingFeed } from "@/components/trading/LiveTradingFeed";

const LiveTradesPage = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-background">
      <div className="px-6 pt-6 pb-2 relative flex items-center justify-center shrink-0">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute left-6 top-1/2 -translate-y-1/2 p-2 rounded-full bg-card border border-border active:bg-secondary"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-center">Live Trading</h1>
      </div>
      <div className="flex-1 min-h-0 px-4 py-4">
        <LiveTradingFeed />
      </div>
    </div>
  );
};

export default LiveTradesPage;
