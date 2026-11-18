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

type AnimMode = 'walk' | 'idle' | 'attack';

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
  frozen = false;
  poisonDps = 0;
  poisonT = 0;
  private atkT = 0;
  private healT: number;
  private summonT: number;
  private summonPause = 0;
  private lane: number;
  private phase = Math.random() * 10;
  private flashT = 0;
  private fxT = 0;
  private mode: AnimMode | '' = '';
  private animRate: number;
  private tintState = -1;

  readonly view: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Image | null = null;
  private hpFg: Phaser.GameObjects.Rectangle;
  private hpBg: Phaser.GameObjects.Rectangle;
  private barW: number;
  private flyH: number;

  constructor(private world: GameScene, key: string, readonly path: PathLine, startD = 0, hpMult = 1) {
    this.def = ENEMIES[key];
    this.maxHp = this.hp = Math.round(this.def.hp * hpMult);
    this.d = startD;
    this.lane = this.def.boss ? 0 : rand(-9, 9);
    this.healT = this.def.heals ? this.def.heals.every * rand(0.4, 1) : 0;
    this.summonT = this.def.summons ? this.def.summons.every : 0;
    const t = ENEMY_TEX[key];
    this.flyH = this.def.flying ? 30 : 0;
    this.hitHeight = t.body * 0.55 + this.flyH;
    this.animRate = this.def.flying ? 1.6 : Math.max(0.5, this.def.speed / 50);

    const s = world;
    this.view = s.add.container(0, 0);
    if (this.def.flying || key === 'wraith') {
      this.shadow = s.add.image(0, 0, 'shadow').setScale(t.w / 70, 0.16).setAlpha(0.6);
      this.view.add(this.shadow);
    }
    this.body = s.add.sprite(0, -this.flyH, `enemy_${key}_0`).setOrigin(0.5, (t.h - 2) / t.h);
    this.barW = this.def.boss ? 70 : 28;
    const barY = -t.body - this.flyH - 8;
    this.hpBg = s.add.rectangle(0, barY, this.barW + 3, 6, 0x1a0a0a).setStrokeStyle(1, 0x000000, 0.6);
    this.hpFg = s.add.rectangle(-this.barW / 2, barY, this.barW, 3.5, 0x5ad14a).setOrigin(0, 0.5);
    this.view.add([this.body, this.hpBg, this.hpFg]);
    this.setMode('walk');
    this.updatePos();
    // spawn fade-in
    this.view.setAlpha(0);
    world.tweens.add({ targets: this.view, alpha: 1, duration: 250 });
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

  private setMode(m: AnimMode): void {
    if (this.mode === m) return;
    this.mode = m;
    const k = `enemy_${this.def.key}`;
    if (m === 'walk') this.body.play({ key: `${k}_walk`, startFrame: randInt(0, 3) });
    else if (m === 'attack') {
      this.body.play(`${k}_attack`);
      this.body.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => { if (this.mode === 'attack') this.mode = 'idle'; });
    } else { this.body.anims.stop(); this.body.setTexture(`${k}_0`); }
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
      this.fxT -= dt;
      if (this.fxT <= 0) { this.fxT = 0.35; this.world.fx.bubble(this.x, this.y - this.hitHeight); }
    }
    if (this.flashT > 0) this.flashT -= dt;
    this.refreshTint();
    this.body.anims.timeScale = this.animRate * this.slowFactor;

    if (this.stunT > 0) {
      this.stunT -= dt;
      this.body.anims.pause();
      if (this.stunT <= 0) { this.frozen = false; this.body.anims.resume(); }
      return;
    }

    // abilities
    if (this.def.heals) {
      this.healT -= dt;
      if (this.healT <= 0) {
        this.healT = this.def.heals.every;
        this.world.healArea(this, this.def.heals.radius, this.def.heals.amount);
        this.setMode('attack');
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
        this.world.fx.ring(this.x, this.y, 80, 0xff5a3a, 600);
        this.world.fx.explosion(this.x, this.y - 30, 30, 0xff3a1a);
        this.setMode('attack');
      }
    }

    // melee with a blocking soldier
    if (this.blocker) {
      if (!this.blocker.alive) { this.blocker = null; }
      else {
        if (this.mode === 'walk') this.setMode('idle');
        this.body.setFlipX(this.blocker.x < this.x);
        this.atkT -= dt;
        if (this.atkT <= 0 && this.def.dmg[1] > 0) {
          this.atkT = this.def.atkRate;
          this.mode = '';
          this.setMode('attack');
          this.world.time.delayedCall(140, () => {
            if (this.alive && this.blocker?.alive) {
              this.blocker.takeDamage(randInt(this.def.dmg[0], this.def.dmg[1]));
              this.world.fx.sparks(this.blocker.x, this.blocker.y - 16, 0xffe0a0, 3, 12);
            }
          });
        }
        this.animateFly();
        return;
      }
    }

    if (this.summonPause > 0) { this.summonPause -= dt; return; }

    this.d += this.def.speed * this.slowFactor * dt;
    if (this.mode !== 'attack') this.setMode('walk');
    this.animateFly();
    this.updatePos();
    if (this.d >= this.path.length) this.world.enemyLeaked(this);
  }

  private animateFly(): void {
    if (this.flying) {
      this.body.y = -this.flyH + Math.sin(this.phase * 3) * 4;
      if (this.shadow) this.shadow.setScale(this.shadow.scaleX, 0.16 - Math.sin(this.phase * 3) * 0.02);
    } else if (this.def.key === 'wraith') {
      this.body.y = Math.sin(this.phase * 2.5) * 2.5 - 3;
    }
  }

  /** 0 normal, 1 flash, 2 frozen, 3 slowed, 4 poisoned */
  private refreshTint(): void {
    const st = this.flashT > 0 ? 1 : this.stunT > 0 && this.frozen ? 2 : this.slowT > 0 ? 3 : this.poisonT > 0 ? 4 : 0;
    if (st === this.tintState) return;
    this.tintState = st;
    const b = this.body;
    if (st === 1) b.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    else {
      b.setTintMode(Phaser.TintModes.MULTIPLY);
      if (st === 2) b.setTint(0x8fe8ff);
      else if (st === 3) b.setTint(0xb8dcff);
      else if (st === 4) b.setTint(0xa8ff9a);
      else b.clearTint();
    }
  }

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
    if (flash) this.flashT = 0.06;
    const pct = Math.max(0, this.hp / this.maxHp);
    this.hpFg.width = this.barW * pct;
    this.hpFg.fillColor = pct > 0.5 ? 0x5ad14a : pct > 0.25 ? 0xf2c14e : 0xe8384a;
  }

  destroy(): void {
    this.alive = false;
    this.view.destroy();
  }
}
