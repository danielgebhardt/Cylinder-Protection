export const W = 1280;
export const H = 720;

/**
 * Render scale: how many real screen pixels one game unit covers. The canvas is created at
 * W*RES x H*RES and every camera zooms by RES, so the game draws at the device's true
 * resolution instead of being stretched up from 1280x720. Capped for performance.
 */
function computeRes(): number {
  if (typeof window === 'undefined') return 1;
  const forced = Number(new URLSearchParams(location.search).get('res'));
  if (forced > 0) return forced;
  const vw = Math.max(window.innerWidth, window.innerHeight);   // the game is always landscape
  const vh = Math.min(window.innerWidth, window.innerHeight);
  const fit = Math.min(vw / W, vh / H);
  const r = fit * (window.devicePixelRatio || 1);
  return Math.max(1, Math.min(2, Math.round(r * 4) / 4));
}
export const RES = computeRes();

/** Storybook display face for titles, labels and numbers (bundled, works offline). */
export const FONT = 'Cinzel, Georgia, "Times New Roman", serif';
/** Plain face for longer descriptive text. */
export const FONT_BODY = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

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
  { x: 390, y: 0, w: 500, h: 100 },   // moon-phase wave track
  { x: 390, y: 625, w: 500, h: 95 },  // crescent dock
];

/** Point a scene's main camera at the 1280x720 world, zoomed to the render scale. */
export function setupCamera(scene: { cameras: { main: { setZoom(z: number): unknown; centerOn(x: number, y: number): unknown } } }): void {
  scene.cameras.main.setZoom(RES);
  scene.cameras.main.centerOn(W / 2, H / 2);
}
