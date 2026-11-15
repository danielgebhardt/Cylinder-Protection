import * as Phaser from 'phaser';
import { DEPTH } from '../config';
import { dist, randInt } from '../util';
import type { Enemy } from './Enemy';
import type { Tower } from './Tower';
import type { GameScene } from '../scenes/GameScene';

export interface SoldierStats {
  hp: number;
  dmg: [number, number];
  armor: number;
  rate: number;
  look: string;
  respawn: number;
}

const SPEED = 105;

export class Soldier {
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  target: Enemy | null = null;
  alive = true;
  removed = false;
  private atkT = 0;
  private respawnT = 0;
  private walkPhase = Math.random() * 6;

  readonly view: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Image;
  private hpFg: Phaser.GameObjects.Rectangle;
  private hpBg: Phaser.GameObjects.Rectangle;

  constructor(
    private world: GameScene,
    public stats: SoldierStats,
    x: number, y: number,
    homeX: number, homeY: number,
    readonly owner: Tower | null,
    readonly engageRadius: number,
    private lifeT = Infinity,
  ) {
    this.maxHp = this.hp = stats.hp;
    this.x = x; this.y = y; this.homeX = homeX; this.homeY = homeY;
    const s = world;
    this.view = s.add.container(x, y);
    const shadow = s.add.ellipse(0, 0, 20, 7, 0x000000, 0.3);
    this.body = s.add.image(0, 0, `soldier_${stats.look}`).setOrigin(0.5, 0.95);
    this.hpBg = s.add.rectangle(0, -42, 22, 4, 0x1a0a0a);
    this.hpFg = s.add.rectangle(-10, -42, 20, 2.5, 0x4ab0ff).setOrigin(0, 0.5);
    this.view.add([shadow, this.body, this.hpBg, this.hpFg]);
    this.refreshBar();
  }

  setStats(stats: SoldierStats): void {
    this.stats = stats;
    this.body.setTexture(`soldier_${stats.look}`);
    this.maxHp = stats.hp;
    if (this.alive) this.hp = stats.hp;
    this.refreshBar();
  }

  setHome(x: number, y: number): void {
    this.homeX = x; this.homeY = y;
    this.release();
  }

  takeDamage(n: number): void {
    if (!this.alive) return;
    this.hp -= n * (1 - this.stats.armor);
    this.refreshBar();
    if (this.hp <= 0) this.die();
  }

  private die(): void {
    this.alive = false;
    this.release();
    this.world.fx.puff(this.x, this.y - 12, 0xdddddd, 0.7);
    this.view.setVisible(false);
    this.respawnT = this.stats.respawn;
    if (!this.owner) this.removed = true;
  }

  release(): void {
    if (this.target && this.target.blocker === this) this.target.blocker = null;
    this.target = null;
  }

  private refreshBar(): void {
    const pct = Math.max(0, this.hp / this.maxHp);
    this.hpFg.width = 20 * pct;
    const show = pct < 0.999;
    this.hpFg.setVisible(show);
    this.hpBg.setVisible(show);
  }

  private moveTo(tx: number, ty: number, dt: number): boolean {
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) return true;
    const step = Math.min(d, SPEED * dt);
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    if (Math.abs(dx) > 1) this.body.setFlipX(dx < 0);
    this.walkPhase += dt * 14;
    this.body.y = -Math.abs(Math.sin(this.walkPhase)) * 3;
    return d - step < 2;
  }

  update(dt: number): void {
    if (this.removed) return;
    if (!this.alive) {
      if (!this.owner) return;
      this.respawnT -= dt;
      if (this.respawnT <= 0) {
        this.alive = true;
        this.hp = this.maxHp;
        this.x = this.owner.x; this.y = this.owner.y + 6;
        this.view.setVisible(true);
        this.refreshBar();
      }
      return;
    }

    this.lifeT -= dt;
    if (this.lifeT <= 0) {
      this.release();
      this.world.fx.puff(this.x, this.y - 12, 0xffffff, 0.7);
      this.alive = false;
      this.removed = true;
      this.view.destroy();
      return;
    }

    const t = this.target;
    if (t && (!t.alive || t.flying || dist(t.x, t.y, this.homeX, this.homeY) > this.engageRadius + 35)) this.release();

    if (!this.target || (this.target.blocker && this.target.blocker !== this)) {
      const c = this.world.findSoldierTarget(this.homeX, this.homeY, this.engageRadius, this);
      if (c && c !== this.target) { this.release(); this.target = c; }
    }

    const tgt = this.target;
    if (tgt) {
      const side = this.x < tgt.x ? -1 : 1;
      const gx = tgt.x + side * (tgt.def.radius + 6);
      const gy = tgt.y + 2;
      const arrived = this.moveTo(gx, gy, dt);
      if (arrived && !tgt.blocker) tgt.blocker = this;
      if (dist(this.x, this.y, tgt.x, tgt.y) < tgt.def.radius + 16) {
        this.body.setFlipX(tgt.x < this.x);
        if (arrived) this.body.y = 0;
        this.atkT -= dt;
        if (this.atkT <= 0) {
          this.atkT = this.stats.rate;
          this.attack(tgt);
        }
      }
    } else {
      const home = this.moveTo(this.homeX, this.homeY, dt);
      if (home) {
        this.body.y = 0;
        if (this.hp < this.maxHp) { this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.08 * dt); this.refreshBar(); }
      }
    }
    this.view.setPosition(this.x, this.y);
    this.view.setDepth(DEPTH.world + this.y);
  }

  private attack(tgt: Enemy): void {
    const dmg = randInt(this.stats.dmg[0], this.stats.dmg[1]);
    this.world.damageEnemy(tgt, dmg, 'physical');
    this.world.fx.sparks(tgt.x, tgt.y - 14, 0xffffff, 3, 14);
    this.world.sfxSword();
    const dir = tgt.x < this.x ? -1 : 1;
    this.world.tweens.add({ targets: this.body, x: 5 * dir, angle: 12 * dir, duration: 70, yoyo: true });

    const o = this.owner;
    if (o && o.spec.skill && o.skillRank > 0) {
      if (o.spec.skill.id === 'bash' && Math.random() < [0.12, 0.22, 0.32][o.skillRank - 1] && tgt.alive) {
        tgt.applyStun(1.5);
        this.world.fx.floatText(tgt.x, tgt.y - 40, 'BASH!', '#9fd8ff', 14);
      }
      if (o.spec.skill.id === 'cleave') {
        const pct = [0.3, 0.5, 0.7][o.skillRank - 1];
        for (const e of this.world.enemies) {
          if (e !== tgt && e.alive && !e.flying && dist(e.x, e.y, tgt.x, tgt.y) < 45) this.world.damageEnemy(e, dmg * pct, 'physical');
        }
      }
    }
  }

  destroy(): void {
    this.release();
    this.removed = true;
    this.alive = false;
    this.view.destroy();
  }
}
