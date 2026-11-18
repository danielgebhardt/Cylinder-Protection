import type * as Phaser from 'phaser';
import { tex, lg, rg, ell, circ, rrect, poly, shape, limb, gloss, softShadow, cyl, hex, sh, rgba, OUT } from './draw';
import type { Ctx } from './draw';
import { TOWERS, ELEMENT_COLOR } from '../data/towers';
import type { TowerSpec } from '../data/towers';

/**
 * Crystal tower art. Each tower is a carved pedestal (static) plus a floating crystal
 * sprite that bobs, pulses when it fires and dims when the tower loses power.
 * The pedestal's ground anchor is (45, 100) on a 90 x 116 canvas.
 */

export const PED_TEX = { w: 90, h: 116, ox: 0.5, oy: 100 / 116 };
/** Where the crystal floats, relative to the pedestal ground anchor. */
export const CRYSTAL_Y: Record<string, number> = {};
export const PYLON_TEX = { w: 56, h: 124, ox: 0.5, oy: 112 / 124, tipY: -96 };

/* ------------------------------ pedestals --------------------------- */

function runeRing(c: Ctx, cx: number, cy: number, rx: number, ry: number, colors: number[]): void {
  colors.forEach((col, i) => {
    const a0 = colors.length === 1 ? 0 : i * Math.PI, a1 = colors.length === 1 ? Math.PI * 2 : (i + 1) * Math.PI;
    c.save();
    c.strokeStyle = rgba(col, 0.35); c.lineWidth = 6;
    c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, a0, a1); c.stroke();
    c.strokeStyle = hex(shadeUp(col)); c.lineWidth = 2;
    c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, a0, a1); c.stroke();
    c.restore();
  });
  // rune ticks
  c.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    c.fillRect(cx + Math.cos(a) * rx - 1, cy + Math.sin(a) * ry - 1, 2, 2);
  }
}
function shadeUp(c: number): number { return parseInt(sh(c, 0.35).slice(1), 16); }

function pedestal(c: Ctx, spec: TowerSpec): number {
  const colors = spec.elements.map(e => ELEMENT_COLOR[e]);
  const fused = spec.fused;
  const greater = fused && spec.elements[0] === spec.elements[1];
  softShadow(c, 45, 102, 40, 12, 0.45);
  // base disc
  ell(c, 45, 99, 36, 12, lg(c, 0, 87, 0, 111, [[0, '#aaa18f'], [1, '#5f574c']]), OUT, 2);
  ell(c, 45, 96, 31, 9, lg(c, 0, 87, 0, 105, [[0, '#c4bba8'], [1, '#948b7a']]), null);
  runeRing(c, 45, 96, 25, 7, colors);
  // pillar
  const top = fused ? 50 : 58;
  const stone = fused ? 0x8f8678 : 0x9d9483;
  poly(c, [31, 96, 59, 96, 55, top, 35, top], cyl(c, stone, 31, 28), OUT, 2);
  c.strokeStyle = 'rgba(42,27,18,0.35)'; c.lineWidth = 1;
  for (let y = top + 9; y < 94; y += 9) { c.beginPath(); c.moveTo(33, y); c.lineTo(57, y); c.stroke(); }
  // glowing glyph(s) on the pillar
  colors.forEach((col, i) => {
    const gx = colors.length === 1 ? 45 : 40 + i * 10, gy = (top + 96) / 2;
    c.fillStyle = rg(c, gx, gy, 9, [[0, rgba(col, 0.9)], [1, rgba(col, 0)]]);
    c.fillRect(gx - 9, gy - 9, 18, 18);
    poly(c, [gx, gy - 6, gx + 3.5, gy, gx, gy + 6, gx - 3.5, gy], hex(shadeUp(col)), 'rgba(42,27,18,0.6)', 1);
  });
  // capital / bowl
  rrect(c, 28, top - 7, 34, 8, 3, lg(c, 0, top - 7, 0, top + 1, [[0, '#d0c8b4'], [1, '#8a8274']]), OUT, 1.8);
  ell(c, 45, top - 7, 15, 4.5, rg(c, 45, top - 7, 15, [[0, rgba(colors[0], 0.95)], [1, rgba(colors[colors.length - 1], 0.4)]]), OUT, 1.5);
  if (fused) {
    // gold trim and side fins for fused towers
    limb(c, 28, top - 2, 62, top - 2, 1.4, '#e8b830');
    for (const s of [-1, 1]) poly(c, [45 + s * 17, top - 4, 45 + s * 24, top - 16, 45 + s * 20, top + 6], lg(c, 0, top - 16, 0, top + 6, [[0, sh(colors[s < 0 ? 0 : colors.length - 1], 0.2)], [1, '#6a6255']]), OUT, 1.5);
  }
  if (greater) for (const s of [-1, 1]) circ(c, 45 + s * 30, 90, 3, '#e8b830', OUT, 1);
  return top - 7;
}

