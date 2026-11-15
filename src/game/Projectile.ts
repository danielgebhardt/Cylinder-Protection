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
    if (this.trailT <= 0 && (this.o.kind === 'bolt' || this.o.kind === 'rocket' || this.o.kind === 'meteor')) {
      this.trailT = 0.03;
      const tint = this.o.kind === 'bolt' ? (this.o.tint ?? 0xffffff) : this.o.kind === 'rocket' ? 0xbbbbbb : 0xff8a2a;
      const s = this.scene.add.image(x, y, 'puff').setTint(tint).setAlpha(0.5).setScale(this.o.kind === 'meteor' ? 0.8 : 0.3).setDepth(DEPTH.projectile - 1);
      this.scene.tweens.add({ targets: s, alpha: 0, scale: s.scale * 0.3, duration: 300, onComplete: () => s.destroy() });
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
