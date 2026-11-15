import type { DamageType } from './enemies';

export type TowerKind = 'archer' | 'mage' | 'cannon' | 'barracks';

export type SkillId = 'poison' | 'headshot' | 'chain' | 'freeze' | 'cluster' | 'napalm' | 'bash' | 'cleave';

export interface SkillDef {
  id: SkillId;
  name: string;
  costs: [number, number, number];
  describe: (rank: number) => string;
}

export interface TowerSpec {
  id: string;
  kind: TowerKind;
  name: string;
  tier: 1 | 2 | 3 | 4;
  cost: number;          // price to build / upgrade into this spec
  range: number;
  rate: number;          // seconds between attacks
  dmg: [number, number];
  dmgType: DamageType;
  splash?: number;
  hitsAir: boolean;
  slow?: { factor: number; duration: number };
  volley?: number;       // simultaneous targets
  // barracks only
  soldiers?: { count: number; hp: number; dmg: [number, number]; armor: number; rate: number; respawn: number; look: string };
  next: string[];        // upgrade options
  skill?: SkillDef;
  blurb: string;
}

const SKILLS: Record<SkillId, SkillDef> = {
  poison: { id: 'poison', name: 'Venom Arrows', costs: [150, 150, 150],
    describe: r => `Arrows poison for ${[6, 12, 18][r - 1]} dmg/sec (3s), ignoring armor.` },
  headshot: { id: 'headshot', name: 'Headshot', costs: [200, 200, 200],
    describe: r => `${[8, 14, 20][r - 1]}% chance to slay a foe outright (bosses take 4x).` },
  chain: { id: 'chain', name: 'Chain Lightning', costs: [200, 200, 200],
    describe: r => `Bolts arc to ${r + 1} more enemies.` },
  freeze: { id: 'freeze', name: 'Deep Freeze', costs: [175, 175, 175],
    describe: r => `${[12, 20, 28][r - 1]}% chance to freeze a foe solid for 1.5s.` },
  cluster: { id: 'cluster', name: 'Cluster Bomb', costs: [250, 250, 250],
    describe: r => `Shells burst into ${[3, 5, 7][r - 1]} extra bomblets.` },
  napalm: { id: 'napalm', name: 'Napalm', costs: [200, 200, 200],
    describe: r => `Rockets leave fire that burns for ${[10, 18, 26][r - 1]} dmg/sec.` },
  bash: { id: 'bash', name: 'Shield Bash', costs: [150, 150, 150],
    describe: r => `${[12, 22, 32][r - 1]}% chance on hit to stun for 1.5s.` },
  cleave: { id: 'cleave', name: 'Cleave', costs: [175, 175, 175],
    describe: r => `Attacks also hit nearby foes for ${[30, 50, 70][r - 1]}% damage.` },
};

const base = { hitsAir: true, next: [] as string[] };

