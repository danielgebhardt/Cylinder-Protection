import * as Phaser from 'phaser';
import { FONT } from './config';

export interface Pt { x: number; y: number }

export function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

/** Small deterministic RNG (mulberry32) so maps look the same every time. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TextOpts {
  size?: number;
  color?: string;
  stroke?: string;
  strokeThickness?: number;
  align?: 'left' | 'center' | 'right';
  wrap?: number;
  bold?: boolean;
}

export function txt(scene: Phaser.Scene, x: number, y: number, s: string, o: TextOpts = {}): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, s, {
    fontFamily: FONT,
    fontSize: `${o.size ?? 20}px`,
    fontStyle: o.bold === false ? 'normal' : 'bold',
    color: o.color ?? '#ffffff',
    stroke: o.stroke ?? '#1a1208',
    strokeThickness: o.strokeThickness ?? 4,
    align: o.align ?? 'center',
    wordWrap: o.wrap ? { width: o.wrap } : undefined,
  });
  t.setOrigin(0.5);
  return t;
}

export function rectsContain(zones: { x: number; y: number; w: number; h: number }[], x: number, y: number, pad = 0): boolean {
  return zones.some(z => x > z.x - pad && x < z.x + z.w + pad && y > z.y - pad && y < z.y + z.h + pad);
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
