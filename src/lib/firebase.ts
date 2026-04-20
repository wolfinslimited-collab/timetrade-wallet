import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCBfKgjSvSy9tifr5I4EdI3wp2TQF0akHs",
  authDomain: "timetrade-81620.firebaseapp.com",
  projectId: "timetrade-81620",
  storageBucket: "timetrade-81620.firebasestorage.app",
  messagingSenderId: "166449318661",
  appId: "1:166449318661:web:bfa84ede000f784fbdc56c",
  measurementId: "G-J058ZT6EPZ",
};

const app = initializeApp(firebaseConfig);

let messaging: Messaging | null = null;

/**
 * Get the Firebase Messaging instance (only works in supported browsers, not iframes)
 */
export function getFirebaseMessaging(): Messaging | null {
  if (messaging) return messaging;
  try {
    messaging = getMessaging(app);
    return messaging;
  } catch {
    return null;
  }
}

/**
 * Request an FCM push token from the browser
 */
export async function requestFCMToken(): Promise<string | null> {
  const m = getFirebaseMessaging();
  if (!m) return null;

  try {
    const token = await getToken(m, {
      vapidKey: "BE1t5y5jSRQ3pDDzk0vbKcCdrMI-iz9ZmYv9YSjJXpQ-4c_Em-U66zu4XMXjHdJB-8gOW2m7Y7AzsUWKAeCyudg",
    });
    return token || null;
  } catch (err) {
    console.error("FCM getToken failed:", err);
    return null;
  }
}

/**
 * Listen for foreground FCM messages
 */
export function onForegroundMessage(callback: (payload: any) => void): (() => void) | null {
  const m = getFirebaseMessaging();
  if (!m) return null;
  return onMessage(m, callback);
}

export { app as firebaseApp };