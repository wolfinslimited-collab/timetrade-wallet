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
import { projectASupabase } from "@/lib/externalSupabase";
import { usePlatform } from "@/hooks/usePlatform";

export type OnboardingStep = "tour" | "welcome" | "security" | "seedphrase" | "verify" | "pin" | "biometric" | "success" | "import";

interface WalletOnboardingProps {
  onComplete: () => void;
}

const STEP_ORDER: OnboardingStep[] = ["tour", "welcome", "security", "seedphrase", "verify", "import", "pin", "biometric", "success"];

export const WalletOnboarding = ({ onComplete }: WalletOnboardingProps) => {
  const { connectWallet, setSelectedChain } = useBlockchainContext();
  const { toast } = useToast();
  const platform = usePlatform();
  const [step, setStep] = useState<OnboardingStep>("tour");
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [walletName, setWalletName] = useState("Main Wallet");
  const [encryptedSeedStr, setEncryptedSeedStr] = useState<string | null>(null);
  const [postTour, setPostTour] = useState<"create" | "import">("create");
  const prevStepRef = useRef<OnboardingStep>("tour");

  const direction = STEP_ORDER.indexOf(step) >= STEP_ORDER.indexOf(prevStepRef.current) ? 1 : -1;
  prevStepRef.current = step;

  const handleCreateWallet = () => {
    setPostTour("create");
    const newSeedPhrase = generateSeedPhrase(12);
    setSeedPhrase(newSeedPhrase);
    setStep("security");
  };

  const handleImportWallet = () => {
    setPostTour("import");
    setStep("import");
  };

  const handleTourContinue = () => {
    setStep("welcome");
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

  const [pendingPin, setPendingPin] = useState<string>("");

  const handlePinComplete = async (pin: string) => {
    localStorage.setItem("timetrade_pin", pin);
    setPendingPin(pin);

    try {
      const phraseString = seedPhrase.join(" ");
      const encryptedData = await encryptPrivateKey(phraseString, pin);
      const encStr = JSON.stringify(encryptedData);
      setEncryptedSeedStr(encStr);

      const storedSolPath = localStorage.getItem("timetrade_solana_derivation_path") as any;
      const accounts = deriveMultipleAccounts(seedPhrase, 5, storedSolPath || "phantom");

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
      return;
    }

    setStep("biometric");
  };

  const handleBiometricComplete = (enabled: boolean) => {
    localStorage.setItem("timetrade_biometric", enabled ? "true" : "false");
    handleFinish();
  };

  const handleBiometricSkip = () => {
    localStorage.setItem("timetrade_biometric", "false");
    handleFinish();
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
      await projectASupabase.functions.invoke("register-user", {
        body: {
          wallet_name: walletName || "Main Wallet",
          platform,
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
      case "tour":
        return (
          <FeatureTourStep
            onContinue={handleTourContinue}
            onBack={handleTourContinue}
          />
        );
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
            onBack={() => (postTour === "import" ? setStep("import") : setStep("verify"))}
          />
        );
      case "biometric":
        return (
          <BiometricSetupStep
            pin={pendingPin}
            onComplete={handleBiometricComplete}
            onSkip={handleBiometricSkip}
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
            initial={{ opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 will-change-[opacity]"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
