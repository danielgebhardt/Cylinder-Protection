import type * as Phaser from 'phaser';
import { tex, lg, rg, ell, circ, rrect, poly, shape, limb, gloss, softShadow, cyl, hex, sh, rgba, OUT } from './draw';
import type { Ctx } from './draw';

/**
 * Tower art. Bodies are drawn in "design" coordinates where the ground centre is (52, 100),
 * then shifted onto a taller canvas. Moving parts (archers, barrels, orbs, flags) are separate
 * sprites; TOWER_PARTS says where they sit relative to the tower's ground anchor.
 */

const DX = 3, DY = 44;
export const TOWER_TEX = { w: 110, h: 168, ox: (52 + DX) / 110, oy: (100 + DY) / 168 };

export type WeaponKind = 'archers' | 'orb' | 'barrel' | 'mortar' | 'rocket' | 'none';

export interface TowerParts {
  weapon: WeaponKind;
  weaponKey: string;
  /** positions relative to the tower ground anchor */
  mounts: { x: number; y: number }[];
  flag?: { x: number; y: number; color: string };
}

export const TOWER_PARTS: Record<string, TowerParts> = {};

const rel = (x: number, y: number) => ({ x: x - 52, y: y - 100 });

function platform(c: Ctx): void {
  softShadow(c, 52, 103, 50, 15, 0.45);
  ell(c, 52, 100, 41, 13.5, lg(c, 0, 88, 0, 114, [[0, '#a59c8a'], [1, '#5f574c']]), OUT, 2);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const x = 52 + Math.cos(a) * 36, y = 100 + Math.sin(a) * 11;
    if (Math.sin(a) < -0.2) continue;
    ell(c, x, y, 6, 3.6, lg(c, 0, y - 4, 0, y + 4, [[0, '#b8b0a0'], [1, '#7d7466']]), 'rgba(42,27,18,0.7)', 1);
  }
  ell(c, 52, 97, 34, 9.5, lg(c, 0, 88, 0, 106, [[0, '#bdb4a2'], [1, '#948b7a']]), null);
}

function flagPole(c: Ctx, x: number, y0: number, y1: number): void {
  limb(c, x, y0, x, y1, 1.8, '#6b4a2a');
  circ(c, x, y1 - 1, 2, '#d4a017', OUT, 1);
}

function roofTiles(c: Ctx, x0: number, x1: number, base: number, apex: number, ax: number, color: number): void {
  shape(c, cc => { cc.moveTo(x0, base); cc.lineTo(ax, apex); cc.lineTo(x1, base); cc.quadraticCurveTo(ax, base + 5, x0, base); },
    lg(c, x0, apex, x1, base, [[0, sh(color, 0.3)], [0.5, hex(color)], [1, sh(color, -0.35)]]), OUT, 2.2);
  c.save();
  c.beginPath(); c.moveTo(x0, base); c.lineTo(ax, apex); c.lineTo(x1, base); c.quadraticCurveTo(ax, base + 5, x0, base); c.clip();
  c.strokeStyle = rgba(0x000000, 0.22); c.lineWidth = 1.2;
  for (let t = 0.25; t < 1; t += 0.2) {
    const y = apex + (base - apex) * t;
    c.beginPath(); c.moveTo(ax - (ax - x0) * t - 2, y); c.quadraticCurveTo(ax, y + 4 * t, ax + (x1 - ax) * t + 2, y); c.stroke();
  }
  c.fillStyle = 'rgba(255,255,255,0.18)';
  c.beginPath(); c.moveTo(ax, apex + 2); c.lineTo(x0 + (ax - x0) * 0.35, base); c.lineTo(x0 + (ax - x0) * 0.6, base); c.closePath(); c.fill();
  c.restore();
}

function bricks(c: Ctx, x0: number, x1: number, y0: number, y1: number, color: number, rowH = 7): void {
  c.save();
  c.beginPath(); c.rect(x0, y0, x1 - x0, y1 - y0); c.clip();
  c.strokeStyle = rgba(shadeNum(color, -0.5), 0.55); c.lineWidth = 1;
  let row = 0;
  for (let y = y0 + rowH; y < y1; y += rowH, row++) {
    c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
    for (let x = x0 + (row % 2 ? 4 : 10); x < x1; x += 12) { c.beginPath(); c.moveTo(x, y - rowH); c.lineTo(x, y); c.stroke(); }
  }
  c.restore();
}
function shadeNum(c: number, a: number): number { return parseInt(sh(c, a).slice(1), 16); }

