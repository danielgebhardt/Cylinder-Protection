import type * as Phaser from 'phaser';
import { tex, lg, rg, ell, circ, rrect, poly, shape, limb, softShadow, hex, sh, rgba } from './draw';
import type { Ctx } from './draw';
import { TOWERS, ELEMENT_COLOR } from '../data/towers';
import type { TowerSpec } from '../data/towers';

/**
 * Bloom towers. Each tower is a rooted stone planter with its stem (static texture) plus a
 * flower head sprite that sways, pulses when it fires and wilts when it loses power.
 * The planter's ground anchor is (45, 100) on a 90 x 116 canvas.
 */

export const PED_TEX = { w: 90, h: 116, ox: 0.5, oy: 100 / 116 };
/** Where the flower head sits, relative to the planter's ground anchor. */
export const CRYSTAL_Y: Record<string, number> = {};
export const PYLON_TEX = { w: 56, h: 124, ox: 0.5, oy: 112 / 124, tipY: -92 };

const NIGHT = 'rgba(10,15,26,0.9)';

function up(c: number, a = 0.35): string { return sh(c, a); }

/* ------------------------------ planters ---------------------------- */

function planter(c: Ctx, spec: TowerSpec): number {
  const colors = spec.elements.map(e => ELEMENT_COLOR[e]);
  const fused = spec.fused;
  softShadow(c, 45, 102, 36, 11, 0.5);
  // roots spilling over the rim
  for (const [x0, x1, y1] of [[28, 20, 100], [62, 70, 99], [36, 33, 101], [55, 60, 101]] as const) limb(c, x0, 84, x1, y1, 2.2, '#4a3426', NIGHT);
  // stone pot
  shape(c, cc => { cc.moveTo(19, 80); cc.lineTo(24, 98); cc.quadraticCurveTo(45, 104, 66, 98); cc.lineTo(71, 80); cc.closePath(); },
    lg(c, 19, 0, 71, 0, [[0, '#3a4656'], [0.35, '#7a8a9e'], [1, '#2e3846']]), NIGHT, 2);
  c.strokeStyle = 'rgba(10,15,26,0.5)'; c.lineWidth = 1;
  for (const x of [32, 45, 58]) { c.beginPath(); c.moveTo(x, 82); c.lineTo(x + (x - 45) * 0.1, 99); c.stroke(); }
  // glowing rune(s) on the front
  colors.forEach((col, i) => {
    const gx = colors.length === 1 ? 45 : 39 + i * 12, gy = 90;
    c.fillStyle = rg(c, gx, gy, 9, [[0, rgba(col, 0.9)], [1, rgba(col, 0)]]);
    c.fillRect(gx - 9, gy - 9, 18, 18);
    poly(c, [gx, gy - 5, gx + 3, gy, gx, gy + 5, gx - 3, gy], up(col, 0.5), 'rgba(10,15,26,0.6)', 1);
  });
  // rim and mossy soil
  ell(c, 45, 80, 27, 8, lg(c, 0, 72, 0, 88, [[0, '#aab6c6'], [1, '#6a7a8e']]), NIGHT, 2);
  ell(c, 45, 80, 22, 5.5, '#1e1a16', null);
  for (const [mx, my] of [[34, 79], [52, 81], [44, 78]]) ell(c, mx, my, 6, 2.2, '#2f7a4a', null);
  if (fused) for (const s of [-1, 1]) circ(c, 45 + s * 25, 80, 3, '#cfe6f0', NIGHT, 1);
  // stem(s) and leaves
  const top = fused ? 36 : 46;
  const stems = fused ? [-1, 1] : [0];
  for (const s of stems) {
    c.strokeStyle = NIGHT; c.lineWidth = 6;
    c.beginPath(); c.moveTo(45 + s * 4, 79); c.bezierCurveTo(45 - 10 - s * 6, 66, 45 + 10 + s * 6, 52, 45, top + 2); c.stroke();
    c.strokeStyle = s < 0 ? '#2f8a4a' : '#3f9a5a'; c.lineWidth = 3.4; c.stroke();
  }
  for (const [lx, ly, dir] of [[40, 66, -1], [50, 56, 1], ...(fused ? [[39, 48, -1]] : [])] as [number, number, number][]) {
    shape(c, cc => { cc.moveTo(lx, ly); cc.quadraticCurveTo(lx + dir * 12, ly - 12, lx + dir * 20, ly - 4); cc.quadraticCurveTo(lx + dir * 10, ly + 2, lx, ly); },
      lg(c, lx, ly - 10, lx + dir * 20, ly, [[0, '#5ac07a'], [1, '#2a6a3a']]), NIGHT, 1.4);
    c.strokeStyle = rgba(colors[0], 0.8); c.lineWidth = 0.8; c.beginPath(); c.moveTo(lx, ly); c.lineTo(lx + dir * 16, ly - 4); c.stroke();
  }
  // sepal cup the flower sits in
  shape(c, cc => { cc.moveTo(38, top + 2); cc.lineTo(41, top + 8); cc.lineTo(45, top + 4); cc.lineTo(49, top + 8); cc.lineTo(52, top + 2); cc.closePath(); }, '#3f9a5a', NIGHT, 1.2);
  return top;
}

