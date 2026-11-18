import * as Phaser from 'phaser';
import { DEPTH } from '../config';
import type { Enemy } from './Enemy';

export type ProjKind = 'arrow' | 'bolt' | 'shell' | 'rocket' | 'bomblet' | 'meteor';

export interface ProjOpts {
  kind: ProjKind;
  x: number; y: number;
  target?: Enemy | null;     // homing target
  tx?: number; ty?: number;  // fixed landing point (if no target)
  speed: number;             // px/s used to derive flight time
  arc: number;               // arc height in px
  tint?: number;
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
  done = false;

  constructor(private scene: Phaser.Scene, private o: ProjOpts) {
    this.sx = o.x; this.sy = o.y;
    this.tx = o.target ? o.target.x : o.tx ?? o.x;
    this.ty = o.target ? o.target.y - o.target.hitHeight : o.ty ?? o.y;
    const d = Math.hypot(this.tx - this.sx, this.ty - this.sy);
    this.dur = Math.max(0.12, d / o.speed);
    const tex = o.kind === 'arrow' ? 'arrow' : o.kind === 'bolt' ? 'bolt' : o.kind === 'rocket' ? 'rocketp' : o.kind === 'meteor' ? 'meteor' : 'shell';
    this.sprite = scene.add.image(o.x, o.y, tex).setDepth(DEPTH.projectile);
    if (o.tint !== undefined) this.sprite.setTint(o.tint);
    if (o.kind === 'bolt' || o.kind === 'meteor') this.sprite.setBlendMode(Phaser.BlendModes.ADD);
    if (o.scale) this.sprite.setScale(o.scale);
    if (o.kind === 'bomblet') this.sprite.setScale(0.6);
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
    if (this.o.kind !== 'bolt' && this.o.kind !== 'shell' && this.o.kind !== 'bomblet') {
      this.sprite.rotation = Math.atan2(y - this.prevY, x - this.prevX);
    } else if (this.o.kind === 'shell' || this.o.kind === 'bomblet') {
      this.sprite.rotation += dt * 8;
    }
    this.prevX = x; this.prevY = y;

    this.trailT -= dt;
    const k = this.o.kind;
    if (this.trailT <= 0 && (k === 'bolt' || k === 'rocket' || k === 'meteor')) {
      this.trailT = k === 'meteor' ? 0.02 : 0.03;
      if (k === 'bolt' || k === 'meteor') {
        const g = this.scene.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(k === 'bolt' ? (this.o.tint ?? 0xffffff) : 0xff8a2a)
          .setAlpha(0.7).setScale(k === 'meteor' ? 0.7 : 0.28).setDepth(DEPTH.projectile - 1);
        this.scene.tweens.add({ targets: g, alpha: 0, scale: g.scale * 0.3, duration: k === 'meteor' ? 380 : 260, onComplete: () => g.destroy() });
      }
      if (k === 'rocket' || k === 'meteor') {
        const sm = this.scene.add.image(x, y, 'smoke').setTint(k === 'meteor' ? 0x5a4a40 : 0xcfcac2).setAlpha(0.55).setScale(k === 'meteor' ? 0.5 : 0.22).setDepth(DEPTH.projectile - 2);
        this.scene.tweens.add({ targets: sm, alpha: 0, scale: sm.scale * 2.2, y: y - 8, duration: k === 'meteor' ? 700 : 500, onComplete: () => sm.destroy() });
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
