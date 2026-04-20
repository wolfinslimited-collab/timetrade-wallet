import { Capacitor } from "@capacitor/core";

type ImpactStyle = "light" | "medium" | "heavy";

let hapticsModule: typeof import("@capacitor/haptics") | null = null;
let hapticsLoadFailed = false;

const isNative = (() => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
})();

async function loadHaptics() {
  if (!isNative || hapticsLoadFailed) return null;
  if (hapticsModule) return hapticsModule;
  try {
    hapticsModule = await import("@capacitor/haptics");
    return hapticsModule;
  } catch {
    hapticsLoadFailed = true;
    return null;
  }
}

function webVibrate(ms: number) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(ms);
    }
  } catch {
    // ignore
  }
}

export async function impact(style: ImpactStyle = "light") {
  const mod = await loadHaptics();
  if (mod) {
    try {
      const map = {
        light: mod.ImpactStyle.Light,
        medium: mod.ImpactStyle.Medium,
        heavy: mod.ImpactStyle.Heavy,
      } as const;
      await mod.Haptics.impact({ style: map[style] });
      return;
    } catch {
      // fall through
    }
  }
  webVibrate(style === "heavy" ? 20 : style === "medium" ? 12 : 6);
}

export async function selection() {
  const mod = await loadHaptics();
  if (mod) {
    try {
      await mod.Haptics.selectionStart();
      await mod.Haptics.selectionChanged();
      await mod.Haptics.selectionEnd();
      return;
    } catch {
      // fall through
    }
  }
  webVibrate(4);
}

export async function notify(type: "success" | "warning" | "error" = "success") {
  const mod = await loadHaptics();
  if (mod) {
    try {
      const map = {
        success: mod.NotificationType.Success,
        warning: mod.NotificationType.Warning,
        error: mod.NotificationType.Error,
      } as const;
      await mod.Haptics.notification({ type: map[type] });
      return;
    } catch {
      // fall through
    }
  }
  webVibrate(type === "error" ? 25 : 10);
}

export const haptics = { impact, selection, notify };
