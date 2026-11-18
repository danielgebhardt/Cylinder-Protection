import * as Phaser from 'phaser';
import { DEPTH } from '../config';
import { LINK_CUT_TIME } from '../data/towers';
import { dist } from '../util';
import type { Pt } from '../util';
import type { PowerNode } from './Tower';
import type { Enemy } from './Enemy';

/** Distance from point p to segment ab. */
function segDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

const key = (a: PowerNode, b: PowerNode) => (a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`);

/**
 * The energy network. The Cylinder powers everything inside its field; pylons inside a powered
 * field relay power and project their own field. Every tower and pylon draws power through a
 * conduit from a powered source in range. Severing enemies cut conduits they pass through for a
 * few seconds; nodes then reroute through another source if one is in range, or go dark.
 */
export class Network {
  readonly root: PowerNode;
  nodes: PowerNode[] = [];
  private cuts = new Map<string, number>();
  private beams: Phaser.GameObjects.Graphics;
  private fieldGfx: Phaser.GameObjects.Graphics;
  private time = 0;
  private fieldStrong = false;
  private fieldDirty = true;
  /** Called the first time a conduit that was carrying power gets cut. */
  onCut: ((at: Pt) => void) | null = null;

  constructor(scene: Phaser.Scene, root: PowerNode) {
    this.root = root;
    this.nodes = [root];
    this.fieldGfx = scene.add.graphics().setDepth(DEPTH.spots);
    this.beams = scene.add.graphics().setDepth(DEPTH.projectile - 5).setBlendMode(Phaser.BlendModes.ADD);
  }

  get sources(): PowerNode[] { return this.nodes.filter(n => n.field > 0); }

  add(n: PowerNode): void { this.nodes.push(n); this.recompute(); this.fieldDirty = true; }
  remove(n: PowerNode): void {
    this.nodes = this.nodes.filter(o => o !== n);
    for (const o of this.nodes) if (o.parent === n) o.parent = null;
    this.recompute();
    this.fieldDirty = true;
  }

  /** Is (x, y) inside the field of a powered source? */
  inField(x: number, y: number): boolean {
    return this.sources.some(s => s.powered && dist(s.x, s.y, x, y) <= s.field);
  }

  /** Crystals currently drawing power from a source (pylons don't count). */
  load(src: PowerNode): number {
    let n = 0;
    for (const o of this.nodes) if (o.parent === src && o.powered && o.field === 0) n++;
    return n;
  }

  /** Could a new crystal at (x, y) be powered (in a field with a free slot)? */
  hasCapacity(x: number, y: number): boolean {
    return this.sources.some(s => s.powered && dist(s.x, s.y, x, y) <= s.field && this.load(s) < s.capacity);
  }

  /** Emphasise the field while the player is building. */
  showField(strong: boolean): void {
    if (strong !== this.fieldStrong) { this.fieldStrong = strong; this.fieldDirty = true; }
  }

  private isCut(a: PowerNode, b: PowerNode): boolean { return (this.cuts.get(key(a, b)) ?? 0) > 0; }

  /** Work out which nodes have power and through which conduit. */
  private recompute(): void {
    const prevPowered = new Map(this.nodes.map(n => [n, n.powered]));
    for (const n of this.nodes) if (n !== this.root) n.powered = false;
    const used = new Map<PowerNode, number>();
    const canFeed = (src: PowerNode, n: PowerNode) => src.powered && src !== n && dist(src.x, src.y, n.x, n.y) <= src.field && !this.isCut(src, n)
      && (n.field > 0 || (used.get(src) ?? 0) < src.capacity);   // pylons never take a slot
    const pick = (n: PowerNode) => {
      if (n.parent && this.nodes.includes(n.parent) && canFeed(n.parent, n)) return n.parent;
      let best: PowerNode | null = null, bd = Infinity;
      for (const s of this.nodes) {
        if (s.field <= 0 || !canFeed(s, n)) continue;
        const d = dist(s.x, s.y, n.x, n.y);
        if (d < bd) { bd = d; best = s; }
      }
      return best;
    };
    // relays first (repeat until stable so chains of pylons light up), then towers
    let changed = true;
    while (changed) {
      changed = false;
      for (const n of this.nodes) {
        if (n === this.root || n.field <= 0 || n.powered) continue;
        const p = pick(n);
        if (p) { n.powered = true; n.parent = p; changed = true; }
      }
    }
    for (const n of this.nodes) {
      if (n.field > 0 || n === this.root) continue;
      const p = pick(n);
      n.powered = !!p;
      if (p) { n.parent = p; used.set(p, (used.get(p) ?? 0) + 1); }
    }
    for (const n of this.nodes) {
      const was = prevPowered.get(n);
      if (n.kind !== 'cylinder' && was !== n.powered) {
        (n as unknown as { setPowered?: (on: boolean) => void }).setPowered?.(n.powered);
        if (n.field > 0) this.fieldDirty = true;
      }
    }
  }

  update(dt: number, enemies: Enemy[]): void {
    this.time += dt;
    for (const [k, t] of this.cuts) {
      if (t - dt <= 0) this.cuts.delete(k); else this.cuts.set(k, t - dt);
    }
    // severing enemies cut any conduit they touch
    const cutters = enemies.filter(e => e.alive && e.def.severs);
    if (cutters.length) {
      for (const n of this.nodes) {
        if (n === this.root) continue;
        for (const s of this.nodes) {
          if (s.field <= 0 || s === n || dist(s.x, s.y, n.x, n.y) > s.field) continue;
          for (const e of cutters) {
            if (segDist(e, s, n) <= e.def.severs!) {
              const k = key(s, n);
              if (!this.cuts.has(k) && n.parent === s && n.powered) this.onCut?.({ x: (s.x + n.x) / 2, y: (s.y + n.y) / 2 - 20 });
              this.cuts.set(k, LINK_CUT_TIME);
            }
          }
        }
      }
    }
    this.recompute();
    this.draw();
  }

  private draw(): void {
    const g = this.beams;
    g.clear();
    for (const n of this.nodes) {
      if (n === this.root) continue;
      const b = n.beamPoint();
      if (n.powered && n.parent) {
        const a = n.parent.beamPoint();
        const flicker = 0.85 + Math.sin(this.time * 9 + n.id) * 0.15;
        g.lineStyle(9, 0x2a9ad8, 0.16 * flicker); g.lineBetween(a.x, a.y, b.x, b.y);
        g.lineStyle(4, 0x5ad0ff, 0.45 * flicker); g.lineBetween(a.x, a.y, b.x, b.y);
        g.lineStyle(1.5, 0xe6fbff, 0.9); g.lineBetween(a.x, a.y, b.x, b.y);
        // energy pulses flowing outwards
        const len = Math.max(1, dist(a.x, a.y, b.x, b.y));
        for (let k = 0; k < 2; k++) {
          const t = ((this.time * 140) / len + k * 0.5 + n.id * 0.37) % 1;
          const px = a.x + (b.x - a.x) * t, py = a.y + (b.y - a.y) * t;
          g.fillStyle(0x9feaff, 0.35); g.fillCircle(px, py, 5);
          g.fillStyle(0xffffff, 0.95); g.fillCircle(px, py, 2.2);
        }
      } else {
        // show the broken conduit to the nearest source in range
        let src: PowerNode | null = null, bd = Infinity;
        for (const s of this.nodes) {
          if (s.field <= 0 || s === n) continue;
          const d = dist(s.x, s.y, n.x, n.y);
          if (d <= s.field && d < bd) { bd = d; src = s; }
        }
        if (src && this.isCut(src, n) && Math.sin(this.time * 18) > -0.2) {
          const a = src.beamPoint();
          const steps = 10;
          g.lineStyle(2, 0xff5a5a, 0.8);
          for (let i = 0; i < steps; i += 2) {
            const t0 = i / steps, t1 = (i + 1) / steps;
            g.lineBetween(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0, a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
          }
        }
      }
    }
    // capacity pips above every source
    for (const src of this.sources) {
      if (!src.powered) continue;
      const bp = src.beamPoint();
      const n = this.load(src);
      const y = bp.y - (src.kind === 'cylinder' ? 58 : 22);
      for (let i = 0; i < src.capacity; i++) {
        const x = bp.x + (i - (src.capacity - 1) / 2) * 9;
        if (i < n) { g.fillStyle(0x9feaff, 0.45); g.fillCircle(x, y, 4.5); g.fillStyle(0xffffff, 1); g.fillCircle(x, y, 2.4); }
        else { g.lineStyle(1.5, 0x9feaff, 0.7); g.strokeCircle(x, y, 3); }
      }
    }
    if (this.fieldDirty) this.drawField();
  }

  private drawField(): void {
    this.fieldDirty = false;
    const g = this.fieldGfx;
    g.clear();
    const strong = this.fieldStrong;
    for (const s of this.sources) {
      if (!s.powered) continue;
      g.fillStyle(0x5ad0ff, strong ? 0.07 : 0.035);
      g.fillCircle(s.x, s.y, s.field);
    }
    for (const s of this.sources) {
      if (!s.powered) continue;
      g.lineStyle(strong ? 2.5 : 1.5, 0x9feaff, strong ? 0.55 : 0.22);
      g.strokeCircle(s.x, s.y, s.field);
    }
  }
}