/* ------------------------------ flower heads ------------------------ */

type Petal = 'pointed' | 'round' | 'thin';

/** Draw n petals radiating from the centre (in a slightly flattened, front-facing view). */
function petals(c: Ctx, n: number, len: number, width: number, kind: Petal, fill: (i: number) => string | CanvasGradient, rot = 0, edge = NIGHT): void {
  for (let i = 0; i < n; i++) {
    c.save();
    c.rotate(rot + (i / n) * Math.PI * 2);
    c.beginPath();
    c.moveTo(0, 0);
    if (kind === 'round') { c.bezierCurveTo(width, -len * 0.35, width, -len, 0, -len); c.bezierCurveTo(-width, -len, -width, -len * 0.35, 0, 0); }
    else { c.bezierCurveTo(width, -len * 0.35, width * (kind === 'thin' ? 0.3 : 0.55), -len * 0.8, 0, -len); c.bezierCurveTo(-width * (kind === 'thin' ? 0.3 : 0.55), -len * 0.8, -width, -len * 0.35, 0, 0); }
    c.fillStyle = fill(i); c.fill();
    c.strokeStyle = edge; c.lineWidth = 1.3; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(0, -len * 0.15); c.lineTo(0, -len * 0.75); c.stroke();
    c.restore();
  }
}

function core(c: Ctx, r: number, inner: string, outer: string): void {
  circ(c, 0, 0, r, rg(c, 0, 0, r, [[0, '#ffffff'], [0.45, inner], [1, outer]], -r * 0.3, -r * 0.3), NIGHT, 1.2);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; circ(c, Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, 0.9, 'rgba(255,255,255,0.8)', null); }
}

function petalPaint(c: Ctx, a: number, b: number, len: number): CanvasGradient {
  return lg(c, 0, 0, 0, -len, [[0, up(b, 0.45)], [0.35, hex(a)], [1, up(a, 0.45)]]);
}

