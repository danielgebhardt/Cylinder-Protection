import * as Phaser from 'phaser';
import { W, H } from '../config';
import { LEVELS } from '../data/levels';
import { ENEMIES } from '../data/enemies';
import { button, iconButton, panel } from '../ui/widgets';
import { seeded, txt } from '../util';
import { isUnlocked, load, resetProgress, totalStars } from '../save';
import { isMuted, setMuted, sfx, unlockAudio } from '../audio';

export class MenuScene extends Phaser.Scene {
  private brief: Phaser.GameObjects.Container | null = null;
  private focus = -1;

  constructor() {
    super('Menu');
  }

  init(data: { focus?: number }): void {
    this.focus = data.focus ?? -1;
    this.brief = null;
  }

  create(): void {
    this.drawMap();
    const title = txt(this, W / 2, 62, 'Cylinder Protection', { size: 58, color: '#ffe26a', stroke: '#3b2a1a', strokeThickness: 10 });
    this.tweens.add({ targets: title, scale: 1.03, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    txt(this, W / 2, 112, 'Defend the ancient Cylinder from the Warlord\'s horde', { size: 20, color: '#fff4d6', stroke: '#3b2a1a', strokeThickness: 5 });

    const stars = totalStars();
    panel(this, W - 190, 150, 170, 52);
    this.add.image(W - 158, 176, 'icon_star').setScale(0.7);
    txt(this, W - 90, 177, `${stars}/${LEVELS.length * 3}`, { size: 24 });

    this.drawNodes();

    const snd = iconButton(this, W - 44, H - 44, 28, isMuted() ? 'icon_mute' : 'icon_sound', () => {
      setMuted(!isMuted());
      snd.icon.setTexture(isMuted() ? 'icon_mute' : 'icon_sound');
    });

    let armed = false;
    const reset = button(this, 110, H - 40, 180, 46, 'Reset progress', () => {
      if (!armed) { armed = true; reset.label.setText('Tap to confirm'); this.time.delayedCall(2500, () => { armed = false; if (reset.active) reset.label.setText('Reset progress'); }); return; }
      resetProgress();
      this.scene.restart();
    }, 0x6a3a2a, 17);

    this.input.on('pointerdown', () => unlockAudio());
    const onBack = () => {
      if (this.brief) { this.closeBrief(); return; }
      this.game.events.emit('exitapp');
    };
    this.game.events.on('backbutton', onBack);
    this.events.once('shutdown', () => this.game.events.off('backbutton', onBack));
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // first-time players go straight into the first briefing
    if (this.focus < 0 && !(load().stars[0] > 0)) this.time.delayedCall(500, () => this.openBrief(0));
  }

  private drawMap(): void {
    if (!this.textures.exists('worldmap')) {
      const g = new Phaser.GameObjects.Graphics(this);
      const rng = seeded(99);
      g.fillStyle(0x2f6f8f); g.fillRect(0, 0, W, H);
      for (let i = 0; i < 60; i++) { g.fillStyle(0x3f87a8, 0.4); g.fillEllipse(rng() * W, rng() * H, 60 + rng() * 120, 8 + rng() * 10); }
      // land
      const land = [[640, 420, 1180, 560], [300, 380, 520, 420], [980, 380, 520, 420]] as const;
      g.fillStyle(0xd9c38f); for (const [x, y, w, h] of land) g.fillEllipse(x, y, w + 30, h + 30);
      g.fillStyle(0x7fae4c); for (const [x, y, w, h] of land) g.fillEllipse(x, y, w, h);
      // regions
      const regions: [number, number, number][] = [[210, 470, 0x6fa64a], [430, 330, 0xa7a24a], [660, 470, 0x4f7a4a], [870, 300, 0xdfe8ef], [1070, 460, 0x6e5a52]];
      for (const [x, y, c] of regions) { g.fillStyle(c, 0.85); g.fillEllipse(x, y, 280, 200); }
      for (let i = 0; i < 90; i++) {
        const x = 120 + rng() * (W - 240), y = 230 + rng() * 420;
        g.fillStyle(0x2f6e3a, 0.8); g.fillTriangle(x - 8, y + 8, x + 8, y + 8, x, y - 10);
      }
      for (let i = 0; i < 12; i++) {
        const x = 780 + rng() * 200, y = 210 + rng() * 120;
        g.fillStyle(0x8a8a9a); g.fillTriangle(x - 22, y + 18, x + 22, y + 18, x, y - 24);
        g.fillStyle(0xffffff); g.fillTriangle(x - 8, y - 9, x + 8, y - 9, x, y - 24);
      }
      // trail
      const pts = LEVELS.map(l => l.mapPos);
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
        for (let t = 0; t <= 1; t += 0.04) {
          g.fillStyle(0x5a3a22, 0.8);
          g.fillCircle(ax + (bx - ax) * t, ay + (by - ay) * t + Math.sin(t * Math.PI) * -30, 3.5);
        }
      }
      // vignette
      for (let i = 0; i < 8; i++) { g.lineStyle(24, 0x000000, 0.08); g.strokeRect(i * 12, i * 12, W - i * 24, H - i * 24); }
      g.generateTexture('worldmap', W, H);
      g.destroy();
    }
    this.add.image(0, 0, 'worldmap').setOrigin(0);
    const cyl = this.add.image(1180, 300, 'cylinder').setScale(0.7);
    this.tweens.add({ targets: cyl, y: 292, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private drawNodes(): void {
    const save = load();
    LEVELS.forEach((lvl, i) => {
      const [x, y] = lvl.mapPos;
      const unlocked = isUnlocked(i);
      const stars = save.stars[i] ?? 0;
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.4); g.fillEllipse(3, 30, 70, 20);
      g.fillStyle(unlocked ? 0x8f2a2a : 0x4a4a4a); g.fillCircle(0, 0, 34);
      g.fillStyle(unlocked ? 0xc0392b : 0x6a6a6a); g.fillCircle(0, -2, 29);
      g.lineStyle(4, unlocked ? 0xd4a017 : 0x8a8a8a); g.strokeCircle(0, -2, 29);
      c.add(g);
      if (unlocked) c.add(txt(this, 0, -2, String(i + 1), { size: 30 }));
      else c.add(this.add.image(0, -2, 'icon_lock').setScale(0.8));
      for (let s = 0; s < 3; s++) c.add(this.add.image(-26 + s * 26, 42, s < stars ? 'icon_star' : 'icon_star_empty').setScale(0.5));
      c.add(txt(this, 0, 68, lvl.name, { size: 16, strokeThickness: 4 }));
      const hit = this.add.circle(0, 0, 40, 0x000000, 0).setInteractive({ useHandCursor: true });
      c.add(hit);
      hit.on('pointerup', () => {
        if (!unlocked) { sfx.error(); this.tweens.add({ targets: c, x: x + 6, duration: 50, yoyo: true, repeat: 2 }); return; }
        sfx.click();
        this.openBrief(i);
      });
      if (unlocked && stars === 0) {
        const ring = this.add.circle(x, y - 2, 34).setStrokeStyle(4, 0xffe26a);
        this.tweens.add({ targets: ring, scale: 1.5, alpha: 0, duration: 1100, repeat: -1 });
      }
      if (i === this.focus) this.tweens.add({ targets: c, scale: 1.12, duration: 300, yoyo: true });
    });
  }

  private openBrief(i: number): void {
    this.closeBrief();
    const lvl = LEVELS[i];
    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55).setInteractive();
    dim.on('pointerup', () => this.closeBrief());
    c.add(dim);
    c.add(panel(this, W / 2 - 300, H / 2 - 230, 600, 460));
    const block = this.add.rectangle(W / 2, H / 2, 600, 460, 0x000000, 0).setInteractive();
    c.add(block);
    c.add(txt(this, W / 2, H / 2 - 185, `${i + 1}. ${lvl.name}`, { size: 34, color: '#ffe26a' }));
    c.add(txt(this, W / 2, H / 2 - 130, lvl.subtitle, { size: 18, wrap: 520, strokeThickness: 3 }));
    c.add(txt(this, W / 2, H / 2 - 78, `${lvl.waves.length} waves  ·  ${lvl.startGold} starting gold  ·  ${lvl.paths.length > 1 ? 'Two roads' : 'One road'}`, { size: 16, color: '#dddddd', strokeThickness: 3 }));

    // enemy roster
    const keys = [...new Set(lvl.waves.flat().map(g => g[0]))];
    c.add(txt(this, W / 2, H / 2 - 40, 'Enemies', { size: 18, color: '#ffe26a', strokeThickness: 3 }));
    const sp = Math.min(80, 520 / keys.length);
    keys.forEach((k, j) => {
      const ex = W / 2 + (j - (keys.length - 1) / 2) * sp;
      const img = this.add.image(ex, H / 2 + 14, `enemy_${k}`);
      img.setScale(Math.min(1.2, 54 / Math.max(img.width, img.height)));
      c.add(img);
      c.add(txt(this, ex, H / 2 + 50, ENEMIES[k].short, { size: 12, strokeThickness: 3 }));
    });

    const best = load().stars[i] ?? 0;
    for (let s = 0; s < 3; s++) c.add(this.add.image(W / 2 - 40 + s * 40, H / 2 + 92, s < best ? 'icon_star' : 'icon_star_empty').setScale(0.7));

    c.add(button(this, W / 2 - 110, H / 2 + 168, 180, 64, 'Back', () => this.closeBrief(), 0x5a5a8a, 24));
    c.add(button(this, W / 2 + 110, H / 2 + 168, 200, 64, 'Defend!', () => {
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game', { level: i }));
    }, 0x4a8a2a, 28));
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 180 });
    this.brief = c;
  }

  private closeBrief(): void {
    this.brief?.destroy();
    this.brief = null;
  }
}
