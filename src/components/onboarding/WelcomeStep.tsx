import { Plus, Fingerprint, Globe, Lock, ArrowRight, Wallet, Download, Shield } from "lucide-react";

interface WelcomeStepProps {
  onCreateWallet: () => void;
  onImportWallet: () => void;
  walletName: string;
  setWalletName: (name: string) => void;
}

export const WelcomeStep = ({ onCreateWallet, onImportWallet }: WelcomeStepProps) => {
  return (
    <div className="h-[100dvh] flex flex-col max-w-md mx-auto overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* App Logo */}
        <div className="w-20 h-20 overflow-hidden mb-8">
          <img 
            src="/app-logo.png" 
            alt="Timetrade" 
            className="w-full h-full object-contain"
          />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold tracking-tight text-center mb-2">
          Welcome to{" "}
          <span className="gradient-text">AI Wallet</span>
        </h1>
        <p className="text-muted-foreground text-sm text-center max-w-[240px] leading-relaxed">
          Your gateway to multi-chain crypto, secured by you.
        </p>

        {/* Feature Row */}
        <div className="flex items-center gap-6 mt-8">
          {[
            { icon: Globe, label: "Multi-Chain" },
            { icon: Shield, label: "Self-Custody" },
            { icon: Fingerprint, label: "Biometric" },
          ].map((f, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center">
                <f.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-5 pb-10 space-y-3">
        {/* Create Wallet */}
        <button
          onClick={onCreateWallet}
          className="w-full flex items-center gap-4 rounded-2xl bg-foreground px-5 py-4 active:scale-[0.98]"
        >
          <div className="w-10 h-10 rounded-full bg-background/15 flex items-center justify-center shrink-0">
            <Wallet className="w-4.5 h-4.5 text-background" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[15px] font-semibold text-background">Create New Wallet</p>
            <p className="text-[12px] text-background/50">Generate a fresh seed phrase</p>
          </div>
          <ArrowRight className="w-4 h-4 text-background/30 shrink-0" />
        </button>

        {/* Import Wallet */}
        <button
          onClick={onImportWallet}
          className="w-full flex items-center gap-4 rounded-2xl bg-card border border-border/50 px-5 py-4 active:scale-[0.98]"
        >
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <Download className="w-4.5 h-4.5 text-foreground/70" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[15px] font-semibold text-foreground/90">Import Existing Wallet</p>
            <p className="text-[12px] text-muted-foreground">Use seed phrase or private key</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
        </button>

        <p className="text-[10px] text-muted-foreground/30 text-center pt-3">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};