function drawBloom(c: Ctx, spec: TowerSpec, w: number, h: number): void {
  const cols = spec.elements.map(e => ELEMENT_COLOR[e]);
  const a = cols[0], b = cols[cols.length - 1];
  const cx = w / 2, cy = h / 2;
  c.fillStyle = rg(c, cx, cy, Math.min(w, h) / 2, [[0, rgba(a, 0.5)], [0.6, rgba(b, 0.16)], [1, rgba(b, 0)]]);
  c.fillRect(0, 0, w, h);
  c.save();
  c.translate(cx, cy);
  c.scale(1, 0.86);
  const L = spec.fused ? 21 : 16;
  switch (spec.id) {
    case 'fire':
      petals(c, 5, L, 7, 'pointed', () => petalPaint(c, a, 0xffe08a, L), -0.2);
      core(c, 5, '#ffd36e', '#e05a1a');
      break;
    case 'frost':
      petals(c, 6, L, 5, 'pointed', () => petalPaint(c, a, 0xffffff, L));
      core(c, 4, '#dff8ff', '#4aa8e0');
      break;
    case 'storm':
    case 'tempest':
    case 'plasma':
    case 'blizzard': {
      // orchid: three broad petals, two thin sepals and a lip
      const lip = spec.id === 'plasma' ? 0xffd36e : spec.id === 'blizzard' ? 0xbff4ff : 0xffffff;
      petals(c, 2, L * 1.05, 4, 'thin', () => petalPaint(c, b, a, L), Math.PI * 0.75, NIGHT);
      petals(c, 3, L, 8, 'round', () => petalPaint(c, a, b, L), 0, NIGHT);
      shape(c, cc => { cc.moveTo(-5, 1); cc.quadraticCurveTo(0, L * 0.8, 5, 1); cc.closePath(); }, up(lip, 0.1), NIGHT, 1.2);
      c.strokeStyle = '#ffffff'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(-2, -L * 0.75); c.lineTo(2, -L * 0.5); c.lineTo(-1, -L * 0.3); c.stroke();
      core(c, 3.4, '#ffffff', hex(lip));
      if (spec.id === 'tempest') { c.save(); c.scale(0.55, 0.55); c.translate(L * 1.4, L * 0.6); petals(c, 3, L, 8, 'round', () => petalPaint(c, a, b, L), 0.5); c.restore(); }
      break;
    }
    case 'earth':
    case 'monolith':
    case 'tremor': {
      // thistle: spiky round head over a scaly cup
      const head = spec.id === 'tremor' ? ELEMENT_COLOR.storm : spec.id === 'monolith' ? 0xc8ccd8 : a;
      const r = spec.fused ? 13 : 10;
      for (let i = 0; i < 18; i++) {
        const ang = -Math.PI + (i / 17) * Math.PI;
        const x1 = Math.cos(ang) * r * 0.6, y1 = Math.sin(ang) * r * 0.6 - 2;
        limb(c, x1, y1, Math.cos(ang) * (r + 7), Math.sin(ang) * (r + 7) - 3, 1.4, up(head, 0.2), NIGHT);
      }
      ell(c, 0, -2, r * 0.9, r * 0.75, rg(c, 0, -2, r, [[0, '#ffffff'], [0.35, up(head, 0.3)], [1, hex(head)]], -2, -5), NIGHT, 1.4);
      shape(c, cc => { cc.moveTo(-r, 0); cc.quadraticCurveTo(0, r * 1.5, r, 0); cc.quadraticCurveTo(0, r * 0.4, -r, 0); }, lg(c, 0, 0, 0, r, [[0, '#7a6a3a'], [1, '#4a3a20']]), NIGHT, 1.4);
      c.strokeStyle = 'rgba(255,220,140,0.7)'; c.lineWidth = 0.9;
      for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * r * 0.3, r * 0.2); c.lineTo(i * r * 0.22, r * 0.75); c.stroke(); }
      break;
    }
    case 'inferno':
      petals(c, 7, L, 9, 'round', () => petalPaint(c, 0xc0301a, 0xff7a2a, L), 0.2);
      petals(c, 6, L * 0.7, 7, 'round', () => petalPaint(c, a, 0xffd36e, L * 0.7), 0.5);
      petals(c, 5, L * 0.42, 5, 'round', () => petalPaint(c, 0xffd36e, 0xffffff, L * 0.42), 0.1);
      break;
    case 'permafrost':
      petals(c, 8, L, 5.5, 'pointed', () => petalPaint(c, a, 0xffffff, L), 0.2);
      petals(c, 6, L * 0.6, 4, 'pointed', () => petalPaint(c, 0xffffff, a, L * 0.6));
      core(c, 4.5, '#ffffff', '#4aa8e0');
      break;
    case 'steam':
      petals(c, 8, L, 8, 'round', (i) => petalPaint(c, i % 2 ? a : b, 0xffffff, L), 0.2);
      petals(c, 6, L * 0.62, 6, 'round', () => petalPaint(c, 0xffffff, b, L * 0.62));
      core(c, 4.5, '#fff0d0', '#ff9a5a');
      c.fillStyle = 'rgba(255,255,255,0.35)';
      for (const [x, y, r] of [[-8, -L, 5], [6, -L - 4, 6], [0, -L - 9, 4]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
      break;
    case 'magma':
      petals(c, 7, L, 6, 'pointed', () => lg(c, 0, 0, 0, -L, [[0, '#ffb030'], [0.4, '#7a1a0a'], [1, '#2a0a06']]), 0.1);
      for (let i = 0; i < 7; i++) { const ang = i * Math.PI * 2 / 7 + 0.55; limb(c, Math.cos(ang) * 6, Math.sin(ang) * 6, Math.cos(ang) * (L - 2), Math.sin(ang) * (L - 2), 0.8, '#ffb030', 'rgba(0,0,0,0)'); }
      core(c, 5.5, '#ffd36e', '#e0501a');
      break;
    case 'glacier':
      petals(c, 6, L, 5, 'pointed', () => petalPaint(c, a, 0xffffff, L), 0.25);
      petals(c, 3, L * 0.6, 7, 'round', () => petalPaint(c, b, 0x7a5a2a, L * 0.6), 0.7);
      core(c, 4.5, '#ffe8a8', '#c08a30');
      break;
  }
  c.restore();
}

