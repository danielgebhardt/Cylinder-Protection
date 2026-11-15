import * as Phaser from 'phaser';
import { DEPTH, FONT } from '../config';
import { rand } from '../util';
import type { Pt } from '../util';

/** Short-lived visual effects, all tween driven (tweens follow the game speed). */
export class Effects {
  constructor(private scene: Phaser.Scene) {}

  explosion(x: number, y: number, radius: number, color = 0xffa22a): void {
    const s = this.scene;
    const ring = s.add.circle(x, y, radius, color, 0.35).setDepth(DEPTH.effects).setScale(0.2);
    ring.setStrokeStyle(4, 0xffe08a, 0.9);
    s.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    const core = s.add.image(x, y, 'puff').setTint(0xfff2b0).setDepth(DEPTH.effects + 1).setScale(radius / 30);
    s.tweens.add({ targets: core, scale: radius / 14, alpha: 0, duration: 260, onComplete: () => core.destroy() });
    for (let i = 0; i < 7; i++) {
      const p = s.add.image(x + rand(-radius, radius) * 0.4, y + rand(-radius, radius) * 0.3, 'puff')
        .setTint(Phaser.Utils.Array.GetRandom([0x6a6a6a, 0x8a8a8a, 0x4a4a4a])).setAlpha(0.7).setScale(rand(0.5, 1.0)).setDepth(DEPTH.effects);
      s.tweens.add({ targets: p, y: p.y - rand(20, 45), scale: p.scale * 1.8, alpha: 0, duration: rand(500, 900), onComplete: () => p.destroy() });
    }
    // scorch mark
    const scorch = s.add.ellipse(x, y + 2, radius * 1.2, radius * 0.6, 0x000000, 0.25).setDepth(DEPTH.spots + 1);
    s.tweens.add({ targets: scorch, alpha: 0, duration: 2500, delay: 500, onComplete: () => scorch.destroy() });
  }

  sparks(x: number, y: number, color: number, n = 6, spread = 28): void {
    const s = this.scene;
    for (let i = 0; i < n; i++) {
      const p = s.add.image(x, y, 'spark').setTint(color).setScale(rand(0.4, 0.9)).setDepth(DEPTH.effects);
      const a = rand(0, Math.PI * 2), d = rand(spread * 0.4, spread);
      s.tweens.add({ targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scale: 0.1, duration: rand(250, 450), onComplete: () => p.destroy() });
    }
  }

  puff(x: number, y: number, color = 0xffffff, scale = 1): void {
    const s = this.scene;
    for (let i = 0; i < 4; i++) {
      const p = s.add.image(x + rand(-8, 8), y + rand(-8, 4), 'puff').setTint(color).setAlpha(0.8).setScale(0.4 * scale).setDepth(DEPTH.effects);
      s.tweens.add({ targets: p, y: p.y - rand(10, 25), scale: rand(0.8, 1.2) * scale, alpha: 0, duration: rand(350, 600), onComplete: () => p.destroy() });
    }
  }

  ring(x: number, y: number, radius: number, color: number, duration = 450): void {
    const s = this.scene;
    const r = s.add.circle(x, y, radius).setStrokeStyle(3, color, 0.9).setDepth(DEPTH.effects).setScale(0.3);
    s.tweens.add({ targets: r, scale: 1, alpha: 0, duration, onComplete: () => r.destroy() });
  }

  floatText(x: number, y: number, str: string, color = '#ffd23a', size = 16): void {
    const s = this.scene;
    const t = s.add.text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color, stroke: '#1a1208', strokeThickness: 3 })
      .setOrigin(0.5).setDepth(DEPTH.effects + 5);
    s.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 900, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  lightning(points: Pt[], color = 0xd9a0ff): void {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.effects + 2);
    for (const [w, c, a] of [[7, color, 0.35], [3, 0xffffff, 1]] as [number, number, number][]) {
      g.lineStyle(w, c, a);
      g.beginPath();
      g.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const a0 = points[i - 1], b = points[i];
        const segs = 4;
        for (let k = 1; k <= segs; k++) {
          const t = k / segs;
          const jitter = k === segs ? 0 : 9;
          g.lineTo(a0.x + (b.x - a0.x) * t + rand(-jitter, jitter), a0.y + (b.y - a0.y) * t + rand(-jitter, jitter));
        }
      }
      g.strokePath();
    }
    s.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  }

  muzzle(x: number, y: number, color: number): void {
    const s = this.scene;
    const f = s.add.image(x, y, 'puff').setTint(color).setScale(0.5).setDepth(DEPTH.effects);
    s.tweens.add({ targets: f, scale: 1.1, alpha: 0, duration: 220, onComplete: () => f.destroy() });
  }
}
