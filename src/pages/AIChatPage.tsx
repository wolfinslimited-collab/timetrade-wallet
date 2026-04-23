import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AIChatPage as AIChatContent } from "@/components/ai/AIChatPage";

const AIChatPageRoute = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-background">
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/80"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full bg-secondary/50 border border-border/50 hover:border-primary/30 hover:bg-secondary transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>

        <h1 className="text-[15px] font-semibold text-foreground">AI Assistant</h1>
      </div>

      <AIChatContent />
    </div>
  );
};

export default AIChatPageRoute;
