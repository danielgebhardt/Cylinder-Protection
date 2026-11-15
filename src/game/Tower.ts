import * as Phaser from 'phaser';
import { TOWERS, SELL_RATIO } from '../data/towers';
import type { TowerSpec } from '../data/towers';
import { TOWER_TEX } from '../art/textures';
import { DEPTH } from '../config';
import { dist, rand, randInt } from '../util';
import type { Pt } from '../util';
import { Soldier } from './Soldier';
import type { SoldierStats } from './Soldier';
import type { Enemy } from './Enemy';
import { Projectile } from './Projectile';
import type { GameScene } from '../scenes/GameScene';
import { sfx } from '../audio';

export interface Spot {
  x: number;
  y: number;
  tower: Tower | null;
  image: Phaser.GameObjects.Image;
}

const FORMATION: Pt[] = [{ x: 0, y: -14 }, { x: -17, y: 9 }, { x: 17, y: 9 }];

export class Tower {
  spec: TowerSpec;
  skillRank = 0;
  spent: number;
  soldiers: Soldier[] = [];
  rally: Pt = { x: 0, y: 0 };
  private cd = 0.4;
  readonly image: Phaser.GameObjects.Image;

  constructor(private world: GameScene, readonly spot: Spot, specId: string) {
    this.spec = TOWERS[specId];
    this.spent = this.spec.cost;
    this.image = world.add.image(spot.x, spot.y + 6, `tower_${specId}`).setOrigin(TOWER_TEX.ox, TOWER_TEX.oy);
    this.image.setDepth(DEPTH.world + spot.y);
    spot.image.setVisible(false);
    this.popIn();
    if (this.spec.soldiers) {
      this.rally = world.defaultRally(spot.x, spot.y, this.spec.range);
      this.syncSoldiers();
    }
  }

  get x(): number { return this.spot.x; }
  get y(): number { return this.spot.y; }

  get sellValue(): number {
    return Math.round(this.spent * SELL_RATIO);
  }

  private popIn(): void {
    this.image.setScale(0.6, 0.3);
    this.world.tweens.add({ targets: this.image, scaleX: 1, scaleY: 1, duration: 350, ease: 'Back.easeOut' });
    this.world.fx.puff(this.x, this.y + 4, 0xd9c19a, 1.3);
  }

  upgradeTo(id: string): void {
    this.spec = TOWERS[id];
    this.spent += this.spec.cost;
    this.image.setTexture(`tower_${id}`);
    this.popIn();
    if (this.spec.soldiers) this.syncSoldiers();
  }

  upgradeSkill(): void {
    const sk = this.spec.skill;
    if (!sk || this.skillRank >= 3) return;
    this.spent += sk.costs[this.skillRank];
    this.skillRank++;
    this.world.fx.sparks(this.x, this.y - 50, 0xffd23a, 10, 40);
  }

  private soldierStats(): SoldierStats {
    const s = this.spec.soldiers!;
    return { hp: s.hp, dmg: s.dmg, armor: s.armor, rate: s.rate, look: s.look, respawn: s.respawn };
  }

  private syncSoldiers(): void {
    const st = this.soldierStats();
    const count = this.spec.soldiers!.count;
    for (const s of this.soldiers) s.setStats(st);
    while (this.soldiers.length < count) {
      const i = this.soldiers.length;
      const f = FORMATION[i % FORMATION.length];
      this.soldiers.push(this.world.addSoldier(new Soldier(this.world, st, this.x, this.y + 6, this.rally.x + f.x, this.rally.y + f.y, this, 75)));
    }
  }

  setRally(x: number, y: number): void {
    this.rally = { x, y };
    this.soldiers.forEach((s, i) => {
      const f = FORMATION[i % FORMATION.length];
      s.setHome(x + f.x, y + f.y);
    });
  }

  update(dt: number): void {
    if (this.spec.kind === 'barracks') return;
    this.cd -= dt;
    if (this.cd > 0) return;
    const target = this.world.pickTarget(this.x, this.y, this.spec.range, this.spec.hitsAir);
    if (!target) { this.cd = 0.1; return; }
    this.cd = this.spec.rate;
    this.recoil();
    switch (this.spec.kind) {
      case 'archer': this.fireArrow(target); break;
      case 'mage': this.fireBolt(target); break;
      case 'cannon': this.spec.id === 'rocket' ? this.fireRockets(target) : this.fireShell(target); break;
    }
  }

  private recoil(): void {
    this.world.tweens.add({ targets: this.image, scaleY: 0.93, scaleX: 1.04, duration: 70, yoyo: true });
  }

  private rollDmg(): number {
    return randInt(this.spec.dmg[0], this.spec.dmg[1]);
  }

  private fireArrow(target: Enemy): void {
    const spec = this.spec;
    const top = spec.tier >= 4 ? 70 : 60;
    {
      const dmgRoll = this.rollDmg();
      const exp = target.expected(dmgRoll, 'physical');
      target.incoming += exp;
      this.world.addProjectile(new Projectile(this.world, {
        kind: 'arrow', x: this.x + rand(-6, 6), y: this.y - top, target, speed: spec.id === 'marksman' ? 900 : 620, arc: spec.id === 'marksman' ? 8 : 26,
        onArrive: (_x, _y, hit) => {
          target.incoming = Math.max(0, target.incoming - exp);
          if (!hit) return;
          let dmg = dmgRoll;
          if (spec.skill?.id === 'headshot' && this.skillRank > 0 && Math.random() < [0.08, 0.14, 0.2][this.skillRank - 1]) {
            if (hit.def.boss) dmg *= 4; else dmg = hit.hp / Math.max(0.05, 1 - hit.def.armor) + 1;
            this.world.fx.floatText(hit.x, hit.y - 44, 'HEADSHOT!', '#ff5a5a', 15);
          }
          this.world.damageEnemy(hit, dmg, 'physical');
          if (spec.skill?.id === 'poison' && this.skillRank > 0 && hit.alive) hit.applyPoison([6, 12, 18][this.skillRank - 1], 3);
          this.world.sfxHit();
        },
      }));
    }
    sfx.arrow();
  }

