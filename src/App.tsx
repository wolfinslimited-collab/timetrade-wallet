import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { BlockchainProvider } from "@/contexts/BlockchainContext";
import { WalletConnectProvider } from "@/contexts/WalletConnectContext";
import { useFCMToken } from "@/hooks/useFCMToken";
import { NetworkStatus } from "@/components/NetworkStatus";
import Index from "./pages/Index";
import { AssetDetailPage } from "./pages/AssetDetailPage";
import { AllAssetsPage } from "./pages/AllAssetsPage";
import AIChatPageRoute from "./pages/AIChatPage";
import NotFound from "./pages/NotFound";
import SendPage from "./pages/SendPage";
import SwapPage from "./pages/SwapPage";
import ReceivePage from "./pages/ReceivePage";
import Build from "./pages/Build";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import LiveTradesPage from "./pages/LiveTradesPage";
import AITradingOnboardingPage from "./pages/AITradingOnboardingPage";
import AITradingWalletPage from "./pages/AITradingWalletPage";
import OTADeployPage from "./pages/OTADeployPage";

// Defensive guard: if the native shell ever navigates to `/~oauth/...`
// (e.g. cached install, missed redirect), bounce to the published web
// origin so the user doesn't end up on the in-app 404 screen.
const OAuthBounce = () => {
  useEffect(() => {
    try {
      const target = `https://timetrade-wallet.lovable.app${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.replace(target);
    } catch {
      /* ignore */
    }
  }, []);
  return null;
};

// When the OAuth broker redirects back, the published web page loads INSIDE
// the in-app browser sheet (SFSafariViewController on iOS / Chrome Custom Tab
// on Android). The sheet won't auto-close because the WebView in the native
// shell never sees that navigation. We fix that by firing a custom-scheme
// deep link (`com.wallet.ai://oauth-done`). iOS/Android intercept that
// scheme, dismiss the in-app browser, switch to the native app, and trigger
// `appUrlOpen` — which our native flow listens for to finalize sign-in.
const OAuthCompleteBridge = () => {
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("oauth_complete") !== "1") return;

      // Strip the marker from the URL so it doesn't loop on re-renders.
      url.searchParams.delete("oauth_complete");
      const cleanPath = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "") + url.hash;
      window.history.replaceState({}, "", cleanPath);

      // Fire the deep link. Use an iframe + window.location fallback for max
      // reliability across iOS Safari versions.
      const deepLink = "com.wallet.ai://oauth-done";
      try {
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = deepLink;
        document.body.appendChild(iframe);
        setTimeout(() => { try { iframe.remove(); } catch { /* ignore */ } }, 1500);
      } catch { /* ignore */ }
      // Fallback: direct navigation. iOS will intercept the scheme.
      setTimeout(() => {
        try { window.location.href = deepLink; } catch { /* ignore */ }
      }, 100);
    } catch {
      /* ignore */
    }
  }, []);
  return null;
};

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

// iOS-style native page transition: subtle slide + fade, hardware-accelerated
const easeIOS = [0.32, 0.72, 0, 1] as const;
const pageVariants: Variants = {
  initial: { opacity: 0, x: 12, willChange: "transform, opacity" },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.22, ease: easeIOS },
    willChange: "auto",
  },
  exit: {
    opacity: 0,
    x: -8,
    willChange: "transform, opacity",
    transition: { duration: 0.16, ease: easeIOS },
  },
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
  useFCMToken();

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
          className="flex-1 flex flex-col overflow-hidden overflow-x-hidden [backface-visibility:hidden] [transform:translateZ(0)]"
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
            <Route path="/live-trades" element={<LiveTradesPage />} />
            <Route path="/ai-trading/start" element={<AITradingOnboardingPage />} />
            <Route path="/ai-trading/wallet" element={<AITradingWalletPage />} />
            <Route path="/ota-deploy" element={<OTADeployPage />} />
            <Route path="/~oauth/*" element={<OAuthBounce />} />
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
          <NetworkStatus />
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

