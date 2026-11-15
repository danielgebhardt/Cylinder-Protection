import * as Phaser from 'phaser';
import { ENEMIES } from '../data/enemies';
import type { EnemyDef } from '../data/enemies';
import { ENEMY_TEX } from '../art/textures';
import { DEPTH } from '../config';
import { rand, randInt } from '../util';
import type { PathLine } from './PathLine';
import type { Soldier } from './Soldier';
import type { GameScene } from '../scenes/GameScene';

let nextId = 1;

export class Enemy {
  readonly id = nextId++;
  readonly def: EnemyDef;
  hp: number;
  maxHp: number;
  d: number;
  x = 0;
  y = 0;
  alive = true;
  blocker: Soldier | null = null;
  /** Damage already in flight towards this enemy (used to avoid overkill). */
  incoming = 0;
  readonly hitHeight: number;

  slowFactor = 1;
  slowT = 0;
  stunT = 0;
  poisonDps = 0;
  poisonT = 0;
  private atkT = 0;
  private healT: number;
  private summonT: number;
  private summonPause = 0;
  private lane: number;
  private phase = Math.random() * 10;
  private flashT = 0;

  readonly view: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Image;
  private hpFg: Phaser.GameObjects.Rectangle;
  private barW: number;
  private flyH: number;

  constructor(private world: GameScene, key: string, readonly path: PathLine, startD = 0, hpMult = 1) {
    this.def = ENEMIES[key];
    this.maxHp = this.hp = Math.round(this.def.hp * hpMult);
    this.d = startD;
    this.lane = this.def.boss ? 0 : rand(-9, 9);
    this.healT = this.def.heals ? this.def.heals.every * rand(0.4, 1) : 0;
    this.summonT = this.def.summons ? this.def.summons.every : 0;
    const tex = ENEMY_TEX[key];
    this.flyH = this.def.flying ? 30 : 0;
    this.hitHeight = tex.h * 0.45 + this.flyH;

    const s = world;
    this.view = s.add.container(0, 0);
    const shadow = s.add.ellipse(0, 0, tex.w * 0.6, 9, 0x000000, this.def.flying ? 0.18 : 0.28);
    this.body = s.add.image(0, -this.flyH, `enemy_${key}`).setOrigin(0.5, 0.95);
    this.barW = this.def.boss ? 64 : 26;
    const barY = -tex.h - this.flyH - 4;
    const hpBg = s.add.rectangle(0, barY, this.barW + 2, 5, 0x1a0a0a).setOrigin(0.5);
    this.hpFg = s.add.rectangle(-this.barW / 2, barY, this.barW, 3, 0x5ad14a).setOrigin(0, 0.5);
    this.view.add([shadow, this.body, hpBg, this.hpFg]);
    this.updatePos();
  }

  get remaining(): number {
    return this.path.length - this.d;
  }

  get flying(): boolean {
    return !!this.def.flying;
  }

  /** Expected damage after resistances, for overkill avoidance. */
  expected(raw: number, type: 'physical' | 'magic'): number {
    return raw * (type === 'physical' ? 1 - this.def.armor : 1 - this.def.mr);
  }

  get doomed(): boolean {
    return this.incoming >= this.hp;
  }

  /** Where this enemy will be after `t` seconds if unobstructed. */
  predict(t: number): { x: number; y: number } {
    if (this.blocker || this.stunT > 0) return { x: this.x, y: this.y };
    const sp = this.def.speed * this.slowFactor;
    const p = this.path.at(this.d + sp * t);
    const n = this.path.dir(this.d + sp * t);
    return { x: p.x - n.y * this.lane, y: p.y + n.x * this.lane };
  }

  private updatePos(): void {
    const p = this.path.at(this.d);
    const n = this.path.dir(this.d);
    const nx = p.x - n.y * this.lane;
    const ny = p.y + n.x * this.lane;
    if (Math.abs(n.x) > 0.15) this.body.setFlipX(n.x < 0);
    this.x = nx; this.y = ny;
    this.view.setPosition(nx, ny);
    this.view.setDepth(DEPTH.world + ny + (this.flying ? 400 : 0));
  }

