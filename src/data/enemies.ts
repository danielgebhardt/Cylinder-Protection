export type DamageType = 'physical' | 'magic' | 'explosive' | 'true';

export interface EnemyDef {
  key: string;
  name: string;
  short: string;
  hp: number;
  speed: number;       // px per second
  armor: number;       // 0..1 physical reduction (explosive takes half of it)
  mr: number;          // 0..1 magic reduction
  gold: number;
  lives: number;       // lives lost if it reaches the Cylinder
  dmg: [number, number];
  atkRate: number;     // seconds between melee attacks
  radius: number;      // hit/pick radius
  flying?: boolean;
  boss?: boolean;
  heals?: { amount: number; radius: number; every: number };
  summons?: { key: string; count: number; every: number };
  tip: string;
}

export const ENEMIES: Record<string, EnemyDef> = {
  goblin: {
    key: 'goblin', short: 'Goblin', name: 'Goblin Raider', hp: 22, speed: 52, armor: 0, mr: 0, gold: 5, lives: 1,
    dmg: [1, 3], atkRate: 1, radius: 13,
    tip: 'Weak but numerous. Anything kills them.',
  },
  wolf: {
    key: 'wolf', short: 'Wolf', name: 'Dire Wolf', hp: 32, speed: 82, armor: 0, mr: 0, gold: 7, lives: 1,
    dmg: [2, 4], atkRate: 0.8, radius: 14,
    tip: 'Very fast! Soldiers are great at stopping them.',
  },
  orc: {
    key: 'orc', short: 'Orc', name: 'Orc Warrior', hp: 75, speed: 40, armor: 0.3, mr: 0, gold: 12, lives: 1,
    dmg: [4, 8], atkRate: 1, radius: 15,
    tip: 'Light armor softens arrows. Magic cuts right through.',
  },
  bat: {
    key: 'bat', short: 'Bat', name: 'Gloom Bat', hp: 42, speed: 62, armor: 0, mr: 0, gold: 10, lives: 1,
    dmg: [0, 0], atkRate: 1, radius: 14, flying: true,
    tip: 'Flies over soldiers. Cannons cannot hit it — use archers or mages.',
  },
  shaman: {
    key: 'shaman', short: 'Shaman', name: 'Bog Shaman', hp: 65, speed: 40, armor: 0, mr: 0.65, gold: 16, lives: 1,
    dmg: [2, 5], atkRate: 1.2, radius: 14,
    heals: { amount: 18, radius: 85, every: 4 },
    tip: 'Heals nearby allies and resists magic. Focus it with arrows!',
  },
  brute: {
    key: 'brute', short: 'Troll', name: 'Ironhide Troll', hp: 240, speed: 30, armor: 0.65, mr: 0, gold: 35, lives: 2,
    dmg: [10, 18], atkRate: 1.3, radius: 19,
    tip: 'Heavily armored. Mages and cannons are your friends.',
  },
  wraith: {
    key: 'wraith', short: 'Wraith', name: 'Hollow Wraith', hp: 110, speed: 58, armor: 0.9, mr: 0.0, gold: 22, lives: 1,
    dmg: [6, 10], atkRate: 1, radius: 15,
    tip: 'Nearly immune to physical damage. Only magic truly hurts it.',
  },
  warlord: {
    key: 'warlord', short: 'Warlord', name: 'Grukk the Warlord', hp: 2600, speed: 20, armor: 0.4, mr: 0.3, gold: 400, lives: 15,
    dmg: [30, 55], atkRate: 1.5, radius: 28, boss: true,
    summons: { key: 'goblin', count: 3, every: 9 },
    tip: 'The Warlord himself! He summons goblins as he marches. Throw everything at him!',
  },
};
