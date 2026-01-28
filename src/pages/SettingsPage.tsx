import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Shield, Key, Fingerprint, Eye, Trash2, Lock, AlertTriangle, KeyRound, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useStoredKeys } from "@/hooks/useStoredKeys";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { useWebNotifications } from "@/hooks/useWebNotifications";
import { ChangePinSheet } from "@/components/settings/ChangePinSheet";
import { ViewSeedPhraseSheet } from "@/components/settings/ViewSeedPhraseSheet";
import { ResetWalletDialog } from "@/components/settings/ResetWalletDialog";
import { ManageStoredKeysSheet } from "@/components/settings/ManageStoredKeysSheet";
import { BiometricSetupDialog } from "@/components/settings/BiometricSetupDialog";
import { NotificationSettingsSheet } from "@/components/settings/NotificationSettingsSheet";
import { wipeAllWalletData } from "@/utils/walletStorage";

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
  const { storedKeys, clearAllStoredKeys } = useStoredKeys();
  const { 
    isAvailable: biometricAvailable, 
    isEnabled: biometricEnabled, 
    isRegistered: biometricRegistered,
    registerBiometric, 
    removeBiometric,
    updateStoredPin,
    refreshStatus: refreshBiometricStatus,
  } = useBiometricAuth();
  
  // Sheet states
  const [changePinOpen, setChangePinOpen] = useState(false);
  const [viewSeedOpen, setViewSeedOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [manageKeysOpen, setManageKeysOpen] = useState(false);
  const [biometricSetupOpen, setBiometricSetupOpen] = useState(false);
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  
  const { permission: notificationPermission, settings: notificationSettings } = useWebNotifications();

  useEffect(() => {
    refreshBiometricStatus();
  }, [refreshBiometricStatus]);

  const handleBiometricToggle = (enabled: boolean) => {
    if (enabled) {
      // Open setup dialog to verify PIN and register biometric
      setBiometricSetupOpen(true);
    } else {
      // Disable biometrics
      removeBiometric();
      toast({
        title: "Biometrics disabled",
        description: "PIN will be required to unlock stored keys",
      });
    }
  };

  const handleBiometricSetupSuccess = () => {
    refreshBiometricStatus();
    toast({
      title: "Biometrics enabled",
      description: "You can now use Face ID or fingerprint to unlock stored keys",
    });
  };

  const handlePinChanged = (newPin?: string) => {
    setChangePinOpen(false);
    // Update the biometric stored PIN if biometrics are registered
    if (newPin && biometricRegistered) {
      updateStoredPin(newPin);
    }
    toast({
      title: "PIN updated",
      description: "Your new PIN has been saved",
    });
  };

  const handleResetWallet = () => {
    console.log('%c[SETTINGS] 🗑️ Reset Wallet initiated', 'color: #ef4444; font-weight: bold;');
    
    // Clear biometric registration first (uses its own storage)
    removeBiometric();
    
    // Wipe ALL timetrade_* localStorage keys
    wipeAllWalletData();
    
    // Reload the app to show onboarding
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
                ? (biometricEnabled && biometricRegistered
                    ? "Enabled - use Face ID or fingerprint"
                    : "Use Face ID or fingerprint to unlock")
                : "Not available on this device"}
              onClick={biometricAvailable ? () => handleBiometricToggle(!biometricEnabled) : undefined}
              rightElement={
                <Switch
                  checked={biometricEnabled && biometricRegistered}
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
            
            <SettingItem
              icon={KeyRound}
              label="Manage Stored Keys"
              description={`${storedKeys.length} key${storedKeys.length !== 1 ? 's' : ''} saved for quick signing`}
              onClick={() => setManageKeysOpen(true)}
            />
          </div>
        </div>

        {/* Notifications Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Notifications
            </h2>
          </div>
          
          <SettingItem
            icon={Bell}
            label="Push Notifications"
            description={
              notificationPermission === 'granted' && notificationSettings.enabled
                ? "Enabled - receiving alerts"
                : notificationPermission === 'denied'
                ? "Blocked by browser"
                : "Get alerts for prices & transactions"
            }
            onClick={() => setNotificationSettingsOpen(true)}
          />
        </div>

        {/* Auto-Lock Section */}
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
      
      <ManageStoredKeysSheet
        open={manageKeysOpen}
        onOpenChange={setManageKeysOpen}
      />
      
      <BiometricSetupDialog
        open={biometricSetupOpen}
        onOpenChange={setBiometricSetupOpen}
        onSuccess={handleBiometricSetupSuccess}
        onRegister={registerBiometric}
      />
      
      <NotificationSettingsSheet
        open={notificationSettingsOpen}
        onOpenChange={setNotificationSettingsOpen}
      />
    </div>
  );
};
