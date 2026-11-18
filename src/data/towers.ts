import type { DamageType } from './enemies';

/**
 * Elemental bloom towers (crystals in the code). Four base elements; fusing two neighbouring crystals
 * creates one of ten fused towers (6 hybrids + 4 "greater" same-element forms).
 * Any crystal can be attuned up to 3 ranks for more damage and range.
 */

export type Element = 'fire' | 'frost' | 'storm' | 'earth';

export type Attack =
  | 'fireball'   // arcing fireball, splash + burn
  | 'shard'      // homing ice shard, slows
  | 'zap'        // instant lightning, can chain
  | 'boulder'    // arcing boulder, splash (ground only)
  | 'plasma'     // fast homing bolt, burn
  | 'magma'      // lava glob, splash + burning pool (ground only)
  | 'spikes'     // ice spikes erupt under the target, freezing everything in the splash
  | 'aura';      // continuous pulse around the tower

export interface TowerSpec {
  id: string;
  name: string;
  elements: Element[];      // 1 for base crystals, 2 for fused ones
  fused: boolean;
  cost: number;             // base build cost (fusions: the fusion fee)
  range: number;
  rate: number;             // seconds between attacks / pulses
  dmg: [number, number];
  dmgType: DamageType;
  attack: Attack;
  hitsAir: boolean;
  splash?: number;
  burn?: { dps: number; time: number };
  slow?: { factor: number; time: number };
  freeze?: { chance: number; time: number };
  chain?: number;           // extra targets for lightning
  pool?: { dps: number; time: number; r: number };
  stun?: number;
  blurb: string;
}

export const ELEMENT_COLOR: Record<Element, number> = {
  fire: 0xff7a2a,
  frost: 0x7fd8ff,
  storm: 0xc08cff,
  earth: 0xe0b050,
};

export const ELEMENT_NAME: Record<Element, string> = { fire: 'Ember', frost: 'Frost', storm: 'Storm', earth: 'Stone' };

const t = (s: TowerSpec) => s;