/* ------------------------------ crystals ----------------------------- */

type CrystalShape = 'flame' | 'spikes' | 'diamond' | 'rock' | 'orb' | 'monolith' | 'shard' | 'twin';

const SHAPE: Record<string, CrystalShape> = {
  fire: 'flame', frost: 'spikes', storm: 'diamond', earth: 'rock',
  inferno: 'flame', permafrost: 'spikes', tempest: 'twin', monolith: 'monolith',
  steam: 'orb', plasma: 'diamond', magma: 'rock', blizzard: 'spikes', glacier: 'shard', tremor: 'rock',
};

function crystalPaint(c: Ctx, a: number, b: number, x0: number, y0: number, x1: number, y1: number): CanvasGradient {
  return lg(c, x0, y0, x1, y1, [[0, '#ffffff'], [0.25, sh(a, 0.45)], [0.6, hex(a)], [1, sh(b, -0.25)]]);
}

function drawCrystal(c: Ctx, spec: TowerSpec, w: number, h: number): void {
  const cols = spec.elements.map(e => ELEMENT_COLOR[e]);
  const a = cols[0], b = cols[cols.length - 1];
  const big = spec.fused ? 1.25 : 1;
  const cx = w / 2, cy = h / 2;
  // halo
  c.fillStyle = rg(c, cx, cy, Math.min(w, h) / 2, [[0, rgba(a, 0.45)], [0.6, rgba(b, 0.15)], [1, rgba(b, 0)]]);
  c.fillRect(0, 0, w, h);
  c.save();
  c.translate(cx, cy);
  c.scale(big, big);
  const edge = 'rgba(30,20,40,0.85)';
  switch (SHAPE[spec.id]) {
    case 'flame':
      shape(c, cc => { cc.moveTo(0, -16); cc.bezierCurveTo(9, -6, 10, 4, 0, 13); cc.bezierCurveTo(-10, 4, -9, -6, 0, -16); },
        lg(c, 0, -16, 0, 13, [[0, '#fff6c0'], [0.35, '#ffcf4a'], [0.7, hex(a)], [1, '#c0300a']]), edge, 1.6);
      shape(c, cc => { cc.moveTo(0, -7); cc.bezierCurveTo(4, -2, 4, 4, 0, 8); cc.bezierCurveTo(-4, 4, -4, -2, 0, -7); }, 'rgba(255,255,220,0.85)', null);
      if (spec.fused) for (const s of [-1, 1]) shape(c, cc => { cc.moveTo(s * 6, -2); cc.quadraticCurveTo(s * 14, -6, s * 12, -14); cc.quadraticCurveTo(s * 9, -6, s * 4, 4); cc.closePath(); }, '#ffb347', edge, 1.2);
      break;
    case 'spikes': {
      const n = spec.fused ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const ang = (i - (n - 1) / 2) * 0.38;
        c.save(); c.rotate(ang);
        const len = i === (n - 1) / 2 ? 17 : 12;
        poly(c, [0, -len, 4.5, -len + 6, 3.5, 10, -3.5, 10, -4.5, -len + 6], crystalPaint(c, a, b, -4, -len, 4, 10), edge, 1.3);
        c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(0, -len + 1); c.lineTo(0, 8); c.stroke();
        c.restore();
      }
      if (spec.id === 'blizzard') { c.strokeStyle = '#ffffff'; c.lineWidth = 1.2; for (let k = 0; k < 3; k++) { c.save(); c.rotate(k * Math.PI / 3); c.beginPath(); c.moveTo(0, -5); c.lineTo(0, 5); c.stroke(); c.restore(); } }
      break;
    }
    case 'diamond':
      poly(c, [0, -17, 10, -3, 0, 14, -10, -3], crystalPaint(c, a, b, -10, -17, 10, 14), edge, 1.6);
      poly(c, [-10, -3, 10, -3, 0, 14], 'rgba(0,0,0,0.15)', null);
      poly(c, [0, -17, 3, -3, 0, 14, -3, -3], 'rgba(255,255,255,0.35)', null);
      c.strokeStyle = spec.id === 'plasma' ? '#fff2d0' : '#ffffff'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(-2, -11); c.lineTo(2, -5); c.lineTo(-2, 0); c.lineTo(2, 6); c.stroke();
      break;
    case 'twin':
      for (const [dx, dy, s] of [[-6, -4, 0.75], [6, 2, 0.85]] as const) {
        c.save(); c.translate(dx, dy); c.scale(s, s);
        poly(c, [0, -17, 10, -3, 0, 14, -10, -3], crystalPaint(c, a, b, -10, -17, 10, 14), edge, 1.8);
        c.strokeStyle = '#ffffff'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-2, -11); c.lineTo(2, -5); c.lineTo(-2, 0); c.lineTo(2, 6); c.stroke();
        c.restore();
      }
      break;
    case 'rock': {
      const stone = spec.id === 'magma' ? 0x4a2a1e : spec.id === 'tremor' ? 0x5a5060 : 0x7a6040;
      poly(c, [-11, -6, -5, -14, 6, -13, 12, -4, 10, 8, 0, 13, -10, 8], lg(c, -11, -14, 12, 13, [[0, sh(stone, 0.35)], [1, sh(stone, -0.35)]]), edge, 1.6);
      // glowing core / veins
      const vein = spec.id === 'magma' ? 0xff7a2a : spec.id === 'tremor' ? ELEMENT_COLOR.storm : a;
      c.fillStyle = rg(c, 0, 0, 9, [[0, '#ffffff'], [0.3, hex(shadeUp(vein))], [1, rgba(vein, 0)]]);
      c.beginPath(); c.arc(0, 0, 9, 0, Math.PI * 2); c.fill();
      c.strokeStyle = hex(shadeUp(vein)); c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(-8, -8); c.lineTo(-2, -2); c.lineTo(-6, 5); c.moveTo(7, -9); c.lineTo(2, -1); c.lineTo(8, 5); c.stroke();
      gloss(c, -4, -9, 3, 1.5, 0.35);
      break;
    }
    case 'orb':
      circ(c, 0, 0, 11, rg(c, 0, 0, 12, [[0, '#ffffff'], [0.4, sh(a, 0.3)], [1, hex(b)]], -3, -4), edge, 1.6);
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.4;
      c.beginPath(); c.arc(0, 0, 6, 0.3, 2.6); c.stroke();
      c.beginPath(); c.arc(0, 0, 8.5, 3.4, 5.6); c.stroke();
      gloss(c, -4, -5, 3.2, 1.8, 0.7);
      break;
    case 'monolith':
      poly(c, [-7, -17, 7, -15, 9, 14, -9, 14], lg(c, -9, 0, 9, 0, [[0, '#9a8060'], [0.4, '#c0a070'], [1, '#5a4430']]), edge, 1.6);
      c.fillStyle = hex(shadeUp(a));
      for (const [gx, gy] of [[0, -9], [-2, -1], [1, 7]]) { c.fillRect(gx - 2, gy - 1, 5, 2); c.fillRect(gx, gy - 3, 1.5, 6); }
      c.fillStyle = rg(c, 0, -2, 12, [[0, rgba(a, 0.5)], [1, rgba(a, 0)]]); c.fillRect(-12, -14, 24, 24);
      break;
    case 'shard':
      poly(c, [-2, -18, 7, -6, 5, 8, -6, 10, -8, -4], crystalPaint(c, a, a, -8, -18, 7, 10), edge, 1.6);
      poly(c, [-12, 10, -6, 4, 6, 4, 12, 10, 0, 14], lg(c, 0, 4, 0, 14, [[0, '#a08060'], [1, '#5a4430']]), edge, 1.4);
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-1, -14); c.lineTo(0, 4); c.stroke();
      break;
  }
  c.restore();
}

