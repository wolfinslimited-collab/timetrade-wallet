import { useState, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const BIOMETRIC_CREDENTIAL_KEY = 'timetrade_biometric_credential';
const BIOMETRIC_PIN_KEY = 'timetrade_biometric_pin';
const NATIVE_BIOMETRIC_SERVER = 'timetrade-wallet';
const NATIVE_BIOMETRIC_USERNAME = 'wallet-pin';

interface BiometricState {
  isAvailable: boolean;
  isEnabled: boolean;
  isRegistered: boolean;
}

function isNativePlatform(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

async function getNativeBiometric() {
  const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
  return NativeBiometric;
}

export function useBiometricAuth() {
  const [state, setState] = useState<BiometricState>({
    isAvailable: false,
    isEnabled: false,
    isRegistered: false,
  });

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = useCallback(async () => {
    let isAvailable = false;
    const native = isNativePlatform();

    if (native) {
      try {
        const NativeBiometric = await getNativeBiometric();
        const result = await NativeBiometric.isAvailable();
        isAvailable = result.isAvailable;
      } catch {
        isAvailable = false;
      }
    } else if (window.PublicKeyCredential) {
      try {
        isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch {
        isAvailable = false;
      }
    }

    const isEnabled = localStorage.getItem('timetrade_biometric') === 'true';
    const isRegistered = native
      ? isEnabled
      : !!localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY);

    setState({ isAvailable, isEnabled, isRegistered });
  }, []);

  // ── Native biometric methods ──

  const registerNative = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const NativeBiometric = await getNativeBiometric();
      await NativeBiometric.verifyIdentity({
        reason: 'Enable biometric unlock for your wallet',
        title: 'Biometric Setup',
      });
      await NativeBiometric.setCredentials({
        server: NATIVE_BIOMETRIC_SERVER,
        username: NATIVE_BIOMETRIC_USERNAME,
        password: pin,
      });
      localStorage.setItem('timetrade_biometric', 'true');
      await checkBiometricStatus();
      return true;
    } catch {
      return false;
    }
  }, [checkBiometricStatus]);

  const authenticateNative = useCallback(async (): Promise<string | null> => {
    try {
      const NativeBiometric = await getNativeBiometric();
      await NativeBiometric.verifyIdentity({
        reason: 'Authenticate to unlock your wallet',
        title: 'Unlock Wallet',
      });
      const credentials = await NativeBiometric.getCredentials({
        server: NATIVE_BIOMETRIC_SERVER,
      });
      return credentials.password;
    } catch {
      return null;
    }
  }, []);

  const removeNative = useCallback(async () => {
    try {
      const NativeBiometric = await getNativeBiometric();
      await NativeBiometric.deleteCredentials({
        server: NATIVE_BIOMETRIC_SERVER,
      });
    } catch { /* credentials may not exist */ }
    localStorage.setItem('timetrade_biometric', 'false');
    checkBiometricStatus();
  }, [checkBiometricStatus]);

  const updateNativePin = useCallback(async (newPin: string) => {
    if (!state.isRegistered) return;
    try {
      const NativeBiometric = await getNativeBiometric();
      await NativeBiometric.setCredentials({
        server: NATIVE_BIOMETRIC_SERVER,
        username: NATIVE_BIOMETRIC_USERNAME,
        password: newPin,
      });
    } catch { /* silent */ }
  }, [state.isRegistered]);

  // ── Web (WebAuthn) fallback methods ──

  const registerWeb = useCallback(async (pin: string): Promise<boolean> => {
    if (!window.PublicKeyCredential) throw new Error('WebAuthn not supported');
    try {
      const userId = new Uint8Array(16);
      crypto.getRandomValues(userId);
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: 'Timetrade Wallet', id: window.location.hostname },
          user: { id: userId, name: 'wallet-user', displayName: 'Wallet User' },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
          attestation: 'none',
        },
      }) as PublicKeyCredential;
      if (!credential) throw new Error('Failed to create credential');
      const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      localStorage.setItem(BIOMETRIC_CREDENTIAL_KEY, credentialId);
      localStorage.setItem(BIOMETRIC_PIN_KEY, btoa(pin));
      localStorage.setItem('timetrade_biometric', 'true');
      await checkBiometricStatus();
      return true;
    } catch {
      return false;
    }
  }, [checkBiometricStatus]);

  const authenticateWeb = useCallback(async (): Promise<string | null> => {
    const credentialIdBase64 = localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY);
    const storedPinBase64 = localStorage.getItem(BIOMETRIC_PIN_KEY);
    if (!credentialIdBase64 || !storedPinBase64) throw new Error('Biometric not registered');
    try {
      const credentialId = Uint8Array.from(atob(credentialIdBase64), c => c.charCodeAt(0));
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rpId: window.location.hostname,
          allowCredentials: [{ id: credentialId, type: 'public-key', transports: ['internal'] }],
          userVerification: 'required',
          timeout: 60000,
        },
      });
      if (!assertion) throw new Error('Authentication failed');
      return atob(storedPinBase64);
    } catch {
      return null;
    }
  }, []);

  const removeWeb = useCallback(() => {
    localStorage.removeItem(BIOMETRIC_CREDENTIAL_KEY);
    localStorage.removeItem(BIOMETRIC_PIN_KEY);
    localStorage.setItem('timetrade_biometric', 'false');
    checkBiometricStatus();
  }, [checkBiometricStatus]);

  const updateWebPin = useCallback((newPin: string) => {
    if (state.isRegistered) {
      localStorage.setItem(BIOMETRIC_PIN_KEY, btoa(newPin));
    }
  }, [state.isRegistered]);

  // ── Route to native or web ──

  const native = isNativePlatform();

  return {
    ...state,
    registerBiometric: native ? registerNative : registerWeb,
    authenticateWithBiometric: native ? authenticateNative : authenticateWeb,
    removeBiometric: native ? removeNative : removeWeb,
    updateStoredPin: native ? updateNativePin : updateWebPin,
    refreshStatus: checkBiometricStatus,
  };
}