/* ------------------------------ archer ------------------------------ */

function drawArcherTower(c: Ctx, tier: number, variant: string, id: string): void {
  platform(c);
  const h = [0, 30, 36, 42, 46][tier];
  const top = 96 - h;
  const wood = variant === 'marksman' ? 0x7a6650 : 0x8a5a32;
  poly(c, [30, 97, 74, 97, 69, top, 35, top], cyl(c, wood, 30, 44), OUT, 2);
  c.strokeStyle = rgba(0x2a1b12, 0.45); c.lineWidth = 1.2;
  for (let y = top + 7; y < 96; y += 7) { c.beginPath(); c.moveTo(31, y); c.lineTo(73, y); c.stroke(); }
  limb(c, 35, top + 3, 70, 94, 2.2, sh(wood, -0.25));
  limb(c, 69, top + 3, 34, 94, 2.2, sh(wood, -0.25));
  // deck & railing
  rrect(c, 22, top - 8, 60, 9, 2, lg(c, 0, top - 8, 0, top + 1, [[0, sh(wood, 0.35)], [1, sh(wood, -0.2)]]), OUT, 2);
  for (const x of [25, 39, 65, 79]) rrect(c, x - 2, top - 17, 4, 10, 1, sh(wood, 0.1), OUT, 1.3);
  limb(c, 24, top - 15, 80, top - 15, 1.8, sh(wood, 0.25));
  const deckY = top - 8;
  let roofBase = deckY;
  if (tier >= 2) {
    const roof = variant === 'ranger' ? 0x2f8a32 : variant === 'marksman' ? 0x2f5aa8 : [0, 0x9a5a2a, 0xa8442e, 0xb83a2e][Math.min(3, tier)];
    roofBase = deckY - 34;
    limb(c, 26, deckY, 26, roofBase, 2.4, sh(wood, -0.1));
    limb(c, 78, deckY, 78, roofBase, 2.4, sh(wood, -0.1));
    roofTiles(c, 16, 88, roofBase + 2, roofBase - 26, 52, roof);
  }
  if (variant === 'ranger') {
    for (const [x, y, r] of [[28, 92, 9], [78, 90, 8], [24, 84, 6]] as const) circ(c, x, y, r, rg(c, x, y, r, [[0, '#6ac04a'], [1, '#2f7a2a']], x - 2, y - 3), OUT, 1.4);
  }
  const archers = tier >= 3 ? [rel(41, deckY), rel(63, deckY)] : [rel(52, deckY)];
  const flagColor = variant === 'marksman' ? '#5ab0ff' : variant === 'ranger' ? '#8be04e' : '#f2c14e';
  let flag: TowerParts['flag'];
  if (tier >= 3) { flagPole(c, 52, roofBase - 24, roofBase - 46); flag = { ...rel(53, roofBase - 46), color: flagColor }; }
  TOWER_PARTS[id] = { weapon: 'archers', weaponKey: `archer_${variant || 'basic'}`, mounts: archers, flag };
}

/* ------------------------------ mage ------------------------------- */

