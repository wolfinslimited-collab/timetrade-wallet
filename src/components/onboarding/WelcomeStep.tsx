import { Globe, Shield, Fingerprint, ArrowRight, Wallet, Download } from "lucide-react";

interface WelcomeStepProps {
  onCreateWallet: () => void;
  onImportWallet: () => void;
  walletName: string;
  setWalletName: (name: string) => void;
}

export const WelcomeStep = ({ onCreateWallet, onImportWallet }: WelcomeStepProps) => {
  return (
    <div className="h-[100dvh] flex flex-col max-w-md mx-auto">
      {/* Top section with logo & branding */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
        {/* Logo */}
        <div className="w-[72px] h-[72px] rounded-[20px] bg-card border border-border/30 flex items-center justify-center mb-10 shadow-lg shadow-black/20 overflow-hidden">
          <img 
            src="/app-logo.png" 
            alt="AI Wallet" 
            className="w-full h-full object-contain"
          />
        </div>

        {/* Title */}
        <h1 className="text-[28px] font-bold tracking-tight text-center text-foreground leading-tight">
          AI Wallet
        </h1>
        <p className="text-[14px] text-muted-foreground text-center mt-2 leading-relaxed max-w-[260px]">
          Multi-chain crypto wallet with self-custody security
        </p>

        {/* Feature pills */}
        <div className="flex items-center gap-2 mt-8">
          {[
            { icon: Globe, label: "Multi-Chain" },
            { icon: Shield, label: "Self-Custody" },
            { icon: Fingerprint, label: "Biometric" },
          ].map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border/30"
            >
              <f.icon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom action area */}
      <div className="px-5 pb-10 space-y-3">
        {/* Create Wallet - Primary */}
        <button
          onClick={onCreateWallet}
          className="w-full flex items-center gap-4 rounded-2xl bg-foreground px-5 py-4 active:opacity-80"
        >
          <div className="w-11 h-11 rounded-full bg-background/10 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-background" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[15px] font-semibold text-background leading-tight">Create New Wallet</p>
            <p className="text-[12px] text-background/50 mt-0.5">Generate a fresh seed phrase</p>
          </div>
          <ArrowRight className="w-4 h-4 text-background/30 shrink-0" />
        </button>

        {/* Import Wallet - Secondary */}
        <button
          onClick={onImportWallet}
          className="w-full flex items-center gap-4 rounded-2xl bg-card border border-border/30 px-5 py-4 active:opacity-80"
        >
          <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-foreground/60" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[15px] font-semibold text-foreground/90 leading-tight">Import Existing Wallet</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Use seed phrase or private key</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
        </button>

        <p className="text-[10px] text-muted-foreground/40 text-center pt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};
