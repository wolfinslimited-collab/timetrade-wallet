import { useState, useEffect } from "react";
import { Fingerprint, Shield, ChevronRight, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface BiometricSetupStepProps {
  onComplete: (enabled: boolean) => void;
  onSkip: () => void;
}

export const BiometricSetupStep = ({ onComplete, onSkip }: BiometricSetupStepProps) => {
  const { toast } = useToast();
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  useEffect(() => {
    const checkBiometric = async () => {
      if (window.PublicKeyCredential) {
        try {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsAvailable(available);
        } catch {
          setIsAvailable(false);
        }
      }
    };
    checkBiometric();
  }, []);

  const handleEnableBiometric = async () => {
    setIsEnabling(true);
    
    // Simulate biometric enrollment
    // In a real app, this would use WebAuthn to register a credential
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: "Biometric enabled!",
      description: "You can now unlock your wallet with Face ID or fingerprint",
    });
    
    setIsEnabling(false);
    onComplete(true);
  };

  return (
    <div className="flex flex-col min-h-screen p-6">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Optional</p>
        <h2 className="text-xl font-bold">Enable Biometrics</h2>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative mb-8">
          <div className="w-32 h-32 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
            <Fingerprint className="w-16 h-16 text-primary" />
          </div>
          {isEnabling && (
            <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          )}
        </div>

        <h3 className="text-xl font-semibold mb-3 text-center">
          {isAvailable ? "Quick & Secure Access" : "Biometric Authentication"}
        </h3>
        
        <p className="text-muted-foreground text-center text-sm max-w-xs mb-8">
          {isAvailable 
            ? "Use Face ID or fingerprint to unlock your wallet instantly without entering your PIN"
            : "Biometric authentication is not available on this device. You can still use your PIN to unlock."}
        </p>

        {/* Benefits */}
        <div className="w-full space-y-3 mb-8">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Enhanced Security</p>
              <p className="text-xs text-muted-foreground">Your biometric data never leaves your device</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Instant Access</p>
              <p className="text-xs text-muted-foreground">Unlock in under a second</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3 pb-8">
        {isAvailable ? (
          <Button
            onClick={handleEnableBiometric}
            disabled={isEnabling}
            className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base"
          >
            {isEnabling ? (
              <>
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                Setting up...
              </>
            ) : (
              <>
                <Fingerprint className="w-5 h-5 mr-2" />
                Enable Biometrics
              </>
            )}
          </Button>
        ) : null}

        <Button
          variant="outline"
          onClick={onSkip}
          disabled={isEnabling}
          className="w-full h-14 border-border bg-card hover:bg-secondary text-foreground font-medium text-base"
        >
          {isAvailable ? "Skip for now" : "Continue with PIN only"}
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};