  update(dt: number): void {
    if (!this.alive) return;
    this.phase += dt;

    // status effects
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.slowFactor = 1; }
    if (this.poisonT > 0) {
      this.poisonT -= dt;
      this.world.damageEnemy(this, this.poisonDps * dt, 'true', true);
      if (!this.alive) return;
    }
    if (this.flashT > 0) this.flashT -= dt;
    this.refreshTint();

    if (this.stunT > 0) { this.stunT -= dt; return; }

    // abilities
    if (this.def.heals) {
      this.healT -= dt;
      if (this.healT <= 0) {
        this.healT = this.def.heals.every;
        this.world.healArea(this, this.def.heals.radius, this.def.heals.amount);
      }
    }
    if (this.def.summons) {
      this.summonT -= dt;
      if (this.summonT <= 0) {
        this.summonT = this.def.summons.every;
        this.summonPause = 1.2;
        for (let i = 0; i < this.def.summons.count; i++) {
          this.world.spawnEnemy(this.def.summons.key, this.path, Math.max(0, this.d - randInt(10, 50)));
        }
        this.world.fx.ring(this.x, this.y, 70, 0xff5a3a, 600);
      }
    }

    // melee with a blocking soldier
    if (this.blocker) {
      if (!this.blocker.alive) { this.blocker = null; }
      else {
        this.animate(dt, false);
        this.atkT -= dt;
        if (this.atkT <= 0 && this.def.dmg[1] > 0) {
          this.atkT = this.def.atkRate;
          this.blocker.takeDamage(randInt(this.def.dmg[0], this.def.dmg[1]));
          this.lunge();
        }
        return;
      }
    }

    if (this.summonPause > 0) { this.summonPause -= dt; this.animate(dt, false); return; }

    this.d += this.def.speed * this.slowFactor * dt;
    this.animate(dt, true);
    this.updatePos();
    if (this.d >= this.path.length) this.world.enemyLeaked(this);
  }

  private animate(_dt: number, moving: boolean): void {
    if (this.flying) {
      this.body.scaleY = 0.8 + Math.abs(Math.sin(this.phase * 9)) * 0.25;
      this.body.y = -this.flyH + Math.sin(this.phase * 3) * 4;
    } else if (moving) {
      const sp = this.def.speed / 10;
      this.body.y = -Math.abs(Math.sin(this.phase * sp)) * 3;
      this.body.rotation = Math.sin(this.phase * sp) * 0.07;
    } else {
      this.body.y = 0;
      this.body.rotation *= 0.9;
    }
  }

  private lunge(): void {
    const dir = this.blocker && this.blocker.x < this.x ? -1 : 1;
    this.world.tweens.add({ targets: this.body, x: 5 * dir, duration: 80, yoyo: true });
  }

  private refreshTint(): void {
    if (this.flashT > 0) this.body.setTint(0xff8a8a);
    else if (this.stunT > 0 && this.frozen) this.body.setTint(0x8fe8ff);
    else if (this.slowT > 0) this.body.setTint(0xb0d8ff);
    else if (this.poisonT > 0) this.body.setTint(0xa8ff9a);
    else this.body.clearTint();
  }

  frozen = false;

  applySlow(factor: number, duration: number): void {
    if (this.def.boss) factor = Math.max(factor, 0.75);
    this.slowFactor = Math.min(this.slowFactor, factor);
    this.slowT = Math.max(this.slowT, duration);
  }

  applyStun(duration: number, frozen = false): void {
    if (this.def.boss) duration *= 0.3;
    this.stunT = Math.max(this.stunT, duration);
    this.frozen = frozen;
  }

  applyPoison(dps: number, duration: number): void {
    this.poisonDps = Math.max(this.poisonDps * (this.poisonT > 0 ? 1 : 0), dps);
    this.poisonT = duration;
  }

  onHit(flash = true): void {
    if (flash) this.flashT = 0.08;
    const pct = Math.max(0, this.hp / this.maxHp);
    this.hpFg.width = this.barW * pct;
    this.hpFg.fillColor = pct > 0.5 ? 0x5ad14a : pct > 0.25 ? 0xf2c14e : 0xe8384a;
  }

  destroy(): void {
    this.alive = false;
    this.view.destroy();
  }
}
