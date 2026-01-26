import { Wallet, Plus, Import, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WelcomeStepProps {
  onCreateWallet: () => void;
  onImportWallet: () => void;
  walletName: string;
  setWalletName: (name: string) => void;
}

export const WelcomeStep = ({ onCreateWallet, onImportWallet, walletName, setWalletName }: WelcomeStepProps) => {
  return (
    <div className="flex flex-col min-h-screen p-6">
      {/* Logo & Title */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center glow-green">
            <Wallet className="w-12 h-12 text-primary" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-3">
          Welcome to <span className="gradient-text">Timetrade</span>
        </h1>
        <p className="text-muted-foreground text-sm max-w-xs mb-8">
          Your AI-powered non-custodial wallet with built-in insurance protection
        </p>

        {/* Wallet Name Input */}
        <div className="w-full max-w-xs mb-6">
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block text-left">
            Wallet Name
          </label>
          <Input
            value={walletName}
            onChange={(e) => setWalletName(e.target.value)}
            placeholder="Enter wallet name"
            className="bg-card border-border text-center font-medium"
            maxLength={30}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pb-8">
        <Button
          onClick={onCreateWallet}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create New Wallet
        </Button>

        <Button
          variant="outline"
          onClick={onImportWallet}
          className="w-full h-14 border-border bg-card hover:bg-secondary text-foreground font-medium text-base"
        >
          <Import className="w-5 h-5 mr-2" />
          Import Existing Wallet
        </Button>

        <p className="text-xs text-muted-foreground text-center pt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};