export const TOWERS: Record<string, TowerSpec> = {
  // ---------------- Archer line ----------------
  archer1: { ...base, id: 'archer1', kind: 'archer', name: 'Archer Post', tier: 1, cost: 70, range: 145, rate: 0.7, dmg: [4, 7], dmgType: 'physical', next: ['archer2'],
    blurb: 'Fast, cheap physical damage. Hits flyers.' },
  archer2: { ...base, id: 'archer2', kind: 'archer', name: 'Archer Tower', tier: 2, cost: 110, range: 150, rate: 0.7, dmg: [7, 11], dmgType: 'physical', next: ['archer3'],
    blurb: 'Sharper arrows, longer range.' },
  archer3: { ...base, id: 'archer3', kind: 'archer', name: 'Archer Fort', tier: 3, cost: 160, range: 160, rate: 0.6, dmg: [10, 16], dmgType: 'physical', next: ['ranger', 'marksman'],
    blurb: 'Veteran bowmen. Ready to specialize!' },
  ranger: { ...base, id: 'ranger', kind: 'archer', name: "Ranger's Lodge", tier: 4, cost: 230, range: 170, rate: 0.33, dmg: [12, 18], dmgType: 'physical',
    skill: SKILLS.poison, blurb: 'Blazing-fast volleys of arrows.' },
  marksman: { ...base, id: 'marksman', kind: 'archer', name: 'Marksman Spire', tier: 4, cost: 250, range: 240, rate: 1.4, dmg: [45, 65], dmgType: 'physical',
    skill: SKILLS.headshot, blurb: 'Huge range, devastating single shots.' },

  // ---------------- Mage line ----------------
  mage1: { ...base, id: 'mage1', kind: 'mage', name: 'Mage Tower', tier: 1, cost: 100, range: 130, rate: 1.4, dmg: [10, 18], dmgType: 'magic', next: ['mage2'],
    blurb: 'Magic bolts ignore armor.' },
  mage2: { ...base, id: 'mage2', kind: 'mage', name: 'Adept Tower', tier: 2, cost: 160, range: 135, rate: 1.5, dmg: [23, 43], dmgType: 'magic', next: ['mage3'],
    blurb: 'Stronger spells.' },
  mage3: { ...base, id: 'mage3', kind: 'mage', name: 'Wizard Tower', tier: 3, cost: 240, range: 140, rate: 1.5, dmg: [40, 72], dmgType: 'magic', next: ['arcane', 'frost'],
    blurb: 'Master wizards. Ready to specialize!' },
  arcane: { ...base, id: 'arcane', kind: 'mage', name: 'Arcane Spire', tier: 4, cost: 300, range: 150, rate: 1.3, dmg: [70, 120], dmgType: 'magic',
    skill: SKILLS.chain, blurb: 'Raw arcane power that shreds armor.' },
  frost: { ...base, id: 'frost', kind: 'mage', name: 'Frost Sanctum', tier: 4, cost: 260, range: 150, rate: 0.9, dmg: [28, 48], dmgType: 'magic', slow: { factor: 0.55, duration: 2 },
    skill: SKILLS.freeze, blurb: 'Icy bolts slow enemies to a crawl.' },

  // ---------------- Cannon line ----------------
  cannon1: { ...base, id: 'cannon1', kind: 'cannon', name: 'Bombard', tier: 1, cost: 120, range: 150, rate: 3, dmg: [8, 15], dmgType: 'explosive', splash: 55, hitsAir: false, next: ['cannon2'],
    blurb: 'Splash damage vs groups. Ground only.' },
  cannon2: { ...base, id: 'cannon2', kind: 'cannon', name: 'Heavy Bombard', tier: 2, cost: 190, range: 155, rate: 3, dmg: [20, 38], dmgType: 'explosive', splash: 60, hitsAir: false, next: ['cannon3'],
    blurb: 'Bigger shells, bigger booms.' },
  cannon3: { ...base, id: 'cannon3', kind: 'cannon', name: 'Siege Works', tier: 3, cost: 280, range: 165, rate: 3, dmg: [32, 58], dmgType: 'explosive', splash: 65, hitsAir: false, next: ['mortar', 'rocket'],
    blurb: 'Dwarven engineers. Ready to specialize!' },
  mortar: { ...base, id: 'mortar', kind: 'cannon', name: 'Doom Mortar', tier: 4, cost: 350, range: 195, rate: 3.4, dmg: [65, 110], dmgType: 'explosive', splash: 85, hitsAir: false,
    skill: SKILLS.cluster, blurb: 'Enormous blasts that flatten crowds.' },
  rocket: { ...base, id: 'rocket', kind: 'cannon', name: 'Rocket Battery', tier: 4, cost: 330, range: 185, rate: 1.6, dmg: [34, 52], dmgType: 'explosive', splash: 40, hitsAir: true, volley: 2,
    skill: SKILLS.napalm, blurb: 'Twin homing rockets. Can hit flyers!' },

  // ---------------- Barracks line ----------------
  barracks1: { ...base, id: 'barracks1', kind: 'barracks', name: 'Militia Barracks', tier: 1, cost: 70, range: 160, rate: 0, dmg: [0, 0], dmgType: 'physical', next: ['barracks2'],
    soldiers: { count: 3, hp: 60, dmg: [2, 4], armor: 0, rate: 1, respawn: 10, look: 'militia' },
    blurb: 'Soldiers block the road. Use the flag to move them.' },
  barracks2: { ...base, id: 'barracks2', kind: 'barracks', name: 'Footmen Barracks', tier: 2, cost: 110, range: 160, rate: 0, dmg: [0, 0], dmgType: 'physical', next: ['barracks3'],
    soldiers: { count: 3, hp: 100, dmg: [3, 5], armor: 0.15, rate: 1, respawn: 10, look: 'footman' },
    blurb: 'Tougher soldiers with better gear.' },
  barracks3: { ...base, id: 'barracks3', kind: 'barracks', name: 'Guard Barracks', tier: 3, cost: 160, range: 170, rate: 0, dmg: [0, 0], dmgType: 'physical', next: ['knights', 'berserkers'],
    soldiers: { count: 3, hp: 150, dmg: [6, 10], armor: 0.3, rate: 1, respawn: 10, look: 'guard' },
    blurb: 'Elite guards. Ready to specialize!' },
  knights: { ...base, id: 'knights', kind: 'barracks', name: 'Knight Hall', tier: 4, cost: 230, range: 180, rate: 0, dmg: [0, 0], dmgType: 'physical',
    soldiers: { count: 3, hp: 320, dmg: [10, 16], armor: 0.6, rate: 1, respawn: 12, look: 'knight' },
    skill: SKILLS.bash, blurb: 'Armored knights that hold any line.' },
  berserkers: { ...base, id: 'berserkers', kind: 'barracks', name: 'Berserker Den', tier: 4, cost: 230, range: 180, rate: 0, dmg: [0, 0], dmgType: 'physical',
    soldiers: { count: 3, hp: 210, dmg: [20, 30], armor: 0.2, rate: 0.7, respawn: 9, look: 'berserker' },
    skill: SKILLS.cleave, blurb: 'Furious axe fighters that deal huge damage.' },
};

export const BUILD_OPTIONS: string[] = ['archer1', 'barracks1', 'mage1', 'cannon1'];

export const SELL_RATIO = 0.6;

export function dps(spec: TowerSpec): number {
  if (spec.soldiers) {
    const s = spec.soldiers;
    return ((s.dmg[0] + s.dmg[1]) / 2 / s.rate) * s.count;
  }
  return ((spec.dmg[0] + spec.dmg[1]) / 2 / spec.rate) * (spec.volley ?? 1);
}