/* ------------------------------ pylon -------------------------------- */

function drawPylon(c: Ctx): void {
  softShadow(c, 28, 114, 22, 7, 0.45);
  ell(c, 28, 111, 20, 7, lg(c, 0, 104, 0, 118, [[0, '#a59c8a'], [1, '#5f574c']]), OUT, 1.8);
  runeRing(c, 28, 109, 14, 4.2, [0x5ad0ff]);
  poly(c, [17, 109, 39, 109, 33, 30, 23, 30], cyl(c, 0x8a8a96, 17, 22), OUT, 2);
  c.strokeStyle = 'rgba(90,208,255,0.9)'; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(28, 100); c.lineTo(28, 40); c.stroke();
  for (const y of [55, 75, 95]) { rrect(c, 20 + (y - 30) * 0.03, y - 2, 16 - (y - 30) * 0.06, 4, 1.5, '#e8b830', OUT, 1); }
  // claws holding the crystal
  for (const s of [-1, 1]) poly(c, [28 + s * 5, 32, 28 + s * 12, 18, 28 + s * 8, 14, 28 + s * 3, 26], lg(c, 0, 14, 0, 32, [[0, '#c0c0cc'], [1, '#6a6a76']]), OUT, 1.4);
  poly(c, [28, 4, 34, 16, 28, 30, 22, 16], lg(c, 22, 4, 34, 30, [[0, '#ffffff'], [0.4, '#9feaff'], [1, '#2a8ac0']]), 'rgba(20,40,60,0.9)', 1.6);
  poly(c, [28, 4, 30, 16, 28, 30, 26, 16], 'rgba(255,255,255,0.45)', null);
}

