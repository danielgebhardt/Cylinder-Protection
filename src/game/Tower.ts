import * as Phaser from 'phaser';
import { TOWERS, ELEMENT_COLOR, ATTUNE_DMG, ATTUNE_RANGE, SELL_RATIO, PYLON, attuneCost } from '../data/towers';
import type { TowerSpec } from '../data/towers';
import { PED_TEX, PYLON_TEX, CRYSTAL_Y } from '../art/textures';
import { DEPTH } from '../config';
import { dist, rand, randInt } from '../util';
import type { Pt } from '../util';
import type { Enemy } from './Enemy';
import { Projectile } from './Projectile';
import type { GameScene } from '../scenes/GameScene';
import { sfx } from '../audio';

const ADD = Phaser.BlendModes.ADD;
let nextNodeId = 1;

/** Anything that takes part in the energy network. */
export interface PowerNode {
  readonly id: number;
  readonly kind: 'cylinder' | 'pylon' | 'tower';
  x: number;
  y: number;
  /** Radius of the energy field this node projects (0 for towers). */
  field: number;
  /** How many structures this node can power (0 for towers). */
  capacity: number;
  powered: boolean;
  parent: PowerNode | null;
  /** Where conduit beams attach, in world coordinates. */
  beamPoint(): Pt;
}

export class CylinderNode implements PowerNode {
  readonly id = nextNodeId++;
  readonly kind = 'cylinder' as const;
  powered = true;
  parent: PowerNode | null = null;
  constructor(public x: number, public y: number, public field: number, public capacity: number) {}
  beamPoint(): Pt { return { x: this.x, y: this.y - 62 }; }
}

export class Pylon implements PowerNode {
  readonly id = nextNodeId++;
  readonly kind = 'pylon' as const;
  readonly field = PYLON.field;
  readonly capacity = PYLON.capacity;
  powered = true;
  parent: PowerNode | null = null;
  spent = PYLON.cost;
  private image: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Image;

