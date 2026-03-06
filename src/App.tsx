import { useEffect } from "react";
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
import AIChatPageRoute from "./pages/AIChatPage";
import SwapPage from "./pages/SwapPage";
import SendPage from "./pages/SendPage";
import ReceivePage from "./pages/ReceivePage";
import NotFound from "./pages/NotFound";
import Build from "./pages/Build";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";

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

// Lightweight fade transition — no slide to reduce jank on mobile
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};



// Blur active element (hide keyboard) on every route change
const KeyboardDismisser = () => {
  const location = useLocation();
  useEffect(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [location.pathname]);
  return null;
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <>
      <KeyboardDismisser />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="flex-1 flex flex-col overflow-hidden overflow-x-hidden"
        >
          <Routes location={location}>
            <Route path="/" element={<Index />} />
            <Route path="/notifications" element={<Index />} />
            <Route path="/ai-chat" element={<AIChatPageRoute />} />
            <Route path="/asset" element={<AssetDetailPage />} />
            <Route path="/assets" element={<AllAssetsPage />} />
            <Route path="/swap" element={<SwapPage />} />
            <Route path="/send" element={<SendPage />} />
            <Route path="/receive" element={<ReceivePage />} />
            <Route path="/build" element={<Build />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </>
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