/* ------------------------------ moth lantern ------------------------ */

function drawLantern(c: Ctx): void {
  softShadow(c, 28, 114, 18, 6, 0.5);
  // twisted wooden post
  c.strokeStyle = NIGHT; c.lineWidth = 7;
  c.beginPath(); c.moveTo(28, 112); c.bezierCurveTo(22, 90, 34, 70, 28, 46); c.stroke();
  c.strokeStyle = '#4a3426'; c.lineWidth = 4.4; c.stroke();
  c.strokeStyle = '#6a4a36'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(27, 108); c.bezierCurveTo(21, 88, 33, 70, 27, 50); c.stroke();
  ell(c, 28, 112, 12, 4, '#2f6a4a', null);
  // hook and lantern cage
  c.strokeStyle = '#cfe6f0'; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(28, 46); c.lineTo(28, 38); c.stroke();
  c.fillStyle = rg(c, 28, 22, 22, [[0, 'rgba(191,250,255,0.85)'], [0.5, 'rgba(122,240,224,0.35)'], [1, 'rgba(122,240,224,0)']]);
  c.beginPath(); c.arc(28, 22, 22, 0, Math.PI * 2); c.fill();
  rrect(c, 19, 8, 18, 28, 7, 'rgba(160,230,255,0.25)', '#cfe6f0', 1.6);
  for (const x of [23.5, 28, 32.5]) { c.beginPath(); c.moveTo(x, 9); c.lineTo(x, 35); c.strokeStyle = 'rgba(207,230,240,0.7)'; c.lineWidth = 1; c.stroke(); }
  rrect(c, 17, 5, 22, 5, 2, '#8a9aae', NIGHT, 1.2);
  rrect(c, 17, 34, 22, 4, 2, '#8a9aae', NIGHT, 1.2);
  // the glowing moth inside
  ell(c, 24, 21, 4.5, 3.5, '#e6fbff', null); ell(c, 32, 21, 4.5, 3.5, '#e6fbff', null);
  ell(c, 28, 22, 1.3, 4, '#2a3a4a', null);
}

/* ------------------------------ projectiles ------------------------- */

function generateProjectiles(scene: Phaser.Scene): void {
  tex(scene, 'iceshard', 24, 10, c => {
    poly(c, [0, 5, 8, 1, 24, 5, 8, 9], lg(c, 0, 0, 24, 0, [[0, '#4aa8e0'], [0.6, '#bff4ff'], [1, '#ffffff']]), '#2a6a9a', 1.2);
  });
  tex(scene, 'boulder', 20, 20, c => {
    poly(c, [3, 9, 7, 3, 14, 2, 18, 8, 16, 16, 8, 18, 3, 14], lg(c, 3, 2, 18, 18, [[0, '#a8b0bc'], [1, '#4a5260']]), NIGHT, 1.6);
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
    let top = 0;
    tex(scene, `ped_${spec.id}`, PED_TEX.w, PED_TEX.h, c => { top = planter(c, spec); });
    CRYSTAL_Y[spec.id] = top - 100 - (spec.fused ? 6 : 5);
    const s = spec.fused ? 58 : 46;
    tex(scene, `crystal_${spec.id}`, s, s, c => drawBloom(c, spec, s, s));
  }
  tex(scene, 'pylon', PYLON_TEX.w, PYLON_TEX.h, c => drawLantern(c));
  // petals that orbit greater blooms
  for (const [el, col] of Object.entries(ELEMENT_COLOR)) {
    tex(scene, `orbit_${el}`, 12, 16, c => {
      shape(c, cc => { cc.moveTo(6, 1); cc.bezierCurveTo(11, 5, 11, 12, 6, 15); cc.bezierCurveTo(1, 12, 1, 5, 6, 1); },
        lg(c, 0, 0, 0, 16, [[0, '#ffffff'], [0.5, up(col, 0.3)], [1, hex(col)]]), NIGHT, 1);
    });
  }
  generateProjectiles(scene);
}
