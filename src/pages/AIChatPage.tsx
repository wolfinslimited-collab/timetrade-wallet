import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AIChatPage as AIChatContent } from "@/components/ai/AIChatPage";
import { motion } from "framer-motion";

const AIChatPageRoute = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-background">
      {/* Premium Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex items-center gap-3 px-4 py-3 border-b border-border/50 backdrop-blur-xl bg-card/60"
      >
        {/* Subtle gradient accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full bg-secondary/50 border border-border/50 hover:border-primary/30 hover:bg-secondary transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>

        <div className="flex items-center gap-3 flex-1">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-card" />
          </div>

          <div>
            <h1 className="text-[15px] font-semibold text-foreground leading-tight">AI Assistant</h1>
            <p className="text-[11px] text-muted-foreground leading-tight">Powered by AI • Always ready</p>
          </div>
        </div>
      </motion.div>

      <AIChatContent />
    </div>
  );
};

export default AIChatPageRoute;
