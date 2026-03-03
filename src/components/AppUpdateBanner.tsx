import { useAppUpdate } from "@/hooks/useAppUpdate";
import { Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function AppUpdateBanner() {
  const { showUpdate, updateConfig, dismiss, openStore } = useAppUpdate();

  return (
    <AnimatePresence>
      {showUpdate && updateConfig && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-[10002] px-4 pt-[env(safe-area-inset-top,12px)] pb-3 bg-primary/95 backdrop-blur-md"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <Download className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary-foreground">
                Update Available
              </p>
              <p className="text-xs text-primary-foreground/80 mt-0.5 leading-relaxed">
                {updateConfig.update_message}
              </p>
              <button
                onClick={openStore}
                className="mt-2 px-4 py-1.5 rounded-full bg-primary-foreground/20 border border-primary-foreground/30 text-xs font-semibold text-primary-foreground active:opacity-70 transition-opacity"
              >
                Update Now
              </button>
            </div>
            <button
              onClick={dismiss}
              className="flex-shrink-0 p-1 rounded-full active:bg-primary-foreground/10 transition-colors"
            >
              <X className="w-4 h-4 text-primary-foreground/70" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