  private fireBolt(target: Enemy): void {
    const spec = this.spec;
    const color = spec.id === 'frost' ? 0x8fe8ff : spec.id === 'arcane' ? 0xe39bff : 0xffd36e;
    const sy = this.y - (spec.tier >= 4 ? 118 : 100 + spec.tier * 4);
    this.world.fx.muzzle(this.x, sy, color);
    const dmgRoll = this.rollDmg();
    const exp = target.expected(dmgRoll, 'magic');
    target.incoming += exp;
    this.world.addProjectile(new Projectile(this.world, {
      kind: 'bolt', x: this.x, y: sy, target, speed: 440, arc: 0, tint: color,
      onArrive: (x, y, hit) => {
        target.incoming = Math.max(0, target.incoming - exp);
        this.world.fx.sparks(x, y - (hit ? hit.hitHeight : 0), color, 6, 22);
        if (!hit) return;
        this.world.damageEnemy(hit, dmgRoll, 'magic');
        if (spec.slow && hit.alive) hit.applySlow(spec.slow.factor, spec.slow.duration);
        if (spec.skill?.id === 'freeze' && this.skillRank > 0 && hit.alive && Math.random() < [0.12, 0.2, 0.28][this.skillRank - 1]) {
          hit.applyStun(1.5, true);
          this.world.fx.ring(hit.x, hit.y - 10, 26, 0xbff4ff);
        }
        if (spec.skill?.id === 'chain' && this.skillRank > 0) this.chain(hit, this.skillRank + 1);
      },
    }));
    if (spec.id === 'frost') sfx.frost(); else sfx.magic();
  }

  private chain(from: Enemy, jumps: number): void {
    const hitSet = new Set<Enemy>([from]);
    const pts: Pt[] = [{ x: from.x, y: from.y - from.hitHeight }];
    let cur = from;
    for (let j = 0; j < jumps; j++) {
      let best: Enemy | null = null, bd = 95;
      for (const e of this.world.enemies) {
        if (!e.alive || hitSet.has(e)) continue;
        const d = dist(e.x, e.y, cur.x, cur.y);
        if (d < bd) { bd = d; best = e; }
      }
      if (!best) break;
      hitSet.add(best);
      pts.push({ x: best.x, y: best.y - best.hitHeight });
      this.world.damageEnemy(best, this.rollDmg() * 0.6, 'magic');
      cur = best;
    }
    if (pts.length > 1) { this.world.fx.lightning(pts); sfx.zap(); }
  }

  private fireShell(target: Enemy): void {
    const spec = this.spec;
    const flight = spec.id === 'mortar' ? 1.1 : 0.9;
    const aim = target.predict(flight);
    const sy = this.y - 40;
    const d = Math.hypot(aim.x - this.x, aim.y - sy);
    this.world.fx.muzzle(this.x + 10, sy - 6, 0xdddddd);
    this.world.addProjectile(new Projectile(this.world, {
      kind: 'shell', x: this.x + 8, y: sy - 4, tx: aim.x, ty: aim.y, speed: d / flight, arc: 120, scale: spec.id === 'mortar' ? 1.5 : 1,
      onArrive: (x, y) => {
        this.world.explode(x, y, spec.splash ?? 50, this.rollDmg(), false);
        if (spec.skill?.id === 'cluster' && this.skillRank > 0) {
          const n = [3, 5, 7][this.skillRank - 1];
          for (let i = 0; i < n; i++) {
            const a = rand(0, Math.PI * 2), r = rand(35, 85);
            const bx = x + Math.cos(a) * r, by = y + Math.sin(a) * r * 0.7;
            this.world.addProjectile(new Projectile(this.world, {
              kind: 'bomblet', x, y: y - 10, tx: bx, ty: by, speed: 220, arc: 50,
              onArrive: (qx, qy) => this.world.explode(qx, qy, 35, randInt(18, 28), false, true),
            }));
          }
        }
      },
    }));
    sfx.cannon();
  }

  private fireRockets(target: Enemy): void {
    const spec = this.spec;
    const targets = [target];
    const other = this.world.pickTarget(this.x, this.y, spec.range, true, target);
    targets.push(other ?? target);
    targets.forEach((t, i) => {
      this.world.addProjectile(new Projectile(this.world, {
        kind: 'rocket', x: this.x - 8 + i * 16, y: this.y - 70, target: t, speed: 380, arc: 50 + i * 20,
        onArrive: (x, y) => {
          this.world.explode(x, y, spec.splash ?? 40, this.rollDmg(), true, true);
          if (spec.skill?.id === 'napalm' && this.skillRank > 0) this.world.addFire(x, y, 42, [10, 18, 26][this.skillRank - 1], 4);
        },
      }));
    });
    sfx.rocket();
  }

  destroy(): void {
    this.soldiers.forEach(s => s.destroy());
    this.soldiers = [];
    this.image.destroy();
    this.spot.image.setVisible(true);
  }
}
