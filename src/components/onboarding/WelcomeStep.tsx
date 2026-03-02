import { Globe, Shield, Fingerprint, ArrowRight, Wallet, Download } from "lucide-react";

interface WelcomeStepProps {
  onCreateWallet: () => void;
  onImportWallet: () => void;
  walletName: string;
  setWalletName: (name: string) => void;
}

export const WelcomeStep = ({ onCreateWallet, onImportWallet }: WelcomeStepProps) => {
  return (
    <div className="h-[100dvh] w-full flex flex-col">
      {/* Top section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
        {/* Logo */}
        <div className="w-20 h-20 rounded-[22px] bg-card border border-border/40 flex items-center justify-center mb-10 shadow-2xl shadow-primary/10 overflow-hidden">
          <img src="/app-logo.png" alt="AI Wallet" className="w-full h-full object-contain" />
        </div>

        <h1 className="text-[30px] font-extrabold tracking-tight text-center text-foreground leading-tight">
          AI Wallet
        </h1>
        <p className="text-[14px] text-muted-foreground text-center mt-2.5 leading-relaxed max-w-[260px]">
          Your multi-chain crypto wallet with self-custody security
        </p>

        {/* Feature pills */}
        <div className="flex items-center gap-2.5 mt-8">
          {[
            { icon: Globe, label: "Multi-Chain" },
            { icon: Shield, label: "Self-Custody" },
            { icon: Fingerprint, label: "Biometric" },
          ].map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card border border-border/30"
            >
              <f.icon className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-foreground/70">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="px-6 pb-10 space-y-3" style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))' }}>
        <button
          onClick={onCreateWallet}
          className="w-full flex items-center gap-4 rounded-2xl bg-primary px-5 py-[18px] active:opacity-90"
        >
          <div className="w-12 h-12 rounded-xl bg-primary-foreground/15 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[15px] font-bold text-primary-foreground leading-tight">Create New Wallet</p>
            <p className="text-[12px] text-primary-foreground/60 mt-0.5">Generate a fresh seed phrase</p>
          </div>
          <ArrowRight className="w-4 h-4 text-primary-foreground/40 shrink-0" />
        </button>

        <button
          onClick={onImportWallet}
          className="w-full flex items-center gap-4 rounded-2xl bg-card border border-border/40 px-5 py-[18px] active:opacity-90"
        >
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-foreground/60" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[15px] font-bold text-foreground/90 leading-tight">Import Wallet</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Use seed phrase or private key</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
        </button>

        <p className="text-[10px] text-muted-foreground/40 text-center pt-3">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};
