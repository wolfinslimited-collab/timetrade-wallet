import { useState, useEffect } from "react";
import { ChevronLeft, Shield, Key, Fingerprint, Eye, Trash2, Lock, AlertTriangle, KeyRound, Bell, ChevronRight, Info } from "lucide-react";
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
      "w-full flex items-center gap-4 px-4 py-3.5 transition-all duration-150 text-left",
      "first:rounded-t-2xl last:rounded-b-2xl",
      danger 
        ? "active:bg-destructive/10" 
        : "active:bg-foreground/5"
    )}
  >
    <div className={cn(
      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
      danger ? "bg-destructive/10" : "bg-foreground/8"
    )}>
      <Icon className={cn("w-[18px] h-[18px]", danger ? "text-destructive" : "text-foreground")} />
    </div>
    <div className="flex-1 min-w-0">
      <p className={cn("text-[15px] font-medium leading-tight", danger && "text-destructive")}>{label}</p>
      {description && (
        <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{description}</p>
      )}
    </div>
    {rightElement || (
      <ChevronRight className={cn("w-4 h-4 shrink-0", danger ? "text-destructive/40" : "text-muted-foreground/40")} />
    )}
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
      toast({ title: "Biometrics disabled", description: "PIN will be required to unlock" });
    }
  };

  const handleBiometricSetupSuccess = () => {
    refreshBiometricStatus();
    toast({ title: "Biometrics enabled", description: "You can now use Face ID or fingerprint" });
  };

  const handlePinChanged = (newPin?: string) => {
    setChangePinOpen(false);
    if (newPin && biometricRegistered) updateStoredPin(newPin);
    toast({ title: "PIN updated", description: "Your new PIN has been saved" });
  };

  const handleResetWallet = async () => {
    broadcastWalletResetSignal();
    removeBiometric();
    wipeAllWalletData();
    await wipeIndexedDb();
    window.location.replace(window.location.pathname);
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="flex-1 px-4 space-y-6 pb-28">
        {/* Security */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-2">
            Security
          </p>
          <div className="bg-card/50 border border-border/30 rounded-2xl divide-y divide-border/20 overflow-hidden">
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
                ? (biometricEnabled && biometricRegistered ? "Enabled" : "Use Face ID or fingerprint")
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
              label="Stored Keys"
              description={`${storedKeys.length} key${storedKeys.length !== 1 ? 's' : ''} saved`}
              onClick={() => setManageKeysOpen(true)}
            />
          </div>
        </section>

        {/* Preferences */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-2">
            Preferences
          </p>
          <div className="bg-card/50 border border-border/30 rounded-2xl divide-y divide-border/20 overflow-hidden">
            <SettingItem
              icon={Bell}
              label="Notifications"
              description={
                notificationPermission === 'granted' && notificationSettings.enabled
                  ? "Enabled"
                  : notificationPermission === 'denied'
                  ? "Blocked by browser"
                  : "Price & transaction alerts"
              }
              onClick={() => setNotificationSettingsOpen(true)}
            />
            <SettingItem
              icon={Lock}
              label="Auto-Lock"
              description="Lock after 5 min of inactivity"
              rightElement={<Switch defaultChecked />}
            />
          </div>
        </section>

        {/* Danger */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-destructive/60 px-1 mb-2">
            Danger Zone
          </p>
          <div className="bg-card/50 border border-destructive/15 rounded-2xl overflow-hidden">
            <SettingItem
              icon={Trash2}
              label="Reset Wallet"
              description="Delete all data and start fresh"
              onClick={() => setResetDialogOpen(true)}
              danger
            />
          </div>
        </section>

        {/* App Info */}
        <div className="text-center space-y-1 pt-2">
          <p className="text-[11px] text-muted-foreground/50">Timetrade Wallet v1.0.0</p>
          <p className="text-[10px] text-muted-foreground/30">Powered by secure encryption</p>
        </div>
      </div>

      {/* Sheets */}
      <ChangePinSheet open={changePinOpen} onOpenChange={setChangePinOpen} onSuccess={handlePinChanged} />
      <ViewSeedPhraseSheet open={viewSeedOpen} onOpenChange={setViewSeedOpen} />
      <ResetWalletDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen} onConfirm={handleResetWallet} />
      <ManageStoredKeysSheet open={manageKeysOpen} onOpenChange={setManageKeysOpen} />
      <BiometricSetupDialog open={biometricSetupOpen} onOpenChange={setBiometricSetupOpen} onSuccess={handleBiometricSetupSuccess} onRegister={registerBiometric} />
      <NotificationSettingsSheet open={notificationSettingsOpen} onOpenChange={setNotificationSettingsOpen} />
    </div>
  );
};
