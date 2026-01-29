import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f490c70078524355b9ac697a3479cf03',
  appName: 'timetrade-wallet',
  webDir: 'dist',
  server: {
    url: 'https://f490c700-7852-4355-b9ac-697a3479cf03.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  ios: {
    contentInset: 'automatic'
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