  constructor(private world: GameScene, public x: number, public y: number) {
    const d = DEPTH.world + y;
    this.image = world.add.image(x, y, 'pylon').setOrigin(PYLON_TEX.ox, PYLON_TEX.oy).setDepth(d);
    this.glow = world.add.image(x, y + PYLON_TEX.tipY - 6, 'glow').setBlendMode(ADD).setTint(0x5ad0ff).setScale(0.8).setDepth(d + 0.1);
    world.tweens.add({ targets: this.glow, scale: 1, alpha: 0.6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.image.setScale(0.6, 0.3);
    world.tweens.add({ targets: this.image, scaleX: 1, scaleY: 1, duration: 350, ease: 'Back.easeOut' });
    world.fx.puff(x, y, 0xd9c19a, 1.2);
    world.fx.sparks(x, y + PYLON_TEX.tipY, 0x9feaff, 8, 30);
  }

  get sellValue(): number { return Math.round(this.spent * SELL_RATIO); }
  beamPoint(): Pt { return { x: this.x, y: this.y + PYLON_TEX.tipY + 2 }; }

  setPowered(on: boolean): void {
    if (on === this.powered) return;
    this.powered = on;
    this.image.setTint(on ? 0xffffff : 0x777788);
    this.glow.setVisible(on);
  }

  destroy(): void {
    this.world.tweens.killTweensOf(this.glow);
    this.image.destroy();
    this.glow.destroy();
  }
}

export class Tower implements PowerNode {
  readonly id = nextNodeId++;
  readonly kind = 'tower' as const;
  readonly field = 0;
  readonly capacity = 0;
  spec: TowerSpec;
  rank = 0;
  spent: number;
  powered = true;
  parent: PowerNode | null = null;
  private cd = 0.5;
  private phase = Math.random() * 6;
  private image: Phaser.GameObjects.Image;
  private crystal!: Phaser.GameObjects.Image;
  private glow!: Phaser.GameObjects.Image;
  private orbiters: Phaser.GameObjects.Image[] = [];
  private motes: Phaser.GameObjects.Image[] = [];

  constructor(private world: GameScene, public x: number, public y: number, specId: string) {
    this.spec = TOWERS[specId];
    this.spent = this.spec.cost;
    this.image = world.add.image(x, y + 4, `ped_${specId}`).setOrigin(PED_TEX.ox, PED_TEX.oy).setDepth(DEPTH.world + y);
    this.buildParts();
    this.popIn();
  }

  get sellValue(): number { return Math.round(this.spent * SELL_RATIO); }
  get range(): number { return this.spec.range + this.rank * ATTUNE_RANGE; }
  get dmgMult(): number { return 1 + this.rank * ATTUNE_DMG; }
  get color(): number { return ELEMENT_COLOR[this.spec.elements[0]]; }
  get color2(): number { return ELEMENT_COLOR[this.spec.elements[this.spec.elements.length - 1]]; }

  /** What the crystal is worth before attunement (sets the attune price). */
  get baseValue(): number {
    const s = this.spec;
    return s.fused ? TOWERS[s.elements[0]].cost + TOWERS[s.elements[1]].cost + s.cost : s.cost;
  }
  get attunePrice(): number { return attuneCost(this.baseValue, this.rank); }

  private get crystalPos(): Pt { return { x: this.x, y: this.y + 4 + (CRYSTAL_Y[this.spec.id] ?? -70) }; }
  beamPoint(): Pt { const p = this.crystalPos; return { x: p.x, y: p.y + 4 }; }

  private buildParts(): void {
    this.crystal?.destroy(); this.glow?.destroy();
    this.orbiters.forEach(o => o.destroy()); this.orbiters = [];
    const p = this.crystalPos;
    const d = this.image.depth;
    this.glow = this.world.add.image(p.x, p.y, 'glow').setBlendMode(ADD).setTint(this.color).setScale(this.spec.fused ? 1.1 : 0.85).setAlpha(0.7).setDepth(d + 0.1);
    this.crystal = this.world.add.image(p.x, p.y, `crystal_${this.spec.id}`).setDepth(d + 0.2);
    const greater = this.spec.fused && this.spec.elements[0] === this.spec.elements[1];
    if (greater) {
      for (let i = 0; i < 3; i++) this.orbiters.push(this.world.add.image(p.x, p.y, `orbit_${this.spec.elements[0]}`).setDepth(d + 0.25).setScale(0.9));
    }
    this.syncMotes();
    if (!this.powered) this.applyPowerLook();
  }

  private syncMotes(): void {
    while (this.motes.length < this.rank) {
      this.motes.push(this.world.add.image(this.x, this.y, 'spark').setBlendMode(ADD).setDepth(this.image.depth + 0.3).setScale(0.9));
    }
    this.motes.forEach((m, i) => m.setTint(i % 2 ? this.color2 : this.color));
  }

  private popIn(): void {
    for (const o of [this.image, this.crystal]) {
      this.world.tweens.killTweensOf(o);
      o.setScale(0.6, 0.3);
      this.world.tweens.add({ targets: o, scaleX: 1, scaleY: 1, duration: 380, ease: 'Back.easeOut' });
    }
    this.world.fx.puff(this.x, this.y + 4, 0xd9c19a, 1.4);
    this.world.fx.sparks(this.crystalPos.x, this.crystalPos.y, this.color, 10, 44);
  }

  /** Become a fused tower. */
  transform(id: string): void {
    this.spec = TOWERS[id];
    this.image.setTexture(`ped_${id}`);
    this.buildParts();
    this.popIn();
    this.world.fx.ring(this.x, this.y, 70, this.color, 600);
  }

  attune(): void {
    this.rank++;
    this.syncMotes();
    this.world.fx.sparks(this.crystalPos.x, this.crystalPos.y, 0xffffff, 12, 46);
    this.world.fx.ring(this.x, this.y, 60, this.color, 500);
  }

  setPowered(on: boolean): void {
    if (on === this.powered) return;
    this.powered = on;
    this.applyPowerLook();
    if (on) this.world.fx.sparks(this.crystalPos.x, this.crystalPos.y, this.color, 6, 24);
  }

  private applyPowerLook(): void {
    const on = this.powered;
    this.crystal.setTint(on ? 0xffffff : 0x55556a);
    this.glow.setVisible(on);
    this.motes.forEach(m => m.setVisible(on));
    this.orbiters.forEach(o => o.setTint(on ? 0xffffff : 0x55556a));
  }

  update(dt: number, rateMult: number): void {
    this.phase += dt;
    this.animate();
    if (!this.powered) return;
    this.cd -= dt * rateMult;
    if (this.cd > 0) return;
    const s = this.spec;
    if (s.attack === 'aura') {
      if (!this.pulse()) { this.cd = 0.15; return; }
      this.cd = s.rate;
      return;
    }
    const target = this.world.pickTarget(this.x, this.y, this.range, s.hitsAir);
    if (!target) { this.cd = 0.1; return; }
    this.cd = s.rate;
    this.flash();
    switch (s.attack) {
      case 'fireball': this.fireball(target); break;
      case 'shard': this.shard(target); break;
      case 'zap': this.zap(target); break;
      case 'boulder': this.boulder(target); break;
      case 'plasma': this.plasma(target); break;
      case 'magma': this.magma(target); break;
      case 'spikes': this.spikes(target); break;
    }
  }

  private animate(): void {
    const base = this.crystalPos;
    const bob = this.powered ? Math.sin(this.phase * 2.2) * 3 : 4;
    this.crystal.y = base.y + bob;
    this.glow.y = base.y + bob;
    if (this.powered) this.glow.setAlpha(0.55 + Math.sin(this.phase * 3.4) * 0.15);
    this.orbiters.forEach((o, i) => {
      const a = this.phase * 1.8 + (i * Math.PI * 2) / 3;
      o.setPosition(base.x + Math.cos(a) * 20, base.y + bob + Math.sin(a) * 7);
      o.setDepth(this.image.depth + (Math.sin(a) > 0 ? 0.25 : 0.05));
    });
    this.motes.forEach((m, i) => {
      const a = -this.phase * 1.4 + (i * Math.PI * 2) / Math.max(1, this.motes.length);
      m.setPosition(this.x + Math.cos(a) * 24, this.y - 2 + Math.sin(a) * 7);
    });
  }

  private flash(): void {
    this.world.tweens.add({ targets: this.crystal, scale: 1.25, duration: 80, yoyo: true });
    this.world.tweens.add({ targets: this.glow, scale: this.glow.scale * 1.35, duration: 80, yoyo: true });
  }

  private roll(): number {
    return randInt(this.spec.dmg[0], this.spec.dmg[1]) * this.dmgMult;
  }

  private muzzle(): Pt {
    const p = this.crystalPos;
    return { x: p.x, y: this.crystal.y };
  }

  /* ---------------- attacks ---------------- */

  private fireball(target: Enemy): void {
    const s = this.spec, m = this.muzzle();
    const dmg = this.roll();
    this.world.addProjectile(new Projectile(this.world, {
      kind: 'fireball', x: m.x, y: m.y, target, speed: 430, arc: 40, scale: s.fused ? 1.5 : 1.1,
      onArrive: (x, y) => {
        this.world.damageArea(x, y, s.splash ?? 40, dmg, s.dmgType, true, 0xff7a2a, (e) => { if (s.burn) e.applyBurn(s.burn.dps * this.dmgMult, s.burn.time); });
      },
    }));
    sfx.cannon();
  }

  private shard(target: Enemy): void {
    const s = this.spec, m = this.muzzle();
    const dmg = this.roll();
    const exp = target.expected(dmg, 'magic');
    target.incoming += exp;
    this.world.addProjectile(new Projectile(this.world, {
      kind: 'ice', x: m.x, y: m.y, target, speed: 520, arc: 10, scale: s.fused ? 1.3 : 1,
      onArrive: (x, y, hit) => {
        target.incoming = Math.max(0, target.incoming - exp);
        this.world.fx.impact(x, y - (hit ? hit.hitHeight : 0), 0xbff4ff, 0.9);
        if (!hit) return;
        this.world.damageEnemy(hit, dmg, 'magic');
        if (s.slow && hit.alive) hit.applySlow(s.slow.factor, s.slow.time);
        if (s.freeze && hit.alive && Math.random() < s.freeze.chance) { hit.applyStun(s.freeze.time, true); this.world.fx.frost(hit.x, hit.y - 10); }
      },
    }));
    sfx.frost();
  }

  private zap(target: Enemy): void {
    const s = this.spec, m = this.muzzle();
    const hit = new Set<Enemy>([target]);
    const pts: Pt[] = [{ x: m.x, y: m.y }, { x: target.x, y: target.y - target.hitHeight }];
    const strike = (e: Enemy, mult: number) => {
      this.world.damageEnemy(e, this.roll() * mult, 'magic');
      if (s.slow && e.alive) e.applySlow(s.slow.factor, s.slow.time);
    };
    strike(target, 1);
    let cur = target;
    for (let j = 0; j < (s.chain ?? 0); j++) {
      let best: Enemy | null = null, bd = 100;
      for (const e of this.world.enemies) {
        if (!e.alive || hit.has(e)) continue;
        const d = dist(e.x, e.y, cur.x, cur.y);
        if (d < bd) { bd = d; best = e; }
      }
      if (!best) break;
      hit.add(best);
      pts.push({ x: best.x, y: best.y - best.hitHeight });
      strike(best, 0.65);
      cur = best;
    }
    this.world.fx.lightning(pts, s.id === 'blizzard' ? 0x9fe8ff : this.color);
    sfx.zap();
  }

  private boulder(target: Enemy): void {
    const s = this.spec, m = this.muzzle();
    const flight = 0.95;
    const aim = target.predict(flight);
    const dmg = this.roll();
    this.world.addProjectile(new Projectile(this.world, {
      kind: 'boulder', x: m.x, y: m.y, tx: aim.x, ty: aim.y, speed: Math.hypot(aim.x - m.x, aim.y - m.y) / flight, arc: 120,
      scale: s.fused ? 1.8 : 1.15,
      onArrive: (x, y) => this.world.damageArea(x, y, s.splash ?? 50, dmg, 'physical', false, 0xc8a070),
    }));
    sfx.cannon();
  }

  private plasma(target: Enemy): void {
    const s = this.spec, m = this.muzzle();
    const dmg = this.roll();
    const exp = target.expected(dmg, 'physical') * 0.7;
    target.incoming += exp;
    this.world.addProjectile(new Projectile(this.world, {
      kind: 'plasma', x: m.x + rand(-4, 4), y: m.y, target, speed: 720, arc: 0,
      onArrive: (x, y, hit) => {
        target.incoming = Math.max(0, target.incoming - exp);
        this.world.fx.impact(x, y - (hit ? hit.hitHeight : 0), 0xffb0f0, 0.8);
        if (!hit) return;
        this.world.damageEnemy(hit, dmg, s.dmgType);
        if (s.burn && hit.alive) hit.applyBurn(s.burn.dps * this.dmgMult, s.burn.time);
      },
    }));
    sfx.magic();
  }

  private magma(target: Enemy): void {
    const s = this.spec, m = this.muzzle();
    const flight = 1;
    const aim = target.predict(flight);
    const dmg = this.roll();
    this.world.addProjectile(new Projectile(this.world, {
      kind: 'glob', x: m.x, y: m.y, tx: aim.x, ty: aim.y, speed: Math.hypot(aim.x - m.x, aim.y - m.y) / flight, arc: 130, scale: 1.4,
      onArrive: (x, y) => {
        this.world.damageArea(x, y, s.splash ?? 50, dmg, s.dmgType, false, 0xff5a1a);
        if (s.pool) this.world.addFire(x, y, s.pool.r, s.pool.dps * this.dmgMult, s.pool.time);
      },
    }));
    sfx.cannon();
  }

  private spikes(target: Enemy): void {
    const s = this.spec;
    const aim = target.predict(0.3);
    const dmg = this.roll();
    this.world.fx.spikesWarn(aim.x, aim.y, s.splash ?? 55);
    this.world.time.delayedCall(300, () => {
      this.world.fx.spikes(aim.x, aim.y, s.splash ?? 55);
      sfx.frost();
      this.world.damageArea(aim.x, aim.y, s.splash ?? 55, dmg, 'physical', false, undefined, (e) => {
        if (s.freeze && Math.random() < s.freeze.chance) e.applyStun(s.freeze.time, true);
      });
    });
  }

  /** Aura towers damage everything around them. Returns false if nothing was in range. */
  private pulse(): boolean {
    const s = this.spec;
    const r = this.range;
    const victims = this.world.enemies.filter(e => e.alive && (s.hitsAir || !e.flying) && dist(e.x, e.y, this.x, this.y) <= r);
    if (!victims.length) return false;
    this.flash();
    if (s.id === 'steam') {
      this.world.fx.steam(this.x, this.y, r);
      sfx.frost();
    } else {
      this.world.fx.shockwave(this.x, this.y, r, this.color2);
      this.world.cameras.main.shake(90, 0.003);
      sfx.boom();
    }
    for (const e of victims) {
      this.world.damageEnemy(e, this.roll(), s.dmgType);
      if (!e.alive) continue;
      if (s.slow) e.applySlow(s.slow.factor, s.slow.time);
      if (s.stun) e.applyStun(s.stun);
    }
    return true;
  }

  destroy(): void {
    for (const o of [this.image, this.crystal, this.glow, ...this.orbiters, ...this.motes]) {
      this.world.tweens.killTweensOf(o);
      o.destroy();
    }
  }
}
