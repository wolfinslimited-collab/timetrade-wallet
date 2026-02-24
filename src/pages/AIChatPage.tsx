import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AIChatPage as AIChatContent } from "@/components/ai/AIChatPage";

const AIChatPageRoute = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen max-w-md mx-auto flex flex-col">
      {/* Header with back button */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full bg-card border border-border hover:border-foreground/30 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold">AI Assistant</h1>
      </div>
      <AIChatContent />
    </div>
  );
};

export default AIChatPageRoute;
