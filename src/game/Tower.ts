import * as Phaser from 'phaser';
import { TOWERS, SELL_RATIO } from '../data/towers';
import type { TowerSpec } from '../data/towers';
import { TOWER_TEX, TOWER_PARTS } from '../art/textures';
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
const ADD = Phaser.BlendModes.ADD;
const MAGIC_COLOR: Record<string, number> = { frost: 0x8fe8ff, arcane: 0xe39bff };

export class Tower {
  spec: TowerSpec;
  skillRank = 0;
  spent: number;
  soldiers: Soldier[] = [];
  rally: Pt = { x: 0, y: 0 };
  private cd = 0.4;
  private shot = 0;
  private phase = Math.random() * 6;
  readonly image: Phaser.GameObjects.Image;
  private parts: Phaser.GameObjects.GameObject[] = [];
  private weapons: Phaser.GameObjects.Sprite[] = [];
  private orbGlow: Phaser.GameObjects.Image | null = null;
  private aim = 0;

  constructor(private world: GameScene, readonly spot: Spot, specId: string) {
    this.spec = TOWERS[specId];
    this.spent = this.spec.cost;
    this.image = world.add.image(spot.x, spot.y + 6, `tower_${specId}`).setOrigin(TOWER_TEX.ox, TOWER_TEX.oy);
    this.image.setDepth(DEPTH.world + spot.y);
    spot.image.setVisible(false);
    this.buildParts();
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

  /** Ground anchor that TOWER_PARTS offsets are relative to. */
  private get ax(): number { return this.spot.x; }
  private get ay(): number { return this.spot.y + 6; }

  private buildParts(): void {
    for (const p of this.parts) p.destroy();
    this.parts = []; this.weapons = []; this.orbGlow = null;
    const parts = TOWER_PARTS[this.spec.id];
    if (!parts) return;
    const depth = this.image.depth;
    const w = this.world;
    if (parts.flag) {
      const key = `flag_${parts.flag.color.slice(1)}`;
      const f = w.add.sprite(this.ax + parts.flag.x, this.ay + parts.flag.y, `${key}_0`).setOrigin(0.04, 0.12).setDepth(depth + 0.1);
      f.play({ key, startFrame: randInt(0, 3) });
      this.parts.push(f);
    }
    for (const m of parts.mounts) {
      const x = this.ax + m.x, y = this.ay + m.y;
      let s: Phaser.GameObjects.Sprite;
      switch (parts.weapon) {
        case 'archers':
          s = w.add.sprite(x, y, `${parts.weaponKey}_0`).setOrigin(11 / 26, 26 / 28);
          if (Math.random() < 0.5) s.setFlipX(true);
          break;
        case 'orb': {
          const color = MAGIC_COLOR[this.spec.id] ?? 0xffd36e;
          this.orbGlow = w.add.image(x, y, 'glow').setBlendMode(ADD).setTint(color).setScale(0.75).setAlpha(0.8).setDepth(depth + 0.2);
          this.parts.push(this.orbGlow);
          s = w.add.sprite(x, y, parts.weaponKey);
          break;
        }
        case 'barrel':
          s = w.add.sprite(x, y, parts.weaponKey).setOrigin(8 / 46, 12 / 24).setRotation(-0.5);
          this.aim = -0.5;
          break;
        case 'mortar':
          s = w.add.sprite(x, y + 3, parts.weaponKey).setOrigin(0.5, 26 / 32);
          break;
        case 'rocket':
          s = w.add.sprite(x, y - 2, parts.weaponKey).setOrigin(0.4, 0.62).setRotation(-0.4);
          this.aim = -0.4;
          break;
        default:
          continue;
      }
      s.setDepth(depth + 0.3);
      this.weapons.push(s);
      this.parts.push(s);
    }
  }

  private popIn(): void {
    const all = [this.image, ...this.parts] as (Phaser.GameObjects.Image | Phaser.GameObjects.Sprite)[];
    for (const o of all) {
      // remember each object's resting scale so repeated upgrades never compound
      if (o.getData('sx') === undefined) o.setData({ sx: o.scaleX, sy: o.scaleY });
      const sx = o.getData('sx') as number, sy = o.getData('sy') as number;
      this.world.tweens.killTweensOf(o);
      o.setScale(sx * 0.6, sy * 0.3);
      this.world.tweens.add({ targets: o, scaleX: sx, scaleY: sy, duration: 380, ease: 'Back.easeOut' });
    }
    this.world.fx.puff(this.x, this.y + 4, 0xd9c19a, 1.6);
    this.world.fx.sparks(this.x, this.y - 30, 0xffe26a, 8, 46);
  }

  upgradeTo(id: string): void {
    this.spec = TOWERS[id];
    this.spent += this.spec.cost;
    this.image.setTexture(`tower_${id}`);
    this.buildParts();
    this.popIn();
    if (this.spec.soldiers) this.syncSoldiers();
  }

  upgradeSkill(): void {
    const sk = this.spec.skill;
    if (!sk || this.skillRank >= 3) return;
    this.spent += sk.costs[this.skillRank];
    this.skillRank++;
    this.world.fx.sparks(this.x, this.y - 50, 0xffd23a, 14, 50);
    this.world.fx.ring(this.x, this.y, 60, 0xffe26a, 600);
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
      this.soldiers.push(this.world.addSoldier(new Soldier(this.world, st, this.x, this.y + 8, this.rally.x + f.x, this.rally.y + f.y, this, 75)));
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
    this.phase += dt;
    this.idleAnim();
    if (this.spec.kind === 'barracks') return;
    this.cd -= dt;
    const target = this.cd <= 0.6 ? this.world.pickTarget(this.x, this.y, this.spec.range, this.spec.hitsAir) : null;
    if (target) this.track(target, dt);
    if (this.cd > 0) return;
    if (!target) { this.cd = 0.1; return; }
    this.cd = this.spec.rate;
    switch (this.spec.kind) {
      case 'archer': this.fireArrow(target); break;
      case 'mage': this.fireBolt(target); break;
      case 'cannon': this.spec.id === 'rocket' ? this.fireRockets(target) : this.fireShell(target); break;
    }
  }

  private idleAnim(): void {
    if (this.spec.kind === 'mage' && this.weapons[0]) {
      const base = this.ay + TOWER_PARTS[this.spec.id].mounts[0].y;
      const y = base + Math.sin(this.phase * 2.2) * 3;
      this.weapons[0].y = y;
      if (this.spec.id !== 'mage1' && this.spec.id !== 'mage2' && this.spec.id !== 'mage3') this.weapons[0].rotation = Math.sin(this.phase * 1.3) * 0.25;
      if (this.orbGlow) { this.orbGlow.y = y; this.orbGlow.setAlpha(0.6 + Math.sin(this.phase * 4) * 0.2); }
    }
  }

  /** Turn weapons towards the target. */
  private track(target: Enemy, dt: number): void {
    const kind = TOWER_PARTS[this.spec.id]?.weapon;
    if (kind === 'archers') {
      for (const a of this.weapons) a.setFlipX(target.x < a.x);
    } else if ((kind === 'barrel' || kind === 'rocket') && this.weapons[0]) {
      const w = this.weapons[0];
      const want = Math.atan2(target.y - 40 - w.y, target.x - w.x);
      let diff = Phaser.Math.Angle.Wrap(want - this.aim);
      diff = Phaser.Math.Clamp(diff, -6 * dt, 6 * dt);
      this.aim = Phaser.Math.Angle.Wrap(this.aim + diff);
      w.setRotation(this.aim);
      w.setFlipY(Math.cos(this.aim) < 0);
    }
  }

  private weaponTip(len: number): Pt {
    const w = this.weapons[0];
    return { x: w.x + Math.cos(this.aim) * len, y: w.y + Math.sin(this.aim) * len };
  }

  private recoil(o: Phaser.GameObjects.Sprite, dx: number, dy: number): void {
    const x = o.x, y = o.y;
    this.world.tweens.add({ targets: o, x: x - dx, y: y - dy, duration: 60, yoyo: true, ease: 'Quad.easeOut', onComplete: () => { o.x = x; o.y = y; } });
  }

  private rollDmg(): number {
    return randInt(this.spec.dmg[0], this.spec.dmg[1]);
  }

  private fireArrow(target: Enemy): void {
    const spec = this.spec;
    const archer = this.weapons[this.shot++ % Math.max(1, this.weapons.length)];
    const key = TOWER_PARTS[spec.id].weaponKey;
    let sx = this.x, sy = this.y - 60;
    if (archer) {
      archer.setTexture(`${key}_1`).setFlipX(target.x < archer.x);
      this.world.time.delayedCall(140, () => { if (archer.active) archer.setTexture(`${key}_0`); });
      sx = archer.x + (archer.flipX ? -8 : 8); sy = archer.y - 13;
    }
    const dmgRoll = this.rollDmg();
    const exp = target.expected(dmgRoll, 'physical');
    target.incoming += exp;
    this.world.addProjectile(new Projectile(this.world, {
      kind: 'arrow', x: sx, y: sy, target, speed: spec.id === 'marksman' ? 900 : 620, arc: spec.id === 'marksman' ? 8 : 26,
      tint: spec.id === 'marksman' ? 0xbfe6ff : undefined,
      onArrive: (_x, _y, hit) => {
        target.incoming = Math.max(0, target.incoming - exp);
        if (!hit) return;
        let dmg = dmgRoll;
        if (spec.skill?.id === 'headshot' && this.skillRank > 0 && Math.random() < [0.08, 0.14, 0.2][this.skillRank - 1]) {
          if (hit.def.boss) dmg *= 4; else dmg = hit.hp / Math.max(0.05, 1 - hit.def.armor) + 1;
          this.world.fx.floatText(hit.x, hit.y - 44, 'HEADSHOT!', '#ff5a5a', 15);
          this.world.fx.impact(hit.x, hit.y - hit.hitHeight, 0xff5a5a, 1.3);
        }
        this.world.damageEnemy(hit, dmg, 'physical');
        this.world.fx.sparks(hit.x, hit.y - hit.hitHeight, 0xfff2d0, 2, 10);
        if (spec.skill?.id === 'poison' && this.skillRank > 0 && hit.alive) hit.applyPoison([6, 12, 18][this.skillRank - 1], 3);
        this.world.sfxHit();
      },
    }));
    sfx.arrow();
  }

  private fireBolt(target: Enemy): void {
    const spec = this.spec;
    const color = MAGIC_COLOR[spec.id] ?? 0xffd36e;
    const orb = this.weapons[0];
    const sx = orb ? orb.x : this.x, sy = orb ? orb.y : this.y - 100;
    if (orb) {
      this.world.tweens.add({ targets: orb, scale: 1.45, duration: 90, yoyo: true });
      if (this.orbGlow) this.world.tweens.add({ targets: this.orbGlow, scale: 1.3, duration: 90, yoyo: true });
    }
    this.world.fx.muzzle(sx, sy, color, 1.2);
    const dmgRoll = this.rollDmg();
    const exp = target.expected(dmgRoll, 'magic');
    target.incoming += exp;
    this.world.addProjectile(new Projectile(this.world, {
      kind: 'bolt', x: sx, y: sy, target, speed: 440, arc: 0, tint: color, scale: spec.tier >= 3 ? 1.25 : 1,
      onArrive: (x, y, hit) => {
        target.incoming = Math.max(0, target.incoming - exp);
        this.world.fx.impact(x, y - (hit ? hit.hitHeight : 0), color, spec.tier >= 3 ? 1.2 : 0.9);
        if (!hit) return;
        this.world.damageEnemy(hit, dmgRoll, 'magic');
        if (spec.slow && hit.alive) hit.applySlow(spec.slow.factor, spec.slow.duration);
        if (spec.skill?.id === 'freeze' && this.skillRank > 0 && hit.alive && Math.random() < [0.12, 0.2, 0.28][this.skillRank - 1]) {
          hit.applyStun(1.5, true);
          this.world.fx.frost(hit.x, hit.y - 10);
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
    const mortar = spec.id === 'mortar';
    const flight = mortar ? 1.1 : 0.9;
    const aim = target.predict(flight);
    const w = this.weapons[0];
    let sx = this.x, sy = this.y - 40;
    if (w && mortar) {
      sx = w.x; sy = w.y - 24;
      this.world.tweens.add({ targets: w, scaleY: 0.78, scaleX: 1.12, duration: 70, yoyo: true });
      this.world.fx.smokePuff(sx, sy, 0, -1, 1.4);
      this.world.fx.muzzle(sx, sy, 0xffd36e, 1.5);
    } else if (w) {
      const len = 30 + spec.tier * 3;
      const tip = this.weaponTip(len);
      sx = tip.x; sy = tip.y;
      this.recoil(w, Math.cos(this.aim) * 5, Math.sin(this.aim) * 5);
      this.world.fx.muzzle(sx, sy, 0xffd36e, 1.1);
      this.world.fx.smokePuff(sx, sy, Math.cos(this.aim), Math.sin(this.aim), 1);
    }
    const d = Math.hypot(aim.x - sx, aim.y - sy);
    this.world.addProjectile(new Projectile(this.world, {
      kind: 'shell', x: sx, y: sy, tx: aim.x, ty: aim.y, speed: d / flight, arc: mortar ? 170 : 110, scale: mortar ? 1.5 : 1,
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
    const w = this.weapons[0];
    if (w) this.recoil(w, Math.cos(this.aim) * 4, Math.sin(this.aim) * 4);
    targets.forEach((t, i) => {
      const tip = w ? this.weaponTip(20) : { x: this.x, y: this.y - 70 };
      const sx = tip.x + (i ? 3 : -3), sy = tip.y + (i ? 3 : -3);
      this.world.fx.muzzle(sx, sy, 0xffa22a, 0.9);
      this.world.fx.smokePuff(sx, sy, -Math.cos(this.aim), -Math.sin(this.aim), 0.7);
      this.world.addProjectile(new Projectile(this.world, {
        kind: 'rocket', x: sx, y: sy, target: t, speed: 380, arc: 50 + i * 20,
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
    for (const p of this.parts) p.destroy();
    this.parts = [];
    this.image.destroy();
    this.spot.image.setVisible(true);
  }
}
