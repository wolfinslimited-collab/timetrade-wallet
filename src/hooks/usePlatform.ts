import { Capacitor } from "@capacitor/core";

export type Platform = "iphone" | "android" | "web";

/**
 * Returns the current runtime platform.
 * - 'iphone' on iOS native (Capacitor)
 * - 'android' on Android native (Capacitor)
 * - 'web' everywhere else (browser, PWA)
 */
export const usePlatform = (): Platform => {
  const p = Capacitor.getPlatform();
  if (p === "ios") return "iphone";
  if (p === "android") return "android";
  return "web";
};
