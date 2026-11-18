import * as Phaser from 'phaser';
import { DEPTH, FONT, RES } from '../config';
import { rand } from '../util';
import type { Pt } from '../util';

const ADD = Phaser.BlendModes.ADD;

/** Short-lived visual effects. Everything is tween driven so it follows the game speed. */
export class Effects {
  constructor(private scene: Phaser.Scene) {}

  private img(x: number, y: number, key: string, depth: number = DEPTH.effects): Phaser.GameObjects.Image {
    return this.scene.add.image(x, y, key).setDepth(depth);
  }

  private fade(o: Phaser.GameObjects.GameObject, props: Record<string, unknown>, duration: number, delay = 0, ease = 'Cubic.easeOut'): void {
    this.scene.tweens.add({ targets: o, ...props, duration, delay, ease, onComplete: () => o.destroy() });
  }

  /** Big fiery blast: flash, fireball, shockwave, smoke, debris and a scorch mark. */
  explosion(x: number, y: number, radius: number, color = 0xff8a2a): void {
    const k = radius / 55;
    const flash = this.img(x, y - 6, 'flare', DEPTH.effects + 3).setBlendMode(ADD).setTint(0xfff2b0).setScale(1.6 * k);
    this.fade(flash, { scale: 3 * k, alpha: 0 }, 220);
    for (let i = 0; i < 4; i++) {
      const f = this.img(x + rand(-12, 12) * k, y - 6 + rand(-8, 6) * k, 'glow', DEPTH.effects + 2).setBlendMode(ADD)
        .setTint(i % 2 ? color : 0xffd36e).setScale(0.6 * k).setAlpha(0.95);
      this.fade(f, { scale: rand(1.4, 2) * k, alpha: 0, y: f.y - rand(6, 16) }, rand(300, 480));
    }
    const ring = this.img(x, y, 'ring', DEPTH.effects + 1).setBlendMode(ADD).setTint(0xffc06a).setScale(0.3 * k).setAlpha(0.9);
    ring.scaleY = 0.15 * k;
    this.scene.tweens.add({ targets: ring, scaleX: radius / 28, scaleY: radius / 56, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    for (let i = 0; i < 6; i++) {
      const s = this.img(x + rand(-radius, radius) * 0.4, y + rand(-radius, radius) * 0.25, 'smoke', DEPTH.effects)
        .setTint(Phaser.Utils.Array.GetRandom([0x9a958f, 0xb0aaa2, 0x857f78])).setAlpha(0.55).setScale(rand(0.4, 0.7) * k);
      this.fade(s, { y: s.y - rand(25, 55), scale: s.scale * 2, alpha: 0 }, rand(700, 1100), 80);
    }
    for (let i = 0; i < 6; i++) {
      const d = this.img(x, y - 4, 'debris', DEPTH.effects + 1).setScale(rand(0.6, 1.1)).setAngle(rand(0, 360));
      const tx = x + rand(-radius, radius) * 0.9, ty = y + rand(-radius, radius) * 0.4;
      this.scene.tweens.add({ targets: d, x: tx, duration: 500, ease: 'Linear' });
      this.scene.tweens.add({ targets: d, y: ty - rand(30, 55), duration: 250, ease: 'Quad.easeOut', yoyo: true, onComplete: () => d.destroy() });
      this.scene.tweens.add({ targets: d, angle: d.angle + rand(-360, 360), duration: 500 });
    }
    const scorch = this.img(x, y + 2, 'shadow', DEPTH.spots + 1).setTint(0x2a1a0a).setAlpha(0.7);
    scorch.setScale(radius / 30, radius / 60);
    this.fade(scorch, { alpha: 0 }, 2600, 600, 'Linear');
  }

  sparks(x: number, y: number, color: number, n = 6, spread = 28): void {
    for (let i = 0; i < n; i++) {
      const p = this.img(x, y, 'spark').setBlendMode(ADD).setTint(color).setScale(rand(0.6, 1.2));
      const a = rand(0, Math.PI * 2), d = rand(spread * 0.4, spread);
      this.fade(p, { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - 6, alpha: 0, scale: 0.1 }, rand(260, 460));
    }
  }

  /** Magic impact: coloured flare and sparks. */
  impact(x: number, y: number, color: number, size = 1): void {
    const f = this.img(x, y, 'flare', DEPTH.effects + 2).setBlendMode(ADD).setTint(color).setScale(0.5 * size);
    this.fade(f, { scale: 1.1 * size, alpha: 0, angle: 45 }, 260);
    this.sparks(x, y, color, 5, 22 * size);
  }

  puff(x: number, y: number, color = 0xffffff, scale = 1): void {
    for (let i = 0; i < 5; i++) {
      const p = this.img(x + rand(-9, 9) * scale, y + rand(-8, 4) * scale, 'smoke').setTint(color).setAlpha(0.8).setScale(0.3 * scale);
      this.fade(p, { y: p.y - rand(10, 26) * scale, scale: rand(0.7, 1.0) * scale, alpha: 0 }, rand(380, 650));
    }
  }

  ring(x: number, y: number, radius: number, color: number, duration = 450): void {
    const r = this.img(x, y, 'ring').setBlendMode(ADD).setTint(color).setScale(0.2, 0.1);
    this.fade(r, { scaleX: radius / 28, scaleY: radius / 50, alpha: 0 }, duration);
  }

  heal(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const p = this.img(x + rand(-8, 8), y - rand(5, 25), 'spark').setBlendMode(ADD).setTint(0x7dff8a).setScale(0.9);
      this.fade(p, { y: p.y - 18, alpha: 0 }, 600, i * 80, 'Sine.easeOut');
    }
  }

  frost(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const s = this.img(x, y, 'shard', DEPTH.effects + 1).setAngle(i * 60).setScale(0.8);
      const a = Phaser.Math.DegToRad(i * 60 - 90);
      this.fade(s, { x: x + Math.cos(a) * 20, y: y + Math.sin(a) * 14, alpha: 0, scale: 0.3 }, 420);
    }
    this.impact(x, y, 0xbff4ff, 1.2);
  }