export const TOWERS: Record<string, TowerSpec> = {
  // ---------------- base crystals ----------------
  fire: t({ id: 'fire', name: 'Ember Bloom', elements: ['fire'], fused: false, cost: 90, range: 135, rate: 1.2, dmg: [8, 13], dmgType: 'explosive',
    attack: 'fireball', hitsAir: true, splash: 38, burn: { dps: 4, time: 2 },
    blurb: 'Lobs fireballs that splash and set foes alight.' }),
  frost: t({ id: 'frost', name: 'Frost Lily', elements: ['frost'], fused: false, cost: 80, range: 130, rate: 1.0, dmg: [6, 10], dmgType: 'magic',
    attack: 'shard', hitsAir: true, slow: { factor: 0.6, time: 1.6 },
    blurb: 'Ice shards that slow enemies down.' }),
  storm: t({ id: 'storm', name: 'Storm Orchid', elements: ['storm'], fused: false, cost: 100, range: 145, rate: 0.6, dmg: [4, 8], dmgType: 'magic',
    attack: 'zap', hitsAir: true, chain: 1,
    blurb: 'Rapid lightning that arcs to a second foe. Great vs flyers.' }),
  earth: t({ id: 'earth', name: 'Stone Thistle', elements: ['earth'], fused: false, cost: 110, range: 150, rate: 2.6, dmg: [15, 27], dmgType: 'physical',
    attack: 'boulder', hitsAir: false, splash: 50,
    blurb: 'Hurls stones that crush groups. Ground only.' }),

  // ---------------- greater (same + same) ----------------
  inferno: t({ id: 'inferno', name: 'Wildfire Rose', elements: ['fire', 'fire'], fused: true, cost: 90, range: 155, rate: 1.25, dmg: [28, 44], dmgType: 'explosive',
    attack: 'fireball', hitsAir: true, splash: 58, burn: { dps: 10, time: 3 },
    blurb: 'Huge fireballs and roaring flames.' }),
  permafrost: t({ id: 'permafrost', name: 'Winter Lily', elements: ['frost', 'frost'], fused: true, cost: 90, range: 150, rate: 0.85, dmg: [16, 26], dmgType: 'magic',
    attack: 'shard', hitsAir: true, slow: { factor: 0.45, time: 2 }, freeze: { chance: 0.15, time: 1.2 },
    blurb: 'Deep cold: heavy slows and a chance to freeze solid.' }),
  tempest: t({ id: 'tempest', name: 'Thunder Orchid', elements: ['storm', 'storm'], fused: true, cost: 90, range: 165, rate: 0.5, dmg: [11, 18], dmgType: 'magic',
    attack: 'zap', hitsAir: true, chain: 3,
    blurb: 'Lightning that leaps between four foes.' }),
  monolith: t({ id: 'monolith', name: 'Ironthistle', elements: ['earth', 'earth'], fused: true, cost: 90, range: 175, rate: 2.8, dmg: [55, 90], dmgType: 'physical',
    attack: 'boulder', hitsAir: false, splash: 72,
    blurb: 'Enormous stones that flatten whole packs. Ground only.' }),

  // ---------------- hybrids ----------------
  steam: t({ id: 'steam', name: 'Mist Lotus', elements: ['fire', 'frost'], fused: true, cost: 90, range: 110, rate: 0.5, dmg: [4, 6], dmgType: 'magic',
    attack: 'aura', hitsAir: true, slow: { factor: 0.75, time: 0.8 },
    blurb: 'Scalding mist burns and slows everything nearby.' }),
  plasma: t({ id: 'plasma', name: 'Starfire Orchid', elements: ['fire', 'storm'], fused: true, cost: 90, range: 160, rate: 0.35, dmg: [11, 17], dmgType: 'explosive',
    attack: 'plasma', hitsAir: true, burn: { dps: 6, time: 2 },
    blurb: 'A stream of white-hot plasma bolts.' }),
  magma: t({ id: 'magma', name: 'Cinder Thorn', elements: ['fire', 'earth'], fused: true, cost: 90, range: 160, rate: 2.2, dmg: [32, 50], dmgType: 'explosive',
    attack: 'magma', hitsAir: false, splash: 55, pool: { dps: 14, time: 4, r: 44 },
    blurb: 'Molten globs that leave burning lava on the road.' }),
  blizzard: t({ id: 'blizzard', name: 'Sleet Orchid', elements: ['frost', 'storm'], fused: true, cost: 90, range: 160, rate: 0.7, dmg: [13, 20], dmgType: 'magic',
    attack: 'zap', hitsAir: true, chain: 2, slow: { factor: 0.55, time: 1.5 },
    blurb: 'Freezing lightning that slows every foe it touches.' }),
  glacier: t({ id: 'glacier', name: 'Frostroot', elements: ['frost', 'earth'], fused: true, cost: 90, range: 160, rate: 2.4, dmg: [28, 42], dmgType: 'physical',
    attack: 'spikes', hitsAir: false, splash: 58, freeze: { chance: 1, time: 1 },
    blurb: 'Ice spikes burst from the ground and freeze a whole area.' }),
  tremor: t({ id: 'tremor', name: 'Quakeroot', elements: ['storm', 'earth'], fused: true, cost: 90, range: 115, rate: 2.4, dmg: [18, 28], dmgType: 'physical',
    attack: 'aura', hitsAir: false, stun: 0.4,
    blurb: 'Shockwaves that damage and stun all nearby ground foes.' }),
};

export const BASE_CRYSTALS: Element[] = ['fire', 'frost', 'storm', 'earth'];

/** Which fused tower two elements make. */
export function fusionOf(a: Element, b: Element): string {
  if (a === b) return { fire: 'inferno', frost: 'permafrost', storm: 'tempest', earth: 'monolith' }[a];
  const key = [a, b].sort().join('+');
  const table: Record<string, string> = {
    'fire+frost': 'steam', 'fire+storm': 'plasma', 'earth+fire': 'magma',
    'frost+storm': 'blizzard', 'earth+frost': 'glacier', 'earth+storm': 'tremor',
  };
  return table[key];
}

/** Crystals within this distance of each other can fuse. */
export const FUSE_RANGE = 105;
export const SELL_RATIO = 0.6;

/** Attunement: 3 ranks, each +35% damage and +8 range. Cost scales with what the crystal is worth. */
export const ATTUNE_MAX = 3;
export const ATTUNE_DMG = 0.35;
export const ATTUNE_RANGE = 8;
export function attuneCost(value: number, rank: number): number {
  return Math.round((value * [0.6, 0.85, 1.1][rank]) / 5) * 5;
}

/* ---------------- energy network ---------------- */

export const CYLINDER_FIELD = 150;
/** How many crystals each source can power (pylons don't use a slot). */
export const CYLINDER_CAPACITY = 5;
export const PYLON = { id: 'pylon', name: 'Moth Lantern', cost: 40, field: 160, capacity: 3,
  blurb: 'Relays moonlight: extends the glow and powers up to 3 more blooms.' };
/** How long a link stays broken after a severing enemy passes through it. */
export const LINK_CUT_TIME = 3;
