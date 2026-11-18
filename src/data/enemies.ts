export type DamageType = 'physical' | 'magic' | 'explosive' | 'true';

export interface EnemyDef {
  key: string;
  name: string;
  short: string;
  hp: number;
  speed: number;       // px per second
  armor: number;       // 0..1 physical reduction (explosive takes half of it)
  mr: number;          // 0..1 magic reduction
  gold: number;        // moonlight awarded on kill
  lives: number;       // lives lost if it reaches the Moonwell
  radius: number;      // hit/pick radius
  severs?: number;     // snips moonbeams (conduits) that pass within this distance
  flying?: boolean;
  boss?: boolean;
  heals?: { amount: number; radius: number; every: number };
  summons?: { key: string; count: number; every: number };
  tip: string;
}

export const ENEMIES: Record<string, EnemyDef> = {
  goblin: {
    key: 'goblin', short: 'Thornling', name: 'Thornling', hp: 22, speed: 52, armor: 0, mr: 0, gold: 5, lives: 1, radius: 13,
    tip: 'Small, spiky and numerous. Splash from Ember and Stone blooms clears them fast.',
  },
  wolf: {
    key: 'wolf', short: 'Hound', name: 'Shade Hound', hp: 32, speed: 82, armor: 0, mr: 0, gold: 7, lives: 1, radius: 14,
    tip: 'Very fast! Frost slows them so your other blooms can finish the job.',
  },
  orc: {
    key: 'orc', short: 'Knight', name: 'Bramble Knight', hp: 75, speed: 40, armor: 0.3, mr: 0, gold: 12, lives: 1, radius: 15,
    tip: 'Bark armor softens stones. Storm and Frost magic cut right through.',
  },
  bat: {
    key: 'bat', short: 'Moth', name: 'Shadow Moth', hp: 42, speed: 62, armor: 0, mr: 0, gold: 10, lives: 1, radius: 14, flying: true, severs: 24,
    tip: 'Flies over the road and SNIPS moonbeams it passes. Stone blooms can\'t reach it; Storm can.',
  },
  shaman: {
    key: 'shaman', short: 'Witch', name: 'Blight Witch', hp: 65, speed: 40, armor: 0, mr: 0.65, gold: 16, lives: 1, radius: 14,
    heals: { amount: 18, radius: 85, every: 4 },
    tip: 'Mends nearby Blight and resists magic. Burn her with Ember or crush her with Stone.',
  },
  brute: {
    key: 'brute', short: 'Troll', name: 'Mossback Troll', hp: 240, speed: 30, armor: 0.65, mr: 0, gold: 35, lives: 2, radius: 19,
    tip: 'Armored in bark and stone. Magic and fire are your friends.',
  },
  wraith: {
    key: 'wraith', short: 'Wisp', name: 'Blight Wisp', hp: 110, speed: 58, armor: 0.9, mr: 0.0, gold: 22, lives: 1, radius: 15, severs: 28,
    tip: 'Nearly immune to physical damage, and SNIPS moonbeams it drifts through. Use magic.',
  },
  warlord: {
    key: 'warlord', short: 'King', name: 'The Hollow King', hp: 2600, speed: 20, armor: 0.4, mr: 0.3, gold: 400, lives: 15, radius: 28, boss: true, severs: 46,
    summons: { key: 'goblin', count: 3, every: 9 },
    tip: 'He summons Thornlings as he walks and tears apart any moonbeam near him. Throw everything at him!',
  },
};
