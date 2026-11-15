import * as Phaser from 'phaser';
import { generateAll } from '../art/textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    generateAll(this);
    const params = new URLSearchParams(location.search);
    const lvl = params.get('level');
    if (lvl !== null) this.scene.start('Game', { level: Number(lvl) });
    else this.scene.start('Menu');
  }
}
