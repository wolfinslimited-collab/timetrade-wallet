import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, BellOff, TrendingUp, ArrowRightLeft, Shield, Check, X } from "lucide-react";
import { useWebNotifications } from "@/hooks/useWebNotifications";
import { cn } from "@/lib/utils";

interface NotificationSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NotificationSettingsSheet = ({ open, onOpenChange }: NotificationSettingsSheetProps) => {
  const {
    isSupported,
    permission,
    settings,
    requestPermission,
    updateSettings,
    disableNotifications,
    showNotification,
  } = useWebNotifications();

  const [isRequesting, setIsRequesting] = useState(false);

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    const granted = await requestPermission();
    setIsRequesting(false);
    
    if (granted) {
      // Show a test notification
      showNotification({
        title: '🎉 Notifications Enabled!',
        body: 'You will now receive alerts for price changes and transactions.',
      });
    }
  };

  const handleTestNotification = () => {
    showNotification({
      title: '🔔 Test Notification',
      body: 'This is a test notification from Timetrade Wallet.',
    });
  };

  const isEnabled = permission === 'granted' && settings.enabled;
  const isDenied = permission === 'denied';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Push Notifications
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto max-h-[calc(75vh-120px)] pb-4">
          {/* Browser Support Check */}
          {!isSupported && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
              <div className="flex gap-3">
                <BellOff className="w-5 h-5 text-destructive flex-shrink-0" />
                <div>
                  <p className="font-medium text-destructive">Not Supported</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your browser doesn't support push notifications. Try using Chrome, Firefox, or Safari.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Permission Denied */}
          {isSupported && isDenied && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex gap-3">
                <X className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-500">Permission Denied</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You've blocked notifications. To enable them, update your browser settings for this site.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Enable Button */}
          {isSupported && !isDenied && !isEnabled && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bell className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Enable Push Notifications</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get instant alerts for price changes, incoming transactions, and security events.
                  </p>
                </div>
                <Button 
                  onClick={handleEnableNotifications} 
                  disabled={isRequesting}
                  className="w-full"
                >
                  {isRequesting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                      Requesting...
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      Enable Notifications
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Enabled Status */}
          {isEnabled && (
            <>
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-green-500">Notifications Enabled</p>
                    <p className="text-sm text-muted-foreground">You'll receive push notifications</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleTestNotification}>
                    Test
                  </Button>
                </div>
              </div>

              {/* Notification Types */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Notification Types
                </h3>
                
                <div className="space-y-2">
                  {/* Price Alerts */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-medium">Price Alerts</p>
                        <p className="text-xs text-muted-foreground">When tokens hit your price targets</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.priceAlerts}
                      onCheckedChange={(checked) => updateSettings({ priceAlerts: checked })}
                    />
                  </div>

                  {/* Transactions */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <ArrowRightLeft className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium">Transactions</p>
                        <p className="text-xs text-muted-foreground">Sends, receives, and confirmations</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.transactions}
                      onCheckedChange={(checked) => updateSettings({ transactions: checked })}
                    />
                  </div>

                  {/* Security */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <p className="font-medium">Security Alerts</p>
                        <p className="text-xs text-muted-foreground">Login attempts and warnings</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.security}
                      onCheckedChange={(checked) => updateSettings({ security: checked })}
                    />
                  </div>
                </div>
              </div>

              {/* Disable Button */}
              <Button
                variant="outline"
                className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={disableNotifications}
              >
                <BellOff className="w-4 h-4 mr-2" />
                Disable Notifications
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