function drawMageTower(c: Ctx, tier: number, variant: string, id: string): void {
  platform(c);
  const h = [0, 40, 46, 52, 56][tier];
  const top = 96 - h;
  const stone = variant === 'frost' ? 0xb4cfe0 : variant === 'arcane' ? 0x6f6290 : 0xa39888;
  // flared base
  poly(c, [26, 97, 78, 97, 72, 86, 32, 86], cyl(c, sh2(stone, -0.1), 26, 52), OUT, 2);
  rrect(c, 32, top, 40, h, 4, cyl(c, stone, 32, 40), OUT, 2.2);
  bricks(c, 33, 71, top + 2, 96, stone);
  // windows
  const glow = variant === 'frost' ? '#9fe8ff' : variant === 'arcane' ? '#e39bff' : '#ffd36e';
  for (const [wx, wy] of [[52, top + 12], ...(tier >= 2 ? [[52, top + 30]] : [])] as [number, number][]) {
    rrect(c, wx - 6, wy - 1, 12, 15, [6, 6, 1, 1], '#2a1f3a', OUT, 1.6);
    c.fillStyle = rg(c, wx, wy + 8, 9, [[0, glow], [1, 'rgba(0,0,0,0)']]);
    c.fillRect(wx - 9, wy - 2, 18, 18);
    rrect(c, wx - 4, wy + 1.5, 8, 11, 3, glow, null);
    limb(c, wx, wy + 1, wx, wy + 13, 0.8, '#2a1f3a', '#2a1f3a');
  }
  // roof
  const roof = variant === 'frost' ? 0x3f8fd0 : variant === 'arcane' ? 0x5a1fa0 : [0, 0x5c3c9e, 0x5a35a8, 0x6331b8][Math.min(3, tier)];
  const apex = top - 44;
  roofTiles(c, 24, 80, top + 2, apex, 52, roof);
  rrect(c, 24, top - 1, 56, 5, 2, lg(c, 0, top - 1, 0, top + 4, [[0, '#ffe58a'], [1, '#b07a10']]), OUT, 1.4);
  if (variant === 'frost') {
    for (const x of [30, 38, 47, 58, 66, 74]) poly(c, [x - 2.5, top + 4, x + 2.5, top + 4, x, top + 10 + (x % 3) * 2], '#e6fbff', '#3f8fd0', 0.8);
  }
  if (variant === 'arcane') {
    for (const [x, y] of [[22, top + 20], [82, top + 30]]) poly(c, [x, y - 7, x + 4, y, x, y + 7, x - 4, y], '#d27cff', OUT, 1.2);
  }
  circ(c, 52, apex, 2.5, '#ffd23a', OUT, 1);
  const flag = tier >= 3 ? { ...rel(77, top - 2), color: variant === 'frost' ? '#8fdcff' : variant === 'arcane' ? '#d27cff' : '#f2c14e' } : undefined;
  if (flag) flagPole(c, 76, top + 2, top - 20);
  if (flag) flag.y = top - 20 - 100;
  TOWER_PARTS[id] = { weapon: 'orb', weaponKey: `orb_${variant || 'basic'}`, mounts: [rel(52, apex - 12)], flag };
}
function sh2(c: number, a: number): number { return shadeNum(c, a); }

/* ------------------------------ cannon ----------------------------- */

function drawCannonTower(c: Ctx, tier: number, variant: string, id: string): void {
  platform(c);
  const h = [0, 26, 30, 34, 36][tier];
  const top = 96 - h;
  const stone = variant === 'rocket' ? 0x9a7a62 : 0x958f84;
  rrect(c, 20, top, 64, h + 1, 6, cyl(c, stone, 20, 64), OUT, 2.2);
  bricks(c, 21, 83, top + 1, 96, stone, 8);
  for (let x = 21; x < 82; x += 13) rrect(c, x, top - 8, 9, 9, 2, lg(c, 0, top - 8, 0, top + 1, [[0, sh(stone, 0.3)], [1, sh(stone, -0.2)]]), OUT, 1.6);
  for (const x of [34, 70]) { rrect(c, x - 2, top + 10, 4, 10, 1.5, '#1a120c', null); }
  if (variant === 'mortar') { ell(c, 52, top - 1, 20, 6, '#5a4a3a', OUT, 1.5); }
  else if (variant === 'rocket') { rrect(c, 36, top - 6, 32, 6, 2, '#4a4a50', OUT, 1.5); }
  else { rrect(c, 40, top - 7, 24, 7, 2, '#5a3a22', OUT, 1.5); circ(c, 44, top - 2, 4.5, '#6a3d1e', OUT, 1.3); circ(c, 60, top - 2, 4.5, '#6a3d1e', OUT, 1.3); }
  let flag: TowerParts['flag'];
  if (tier >= 3) { flagPole(c, 25, top - 4, top - 28); flag = { ...rel(26, top - 28), color: variant === 'rocket' ? '#d23a2a' : variant === 'mortar' ? '#ffa22a' : '#f2c14e' }; }
  const weapon: WeaponKind = variant === 'mortar' ? 'mortar' : variant === 'rocket' ? 'rocket' : 'barrel';
  const key = variant === 'mortar' ? 'mortar' : variant === 'rocket' ? 'rocketrack' : `barrel_${tier}`;
  TOWER_PARTS[id] = { weapon, weaponKey: key, mounts: [rel(52, top - 7)], flag };
}

/* ------------------------------ barracks --------------------------- */

