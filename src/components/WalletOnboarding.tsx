import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WelcomeStep } from "./onboarding/WelcomeStep";
import { FeatureTourStep } from "./onboarding/FeatureTourStep";
import { SecurityWarningStep } from "./onboarding/SecurityWarningStep";
import { SeedPhraseStep } from "./onboarding/SeedPhraseStep";
import { VerifySeedStep } from "./onboarding/VerifySeedStep";
import { SuccessStep } from "./onboarding/SuccessStep";
import { ImportWalletStep } from "./onboarding/ImportWalletStep";
import { PinSetupStep } from "./onboarding/PinSetupStep";
import { BiometricSetupStep } from "./onboarding/BiometricSetupStep";
import { generateSeedPhrase } from "@/utils/seedPhrase";
import { encryptPrivateKey } from "@/utils/encryption";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { deriveMultipleAccounts } from "@/utils/walletDerivation";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export type OnboardingStep = "welcome" | "tour" | "security" | "seedphrase" | "verify" | "pin" | "biometric" | "success" | "import";

interface WalletOnboardingProps {
  onComplete: () => void;
}

const STEP_ORDER: OnboardingStep[] = ["welcome", "tour", "security", "seedphrase", "verify", "import", "pin", "biometric", "success"];

export const WalletOnboarding = ({ onComplete }: WalletOnboardingProps) => {
  const { connectWallet, setSelectedChain } = useBlockchainContext();
  const { toast } = useToast();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [walletName, setWalletName] = useState("Main Wallet");
  const [encryptedSeedStr, setEncryptedSeedStr] = useState<string | null>(null);
  const [postTour, setPostTour] = useState<"create" | "import">("create");
  const prevStepRef = useRef<OnboardingStep>("welcome");

  const direction = STEP_ORDER.indexOf(step) >= STEP_ORDER.indexOf(prevStepRef.current) ? 1 : -1;
  prevStepRef.current = step;

  const handleCreateWallet = () => {
    setPostTour("create");
    setStep("tour");
  };

  const handleImportWallet = () => {
    setPostTour("import");
    setStep("tour");
  };

  const handleTourContinue = () => {
    if (postTour === "create") {
      const newSeedPhrase = generateSeedPhrase(12);
      setSeedPhrase(newSeedPhrase);
      setStep("security");
    } else {
      setStep("import");
    }
  };

  const handleImportComplete = (importedPhrase: string[]) => {
    setSeedPhrase(importedPhrase);
    setStep("pin");
  };

  const handleSecurityAcknowledged = () => {
    setStep("seedphrase");
  };

  const handleSeedPhraseConfirmed = () => {
    setStep("verify");
  };

  const handleVerificationComplete = () => {
    setStep("pin");
  };

  const handlePinComplete = async (pin: string) => {
    localStorage.setItem("timetrade_pin", pin);
    
    try {
      const phraseString = seedPhrase.join(" ");
      const encryptedData = await encryptPrivateKey(phraseString, pin);
      const encStr = JSON.stringify(encryptedData);
      setEncryptedSeedStr(encStr);

      const storedSolPath = localStorage.getItem("timetrade_solana_derivation_path") as any;
      const accounts = deriveMultipleAccounts(seedPhrase, 5, storedSolPath || "legacy");

      if (accounts.evm.length > 0) {
        connectWallet(accounts.evm[0].address);
        localStorage.setItem("timetrade_active_account_index", "0");

        if (!localStorage.getItem("timetrade_wallet_address_evm")) {
          localStorage.setItem("timetrade_wallet_address_evm", accounts.evm[0].address);
        }
      }

      if (accounts.solana?.[0]?.address && !localStorage.getItem("timetrade_wallet_address_solana")) {
        localStorage.setItem("timetrade_wallet_address_solana", accounts.solana[0].address);
      }

      if (accounts.tron?.[0]?.address && !localStorage.getItem("timetrade_wallet_address_tron")) {
        localStorage.setItem("timetrade_wallet_address_tron", accounts.tron[0].address);
      }

      setSelectedChain("ethereum");
    } catch (error) {
      console.error("Failed to encrypt seed phrase:", error);
      toast({
        title: "Setup failed",
        description: "Could not secure your wallet. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    setStep("success");
  };

  const handleBiometricComplete = (enabled: boolean) => {
    localStorage.setItem("timetrade_biometric", enabled ? "true" : "false");
    setStep("success");
  };

  const handleFinish = async () => {
    localStorage.setItem("timetrade_wallet_name", walletName);
    
    const evmAddress = localStorage.getItem("timetrade_wallet_address_evm") || undefined;
    const solanaAddress = localStorage.getItem("timetrade_wallet_address_solana") || undefined;
    const tronAddress = localStorage.getItem("timetrade_wallet_address_tron") || undefined;
    
    const mainAccount = {
      id: "main",
      name: walletName || "Main Wallet",
      type: "mnemonic" as const,
      encryptedSeedPhrase: encryptedSeedStr || undefined,
      derivationIndex: 0,
      evmAddress,
      solanaAddress,
      tronAddress,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem("timetrade_user_accounts", JSON.stringify([mainAccount]));
    localStorage.setItem("timetrade_active_account_id", "main");

    try {
      await supabase.functions.invoke("register-user", {
        body: {
          wallet_name: walletName || "Main Wallet",
          device_info: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
          },
        },
      });
    } catch (e) {
      console.error("Failed to save user record:", e);
    }
    
    onComplete();
  };

  const renderStep = () => {
    switch (step) {
      case "welcome":
        return (
          <WelcomeStep
            onCreateWallet={handleCreateWallet}
            onImportWallet={handleImportWallet}
            walletName={walletName}
            setWalletName={setWalletName}
          />
        );
      case "security":
        return (
          <SecurityWarningStep
            onContinue={handleSecurityAcknowledged}
            onBack={() => setStep("welcome")}
          />
        );
      case "seedphrase":
        return (
          <SeedPhraseStep
            seedPhrase={seedPhrase}
            onContinue={handleSeedPhraseConfirmed}
            onBack={() => setStep("security")}
          />
        );
      case "verify":
        return (
          <VerifySeedStep
            seedPhrase={seedPhrase}
            onComplete={handleVerificationComplete}
            onBack={() => setStep("seedphrase")}
          />
        );
      case "import":
        return (
          <ImportWalletStep
            onImport={handleImportComplete}
            onBack={() => setStep("welcome")}
          />
        );
      case "pin":
        return (
          <PinSetupStep
            onComplete={handlePinComplete}
            onBack={() => setStep("verify")}
          />
        );
      case "success":
        return (
          <SuccessStep
            walletName={walletName}
            onFinish={handleFinish}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden bg-background">
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ x: direction > 0 ? "100%" : "-25%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? "-25%" : "100%", opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0 will-change-transform"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
