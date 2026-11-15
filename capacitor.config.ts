import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.danielgebhardt.cylinderprotection',
  appName: 'Cylinder Protection',
  webDir: 'dist',
  backgroundColor: '#1b2a1a',
  android: {
    allowMixedContent: false,
  },
};

export default config;
