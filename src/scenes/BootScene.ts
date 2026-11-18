import * as Phaser from 'phaser';
import { generateAll } from '../art/textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    // text is drawn to canvases, so the bundled font must be ready before any Text is created
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    const ready = fonts ? Promise.all([fonts.load('700 20px Cinzel'), fonts.load('600 20px Cinzel')]).catch(() => []) : Promise.resolve([]);
    const timeout = new Promise(r => setTimeout(r, 2500));
    void Promise.race([ready, timeout]).then(() => this.boot());
  }

  private boot(): void {
    generateAll(this);
    const params = new URLSearchParams(location.search);
    const lvl = params.get('level');
    if (lvl !== null) this.scene.start('Game', { level: Number(lvl) });
    else this.scene.start('Menu');
  }
}
