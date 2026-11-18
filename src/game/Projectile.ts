import * as Phaser from 'phaser';
import { DEPTH } from '../config';
import type { Enemy } from './Enemy';

export type ProjKind = 'fireball' | 'ice' | 'boulder' | 'plasma' | 'glob';

interface KindStyle {
  tex: string;
  tint?: number;
  glow?: boolean;          // additive blending
  rotate?: 'face' | 'spin' | 'none';
  trail?: { tex: string; tint: number; add: boolean; every: number; scale: number; life: number };
}

const STYLE: Record<ProjKind, KindStyle> = {
  fireball: { tex: 'bolt', tint: 0xff8a2a, glow: true, rotate: 'none', trail: { tex: 'glow', tint: 0xff6a1a, add: true, every: 0.025, scale: 0.4, life: 300 } },
  ice: { tex: 'iceshard', rotate: 'face', trail: { tex: 'spark', tint: 0xbff4ff, add: true, every: 0.04, scale: 0.7, life: 250 } },
  boulder: { tex: 'boulder', rotate: 'spin', trail: { tex: 'smoke', tint: 0xb8a080, add: false, every: 0.06, scale: 0.25, life: 350 } },
  plasma: { tex: 'bolt', tint: 0xffc0f8, glow: true, rotate: 'none', trail: { tex: 'glow', tint: 0xff70e0, add: true, every: 0.02, scale: 0.22, life: 200 } },
  glob: { tex: 'magmaglob', rotate: 'spin', trail: { tex: 'glow', tint: 0xff5a1a, add: true, every: 0.03, scale: 0.35, life: 320 } },
};

export interface ProjOpts {
  kind: ProjKind;
  x: number; y: number;
  target?: Enemy | null;     // homing target
  tx?: number; ty?: number;  // fixed landing point (if no target)
  speed: number;             // px/s used to derive flight time
  arc: number;               // arc height in px
  scale?: number;
  onArrive: (x: number, y: number, target: Enemy | null) => void;
}

/** Projectiles move from start to target over a fixed flight time with an optional arc, so they always land. */
export class Projectile {
  sprite: Phaser.GameObjects.Image;
  private sx: number; private sy: number;
  private tx: number; private ty: number;
  private t = 0;
  private dur: number;
  private prevX: number; private prevY: number;
  private trailT = 0;
  private style: KindStyle;
  done = false;

  constructor(private scene: Phaser.Scene, private o: ProjOpts) {
    this.style = STYLE[o.kind];
    this.sx = o.x; this.sy = o.y;
    this.tx = o.target ? o.target.x : o.tx ?? o.x;
    this.ty = o.target ? o.target.y - o.target.hitHeight : o.ty ?? o.y;
    this.dur = Math.max(0.12, Math.hypot(this.tx - this.sx, this.ty - this.sy) / o.speed);
    this.sprite = scene.add.image(o.x, o.y, this.style.tex).setDepth(DEPTH.projectile).setScale(o.scale ?? 1);
    if (this.style.tint !== undefined) this.sprite.setTint(this.style.tint);
    if (this.style.glow) this.sprite.setBlendMode(Phaser.BlendModes.ADD);
    this.prevX = o.x; this.prevY = o.y;
  }

  update(dt: number): void {
    if (this.done) return;
    const tgt = this.o.target;
    if (tgt && tgt.alive) { this.tx = tgt.x; this.ty = tgt.y - tgt.hitHeight; }
    this.t += dt;
    const p = Math.min(1, this.t / this.dur);
    const x = this.sx + (this.tx - this.sx) * p;
    const y = this.sy + (this.ty - this.sy) * p - Math.sin(p * Math.PI) * this.o.arc;
    this.sprite.setPosition(x, y);
    if (this.style.rotate === 'face') this.sprite.rotation = Math.atan2(y - this.prevY, x - this.prevX);
    else if (this.style.rotate === 'spin') this.sprite.rotation += dt * 7;
    this.prevX = x; this.prevY = y;

    const tr = this.style.trail;
    if (tr) {
      this.trailT -= dt;
      if (this.trailT <= 0) {
        this.trailT = tr.every;
        const g = this.scene.add.image(x, y, tr.tex).setTint(tr.tint).setAlpha(0.7).setScale(tr.scale * (this.o.scale ?? 1)).setDepth(DEPTH.projectile - 1);
        if (tr.add) g.setBlendMode(Phaser.BlendModes.ADD);
        this.scene.tweens.add({ targets: g, alpha: 0, scale: g.scale * (tr.add ? 0.3 : 2), duration: tr.life, onComplete: () => g.destroy() });
      }
    }

    if (p >= 1) {
      this.done = true;
      this.sprite.destroy();
      const hit = tgt && tgt.alive ? tgt : null;
      this.o.onArrive(hit ? hit.x : this.tx, hit ? hit.y : this.ty + (tgt ? tgt.hitHeight : 0), hit);
    }
  }

  destroy(): void {
    this.done = true;
    this.sprite.destroy();
  }
}
