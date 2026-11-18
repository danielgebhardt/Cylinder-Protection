export type Group = [enemy: string, count: number, gap: number, delay?: number, path?: number];

export interface Theme {
  ground: number;
  groundDark: number;
  groundLight: number;
  path: number;
  pathEdge: number;
  ambient: 'pollen' | 'leaves' | 'fireflies' | 'snow' | 'embers';
  decor: ('tree' | 'pine' | 'rock' | 'bush' | 'flower' | 'deadtree' | 'snowpine' | 'crystal' | 'autumn' | 'lava')[];
}

export interface LevelDef {
  name: string;
  subtitle: string;
  startEnergy: number;
  lives: number;
  hpMult: number;
  pace?: number;  // multiplies spawn gaps (higher = enemies more spread out)
  paths: [number, number][][];
  maxSpots: number;
  extraSpots?: [number, number][];
  theme: Theme;
  seed: number;
  waves: Group[][];
  mapPos: [number, number]; // position on the world map
}

const MEADOW: Theme = {
  ambient: 'pollen',
  ground: 0x6fa64a, groundDark: 0x5a8f3c, groundLight: 0x86bb5c, path: 0xd8b77a, pathEdge: 0xa9875a,
  decor: ['tree', 'tree', 'bush', 'flower', 'flower', 'rock', 'pine'],
};
const AUTUMN: Theme = {
  ambient: 'leaves',
  ground: 0x8fa24a, groundDark: 0x7a8b3c, groundLight: 0xa7b860, path: 0xcfa36e, pathEdge: 0x9b7346,
  decor: ['autumn', 'autumn', 'tree', 'bush', 'rock', 'flower'],
};
const SWAMP: Theme = {
  ambient: 'fireflies',
  ground: 0x4f7a4a, groundDark: 0x3f6540, groundLight: 0x62905a, path: 0x9c8a62, pathEdge: 0x6f6244,
  decor: ['deadtree', 'pine', 'bush', 'rock', 'crystal', 'pine'],
};
const SNOW: Theme = {
  ambient: 'snow',
  ground: 0xdfe8ef, groundDark: 0xc5d3df, groundLight: 0xf4f8fb, path: 0xa8a3a0, pathEdge: 0x7c7877,
  decor: ['snowpine', 'snowpine', 'rock', 'snowpine', 'crystal'],
};
const EMBER: Theme = {
  ambient: 'embers',
  ground: 0x5b4a44, groundDark: 0x4a3b36, groundLight: 0x6e5a52, path: 0x9a7c62, pathEdge: 0x3a2c26,
  decor: ['deadtree', 'rock', 'rock', 'lava', 'crystal'],
};

