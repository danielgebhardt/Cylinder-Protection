export const W = 1280;
export const H = 720;

export const FONT = '"Trebuchet MS", "Segoe UI", Arial, sans-serif';

export const DEPTH = {
  ground: 0,
  spots: 5,
  // world objects use 100 + y for pseudo-3D sorting
  world: 100,
  range: 1000,
  projectile: 2000,
  effects: 2100,
  menu: 3000,
  hud: 5000,
  modal: 8000,
} as const;

/** Screen regions the HUD occupies; build spots and decor avoid these. */
export const HUD_ZONES = [
  { x: 0, y: 0, w: 440, h: 78 },      // stats panel
  { x: 1050, y: 0, w: 230, h: 78 },   // speed / pause
  { x: 0, y: 610, w: 210, h: 110 },   // abilities
];
