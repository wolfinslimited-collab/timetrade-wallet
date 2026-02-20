import { useState, useEffect } from "react";
import { ChevronLeft, Shield, Key, Fingerprint, Eye, Trash2, Lock, AlertTriangle, Bell, ChevronRight, Info, Globe } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { SUPPORTED_CHAINS } from "@/hooks/useBlockchain";
import { useToast } from "@/hooks/use-toast";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { useWebNotifications } from "@/hooks/useWebNotifications";
import { ChangePinSheet } from "@/components/settings/ChangePinSheet";
import { ViewSeedPhraseSheet } from "@/components/settings/ViewSeedPhraseSheet";
import { ResetWalletDialog } from "@/components/settings/ResetWalletDialog";
import { BiometricSetupDialog } from "@/components/settings/BiometricSetupDialog";
import { NotificationSettingsSheet } from "@/components/settings/NotificationSettingsSheet";
import { broadcastWalletResetSignal, wipeAllWalletData, wipeIndexedDb } from "@/utils/walletStorage";

const NetworkLogo = ({ chainId, color }: { chainId: string; color: string }) => {
  const cls = "w-5 h-5";
  switch (chainId) {
    case 'ethereum':
      return <svg viewBox="0 0 32 32" className={cls} fill={color}><path d="M16 0L6.5 16.5L16 22.5L25.5 16.5L16 0Z" opacity="0.6" /><path d="M6.5 16.5L16 32L25.5 16.5L16 22.5L6.5 16.5Z" /></svg>;
    case 'polygon':
      return <svg viewBox="0 0 32 32" className={cls} fill={color}><path d="M21.6 13.4c-.6-.3-1.3-.3-1.8 0l-4.2 2.4-2.8 1.6-4.2 2.4c-.6.3-1.3.3-1.8 0l-3.3-1.9c-.6-.3-.9-.9-.9-1.5v-3.7c0-.6.3-1.2.9-1.5l3.2-1.8c.6-.3 1.3-.3 1.8 0l3.2 1.8c.6.3.9.9.9 1.5v2.4l2.8-1.6v-2.4c0-.6-.3-1.2-.9-1.5l-6-3.4c-.6-.3-1.3-.3-1.8 0l-6.1 3.5c-.6.3-.9.9-.9 1.5v6.9c0 .6.3 1.2.9 1.5l6 3.4c.6.3 1.3.3 1.8 0l4.2-2.4 2.8-1.6 4.2-2.4c.6-.3 1.3-.3 1.8 0l3.2 1.8c.6.3.9.9.9 1.5v3.7c0 .6-.3 1.2-.9 1.5l-3.2 1.9c-.6.3-1.3.3-1.8 0l-3.2-1.8c-.6-.3-.9-.9-.9-1.5v-2.4l-2.8 1.6v2.4c0 .6.3 1.2.9 1.5l6 3.4c.6.3 1.3.3 1.8 0l6-3.4c.6-.3.9-.9.9-1.5v-6.9c0-.6-.3-1.2-.9-1.5l-6.1-3.4z" /></svg>;
    case 'bitcoin':
      return <svg viewBox="0 0 32 32" className={cls} fill={color}><path d="M22.2 14.4c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.6-.4-.7 2.6c-.4-.1-.8-.2-1.3-.3l.7-2.7-1.6-.4-.7 2.7c-.3-.1-.7-.2-1-.3l-2.2-.5-.4 1.7s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.2c0 .1.1.1.1.1l-.1 0-1.1 4.5c-.1.2-.3.5-.7.4 0 0-1.2-.3-1.2-.3l-.8 1.8 2.1.5c.4.1.8.2 1.2.3l-.7 2.8 1.6.4.7-2.7c.4.1.9.2 1.3.3l-.7 2.7 1.6.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2.1 0-3.3-1.5-4.1 1.1-.3 1.9-1 2.1-2.5zM19 19.1c-.5 2.1-4 1-5.1.7l.9-3.7c1.1.3 4.7.8 4.2 3zM19.5 14.3c-.5 1.9-3.4.9-4.3.7l.8-3.3c.9.2 4 .6 3.5 2.6z" /></svg>;
    case 'solana':
      return <svg viewBox="0 0 32 32" className={cls} fill={color}><path d="M7.5 21.5c.2-.2.4-.3.7-.3h18.4c.4 0 .6.5.3.8l-3.7 3.7c-.2.2-.4.3-.7.3H4.1c-.4 0-.6-.5-.3-.8l3.7-3.7z" /><path d="M7.5 6.3c.2-.2.4-.3.7-.3h18.4c.4 0 .6.5.3.8l-3.7 3.7c-.2.2-.4.3-.7.3H4.1c-.4 0-.6-.5-.3-.8l3.7-3.7z" /><path d="M22.5 13.8c-.2-.2-.4-.3-.7-.3H3.4c-.4 0-.6.5-.3.8l3.7 3.7c.2.2.4.3.7.3h18.4c.4 0 .6-.5.3-.8l-3.7-3.7z" /></svg>;
    case 'tron':
      return <svg viewBox="0 0 32 32" className={cls} fill={color}><path d="M16 2L3 9v14l13 7 13-7V9L16 2zm0 3.5l9.5 5.2v10.6L16 26.5l-9.5-5.2V10.7L16 5.5z" /><path d="M16 8v16l7-4V12l-7-4z" opacity="0.6" /></svg>;
    case 'arbitrum':
      return <svg viewBox="0 0 32 32" className={cls} fill={color}><path d="M16 2L4 9v14l12 7 12-7V9L16 2z" opacity="0.3" /><path d="M16 6l-8 4.5v9L16 24l8-4.5v-9L16 6z" /><path d="M16 10l-4 2.5v5l4 2.5 4-2.5v-5l-4-2.5z" opacity="0.6" /></svg>;
    default:
      return <span style={{ color }} className="text-lg font-bold">?</span>;
  }
};

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

        {/* Supported Networks */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-2">
            Supported Networks
          </p>
          <div className="bg-card/50 border border-border/30 rounded-2xl p-3 overflow-hidden">
            <div className="grid grid-cols-3 gap-2">
              {SUPPORTED_CHAINS.map((chain) => (
                <div
                  key={chain.id}
                  className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl"
                  style={{ backgroundColor: `${chain.color}08` }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${chain.color}18` }}
                  >
                    <NetworkLogo chainId={chain.id} color={chain.color} />
                  </div>
                  <p className="text-[12px] font-medium leading-tight text-center">{chain.name}</p>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-muted-foreground">{chain.symbol}</span>
                  </div>
                </div>
              ))}
            </div>
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

      </div>

      {/* Sheets */}
      <ChangePinSheet open={changePinOpen} onOpenChange={setChangePinOpen} onSuccess={handlePinChanged} />
      <ViewSeedPhraseSheet open={viewSeedOpen} onOpenChange={setViewSeedOpen} />
      <ResetWalletDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen} onConfirm={handleResetWallet} />
      
      <BiometricSetupDialog open={biometricSetupOpen} onOpenChange={setBiometricSetupOpen} onSuccess={handleBiometricSetupSuccess} onRegister={registerBiometric} />
      <NotificationSettingsSheet open={notificationSettingsOpen} onOpenChange={setNotificationSettingsOpen} />
    </div>
  );
};
