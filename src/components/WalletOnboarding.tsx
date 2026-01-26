import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WelcomeStep } from "./onboarding/WelcomeStep";
import { SecurityWarningStep } from "./onboarding/SecurityWarningStep";
import { SeedPhraseStep } from "./onboarding/SeedPhraseStep";
import { VerifySeedStep } from "./onboarding/VerifySeedStep";
import { SuccessStep } from "./onboarding/SuccessStep";
import { ImportWalletStep } from "./onboarding/ImportWalletStep";
import { generateSeedPhrase } from "@/utils/seedPhrase";

export type OnboardingStep = "welcome" | "security" | "seedphrase" | "verify" | "success" | "import";

interface WalletOnboardingProps {
  onComplete: () => void;
}

export const WalletOnboarding = ({ onComplete }: WalletOnboardingProps) => {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [walletName, setWalletName] = useState("Main Wallet");

  const handleCreateWallet = () => {
    const newSeedPhrase = generateSeedPhrase(12);
    setSeedPhrase(newSeedPhrase);
    setStep("security");
  };

  const handleImportWallet = () => {
    setStep("import");
  };

  const handleImportComplete = (importedPhrase: string[]) => {
    setSeedPhrase(importedPhrase);
    setStep("success");
  };

  const handleSecurityAcknowledged = () => {
    setStep("seedphrase");
  };

  const handleSeedPhraseConfirmed = () => {
    setStep("verify");
  };

  const handleVerificationComplete = () => {
    setStep("success");
  };

  const handleFinish = () => {
    onComplete();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {step === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1"
          >
            <WelcomeStep 
              onCreateWallet={handleCreateWallet}
              onImportWallet={handleImportWallet}
              walletName={walletName}
              setWalletName={setWalletName}
            />
          </motion.div>
        )}

        {step === "security" && (
          <motion.div
            key="security"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1"
          >
            <SecurityWarningStep 
              onContinue={handleSecurityAcknowledged}
              onBack={() => setStep("welcome")}
            />
          </motion.div>
        )}

        {step === "seedphrase" && (
          <motion.div
            key="seedphrase"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1"
          >
            <SeedPhraseStep 
              seedPhrase={seedPhrase}
              onContinue={handleSeedPhraseConfirmed}
              onBack={() => setStep("security")}
            />
          </motion.div>
        )}

        {step === "verify" && (
          <motion.div
            key="verify"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1"
          >
            <VerifySeedStep 
              seedPhrase={seedPhrase}
              onComplete={handleVerificationComplete}
              onBack={() => setStep("seedphrase")}
            />
          </motion.div>
        )}

        {step === "import" && (
          <motion.div
            key="import"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1"
          >
            <ImportWalletStep 
              onImport={handleImportComplete}
              onBack={() => setStep("welcome")}
            />
          </motion.div>
        )}

        {step === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1"
          >
            <SuccessStep 
              walletName={walletName}
              onFinish={handleFinish}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
