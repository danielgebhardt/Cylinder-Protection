import type * as Phaser from 'phaser';
import { RES } from '../config';

/**
 * Canvas2D drawing toolkit. Every texture is painted in logical game units on a canvas that is
 * RES times larger, then registered so Phaser displays it at its logical size — so art stays
 * crisp on high-density phone screens while game code keeps using 1280x720 coordinates.
 */

export type Ctx = CanvasRenderingContext2D;
export type Paint = string | CanvasGradient;

export const OUT = '#2a1b12';

/** Register a canvas painted at RES scale as a texture with logical size w x h. */
export function tex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: Ctx) => void): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * RES);
  canvas.height = Math.ceil(h * RES);
  const c = canvas.getContext('2d')!;
  c.scale(RES, RES);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  draw(c);
  const t = scene.textures.addCanvas(key, canvas)!;
  setLogicalSize(t, w, h);
}

/** Make Phaser treat a hi-res texture as w x h logical units (images, sprites and particles). */
export function setLogicalSize(t: Phaser.Textures.Texture, w: number, h: number): void {
  const src = t.source[0];
  src.resolution = src.width / w;
  const f = t.get();
  const data = (f as unknown as { data: { sourceSize: { w: number; h: number }; spriteSourceSize: { w: number; h: number } } }).data;
  data.sourceSize.w = w;
  data.sourceSize.h = h;
  data.spriteSourceSize.w = w;
  data.spriteSourceSize.h = h;
  f.width = w;
  f.height = h;
  f.halfWidth = w / 2;
  f.halfHeight = h / 2;
  f.centerX = Math.floor(w / 2);
  f.centerY = Math.floor(h / 2);
}

/* ---------------------------------------------------------------- */
/* Colors                                                            */
/* ---------------------------------------------------------------- */

export function hex(c: number): string {
  return '#' + c.toString(16).padStart(6, '0');
}

/** Lighten (amt > 0) or darken (amt < 0) a color. */
export function shade(c: number, amt: number): number {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  return (f(r) << 16) | (f(g) << 8) | f(b);
}

export function sh(c: number, amt: number): string {
  return hex(shade(c, amt));
}

export function rgba(c: number, a: number): string {
  return `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
}

/* ---------------------------------------------------------------- */
/* Gradients                                                         */
/* ---------------------------------------------------------------- */

export function lg(c: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  for (const [o, col] of stops) g.addColorStop(o, col);
  return g;
}

export function rg(c: Ctx, x: number, y: number, r: number, stops: [number, string][], fx = x, fy = y, r0 = 0): CanvasGradient {
  const g = c.createRadialGradient(fx, fy, r0, x, y, r);
  for (const [o, col] of stops) g.addColorStop(o, col);
  return g;
}

/** Standard "lit from top-left" material across a box. */
export function mat(c: Ctx, base: number, x: number, y: number, w: number, h: number, light = 0.28, dark = -0.32): CanvasGradient {
  return lg(c, x, y, x + w * 0.6, y + h, [[0, sh(base, light)], [0.45, hex(base)], [1, sh(base, dark)]]);
}

/** Horizontal cylinder-style shading (good for towers, trunks, barrels). */
export function cyl(c: Ctx, base: number, x: number, w: number): CanvasGradient {
  return lg(c, x, 0, x + w, 0, [[0, sh(base, -0.15)], [0.25, sh(base, 0.3)], [0.55, hex(base)], [1, sh(base, -0.4)]]);
}

/* ---------------------------------------------------------------- */
/* Shapes                                                            */
/* ---------------------------------------------------------------- */

function finish(c: Ctx, fill?: Paint | null, stroke: string | null = OUT, lw = 2): void {
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
}

export function shape(c: Ctx, build: (c: Ctx) => void, fill?: Paint | null, stroke: string | null = OUT, lw = 2): void {
  c.beginPath();
  build(c);
  finish(c, fill, stroke, lw);
}

export function poly(c: Ctx, pts: number[], fill?: Paint | null, stroke: string | null = OUT, lw = 2): void {
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
  finish(c, fill, stroke, lw);
}

export function ell(c: Ctx, x: number, y: number, rx: number, ry: number, fill?: Paint | null, stroke: string | null = OUT, lw = 2): void {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  finish(c, fill, stroke, lw);
}

export function circ(c: Ctx, x: number, y: number, r: number, fill?: Paint | null, stroke: string | null = OUT, lw = 2): void {
  ell(c, x, y, r, r, fill, stroke, lw);
}

export function rrect(c: Ctx, x: number, y: number, w: number, h: number, r: number | number[], fill?: Paint | null, stroke: string | null = OUT, lw = 2): void {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  finish(c, fill, stroke, lw);
}

/** A line drawn with a dark outline around it (limbs, poles, handles). */
export function limb(c: Ctx, x0: number, y0: number, x1: number, y1: number, w: number, color: string, outline = OUT): void {
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1);
  c.strokeStyle = outline; c.lineWidth = w + 3; c.stroke();
  c.strokeStyle = color; c.lineWidth = w; c.stroke();
}

/** Soft blurred ground shadow. */
export function softShadow(c: Ctx, x: number, y: number, rx: number, ry: number, a = 0.35): void {
  c.save();
  c.translate(x, y);
  c.scale(1, ry / rx);
  c.fillStyle = rg(c, 0, 0, rx, [[0, `rgba(0,0,0,${a})`], [0.6, `rgba(0,0,0,${a * 0.6})`], [1, 'rgba(0,0,0,0)']]);
  c.beginPath(); c.arc(0, 0, rx, 0, Math.PI * 2); c.fill();
  c.restore();
}

/** Glossy highlight streak. */
export function gloss(c: Ctx, x: number, y: number, rx: number, ry: number, a = 0.45, rot = -0.5): void {
  c.save();
  c.translate(x, y); c.rotate(rot);
  c.fillStyle = `rgba(255,255,255,${a})`;
  c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.fill();
  c.restore();
}

export function star(c: Ctx, cx: number, cy: number, r: number, inner: number, points: number, fill?: Paint | null, stroke: string | null = OUT, lw = 2, rot = -Math.PI / 2): void {
  c.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = rot + (i * Math.PI) / points;
    const rr = i % 2 ? inner : r;
    if (i === 0) c.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    else c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  c.closePath();
  finish(c, fill, stroke, lw);
}

/** Rotate drawing around a pivot. */
export function rotated(c: Ctx, x: number, y: number, angle: number, draw: () => void): void {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  draw();
  c.restore();
}
