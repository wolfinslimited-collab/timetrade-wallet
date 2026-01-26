import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Shield, Key, Fingerprint, Eye, Trash2, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ChangePinSheet } from "@/components/settings/ChangePinSheet";
import { ViewSeedPhraseSheet } from "@/components/settings/ViewSeedPhraseSheet";
import { ResetWalletDialog } from "@/components/settings/ResetWalletDialog";

interface SettingsPageProps {
  onBack: () => void;
}

interface SettingItemProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

const SettingItem = ({ icon: Icon, label, description, onClick, rightElement, danger }: SettingItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-4 p-4 rounded-xl transition-colors text-left",
      danger 
        ? "bg-destructive/5 hover:bg-destructive/10 border border-destructive/20" 
        : "bg-card border border-border hover:border-primary/30"
    )}
  >
    <div className={cn(
      "w-10 h-10 rounded-full flex items-center justify-center",
      danger ? "bg-destructive/10" : "bg-primary/10"
    )}>
      <Icon className={cn("w-5 h-5", danger ? "text-destructive" : "text-primary")} />
    </div>
    <div className="flex-1 min-w-0">
      <p className={cn("font-medium", danger && "text-destructive")}>{label}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      )}
    </div>
    {rightElement || <ChevronRight className="w-5 h-5 text-muted-foreground" />}
  </button>
);

export const SettingsPage = ({ onBack }: SettingsPageProps) => {
  const { toast } = useToast();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  
  // Sheet states
  const [changePinOpen, setChangePinOpen] = useState(false);
  const [viewSeedOpen, setViewSeedOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  useEffect(() => {
    // Check biometric status
    const checkBiometric = async () => {
      if (window.PublicKeyCredential) {
        try {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setBiometricAvailable(available);
        } catch {
          setBiometricAvailable(false);
        }
      }
    };
    checkBiometric();
    
    // Load biometric setting
    const stored = localStorage.getItem("timetrade_biometric");
    setBiometricEnabled(stored === "true");
  }, []);

  const handleBiometricToggle = (enabled: boolean) => {
    setBiometricEnabled(enabled);
    localStorage.setItem("timetrade_biometric", enabled ? "true" : "false");
    toast({
      title: enabled ? "Biometrics enabled" : "Biometrics disabled",
      description: enabled 
        ? "You can now unlock with Face ID or fingerprint" 
        : "PIN will be required to unlock",
    });
  };

  const handlePinChanged = () => {
    setChangePinOpen(false);
    toast({
      title: "PIN updated",
      description: "Your new PIN has been saved",
    });
  };

  const handleResetWallet = () => {
    // Clear all wallet data
    localStorage.removeItem("timetrade_wallet_created");
    localStorage.removeItem("timetrade_pin");
    localStorage.removeItem("timetrade_biometric");
    localStorage.removeItem("timetrade_seed_phrase");
    
    // Reload the app
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button 
          onClick={onBack}
          className="p-2 rounded-full bg-card border border-border hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="flex-1 p-4 space-y-6 pb-8">
        {/* Security Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Security
            </h2>
          </div>
          
          <div className="space-y-3">
            <SettingItem
              icon={Key}
              label="Change PIN"
              description="Update your 6-digit security PIN"
              onClick={() => setChangePinOpen(true)}
            />
            
            <SettingItem
              icon={Fingerprint}
              label="Biometric Unlock"
              description={biometricAvailable 
                ? "Use Face ID or fingerprint to unlock" 
                : "Not available on this device"}
              onClick={biometricAvailable ? () => handleBiometricToggle(!biometricEnabled) : undefined}
              rightElement={
                <Switch
                  checked={biometricEnabled}
                  onCheckedChange={handleBiometricToggle}
                  disabled={!biometricAvailable}
                />
              }
            />
            
            <SettingItem
              icon={Eye}
              label="View Seed Phrase"
              description="Backup your recovery phrase"
              onClick={() => setViewSeedOpen(true)}
            />
          </div>
        </div>

        {/* Lock Settings */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Auto-Lock
            </h2>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Lock after inactivity</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automatically lock wallet after 5 minutes
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-destructive">
              Danger Zone
            </h2>
          </div>
          
          <SettingItem
            icon={Trash2}
            label="Reset Wallet"
            description="Delete all data and start fresh"
            onClick={() => setResetDialogOpen(true)}
            danger
          />
        </div>

        {/* App Info */}
        <div className="pt-4 text-center">
          <p className="text-xs text-muted-foreground">Timetrade Wallet v1.0.0</p>
          <p className="text-xs text-muted-foreground mt-1">
            Powered by secure encryption
          </p>
        </div>
      </div>

      {/* Sheets and Dialogs */}
      <ChangePinSheet 
        open={changePinOpen} 
        onOpenChange={setChangePinOpen}
        onSuccess={handlePinChanged}
      />
      
      <ViewSeedPhraseSheet 
        open={viewSeedOpen} 
        onOpenChange={setViewSeedOpen}
      />
      
      <ResetWalletDialog 
        open={resetDialogOpen} 
        onOpenChange={setResetDialogOpen}
        onConfirm={handleResetWallet}
      />
    </div>
  );
};
