import { useState, useEffect } from "react";
import { projectASupabase } from "@/lib/externalSupabase";

const APP_VERSION = "1.0.0";

interface AppUpdateConfig {
  min_version: string;
  latest_version: string;
  force_update: boolean;
  update_message: string;
  ios_store_url: string;
  android_store_url: string;
  enabled: boolean;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

function getStoreUrl(config: AppUpdateConfig): string {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return config.ios_store_url;
  return config.android_store_url;
}

export function useAppUpdate() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [updateConfig, setUpdateConfig] = useState<AppUpdateConfig | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedVersion = sessionStorage.getItem("timetrade_update_dismissed");
    
    projectASupabase
      .from("config")
      .select("value")
      .eq("key", "app_update")
      .single()
      .then(({ data }) => {
        if (!data?.value) return;
        const config = data.value as unknown as AppUpdateConfig;
        if (!config.enabled) return;

        const needsUpdate = compareVersions(APP_VERSION, config.min_version) < 0;
        if (needsUpdate && dismissedVersion !== config.min_version) {
          setUpdateConfig(config);
          setShowUpdate(true);
        }
      });
  }, []);

  const dismiss = () => {
    if (updateConfig) {
      sessionStorage.setItem("timetrade_update_dismissed", updateConfig.min_version);
    }
    setDismissed(true);
    setShowUpdate(false);
  };

  const openStore = () => {
    if (updateConfig) {
      window.open(getStoreUrl(updateConfig), "_blank");
    }
  };

  return { showUpdate: showUpdate && !dismissed, updateConfig, dismiss, openStore };
}