function drawBarracks(c: Ctx, tier: number, variant: string, id: string): void {
  platform(c);
  const wall = variant === 'knights' ? 0xbcb8b0 : variant === 'berserkers' ? 0x7a5a42 : [0, 0xe0c8a0, 0xd8bf94, 0xd0b488][Math.min(3, tier)];
  const roof = variant === 'knights' ? 0x2f5aa8 : variant === 'berserkers' ? 0x8f1f1f : [0, 0xa0602e, 0xa8482e, 0x983a2b][Math.min(3, tier)];
  const h = 30 + Math.min(tier, 3) * 3;
  const top = 96 - h;
  rrect(c, 22, top, 60, h + 1, 2, lg(c, 22, 0, 82, 0, [[0, sh(wall, 0.2)], [0.5, hex(wall)], [1, sh(wall, -0.3)]]), OUT, 2.2);
  if (variant === 'knights') bricks(c, 23, 81, top + 1, 96, wall, 7);
  else {
    const beam = variant === 'berserkers' ? '#3a2416' : '#6b4226';
    for (const x of [24, 52, 80]) limb(c, x, top + 1, x, 95, 2.4, beam);
    limb(c, 23, top + 13, 81, top + 13, 2.2, beam);
    limb(c, 24, top + 13, 36, 95, 1.6, beam); limb(c, 80, top + 13, 68, 95, 1.6, beam);
  }
  // door
  shape(c, cc => { cc.moveTo(44, 97); cc.lineTo(44, 84); cc.arc(52, 84, 8, Math.PI, 0); cc.lineTo(60, 97); cc.closePath(); }, lg(c, 0, 76, 0, 97, [[0, '#7a4a28'], [1, '#3a2010']]), OUT, 1.8);
  limb(c, 52, 77, 52, 96, 0.8, '#2a1508', '#2a1508');
  circ(c, 57, 88, 1.2, '#d4a017', null);
  // windows
  for (const x of [32, 72]) {
    rrect(c, x - 5, top + 17, 10, 9, 1.5, '#ffd36e', OUT, 1.5);
    limb(c, x, top + 17, x, top + 26, 0.8, OUT, OUT);
  }
  // roof (gable seen from the front)
  roofTiles(c, 12, 92, top + 3, top - 30, 52, roof);
  // weapon rack / barrels
  if (tier >= 2) {
    ell(c, 88, 94, 5, 3, '#6b4226', OUT, 1.2); rrect(c, 83, 84, 10, 11, 3, cyl(c, 0x8a5a32, 83, 10), OUT, 1.4);
    limb(c, 84, 88, 92, 88, 0.8, '#3a2416', '#3a2416');
  }
  const bc = variant === 'knights' ? '#5ab0ff' : variant === 'berserkers' ? '#1a1a1a' : '#c0392b';
  flagPole(c, 74, top + 6, top - 30);
  TOWER_PARTS[id] = { weapon: 'none', weaponKey: '', mounts: [], flag: { ...rel(75, top - 30), color: bc } };
}

/* ------------------------------ moving parts ----------------------- */

function archerFigure(c: Ctx, variant: string, frame: number): void {
  const cloak = variant === 'ranger' ? 0x2f7a2a : variant === 'marksman' ? 0x2f4a8a : 0x3e6e3a;
  const ox = 11, oy = 26;
  softShadow(c, ox, oy - 1, 6, 1.8, 0.3);
  // body
  shape(c, cc => { cc.moveTo(ox - 5, oy - 1); cc.lineTo(ox - 4, oy - 12); cc.quadraticCurveTo(ox, oy - 15, ox + 4, oy - 12); cc.lineTo(ox + 5, oy - 1); cc.closePath(); },
    lg(c, ox - 5, oy - 15, ox + 5, oy, [[0, sh(cloak, 0.3)], [1, sh(cloak, -0.3)]]), OUT, 1.4);
  // head + hood
  circ(c, ox, oy - 16, 4.2, '#f0c9a0', OUT, 1.3);
  shape(c, cc => { cc.arc(ox, oy - 16.5, 4.8, Math.PI * 0.9, Math.PI * 2.05); cc.lineTo(ox - 5.5, oy - 13); cc.closePath(); }, hex(cloak), OUT, 1.2);
  circ(c, ox + 2, oy - 16, 0.8, '#222', null);
  // bow
  const draw = frame === 1;
  const bx = ox + 6;
  c.strokeStyle = OUT; c.lineWidth = 3;
  c.beginPath(); c.arc(bx - 4, oy - 11, 8, -1.1, 1.1); c.stroke();
  c.strokeStyle = '#a0703a'; c.lineWidth = 1.6; c.stroke();
  const sx = draw ? bx - 6 : bx - 0.6;
  c.strokeStyle = '#eee'; c.lineWidth = 0.7;
  c.beginPath(); c.moveTo(bx - 0.6, oy - 18); c.lineTo(sx, oy - 11); c.lineTo(bx - 0.6, oy - 4); c.stroke();
  if (draw) { limb(c, sx, oy - 11, bx + 6, oy - 11, 0.8, '#8a5a2a'); poly(c, [bx + 5, oy - 12.5, bx + 8, oy - 11, bx + 5, oy - 9.5], '#ccc', null); }
  limb(c, ox + 2, oy - 10, draw ? sx : bx + 1, oy - 11, 1.6, hex(cloak));
  if (variant === 'marksman') { limb(c, ox - 3, oy - 7, ox - 5, oy - 1, 1, '#c9b27a'); }
}

