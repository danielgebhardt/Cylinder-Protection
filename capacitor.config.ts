import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.danielgebhardt.cylinderprotection',
  appName: 'Cylinder Protection',
  webDir: 'dist',
  backgroundColor: '#0c1428',
  android: {
    allowMixedContent: false,
  },
};

export default config;
