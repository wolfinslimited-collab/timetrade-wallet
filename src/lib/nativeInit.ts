import { Capacitor } from "@capacitor/core";

let initialized = false;

export async function initNativeShell() {
  if (initialized) return;
  initialized = true;

  let isNative = false;
  try {
    isNative = Capacitor.isNativePlatform();
  } catch {
    isNative = false;
  }
  if (!isNative) return;

  // Status bar — match the dark app background
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    try {
      // Android only — ignore failure on iOS
      await StatusBar.setBackgroundColor({ color: "#0E1116" });
    } catch {
      // ignore (iOS)
    }
    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
    } catch {
      // ignore
    }
  } catch {
    // status-bar unavailable
  }

  // Splash screen — hide once the web layer is ready
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 200 });
  } catch {
    // splash-screen unavailable
  }
}