export const LEVELS: LevelDef[] = [
  {
    name: 'Greenmeadow Road',
    subtitle: 'The goblins have found the old road. Build crystals in the Cylinder\'s glow and hold them back!',
    startEnergy: 300, lives: 20, hpMult: 1, maxSpots: 12, seed: 11, theme: MEADOW, mapPos: [210, 470],
    paths: [[[-40, 190], [190, 185], [320, 250], [350, 410], [470, 520], [680, 525], [790, 410], [780, 270], [890, 175], [1050, 200], [1110, 350], [1175, 455]]],
    waves: [
      [['goblin', 6, 1.4]],
      [['goblin', 10, 1.0]],
      [['goblin', 6, 1.1], ['wolf', 4, 1.2, 6]],
      [['orc', 4, 2.2], ['goblin', 8, 0.8, 3]],
      [['wolf', 8, 0.8], ['orc', 5, 1.8, 6]],
      [['orc', 8, 1.5], ['goblin', 14, 0.55, 2], ['brute', 1, 1, 16]],
    ],
  },
  {
    name: 'Bramblewood',
    subtitle: 'Bats circle above the autumn forest, slicing through any conduit in their path.',
    startEnergy: 400, lives: 20, hpMult: 1.15, maxSpots: 13, seed: 23, theme: AUTUMN, mapPos: [430, 330],
    paths: [[[-40, 560], [170, 560], [290, 460], [260, 300], [350, 170], [550, 150], [660, 270], [620, 440], [730, 575], [930, 580], [1040, 455], [985, 305], [1060, 185], [1170, 230]]],
    waves: [
      [['goblin', 10, 0.9]],
      [['bat', 5, 1.5], ['goblin', 8, 0.9, 4]],
      [['orc', 6, 1.6], ['wolf', 6, 0.9, 5]],
      [['bat', 8, 1.1], ['orc', 4, 2, 6]],
      [['goblin', 20, 0.45], ['brute', 1, 1, 10]],
      [['wolf', 12, 0.6], ['bat', 6, 1.2, 4]],
      [['orc', 10, 1.2], ['brute', 2, 5, 8], ['bat', 6, 1.0, 12]],
      [['brute', 3, 4], ['orc', 10, 1.0, 3], ['wolf', 10, 0.6, 10], ['bat', 8, 0.9, 14]],
    ],
  },
  {
    name: 'Twin Fens',
    subtitle: 'Two roads, one Cylinder. Shamans heal their kin in the fog.',
    startEnergy: 600, lives: 20, hpMult: 1.45, pace: 1.2, maxSpots: 15, seed: 37, theme: SWAMP, mapPos: [660, 470],
    paths: [
      [[-40, 150], [200, 160], [380, 260], [540, 360], [700, 370], [850, 270], [1000, 290], [1090, 410], [1180, 430]],
      [[-40, 600], [200, 590], [390, 470], [540, 360], [700, 370], [850, 270], [1000, 290], [1090, 410], [1180, 430]],
    ],
    waves: [
      [['goblin', 8, 0.9, 0, 0], ['goblin', 8, 0.9, 3, 1]],
      [['orc', 5, 1.6, 0, 0], ['wolf', 6, 0.9, 2, 1]],
      [['shaman', 2, 3, 0, 0], ['orc', 6, 1.4, 1, 0], ['goblin', 12, 0.6, 0, 1]],
      [['bat', 6, 1.1, 0, 1], ['wolf', 6, 0.8, 3, 0]],
      [['brute', 2, 5, 0, 0], ['shaman', 2, 4, 2, 0], ['orc', 8, 1.2, 0, 1]],
      [['goblin', 20, 0.4, 0, 0], ['wolf', 10, 0.55, 4, 1]],
      [['shaman', 4, 2.5, 0, 1], ['orc', 10, 1.0, 1, 1], ['bat', 8, 1.0, 5, 0]],
      [['brute', 2, 3.5, 0, 0], ['brute', 2, 3.5, 2, 1], ['shaman', 2, 3, 6, 0], ['orc', 6, 1.2, 8, 1]],
      [['wolf', 12, 0.55, 0, 0], ['bat', 8, 0.9, 2, 1], ['orc', 8, 1.0, 8, 0]],
      [['brute', 4, 3, 0, 0], ['orc', 14, 0.8, 0, 1], ['shaman', 4, 2.5, 6, 1], ['bat', 10, 0.7, 10, 0], ['goblin', 20, 0.4, 14, 0]],
    ],
  },
  {
    name: 'Frostfang Pass',
    subtitle: 'Wraiths drift through the snow. Boulders pass right through them, and they cut through your conduits.',
    startEnergy: 650, lives: 20, hpMult: 1.6, pace: 1.3, maxSpots: 15, seed: 41, theme: SNOW, mapPos: [870, 300],
    paths: [[[640, -40], [640, 120], [430, 150], [235, 220], [200, 380], [380, 450], [620, 390], [860, 300], [1080, 360], [1090, 530], [870, 610], [640, 600]]],
    waves: [
      [['wolf', 10, 0.8]],
      [['orc', 8, 1.3], ['goblin', 12, 0.6, 2]],
      [['wraith', 3, 2.5], ['wolf', 8, 0.7, 4]],
      [['bat', 10, 0.9], ['orc', 6, 1.4, 3]],
      [['brute', 3, 4], ['shaman', 3, 3, 3]],
      [['wraith', 6, 1.8], ['goblin', 20, 0.4, 2]],
      [['wolf', 16, 0.45], ['bat', 8, 0.9, 5]],
      [['brute', 4, 3], ['wraith', 4, 2, 4], ['shaman', 3, 3, 6]],
      [['orc', 18, 0.7], ['bat', 12, 0.7, 4]],
      [['wraith', 10, 1.2], ['brute', 3, 4, 3]],
      [['wolf', 24, 0.35], ['shaman', 5, 2, 3], ['orc', 12, 0.8, 6]],
      [['brute', 6, 2.5], ['wraith', 8, 1.4, 3], ['bat', 14, 0.6, 6], ['orc', 14, 0.7, 10]],
    ],
  },
  {
    name: "The Warlord's Gate",
    subtitle: 'Grukk the Warlord marches on the Cylinder himself. This is the final stand!',
    startEnergy: 800, lives: 20, hpMult: 1.6, pace: 1.35, maxSpots: 17, seed: 59, theme: EMBER, mapPos: [1070, 460],
    paths: [
      [[1320, 200], [1110, 200], [960, 300], [800, 245], [640, 180], [480, 255], [360, 380], [220, 400], [110, 400]],
      [[1320, 565], [1110, 565], [945, 480], [800, 525], [640, 585], [480, 505], [360, 380], [220, 400], [110, 400]],
    ],
    waves: [
      [['goblin', 12, 0.7, 0, 0], ['goblin', 12, 0.7, 2, 1]],
      [['orc', 8, 1.2, 0, 0], ['wolf', 10, 0.6, 2, 1]],
      [['bat', 8, 1.0, 0, 1], ['shaman', 2, 3, 2, 0], ['orc', 6, 1.2, 3, 0]],
      [['wraith', 4, 2.2, 0, 0], ['brute', 2, 5, 2, 1]],
      [['goblin', 24, 0.4, 0, 0], ['wolf', 12, 0.55, 3, 1]],
      [['brute', 4, 3, 0, 0], ['shaman', 4, 2.5, 2, 1], ['orc', 10, 1, 4, 1]],
      [['wraith', 8, 1.4, 0, 1], ['bat', 14, 0.6, 2, 0]],
      [['orc', 16, 0.7, 0, 0], ['orc', 16, 0.7, 0, 1], ['shaman', 4, 3, 5, 0]],
      [['brute', 4, 2.5, 0, 1], ['wraith', 5, 1.6, 3, 0], ['wolf', 14, 0.45, 6, 0]],
      [['bat', 14, 0.6, 0, 0], ['bat', 14, 0.6, 2, 1], ['brute', 3, 3, 6, 0]],
      [['brute', 6, 2.2, 0, 0], ['shaman', 5, 2, 2, 1], ['orc', 14, 0.7, 4, 1]],
      [['wraith', 10, 1.1, 0, 0], ['wolf', 16, 0.45, 2, 1], ['brute', 4, 3, 8, 1]],
      [['orc', 16, 0.7, 0, 0], ['brute', 5, 2.5, 2, 1], ['bat', 12, 0.7, 5, 0], ['shaman', 5, 2.5, 8, 1]],
      [['warlord', 1, 1, 0, 0], ['brute', 4, 4, 6, 1], ['wraith', 8, 1.5, 10, 1], ['orc', 16, 0.8, 16, 0]],
    ],
  },
];