/* ------------------------------ projectiles ------------------------- */

function generateProjectiles(scene: Phaser.Scene): void {
  tex(scene, 'iceshard', 24, 10, c => {
    poly(c, [0, 5, 8, 1, 24, 5, 8, 9], lg(c, 0, 0, 24, 0, [[0, '#4aa8e0'], [0.6, '#bff4ff'], [1, '#ffffff']]), '#2a6a9a', 1.2);
  });
  tex(scene, 'boulder', 20, 20, c => {
    poly(c, [3, 9, 7, 3, 14, 2, 18, 8, 16, 16, 8, 18, 3, 14], lg(c, 3, 2, 18, 18, [[0, '#b8a080'], [1, '#5a4430']]), OUT, 1.6);
    c.strokeStyle = 'rgba(255,200,90,0.9)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(8, 6); c.lineTo(11, 10); c.lineTo(9, 14); c.stroke();
  });
  tex(scene, 'magmaglob', 20, 20, c => {
    c.fillStyle = rg(c, 10, 10, 10, [[0, 'rgba(255,200,90,0.9)'], [1, 'rgba(255,90,20,0)']]); c.fillRect(0, 0, 20, 20);
    poly(c, [4, 9, 8, 4, 14, 4, 16, 10, 13, 16, 6, 15], rg(c, 10, 10, 8, [[0, '#ffd36e'], [0.5, '#e0501a'], [1, '#4a1a0a']], 8, 8), '#2a0a00', 1.4);
  });
}

/* ------------------------------ registration ------------------------ */

export function generateTowers(scene: Phaser.Scene): void {
  for (const spec of Object.values(TOWERS)) {
    let bowl = 0;
    tex(scene, `ped_${spec.id}`, PED_TEX.w, PED_TEX.h, c => { bowl = pedestal(c, spec); });
    CRYSTAL_Y[spec.id] = bowl - 100 - (spec.fused ? 20 : 16);
    const s = spec.fused ? 56 : 46;
    tex(scene, `crystal_${spec.id}`, s, s, c => drawCrystal(c, spec, s, s));
  }
  tex(scene, 'pylon', PYLON_TEX.w, PYLON_TEX.h, c => drawPylon(c));
  for (const [el, col] of Object.entries(ELEMENT_COLOR)) {
    tex(scene, `orbit_${el}`, 12, 16, c => poly(c, [6, 0, 11, 7, 6, 16, 1, 7], lg(c, 0, 0, 12, 16, [[0, '#ffffff'], [0.4, sh(col, 0.3)], [1, hex(col)]]), 'rgba(30,20,40,0.8)', 1));
  }
  generateProjectiles(scene);
}