function barrel(c: Ctx, tier: number): void {
  const len = 22 + tier * 3, th = 9 + tier * 1.4;
  const cy = 12;
  // pivot is at (8, cy)
  shape(c, cc => {
    cc.moveTo(8, cy - th / 2); cc.lineTo(8 + len, cy - th / 2.6); cc.lineTo(8 + len, cy + th / 2.6); cc.lineTo(8, cy + th / 2); cc.closePath();
  }, lg(c, 0, cy - th / 2, 0, cy + th / 2, [[0, '#7a7f88'], [0.35, '#4a4d55'], [1, '#18191d']]), OUT, 1.8);
  rrect(c, 8 + len - 3, cy - th / 2.2, 5, th / 1.1, 1.5, '#3a3d44', OUT, 1.4);
  ell(c, 8 + len + 2, cy, 1.6, th / 3.4, '#0a0a0a', null);
  rrect(c, 12, cy - th / 2 - 0.5, 3, th + 1, 1, '#d4a017', OUT, 1);
  circ(c, 8, cy, th / 2 + 1.5, rg(c, 8, cy, th, [[0, '#7a7f88'], [1, '#2a2b30']], 6, cy - 2), OUT, 1.6);
  gloss(c, 20, cy - th / 4, 7, 1.2, 0.35, 0);
}

function mortar(c: Ctx): void {
  ell(c, 22, 26, 16, 5, '#4a3a2a', OUT, 1.6);
  shape(c, cc => { cc.moveTo(8, 24); cc.quadraticCurveTo(6, 8, 13, 3); cc.lineTo(31, 3); cc.quadraticCurveTo(38, 8, 36, 24); cc.closePath(); },
    lg(c, 6, 0, 38, 0, [[0, '#8a5a1a'], [0.3, '#e0a850'], [0.6, '#b5803a'], [1, '#6a4010']]), OUT, 2);
  ell(c, 22, 4, 10, 3.5, '#1a1208', OUT, 1.6);
  rrect(c, 9, 13, 26, 3, 1, '#d4a017', OUT, 1);
}

function rocketRack(c: Ctx): void {
  rrect(c, 4, 14, 34, 8, 2, lg(c, 0, 14, 0, 22, [[0, '#6a6a72'], [1, '#2a2a30']]), OUT, 1.6);
  for (let i = 0; i < 3; i++) {
    const y = 4 + i * 5;
    rrect(c, 6, y, 26, 5, 2, lg(c, 0, y, 0, y + 5, [[0, '#9a9aa2'], [1, '#4a4a50']]), OUT, 1.2);
    poly(c, [32, y + 0.5, 37, y + 2.5, 32, y + 4.5], '#d23a2a', OUT, 1);
  }
}

function orb(c: Ctx, variant: string): void {
  const s = 30, m = s / 2;
  const col = variant === 'frost' ? ['#ffffff', '#9fe8ff', '#3f8fd0'] : variant === 'arcane' ? ['#ffe6ff', '#d27cff', '#6a1fb0'] : ['#fffbe0', '#ffd36e', '#d48a10'];
  c.fillStyle = rg(c, m, m, m, [[0, rgba(0xffffff, 0.5)], [1, 'rgba(255,255,255,0)']]);
  c.fillRect(0, 0, s, s);
  if (variant === 'frost') {
    for (let i = 0; i < 3; i++) {
      c.save(); c.translate(m, m); c.rotate((i * Math.PI) / 3);
      poly(c, [0, -11, 2.5, 0, 0, 11, -2.5, 0], lg(c, 0, -11, 0, 11, [[0, col[0]], [1, col[1]]]), col[2], 1);
      c.restore();
    }
  } else if (variant === 'arcane') {
    poly(c, [m, m - 12, m + 6, m, m, m + 12, m - 6, m], lg(c, m - 6, m - 12, m + 6, m + 12, [[0, col[0]], [0.5, col[1]], [1, col[2]]]), OUT, 1.4);
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(m, m - 11); c.lineTo(m, m + 11); c.stroke();
  } else {
    circ(c, m, m, 6.5, rg(c, m, m, 7, [[0, col[0]], [0.6, col[1]], [1, col[2]]], m - 2, m - 2), OUT, 1.4);
    gloss(c, m - 2, m - 2.5, 2.2, 1.2, 0.8);
  }
}

