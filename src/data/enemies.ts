export type DamageType = 'physical' | 'magic' | 'explosive' | 'true';

export interface EnemyDef {
  key: string;
  name: string;
  short: string;
  hp: number;
  speed: number;       // px per second
  armor: number;       // 0..1 physical reduction (explosive takes half of it)
  mr: number;          // 0..1 magic reduction
  gold: number;        // energy awarded on kill
  lives: number;       // lives lost if it reaches the Cylinder
  radius: number;      // hit/pick radius
  severs?: number;     // cuts energy conduits that pass within this distance
  flying?: boolean;
  boss?: boolean;
  heals?: { amount: number; radius: number; every: number };
  summons?: { key: string; count: number; every: number };
  tip: string;
}

export const ENEMIES: Record<string, EnemyDef> = {
  goblin: {
    key: 'goblin', short: 'Goblin', name: 'Goblin Raider', hp: 22, speed: 52, armor: 0, mr: 0, gold: 5, lives: 1, radius: 13,
    tip: 'Weak but numerous. Splash damage from Fire and Earth makes short work of them.',
  },
  wolf: {
    key: 'wolf', short: 'Wolf', name: 'Dire Wolf', hp: 32, speed: 82, armor: 0, mr: 0, gold: 7, lives: 1, radius: 14,
    tip: 'Very fast! Frost slows them down so your other crystals can finish the job.',
  },
  orc: {
    key: 'orc', short: 'Orc', name: 'Orc Warrior', hp: 75, speed: 40, armor: 0.3, mr: 0, gold: 12, lives: 1, radius: 15,
    tip: 'Light armor softens boulders. Storm and Frost magic cut right through.',
  },
  bat: {
    key: 'bat', short: 'Bat', name: 'Gloom Bat', hp: 42, speed: 62, armor: 0, mr: 0, gold: 10, lives: 1, radius: 14, flying: true, severs: 24,
    tip: 'Flies over the road and SEVERS energy conduits it passes. Earth can\'t hit it; Storm can.',
  },
  shaman: {
    key: 'shaman', short: 'Shaman', name: 'Bog Shaman', hp: 65, speed: 40, armor: 0, mr: 0.65, gold: 16, lives: 1, radius: 14,
    heals: { amount: 18, radius: 85, every: 4 },
    tip: 'Heals nearby allies and resists magic. Burn it with Fire or crush it with Earth.',
  },
  brute: {
    key: 'brute', short: 'Troll', name: 'Ironhide Troll', hp: 240, speed: 30, armor: 0.65, mr: 0, gold: 35, lives: 2, radius: 19,
    tip: 'Heavily armored. Magic and fire are your friends.',
  },
  wraith: {
    key: 'wraith', short: 'Wraith', name: 'Hollow Wraith', hp: 110, speed: 58, armor: 0.9, mr: 0.0, gold: 22, lives: 1, radius: 15, severs: 28,
    tip: 'Nearly immune to physical damage, and SEVERS conduits it drifts through. Use magic.',
  },
  warlord: {
    key: 'warlord', short: 'Warlord', name: 'Grukk the Warlord', hp: 2600, speed: 20, armor: 0.4, mr: 0.3, gold: 400, lives: 15, radius: 28, boss: true, severs: 46,
    summons: { key: 'goblin', count: 3, every: 9 },
    tip: 'The Warlord himself! He summons goblins and tears apart any conduit near him.',
  },
};
