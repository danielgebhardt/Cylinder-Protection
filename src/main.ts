import * as Phaser from 'phaser';
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { W, H, RES } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: Math.round(W * RES),
  height: Math.round(H * RES),
  backgroundColor: '#0c1428',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 2 },
  render: { antialias: true, roundPixels: false },
  scene: [BootScene, MenuScene, GameScene],
});

// Android hardware back button + app lifecycle
if (Capacitor.isNativePlatform()) {
  void App.addListener('backButton', () => game.events.emit('backbutton'));
  void App.addListener('pause', () => game.events.emit('apppause'));
  game.events.on('exitapp', () => void App.exitApp());
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.events.emit('apppause');
});

(window as unknown as { __game: Phaser.Game }).__game = game;
