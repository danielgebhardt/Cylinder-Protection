import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.danielgebhardt.cylinderprotection',
  appName: 'Cylinder Protection',
  webDir: 'dist',
  backgroundColor: '#0c1428',
  android: {
    allowMixedContent: false,
  },
  ios: {
    backgroundColor: '#0c1428',
    // the game never scrolls: no rubber-band bounce while dragging on the map
    scrollEnabled: false,
    // full-bleed canvas; index.html keeps the game inside the safe area itself
    contentInset: 'never',
  },
};

export default config;
