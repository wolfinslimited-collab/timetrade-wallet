import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BlockchainProvider } from "@/contexts/BlockchainContext";
import { WalletConnectProvider } from "@/contexts/WalletConnectContext";
import Index from "./pages/Index";
import { AssetDetailPage } from "./pages/AssetDetailPage";
import { AllAssetsPage } from "./pages/AllAssetsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: Infinity,
    },
  },
});

// Page transition config — sub-pages slide in from right, root from left
const slideTransition = { duration: 0.28, ease: "easeOut" as const };

const pageVariants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 40 : -40,
  }),
  animate: {
    opacity: 1,
    x: 0,
    transition: slideTransition,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -40 : 40,
    transition: { duration: 0.2, ease: "easeIn" as const },
  }),
};

// Depth map: higher = deeper page (slides in from right)
const PAGE_DEPTH: Record<string, number> = {
  "/": 0,
  "/notifications": 0,
  "/assets": 1,
  "/asset": 2,
};

const AnimatedRoutes = () => {
  const location = useLocation();
  const depth = PAGE_DEPTH[location.pathname] ?? 1;

  return (
    <AnimatePresence mode="wait" initial={false} custom={depth}>
      <motion.div
        key={location.pathname}
        custom={depth}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="min-h-screen"
        style={{ willChange: "transform, opacity" }}
      >
        <Routes location={location}>
          <Route path="/" element={<Index />} />
          <Route path="/notifications" element={<Index />} />
          <Route path="/asset" element={<AssetDetailPage />} />
          <Route path="/assets" element={<AllAssetsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BlockchainProvider>
      <WalletConnectProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AnimatedRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </WalletConnectProvider>
    </BlockchainProvider>
  </QueryClientProvider>
);

export default App;

