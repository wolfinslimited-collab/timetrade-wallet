import { useState, useEffect } from "react";
import { ChevronLeft, Shield, Key, Fingerprint, Eye, Trash2, Lock, AlertTriangle, KeyRound, Bell, ChevronRight } from "lucide-react";
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
import { broadcastWalletResetSignal, wipeAllWalletData, wipeIndexedDb } from "@/utils/walletStorage";

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
      "w-full flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-200 text-left group",
      danger 
        ? "bg-destructive/5 hover:bg-destructive/10 border border-destructive/15" 
        : "bg-card/50 border border-border/40 hover:border-primary/20 hover:bg-card/80"
    )}
  >
    <div className={cn(
      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
      danger ? "bg-destructive/10 group-hover:bg-destructive/15" : "bg-primary/8 group-hover:bg-primary/12"
    )}>
      <Icon className={cn("w-[18px] h-[18px]", danger ? "text-destructive" : "text-primary")} />
    </div>
    <div className="flex-1 min-w-0">
      <p className={cn("text-[15px] font-medium leading-tight", danger && "text-destructive")}>{label}</p>
      {description && (
        <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{description}</p>
      )}
    </div>
    {rightElement || <ChevronRight className="w-4 h-4 text-muted-foreground/50" />}
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
      setBiometricSetupOpen(true);
    } else {
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
    if (newPin && biometricRegistered) {
      updateStoredPin(newPin);
    }
    toast({
      title: "PIN updated",
      description: "Your new PIN has been saved",
    });
  };

  const handleResetWallet = async () => {
    console.log('%c[SETTINGS] 🗑️ Reset Wallet initiated', 'color: #ef4444; font-weight: bold;');
    broadcastWalletResetSignal();
    removeBiometric();
    wipeAllWalletData();
    await wipeIndexedDb();
    window.location.replace(window.location.pathname);
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/30">
        <button 
          onClick={onBack}
          className="p-2 rounded-xl bg-card/50 border border-border/40 hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="flex-1 p-4 space-y-5 pb-8">
        {/* Security Section */}
        <section>
          <div className="flex items-center gap-2 mb-2.5 px-1">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Security
            </h2>
          </div>
          
          <div className="space-y-2">
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
                    ? "Enabled — Face ID or fingerprint"
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
        </section>

        {/* Notifications Section */}
        <section>
          <div className="flex items-center gap-2 mb-2.5 px-1">
            <Bell className="w-3.5 h-3.5 text-primary" />
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Notifications
            </h2>
          </div>
          
          <SettingItem
            icon={Bell}
            label="Push Notifications"
            description={
              notificationPermission === 'granted' && notificationSettings.enabled
                ? "Enabled — receiving alerts"
                : notificationPermission === 'denied'
                ? "Blocked by browser"
                : "Get alerts for prices & transactions"
            }
            onClick={() => setNotificationSettingsOpen(true)}
          />
        </section>

        {/* Auto-Lock Section */}
        <section>
          <div className="flex items-center gap-2 mb-2.5 px-1">
            <Lock className="w-3.5 h-3.5 text-primary" />
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Auto-Lock
            </h2>
          </div>
          
          <div className="bg-card/50 border border-border/40 rounded-2xl p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-medium">Lock after inactivity</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  Auto-lock wallet after 5 minutes
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <div className="flex items-center gap-2 mb-2.5 px-1">
            <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-destructive/70">
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
        </section>

        {/* App Info */}
        <div className="pt-3 text-center space-y-1">
          <p className="text-[11px] text-muted-foreground/60">Timetrade Wallet v1.0.0</p>
          <p className="text-[11px] text-muted-foreground/40">
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
