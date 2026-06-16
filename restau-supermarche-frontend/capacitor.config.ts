import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.menuscan.app',
  appName: 'MenuScan',
  webDir: 'build',
  server: {
    cleartext: true,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0A0F1E',
  },
  ios: {
    backgroundColor: '#0A0F1E',
    contentInset: 'always',
  },
};

export default config;
