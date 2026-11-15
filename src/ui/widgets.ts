import * as Phaser from 'phaser';
import { txt } from '../util';
import { sfx, unlockAudio } from '../audio';
import { shade } from '../art/textures';

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, color = 0x3b2a1a, alpha = 0.92): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.35); g.fillRoundedRect(x + 3, y + 5, w, h, 14);
  g.fillStyle(shade(color, -0.35), alpha); g.fillRoundedRect(x, y, w, h, 14);
  g.fillStyle(color, alpha); g.fillRoundedRect(x + 4, y + 4, w - 8, h - 8, 11);
  g.lineStyle(2, 0xd4a017, 0.8); g.strokeRoundedRect(x + 4, y + 4, w - 8, h - 8, 11);
  return g;
}

export interface Button extends Phaser.GameObjects.Container {
  label: Phaser.GameObjects.Text;
  setEnabled(on: boolean): void;
}

/** A chunky rounded button. Uses pointerup so drags off the button cancel. */
export function button(scene: Phaser.Scene, x: number, y: number, w: number, h: number, text: string, onClick: () => void, color = 0x4a8a2a, size = 24): Button {
  const c = scene.add.container(x, y) as Button;
  const g = scene.add.graphics();
  const draw = (col: number) => {
    g.clear();
    g.fillStyle(0x000000, 0.35); g.fillRoundedRect(-w / 2 + 2, -h / 2 + 5, w, h, 12);
    g.fillStyle(shade(col, -0.4)); g.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    g.fillStyle(col); g.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 9, 10);
    g.fillStyle(0xffffff, 0.18); g.fillRoundedRect(-w / 2 + 6, -h / 2 + 5, w - 12, h * 0.3, 8);
  };
  draw(color);
  const label = txt(scene, 0, -2, text, { size });
  const hit = scene.add.rectangle(0, 0, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
  c.add([g, label, hit]);
  c.label = label;
  let enabled = true;
  c.setEnabled = (on: boolean) => { enabled = on; draw(on ? color : 0x6a6a6a); label.setAlpha(on ? 1 : 0.6); };
  hit.on('pointerdown', () => { unlockAudio(); if (enabled) c.setScale(0.94); });
  hit.on('pointerout', () => c.setScale(1));
  hit.on('pointerup', () => {
    c.setScale(1);
    if (!enabled) { sfx.error(); return; }
    sfx.click();
    onClick();
  });
  return c;
}

/** Round icon button (HUD). */
export function iconButton(scene: Phaser.Scene, x: number, y: number, r: number, icon: string, onClick: () => void, color = 0x3b2a1a): Phaser.GameObjects.Container & { icon: Phaser.GameObjects.Image } {
  const c = scene.add.container(x, y) as Phaser.GameObjects.Container & { icon: Phaser.GameObjects.Image };
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.35); g.fillCircle(2, 4, r);
  g.fillStyle(shade(color, -0.4)); g.fillCircle(0, 0, r);
  g.fillStyle(color); g.fillCircle(0, -1, r - 3);
  g.lineStyle(2, 0xd4a017); g.strokeCircle(0, -1, r - 3);
  const img = scene.add.image(0, -1, icon).setDisplaySize(r * 1.1, r * 1.1);
  const hit = scene.add.circle(0, 0, r, 0x000000, 0).setInteractive({ useHandCursor: true });
  c.add([g, img, hit]);
  c.icon = img;
  hit.on('pointerdown', () => { unlockAudio(); c.setScale(0.92); });
  hit.on('pointerout', () => c.setScale(1));
  hit.on('pointerup', () => { c.setScale(1); sfx.click(); onClick(); });
  return c;
}
