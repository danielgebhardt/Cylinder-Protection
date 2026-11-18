import * as Phaser from 'phaser';
import { W, H, setupCamera } from '../config';
import { paintWorldMap } from '../art/world';
import { LEVELS } from '../data/levels';
import { ENEMIES } from '../data/enemies';
import { ENEMY_TEX } from '../art/textures';
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
    setupCamera(this);
    this.anims.globalTimeScale = 1;
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
    if (!this.textures.exists('worldmap')) paintWorldMap(this, LEVELS.map(l => l.mapPos));
    this.add.image(0, 0, 'worldmap').setOrigin(0);
    // scenery per region
    const rng = seeded(7);
    const regionDecor: [number, number, string[]][] = [
      [210, 470, ['tree', 'tree', 'bush', 'pine']], [430, 330, ['autumn', 'autumn', 'tree']], [660, 470, ['deadtree', 'pine', 'crystal']],
      [870, 300, ['snowpine', 'snowpine']], [1070, 460, ['deadtree', 'rock', 'lava']],
    ];
    const items: { x: number; y: number; k: string }[] = [];
    for (const [cx, cy, kinds] of regionDecor) {
      for (let i = 0; i < 9; i++) {
        const a = rng() * Math.PI * 2, r = 60 + rng() * 70;
        const x = cx + Math.cos(a) * r * 1.2, y = cy + Math.sin(a) * r * 0.75;
        if (LEVELS.some(l => Math.hypot(l.mapPos[0] - x, l.mapPos[1] - y) < 70)) continue;
        items.push({ x, y, k: kinds[Math.floor(rng() * kinds.length)] });
      }
    }
    items.sort((a, b) => a.y - b.y).forEach(it => {
      const img = this.add.image(it.x, it.y, `decor_${it.k}`).setOrigin(0.5, 66 / 72).setScale(0.55);
      if (it.k !== 'rock' && it.k !== 'lava' && it.k !== 'crystal') this.tweens.add({ targets: img, angle: { from: -1.5, to: 1.5 }, duration: 1800 + rng() * 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    // the Cylinder, glowing on its hill
    const glow = this.add.image(1180, 280, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x5ad0ff).setScale(2.4).setAlpha(0.5);
    this.tweens.add({ targets: glow, scale: 2.9, alpha: 0.25, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const cyl = this.add.image(1180, 330, 'cylinder').setOrigin(0.5, 132 / 140).setScale(0.75);
    this.tweens.add({ targets: cyl, y: 324, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // drifting clouds
    for (let i = 0; i < 5; i++) {
      const c = this.add.image(rng() * W, 160 + rng() * 480, 'smoke').setScale(4 + rng() * 3, 1.6 + rng()).setAlpha(0.35).setDepth(5);
      this.tweens.add({ targets: c, x: c.x + 160, duration: 14000 + rng() * 8000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.add.image(0, 0, 'vignette').setOrigin(0).setDisplaySize(W, H).setDepth(6);
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
    c.add(txt(this, W / 2, H / 2 - 78, `${lvl.waves.length} waves  ·  ${lvl.startEnergy} starting energy  ·  ${lvl.paths.length > 1 ? 'Two roads' : 'One road'}`, { size: 16, color: '#dddddd', strokeThickness: 3 }));

    // enemy roster
    const keys = [...new Set(lvl.waves.flat().map(g => g[0]))];
    c.add(txt(this, W / 2, H / 2 - 40, 'Enemies', { size: 18, color: '#ffe26a', strokeThickness: 3 }));
    const sp = Math.min(80, 520 / keys.length);
    keys.forEach((k, j) => {
      const ex = W / 2 + (j - (keys.length - 1) / 2) * sp;
      const img = this.add.image(ex, H / 2 + 14, `enemy_${k}_0`);
      img.setOrigin(0.5, 0.7).setScale(Math.min(1.6, 44 / ENEMY_TEX[k].body));
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
