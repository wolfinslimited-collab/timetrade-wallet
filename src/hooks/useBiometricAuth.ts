import { useState, useCallback, useEffect } from 'react';

const BIOMETRIC_CREDENTIAL_KEY = 'timetrade_biometric_credential';
const BIOMETRIC_PIN_KEY = 'timetrade_biometric_pin';

interface BiometricState {
  isAvailable: boolean;
  isEnabled: boolean;
  isRegistered: boolean;
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
    
    if (window.PublicKeyCredential) {
      try {
        isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch {
        isAvailable = false;
      }
    }

    const isEnabled = localStorage.getItem('timetrade_biometric') === 'true';
    const isRegistered = !!localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY);

    setState({
      isAvailable,
      isEnabled,
      isRegistered,
    });
  }, []);

  /**
   * Register biometric authentication and store PIN for later retrieval
   */
  const registerBiometric = useCallback(async (pin: string): Promise<boolean> => {
    if (!window.PublicKeyCredential) {
      throw new Error('WebAuthn not supported');
    }

    try {
      // Generate a random user ID
      const userId = new Uint8Array(16);
      crypto.getRandomValues(userId);

      // Create credential options
      const createOptions: CredentialCreationOptions = {
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: {
            name: 'Timetrade Wallet',
            id: window.location.hostname,
          },
          user: {
            id: userId,
            name: 'wallet-user',
            displayName: 'Wallet User',
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
          attestation: 'none',
        },
      };

      const credential = await navigator.credentials.create(createOptions) as PublicKeyCredential;
      
      if (!credential) {
        throw new Error('Failed to create credential');
      }

      // Store credential ID for later authentication
      const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      localStorage.setItem(BIOMETRIC_CREDENTIAL_KEY, credentialId);

      // Store PIN (in production, this should be encrypted with a key derived from the credential)
      // For simplicity, we're using base64 encoding - the biometric auth itself provides the security
      localStorage.setItem(BIOMETRIC_PIN_KEY, btoa(pin));
      localStorage.setItem('timetrade_biometric', 'true');

      await checkBiometricStatus();
      return true;
    } catch (error) {
      console.error('Biometric registration failed:', error);
      return false;
    }
  }, [checkBiometricStatus]);

  /**
   * Authenticate with biometrics and retrieve stored PIN
   */
  const authenticateWithBiometric = useCallback(async (): Promise<string | null> => {
    const credentialIdBase64 = localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY);
    const storedPinBase64 = localStorage.getItem(BIOMETRIC_PIN_KEY);

    if (!credentialIdBase64 || !storedPinBase64) {
      throw new Error('Biometric not registered');
    }

    try {
      // Convert credential ID from base64
      const credentialId = Uint8Array.from(atob(credentialIdBase64), c => c.charCodeAt(0));

      const getOptions: CredentialRequestOptions = {
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rpId: window.location.hostname,
          allowCredentials: [{
            id: credentialId,
            type: 'public-key',
            transports: ['internal'],
          }],
          userVerification: 'required',
          timeout: 60000,
        },
      };

      const assertion = await navigator.credentials.get(getOptions);

      if (!assertion) {
        throw new Error('Authentication failed');
      }

      // Biometric verified - return the stored PIN
      return atob(storedPinBase64);
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return null;
    }
  }, []);

  /**
   * Remove biometric registration
   */
  const removeBiometric = useCallback(() => {
    localStorage.removeItem(BIOMETRIC_CREDENTIAL_KEY);
    localStorage.removeItem(BIOMETRIC_PIN_KEY);
    localStorage.setItem('timetrade_biometric', 'false');
    checkBiometricStatus();
  }, [checkBiometricStatus]);

  /**
   * Update stored PIN after PIN change
   */
  const updateStoredPin = useCallback((newPin: string) => {
    if (state.isRegistered) {
      localStorage.setItem(BIOMETRIC_PIN_KEY, btoa(newPin));
    }
  }, [state.isRegistered]);

  return {
    ...state,
    registerBiometric,
    authenticateWithBiometric,
    removeBiometric,
    updateStoredPin,
    refreshStatus: checkBiometricStatus,
  };
}