  bubble(x: number, y: number): void {
    const b = this.img(x + rand(-8, 8), y, 'bubble').setScale(rand(0.6, 1));
    this.fade(b, { y: y - rand(14, 24), alpha: 0 }, 600, 0, 'Sine.easeOut');
  }

  coin(x: number, y: number, n = 1): void {
    for (let i = 0; i < Math.min(n, 4); i++) {
      const c = this.img(x + rand(-6, 6), y, 'coinfx', DEPTH.effects + 4).setScale(0.9);
      this.scene.tweens.add({ targets: c, y: y - rand(26, 40), duration: 260, ease: 'Quad.easeOut', yoyo: true, delay: i * 60 });
      this.scene.tweens.add({ targets: c, scaleX: { from: 0.9, to: -0.9 }, duration: 160, repeat: 2, yoyo: true });
      this.fade(c, { alpha: 0 }, 200, 560 + i * 60);
    }
  }

  floatText(x: number, y: number, str: string, color = '#ffd23a', size = 16): void {
    const t = this.scene.add.text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color, stroke: '#1a1208', strokeThickness: 3, resolution: RES })
      .setOrigin(0.5).setDepth(DEPTH.effects + 5).setScale(0.6);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.easeOut' });
    this.fade(t, { y: y - 32, alpha: 0 }, 900, 120);
  }

  lightning(points: Pt[], color = 0xd9a0ff): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.effects + 2).setBlendMode(ADD);
    const jag: Pt[] = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      for (let k = 1; k <= 5; k++) {
        const t = k / 5, j = k === 5 ? 0 : 10;
        jag.push({ x: a.x + (b.x - a.x) * t + rand(-j, j), y: a.y + (b.y - a.y) * t + rand(-j, j) });
      }
    }
    for (const [w, c, al] of [[10, color, 0.25], [5, color, 0.6], [2, 0xffffff, 1]] as [number, number, number][]) {
      g.lineStyle(w, c, al);
      g.beginPath();
      g.moveTo(jag[0].x, jag[0].y);
      for (const p of jag.slice(1)) g.lineTo(p.x, p.y);
      g.strokePath();
    }
    for (const p of points.slice(1)) this.impact(p.x, p.y, color, 0.8);
    this.fade(g, { alpha: 0 }, 280);
  }

  muzzle(x: number, y: number, color: number, size = 1): void {
    const f = this.img(x, y, 'flare', DEPTH.effects + 2).setBlendMode(ADD).setTint(color).setScale(0.35 * size);
    this.fade(f, { scale: 0.8 * size, alpha: 0 }, 180);
  }

  smokePuff(x: number, y: number, dx = 0, dy = -1, size = 1): void {
    for (let i = 0; i < 3; i++) {
      const s = this.img(x, y, 'smoke').setTint(0xd8d4cc).setAlpha(0.7).setScale(0.25 * size);
      this.fade(s, { x: x + dx * rand(8, 16) + rand(-4, 4), y: y + dy * rand(8, 16) - rand(4, 10), scale: 0.7 * size, alpha: 0 }, rand(400, 650), i * 30);
    }
  }

  /** Small licking flame (burning enemies). */
  flame(x: number, y: number): void {
    const f = this.img(x + rand(-6, 6), y + rand(-4, 4), 'glow').setBlendMode(ADD).setTint(Math.random() < 0.5 ? 0xffa22a : 0xff5a1a).setScale(rand(0.18, 0.3));
    this.fade(f, { y: f.y - rand(12, 20), alpha: 0, scaleX: 0.05 }, rand(280, 420));
  }

  /** Frost glyph that appears just before ice spikes erupt. */
  spikesWarn(x: number, y: number, r: number): void {
    const g = this.img(x, y, 'ring', DEPTH.spots + 2).setBlendMode(ADD).setTint(0x9fe8ff).setScale(r / 28, r / 56).setAlpha(0.2);
    this.fade(g, { alpha: 0.9 }, 300, 0, 'Linear');
  }

  spikes(x: number, y: number, r: number): void {
    for (let i = 0; i < 9; i++) {
      const a = rand(0, Math.PI * 2), d = rand(0, r * 0.85);
      const sx = x + Math.cos(a) * d, sy = y + Math.sin(a) * d * 0.5;
      const sp = this.img(sx, sy, 'shard', DEPTH.world + sy + 1).setOrigin(0.5, 1).setScale(0.6, 0).setAngle(rand(-18, 18));
      this.scene.tweens.add({ targets: sp, scaleY: rand(1.2, 1.9), duration: 90, ease: 'Back.easeOut' });
      this.fade(sp, { alpha: 0, scaleY: 0.4 }, 380, 520);
    }
    this.impact(x, y - 6, 0xbff4ff, 1.4);
    this.ring(x, y, r, 0x9fe8ff, 420);
  }

  steam(x: number, y: number, r: number): void {
    for (let i = 0; i < 8; i++) {
      const a = rand(0, Math.PI * 2), d = rand(r * 0.2, r * 0.9);
      const s = this.img(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.55, 'smoke', DEPTH.effects - 1)
        .setTint(Math.random() < 0.5 ? 0xffffff : 0xffd8c0).setAlpha(0.55).setScale(0.4);
      this.fade(s, { y: s.y - rand(14, 26), scale: rand(0.9, 1.3), alpha: 0 }, rand(500, 800));
    }
  }

  shockwave(x: number, y: number, r: number, color: number): void {
    const ring = this.img(x, y, 'ring', DEPTH.spots + 3).setBlendMode(ADD).setTint(color).setScale(0.2, 0.1);
    this.fade(ring, { scaleX: r / 28, scaleY: r / 52, alpha: 0 }, 420);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const d = this.img(x, y, 'debris', DEPTH.effects).setScale(0.8);
      this.fade(d, { x: x + Math.cos(a) * r * 0.8, y: y + Math.sin(a) * r * 0.45 - 6, alpha: 0, angle: 200 }, 420);
    }
  }

  /** Sparks where an energy conduit was cut. */
  linkCut(x: number, y: number): void {
    this.sparks(x, y, 0xff6a6a, 8, 26);
    this.impact(x, y, 0xff5a5a, 0.7);
  }

  /** Enemy death: white flash, sink and fade, plus a dust puff. */
  death(sprite: Phaser.GameObjects.Sprite, x: number, y: number, ghost: boolean): void {
    const s = this.scene;
    const copy = s.add.image(x + sprite.x, y + sprite.y, sprite.texture.key).setOrigin(sprite.originX, sprite.originY)
      .setFlipX(sprite.flipX).setScale(sprite.scaleX, sprite.scaleY).setDepth(DEPTH.world + y);
    copy.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    s.time.delayedCall(70, () => { if (copy.active) copy.setTintMode(Phaser.TintModes.MULTIPLY).setTint(ghost ? 0x9ff7ff : 0x9a9a9a); });
    this.fade(copy, ghost ? { alpha: 0, y: copy.y - 20, scaleX: copy.scaleX * 1.3 } : { alpha: 0, scaleY: copy.scaleY * 0.3, y: copy.y + 2 }, 420, 60, 'Quad.easeIn');
    this.puff(x, y - 6, ghost ? 0x9ff7ff : 0xd8cfc0, 0.9);
  }
}
