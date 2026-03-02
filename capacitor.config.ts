import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wallet.ai',
  appName: 'NextGen AI Wallet',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    scrollEnabled: true
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    }
  }
};

export default config;