function banner(c: Ctx, color: string, frame: number): void {
  const ph = frame * 2.1;
  shape(c, cc => {
    cc.moveTo(1, 2);
    cc.bezierCurveTo(7, 2 + Math.sin(ph) * 2.5, 13, 2 - Math.sin(ph) * 2.5, 20, 3 + Math.sin(ph + 1) * 2);
    cc.lineTo(16, 8 + Math.sin(ph + 2) * 1.5);
    cc.lineTo(20, 13 + Math.sin(ph + 1) * 2);
    cc.bezierCurveTo(13, 14 - Math.sin(ph) * 2.5, 7, 14 + Math.sin(ph) * 2.5, 1, 14);
    cc.closePath();
  }, lg(c, 0, 0, 20, 14, [[0, color], [1, sh(parseInt(color.slice(1), 16), -0.35)]]), OUT, 1.3);
}

/* ------------------------------ registration ----------------------- */

export function generateTowers(scene: Phaser.Scene): void {
  const list: [string, (c: Ctx, tier: number, variant: string, id: string) => void, number, string][] = [
    ['archer1', drawArcherTower, 1, ''], ['archer2', drawArcherTower, 2, ''], ['archer3', drawArcherTower, 3, ''], ['ranger', drawArcherTower, 4, 'ranger'], ['marksman', drawArcherTower, 4, 'marksman'],
    ['mage1', drawMageTower, 1, ''], ['mage2', drawMageTower, 2, ''], ['mage3', drawMageTower, 3, ''], ['arcane', drawMageTower, 4, 'arcane'], ['frost', drawMageTower, 4, 'frost'],
    ['cannon1', drawCannonTower, 1, ''], ['cannon2', drawCannonTower, 2, ''], ['cannon3', drawCannonTower, 3, ''], ['mortar', drawCannonTower, 4, 'mortar'], ['rocket', drawCannonTower, 4, 'rocket'],
    ['barracks1', drawBarracks, 1, ''], ['barracks2', drawBarracks, 2, ''], ['barracks3', drawBarracks, 3, ''], ['knights', drawBarracks, 4, 'knights'], ['berserkers', drawBarracks, 4, 'berserkers'],
  ];
  for (const [id, fn, tier, variant] of list) {
    tex(scene, `tower_${id}`, TOWER_TEX.w, TOWER_TEX.h, c => { c.translate(DX, DY); fn(c, tier, variant, id); });
  }
  for (const v of ['basic', 'ranger', 'marksman']) for (const f of [0, 1]) tex(scene, `archer_${v}_${f}`, 26, 28, c => archerFigure(c, v === 'basic' ? '' : v, f));
  for (const t of [1, 2, 3]) tex(scene, `barrel_${t}`, 46, 24, c => barrel(c, t));
  tex(scene, 'mortar', 44, 32, c => mortar(c));
  tex(scene, 'rocketrack', 42, 26, c => rocketRack(c));
  for (const v of ['basic', 'arcane', 'frost']) tex(scene, `orb_${v}`, 30, 30, c => orb(c, v));
  const colors = new Set(Object.values(TOWER_PARTS).map(p => p.flag?.color).filter(Boolean) as string[]);
  for (const col of colors) for (let f = 0; f < 3; f++) tex(scene, `flag_${col.slice(1)}_${f}`, 22, 17, c => banner(c, col, f));
  for (const col of colors) {
    const key = `flag_${col.slice(1)}`;
    if (!scene.anims.exists(key)) scene.anims.create({ key, frames: [0, 1, 2, 1].map(i => ({ key: `${key}_${i}` })), frameRate: 6, repeat: -1 });
  }
}
