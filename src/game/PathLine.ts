import * as Phaser from 'phaser';
import type { Pt } from '../util';
import { dist, rectsContain, seeded } from '../util';
import { W, H, HUD_ZONES } from '../config';

const STEP = 2;

/** A smooth path through control points, resampled at uniform spacing for constant-speed movement. */
export class PathLine {
  readonly pts: Pt[] = [];
  readonly length: number;

  constructor(control: [number, number][]) {
    const spline = new Phaser.Curves.Spline(control.map(p => new Phaser.Math.Vector2(p[0], p[1])));
    const raw = spline.getPoints(control.length * 80);
    // resample to uniform spacing
    this.pts.push({ x: raw[0].x, y: raw[0].y });
    let carry = 0;
    for (let i = 1; i < raw.length; i++) {
      const a = raw[i - 1], b = raw[i];
      const seg = dist(a.x, a.y, b.x, b.y);
      let t = STEP - carry;
      while (t <= seg) {
        const k = t / seg;
        this.pts.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
        t += STEP;
      }
      carry = seg - (t - STEP);
    }
    const last = raw[raw.length - 1];
    this.pts.push({ x: last.x, y: last.y });
    this.length = (this.pts.length - 1) * STEP;
  }

  at(d: number, out: Pt = { x: 0, y: 0 }): Pt {
    const f = Math.max(0, Math.min(this.length, d)) / STEP;
    const i = Math.min(this.pts.length - 2, Math.floor(f));
    const k = f - i;
    const a = this.pts[i], b = this.pts[i + 1];
    out.x = a.x + (b.x - a.x) * k;
    out.y = a.y + (b.y - a.y) * k;
    return out;
  }

  /** Unit direction of travel at distance d. */
  dir(d: number): Pt {
    const a = this.at(d - 4), b = this.at(d + 4);
    const l = dist(a.x, a.y, b.x, b.y) || 1;
    return { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
  }

  /** Distance from a point to the path and the path distance of the closest sample. */
  closest(x: number, y: number): { d: number; along: number } {
    let best = Infinity, bi = 0;
    for (let i = 0; i < this.pts.length; i += 3) {
      const p = this.pts[i];
      const dd = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
      if (dd < best) { best = dd; bi = i; }
    }
    return { d: Math.sqrt(best), along: bi * STEP };
  }

  /** First distance at which the path is inside the visible screen. */
  entryDistance(margin = 30): number {
    for (let i = 0; i < this.pts.length; i++) {
      const p = this.pts[i];
      if (p.x > margin && p.x < W - margin && p.y > margin && p.y < H - margin) return i * STEP;
    }
    return 0;
  }
}

export function minPathDist(paths: PathLine[], x: number, y: number): number {
  let m = Infinity;
  for (const p of paths) m = Math.min(m, p.closest(x, y).d);
  return m;
}

/** Generate build plots alongside the road(s). Deterministic; widens spacing until at most maxSpots fit. */
export function generateSpots(paths: PathLine[], maxSpots: number, end: Pt, seed: number, avoid: Pt[]): Pt[] {
  let spacing = 100;
  let spots: Pt[] = [];
  for (let iter = 0; iter < 40; iter++) {
    spots = trySpots(paths, spacing, end, seed, avoid);
    if (spots.length <= maxSpots) break;
    spacing += 6;
  }
  return spots;
}

function trySpots(paths: PathLine[], spacing: number, end: Pt, seed: number, avoid: Pt[]): Pt[] {
  const rng = seeded(seed);
  const spots: Pt[] = [];
  const offsets = [72, 82, 66];
  for (const path of paths) {
    for (let d = 60; d < path.length - 40; d += 22) {
      const p = path.at(d);
      const n = path.dir(d);
      const side = rng() < 0.5 ? 1 : -1;
      for (const s of [side, -side]) {
        const off = offsets[Math.floor(rng() * offsets.length)];
        const x = p.x - n.y * off * s;
        const y = p.y + n.x * off * s;
        if (x < 48 || x > W - 48 || y < 100 || y > H - 40) continue;
        if (rectsContain(HUD_ZONES, x, y, 30)) continue;
        if (minPathDist(paths, x, y) < 58) continue;
        if (dist(x, y, end.x, end.y) < 95) continue;
        if (avoid.some(a => dist(a.x, a.y, x, y) < 95 || dist(a.x, a.y + 45, x, y) < 80)) continue;
        if (spots.some(o => dist(o.x, o.y, x, y) < spacing)) continue;
        spots.push({ x, y });
        break;
      }
    }
  }
  return spots;
}

/** Where to put the "call wave" button for a path: on-screen, near the entry, clear of HUD. */
export function callButtonPos(path: PathLine): Pt {
  for (let d = path.entryDistance(50) + 20; d < path.length; d += 10) {
    const p = path.at(d);
    const x = Math.max(46, Math.min(W - 46, p.x));
    const y = Math.max(120, Math.min(H - 90, p.y));
    if (!rectsContain(HUD_ZONES, x, y, 45)) return { x, y };
  }
  return path.at(path.entryDistance(50));
}
