import type * as Phaser from 'phaser';
import { tex, lg, rg, ell, circ, rrect, poly, shape, limb, gloss, softShadow, hex, sh, rgba, OUT, star } from './draw';
import type { Ctx } from './draw';

/**
 * Character art. Every unit has 4 walk frames (0-3) and 2 attack frames (4 = wind-up, 5 = strike),
 * all facing right. Ground contact is at the bottom-centre of the canvas.
 */

export const WALK_STEP = [1, 0, -1, 0];
export const WALK_BOB = [0, -1.4, 0, -1.4];
export const FRAMES = 6;

type Weapon = 'dagger' | 'spear' | 'sword' | 'axe' | 'hammer' | 'staff' | 'bigaxe';
type Head = 'goblin' | 'human' | 'orc' | 'troll' | 'warlord' | 'mask' | 'skin';
type Helm = 'none' | 'cap' | 'helmet' | 'knight' | 'horned' | 'hood' | 'crown' | 'visor';

interface Humanoid {
  s: number;                 // scale relative to the 36x40 base design
  w: number; h: number;      // canvas size
  skin: number;
  body: number;
  bodyType: 'tunic' | 'armor' | 'robe' | 'bare';
  legs: number;
  head: Head;
  helm: Helm;
  helmColor?: number;
  weapon: Weapon;
  metal?: number;
  shield?: number;
  emblem?: number;
  cape?: number;
  eyes?: number;
  bulk?: number;             // body width multiplier
  plume?: number;
}

type Pose = { step: number; bob: number; arm: 'idle' | 'up' | 'strike' };

function poseFor(frame: number): Pose {
  if (frame < 4) return { step: WALK_STEP[frame], bob: WALK_BOB[frame], arm: 'idle' };
  return { step: 0, bob: frame === 4 ? -1 : 0.5, arm: frame === 4 ? 'up' : 'strike' };
}

function drawWeapon(c: Ctx, wpn: Weapon, metal: number, x: number, y: number, ang: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  const steel = lg(c, -2, 0, 2, 0, [[0, '#ffffff'], [0.5, hex(metal)], [1, sh(metal, -0.4)]]);
  switch (wpn) {
    case 'dagger':
      limb(c, 0, 2, 0, -2, 2.2, '#6b4a2a');
      poly(c, [-1.6, -2, 0, -10, 1.6, -2], steel, OUT, 1.2);
      break;
    case 'sword':
      limb(c, 0, 3, 0, -1, 2.4, '#6b4a2a');
      rrect(c, -4, -2.5, 8, 2.5, 1, '#d4a017', OUT, 1.2);
      poly(c, [-1.8, -2.5, -1.8, -14, 0, -16.5, 1.8, -14, 1.8, -2.5], steel, OUT, 1.2);
      break;
    case 'spear':
      limb(c, 0, 8, 0, -16, 1.8, '#8a5a2a');
      poly(c, [-2.2, -15, 0, -22, 2.2, -15, 0, -13], steel, OUT, 1.2);
      break;
    case 'axe':
      limb(c, 0, 4, 0, -14, 2.2, '#7a4a20');
      shape(c, c => { c.moveTo(0, -14); c.quadraticCurveTo(9, -16, 8, -6); c.lineTo(0, -8); c.closePath(); }, steel, OUT, 1.3);
      break;
    case 'bigaxe':
      limb(c, 0, 6, 0, -20, 2.6, '#5a3a1a');
      shape(c, c => { c.moveTo(0, -20); c.quadraticCurveTo(12, -24, 11, -9); c.lineTo(0, -11); c.closePath(); }, steel, OUT, 1.4);
      shape(c, c => { c.moveTo(0, -20); c.quadraticCurveTo(-9, -22, -8, -12); c.lineTo(0, -13); c.closePath(); }, steel, OUT, 1.4);
      break;
    case 'hammer':
      limb(c, 0, 5, 0, -14, 2.4, '#6b4a2a');
      rrect(c, -6, -20, 12, 8, 2, lg(c, -6, 0, 6, 0, [[0, '#c8c8cc'], [1, '#55555c']]), OUT, 1.4);
      break;
    case 'staff':
      limb(c, 0, 12, 0, -18, 1.8, '#6b4a2a');
      c.fillStyle = rg(c, 0, -20, 7, [[0, 'rgba(160,255,140,0.9)'], [1, 'rgba(120,255,120,0)']]);
      c.beginPath(); c.arc(0, -20, 7, 0, Math.PI * 2); c.fill();
      circ(c, 0, -20, 3, '#9dff7a', '#2a5a1a', 1.2);
      break;
  }
  c.restore();
}

function humanoid(c: Ctx, o: Humanoid, frame: number): void {
  const p = poseFor(frame);
  const bulk = o.bulk ?? 1;
  softShadow(c, o.w / 2, o.h - 3, 11 * o.s * bulk, 3.5 * o.s, 0.4);
  c.save();
  c.translate(o.w / 2 - 18 * o.s, o.h - 2 - 38 * o.s);
  c.scale(o.s, o.s);
  c.translate(0, p.bob);
  const legC = hex(o.legs);
  const skin = hex(o.skin);
  const metal = o.metal ?? 0xc8ccd2;

  // back leg
  if (o.bodyType !== 'robe') limb(c, 16, 28 - p.bob, 16 - p.step * 3, 37.5 - p.bob, 3.6, sh(o.legs, -0.2));
  // cape
  if (o.cape !== undefined) {
    shape(c, c => { c.moveTo(13, 17); c.quadraticCurveTo(6, 26, 8 - p.step, 34); c.lineTo(17, 32); c.closePath(); }, lg(c, 0, 17, 0, 34, [[0, hex(o.cape!)], [1, sh(o.cape!, -0.35)]]), OUT, 1.5);
  }
  // back arm (shield arm)
  limb(c, 14, 19, 12, 25, 3.2, o.bodyType === 'bare' ? sh(o.skin, -0.15) : sh(o.body, -0.2));
  // front leg
  if (o.bodyType !== 'robe') limb(c, 20, 28 - p.bob, 20 + p.step * 3, 37.5 - p.bob, 3.6, legC);
  if (o.bodyType !== 'robe') {
    ell(c, 16 - p.step * 3 + 1, 38 - p.bob, 2.6, 1.4, '#2a1b12', null);
    ell(c, 20 + p.step * 3 + 1, 38 - p.bob, 2.6, 1.4, '#2a1b12', null);
  }

  // body
  const bw = 7 * bulk;
  if (o.bodyType === 'robe') {
    shape(c, c => {
      c.moveTo(18 - 5 * bulk, 16); c.lineTo(18 + 5 * bulk, 16);
      c.lineTo(18 + 9 * bulk + p.step, 37.5); c.quadraticCurveTo(18, 39, 18 - 9 * bulk + p.step, 37.5); c.closePath();
    }, mat(c, o.body, 9, 16, 18, 22), OUT, 1.8);
    c.strokeStyle = sh(o.body, 0.35); c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(18, 18); c.lineTo(18 + p.step * 0.5, 37); c.stroke();
  } else {
    rrect(c, 18 - bw, 16, bw * 2, 14, 4.5, mat(c, o.body, 18 - bw, 16, bw * 2, 14), OUT, 1.8);
    if (o.bodyType === 'armor') {
      c.strokeStyle = sh(o.body, -0.35); c.lineWidth = 1;
      c.beginPath(); c.moveTo(18 - bw + 1, 22); c.lineTo(18 + bw - 1, 22); c.moveTo(18 - bw + 1, 26); c.lineTo(18 + bw - 1, 26); c.stroke();
      ell(c, 18 - bw + 1, 18, 3.5, 2.6, mat(c, o.body, 18 - bw - 2, 15, 7, 6), OUT, 1.2);
      ell(c, 18 + bw - 1, 18, 3.5, 2.6, mat(c, o.body, 18 + bw - 4, 15, 7, 6), OUT, 1.2);
    }
    if (o.bodyType === 'bare') {
      c.strokeStyle = sh(o.skin, -0.3); c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(18, 19); c.lineTo(18, 24); c.stroke();
    }
    // belt
    c.fillStyle = '#4a2e18'; c.fillRect(18 - bw + 0.8, 26.5, bw * 2 - 1.6, 2);
    c.fillStyle = '#d4a017'; c.fillRect(17, 26.3, 2.5, 2.4);
  }

  // head
  const hx = 19, hy = 11;
  if (o.head === 'goblin') {
    poly(c, [hx - 5, hy - 1, hx - 15, hy - 7, hx - 6, hy + 4], mat(c, o.skin, hx - 15, hy - 7, 10, 10), OUT, 1.5);
    poly(c, [hx + 5, hy - 1, hx + 13, hy - 8, hx + 6, hy + 4], mat(c, o.skin, hx + 5, hy - 8, 8, 10), OUT, 1.5);
  }
  const hr = o.head === 'goblin' ? 7.2 : o.head === 'troll' ? 6 : o.head === 'warlord' ? 7.5 : 6.6;
  circ(c, hx, hy, hr, rg(c, hx, hy, hr * 1.2, [[0, sh(o.skin, 0.3)], [0.6, skin], [1, sh(o.skin, -0.3)]], hx - 2, hy - 3), OUT, 1.8);
  if (o.head === 'mask') {
    shape(c, c => { c.moveTo(hx - 5, hy - 5); c.lineTo(hx + 7, hy - 5); c.lineTo(hx + 6, hy + 6); c.quadraticCurveTo(hx + 1, hy + 9, hx - 4, hy + 6); c.closePath(); }, '#e8dcc0', OUT, 1.4);
    c.fillStyle = '#2a1b12'; c.beginPath(); c.ellipse(hx + 0.5, hy - 1, 1.6, 2, 0, 0, 7); c.ellipse(hx + 4.5, hy - 1, 1.6, 2, 0, 0, 7); c.fill();
    c.strokeStyle = '#c0392b'; c.lineWidth = 1; c.beginPath(); c.moveTo(hx - 3, hy + 3); c.lineTo(hx + 5, hy + 3); c.stroke();
  } else if (o.helm !== 'visor' && o.helm !== 'knight') {
    const ey = o.eyes ?? 0xffffff;
    ell(c, hx + 1.8, hy, 1.9, 2.1, hex(ey), null); ell(c, hx + 5.4, hy, 1.7, 2, hex(ey), null);
    circ(c, hx + 2.4, hy + 0.3, 1, '#111', null); circ(c, hx + 5.9, hy + 0.3, 0.9, '#111', null);
  }
  if (o.head === 'orc' || o.head === 'warlord' || o.head === 'troll') {
    poly(c, [hx + 1, hy + 5, hx + 2, hy + 1.5, hx + 3, hy + 5], '#fffbe8', OUT, 0.8);
    poly(c, [hx + 5, hy + 5, hx + 6, hy + 1.5, hx + 7, hy + 5], '#fffbe8', OUT, 0.8);
  }
  if (o.head === 'goblin') { c.strokeStyle = OUT; c.lineWidth = 1; c.beginPath(); c.arc(hx + 4, hy + 3, 2.2, 0.2, 2.6); c.stroke(); }
  if (o.head === 'human' || o.head === 'skin') { ell(c, hx + 6.2, hy + 1.8, 1.2, 1, sh(o.skin, -0.2), null); }

  // helmets
  const hc = o.helmColor ?? 0x9aa0aa;
  const helmMat = lg(c, hx - 7, hy - 9, hx + 7, hy, [[0, sh(hc, 0.4)], [0.5, hex(hc)], [1, sh(hc, -0.35)]]);
  switch (o.helm) {
    case 'cap':
      shape(c, c => { c.arc(hx, hy - 1, hr, Math.PI, 0); c.lineTo(hx + hr + 3, hy - 1); c.closePath(); }, helmMat, OUT, 1.5);
      break;
    case 'helmet':
      shape(c, c => { c.arc(hx, hy - 0.5, hr + 0.8, Math.PI, 0); c.closePath(); }, helmMat, OUT, 1.6);
      c.fillStyle = sh(hc, -0.3); c.fillRect(hx - hr - 1, hy - 1.5, (hr + 1) * 2, 1.6);
      limb(c, hx + 1, hy - 1, hx + 1, hy + 4, 1, sh(hc, -0.2));
      break;
    case 'visor':
    case 'knight':
      shape(c, c => { c.arc(hx, hy, hr + 1, Math.PI * 0.95, Math.PI * 2.05); c.lineTo(hx + hr, hy + hr); c.lineTo(hx - hr, hy + hr); c.closePath(); }, helmMat, OUT, 1.6);
      c.fillStyle = '#1a1a1e'; c.fillRect(hx - 1, hy - 1, hr + 1, 2.2);
      c.fillStyle = o.helm === 'visor' ? '#ffb347' : '#1a1a1e';
      if (o.helm === 'visor') { circ(c, hx + 2, hy, 0.9, '#ffb347', null); circ(c, hx + 5, hy, 0.9, '#ffb347', null); }
      gloss(c, hx - 3, hy - 4, 2.5, 1.2, 0.5);
      if (o.plume !== undefined) {
        shape(c, c => { c.moveTo(hx - 1, hy - hr); c.quadraticCurveTo(hx - 8, hy - hr - 9, hx - 12, hy - hr + 2); c.quadraticCurveTo(hx - 6, hy - hr - 3, hx - 1, hy - hr + 2); c.closePath(); }, hex(o.plume), OUT, 1.2);
      }
      break;
    case 'horned':
      shape(c, c => { c.arc(hx, hy - 0.5, hr + 0.8, Math.PI, 0); c.closePath(); }, helmMat, OUT, 1.6);
      shape(c, c => { c.moveTo(hx - hr, hy - 3); c.quadraticCurveTo(hx - hr - 6, hy - 6, hx - hr - 4, hy - 12); c.quadraticCurveTo(hx - hr - 2, hy - 7, hx - hr + 2, hy - 5); c.closePath(); }, '#efe6cc', OUT, 1.2);
      shape(c, c => { c.moveTo(hx + hr, hy - 3); c.quadraticCurveTo(hx + hr + 6, hy - 6, hx + hr + 4, hy - 12); c.quadraticCurveTo(hx + hr + 2, hy - 7, hx + hr - 2, hy - 5); c.closePath(); }, '#efe6cc', OUT, 1.2);
      break;
    case 'hood':
      shape(c, c => { c.moveTo(hx - hr - 1, hy + 4); c.quadraticCurveTo(hx - hr - 1, hy - hr - 4, hx + 1, hy - hr - 5); c.quadraticCurveTo(hx + hr + 2, hy - hr, hx + hr + 1, hy - 2); c.lineTo(hx + hr - 2, hy - 3); c.quadraticCurveTo(hx, hy - hr + 1, hx - hr + 2, hy + 4); c.closePath(); }, mat(c, hc, hx - 8, hy - 12, 16, 16), OUT, 1.4);
      break;
    case 'crown':
      shape(c, c => { c.arc(hx, hy - 0.5, hr + 0.8, Math.PI, 0); c.closePath(); }, helmMat, OUT, 1.6);
      for (const sx of [-1, 1]) shape(c, c => { c.moveTo(hx + sx * (hr - 1), hy - 3); c.quadraticCurveTo(hx + sx * (hr + 7), hy - 5, hx + sx * (hr + 6), hy - 14); c.quadraticCurveTo(hx + sx * (hr + 3), hy - 8, hx + sx * (hr - 3), hy - 6); c.closePath(); }, '#efe6cc', OUT, 1.2);
      poly(c, [hx - 5, hy - hr - 1, hx - 4, hy - hr - 6, hx - 1.5, hy - hr - 2, hx, hy - hr - 7, hx + 1.5, hy - hr - 2, hx + 4, hy - hr - 6, hx + 5, hy - hr - 1], lg(c, 0, hy - hr - 7, 0, hy - hr, [[0, '#fff2a0'], [1, '#c08a10']]), OUT, 1.1);
      break;
  }

  // weapon arm: shoulder -> hand
  const shx = 21, shy = 19;
  const hand = p.arm === 'idle' ? [25.5, 24.5] : p.arm === 'up' ? [20, 8.5] : [30, 20.5];
  const wAng = p.arm === 'idle' ? 0.35 : p.arm === 'up' ? -0.9 : 1.45;
  if (o.weapon === 'staff' || o.weapon === 'spear') {
    drawWeapon(c, o.weapon, metal, hand[0], hand[1], p.arm === 'strike' ? 1.2 : p.arm === 'up' ? -0.4 : 0.05);
  }
  limb(c, shx, shy, hand[0], hand[1], 3.2, o.bodyType === 'bare' ? skin : hex(o.body));
  circ(c, hand[0], hand[1], 1.9, skin, OUT, 1);
  if (o.weapon !== 'staff' && o.weapon !== 'spear') drawWeapon(c, o.weapon, metal, hand[0], hand[1], wAng);

  // shield in front
  if (o.shield !== undefined) {
    const sy = p.arm === 'up' ? 22 : 23;
    shape(c, c => { c.moveTo(7.5, sy - 6.5); c.lineTo(16.5, sy - 6.5); c.lineTo(16.5, sy + 1); c.quadraticCurveTo(16, sy + 6, 12, sy + 8); c.quadraticCurveTo(8, sy + 6, 7.5, sy + 1); c.closePath(); },
      lg(c, 7, sy - 6, 17, sy + 8, [[0, sh(o.shield, 0.35)], [0.6, hex(o.shield)], [1, sh(o.shield, -0.35)]]), OUT, 1.5);
    if (o.emblem !== undefined) star(c, 12, sy, 3, 1.3, 4, hex(o.emblem), null, 0, 0);
  }
  c.restore();
}

function mat(c: Ctx, base: number, x: number, y: number, w: number, h: number): CanvasGradient {
  return lg(c, x, y, x + w * 0.6, y + h, [[0, sh(base, 0.3)], [0.45, hex(base)], [1, sh(base, -0.32)]]);
}

/* ------------------------------------------------------------------ */

function wolf(c: Ctx, frame: number): void {
  // Shade Hound: a wolf of living shadow
  const Hh = 44;
  const atk = frame >= 4;
  const step = atk ? 0 : WALK_STEP[frame];
  const bob = atk ? 0 : WALK_BOB[frame];
  const lunge = frame === 5 ? 4 : frame === 4 ? -2 : 0;
  softShadow(c, 30, Hh - 3, 19, 4, 0.4);
  c.save();
  c.translate(2 + lunge, bob + 2);
  const fur = 0x3a3452;
  const furM = lg(c, 0, 14, 0, 34, [[0, sh(fur, 0.35)], [0.5, hex(fur)], [1, sh(fur, -0.35)]]);
  // tail
  shape(c, c => { c.moveTo(12, 22); c.quadraticCurveTo(2, 18 - step * 2, 1, 10); c.quadraticCurveTo(7, 15, 14, 19); c.closePath(); }, furM, OUT, 1.6);
  // far legs
  limb(c, 17, 28, 15 - step * 4, 38, 3.6, sh(fur, -0.3));
  limb(c, 36, 28, 38 + step * 4, 38, 3.6, sh(fur, -0.3));
  // body
  shape(c, c => { c.ellipse(26, 24, 17, 9, -0.05, 0, Math.PI * 2); }, furM, OUT, 1.8);
  c.fillStyle = sh(fur, 0.45);
  c.beginPath(); c.ellipse(26, 29, 11, 3, 0, 0, Math.PI * 2); c.fill();
  // near legs
  limb(c, 19, 28, 21 + step * 4, 38.5, 3.8, hex(fur));
  limb(c, 34, 28, 32 - step * 4, 38.5, 3.8, hex(fur));
  // head
  const hx = 43, hy = 17 + (atk ? 2 : 0);
  poly(c, [hx - 4, hy - 5, hx - 2, hy - 15, hx + 2, hy - 6], furM, OUT, 1.4);
  poly(c, [hx + 1, hy - 6, hx + 5, hy - 14, hx + 6, hy - 4], furM, OUT, 1.4);
  circ(c, hx, hy, 8, rg(c, hx, hy, 9, [[0, sh(fur, 0.35)], [1, sh(fur, -0.2)]], hx - 2, hy - 3), OUT, 1.8);
  // snout + jaw
  const open = frame === 5 ? 4 : frame === 4 ? 2 : 0;
  shape(c, c => { c.moveTo(hx + 3, hy - 1); c.lineTo(hx + 13, hy + 1); c.lineTo(hx + 12, hy + 4); c.lineTo(hx + 3, hy + 4); c.closePath(); }, hex(shade2(fur)), OUT, 1.5);
  shape(c, c => { c.moveTo(hx + 3, hy + 4); c.lineTo(hx + 11, hy + 4 + open); c.lineTo(hx + 3, hy + 7 + open * 0.4); c.closePath(); }, sh(fur, -0.15), OUT, 1.3);
  if (open) { poly(c, [hx + 6, hy + 4, hx + 7, hy + 6.5, hx + 8, hy + 4], '#ffffff', null); }
  circ(c, hx + 13, hy + 1.5, 1.6, '#111', null);
  c.fillStyle = rg(c, hx + 2, hy - 2, 7, [[0, 'rgba(192,140,255,0.8)'], [1, 'rgba(192,140,255,0)']]); c.beginPath(); c.arc(hx + 2, hy - 2, 7, 0, Math.PI * 2); c.fill();
  ell(c, hx + 2, hy - 2, 2, 1.6, '#e6d0ff', OUT, 0.8);
  c.restore();
}
function shade2(c: number): number { return c; }



/* ------------------------------------------------------------------ */

/** Canvas size per enemy; `body` is the visible height used for hit points / health bars. */

/** Thornling: a small walking knot of black thorns with ember eyes. */
function thornling(c: Ctx, frame: number): void {
  const atk = frame >= 4;
  const step = atk ? 0 : WALK_STEP[frame];
  const bob = atk ? 0 : WALK_BOB[frame];
  const ext = frame === 5 ? 1.35 : frame === 4 ? 0.85 : 1;
  const cx = 29, cy = 30 + bob;
  softShadow(c, cx, 49, 13, 3.5, 0.45);
  limb(c, cx - 4, cy + 8, cx - 4 - step * 4, 49, 2.6, '#3a2230');
  limb(c, cx + 4, cy + 8, cx + 4 + step * 4, 49, 2.6, '#4a2c3a');
  const pts: number[] = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const r = (i % 2 ? 7 : 14 + (i % 4 === 0 ? 3 : 0)) * (i % 2 ? 1 : ext);
    pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9);
  }
  poly(c, pts, rg(c, cx, cy, 15, [[0, '#6a3a52'], [0.6, '#3a2230'], [1, '#1a0e16']], cx - 3, cy - 4), '#120810', 1.6);
  c.fillStyle = rg(c, cx + 3, cy - 2, 8, [[0, 'rgba(255,90,60,0.7)'], [1, 'rgba(255,90,60,0)']]);
  c.beginPath(); c.arc(cx + 3, cy - 2, 8, 0, Math.PI * 2); c.fill();
  circ(c, cx + 0.5, cy - 2, 2, '#ffb080', null); circ(c, cx + 6, cy - 2, 2, '#ffb080', null);
}

/** Shadow Moth: dusky wings with glowing eye-spots. */
function moth(c: Ctx, frame: number): void {
  const flap = [-1, 0, 1, 0][frame % 4];
  c.save();
  c.translate(30, 26);
  const span = 1 - Math.abs(flap) * 0.22;
  const lift = flap * 6;
  for (const sdir of [-1, 1]) {
    c.save(); c.scale(sdir * span, 1);
    shape(c, cc => { cc.moveTo(2, -2); cc.bezierCurveTo(10, -18 + lift, 28, -20 + lift, 26, -4 + lift * 0.5); cc.bezierCurveTo(22, 2, 10, 2, 2, 0); },
      lg(c, 0, -18, 26, 0, [[0, '#4a3a6e'], [1, '#1e1830']]), '#0e0a18', 1.4);
    shape(c, cc => { cc.moveTo(2, 1); cc.bezierCurveTo(10, 4, 18, 12 + lift * 0.4, 12, 16 + lift * 0.4); cc.bezierCurveTo(6, 14, 3, 8, 2, 1); },
      lg(c, 0, 0, 0, 16, [[0, '#3a2e58'], [1, '#18122a']]), '#0e0a18', 1.3);
    c.fillStyle = rg(c, 17, -9 + lift * 0.7, 7, [[0, 'rgba(192,140,255,0.9)'], [1, 'rgba(192,140,255,0)']]);
    c.beginPath(); c.arc(17, -9 + lift * 0.7, 7, 0, Math.PI * 2); c.fill();
    circ(c, 17, -9 + lift * 0.7, 2.6, '#e6d0ff', '#0e0a18', 0.8);
    c.restore();
  }
  ell(c, 0, 2, 3.5, 11, lg(c, 0, -9, 0, 13, [[0, '#2a2240'], [1, '#100c1a']]), '#0e0a18', 1.2);
  c.strokeStyle = '#2a2240'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(-1, -8); c.quadraticCurveTo(-5, -16, -8, -17); c.moveTo(1, -8); c.quadraticCurveTo(5, -16, 8, -17); c.stroke();
  circ(c, -1.5, -7, 1, '#ff6ad8', null); circ(c, 1.5, -7, 1, '#ff6ad8', null);
  c.restore();
}

/** Blight Wisp: a ghostly green-violet flame. */
function wisp(c: Ctx, frame: number): void {
  const atk = frame >= 4;
  const ph = (frame % 4) / 4 * Math.PI * 2;
  const k = frame === 5 ? 1.25 : 1;
  c.save();
  c.translate(27, 34);
  c.fillStyle = rg(c, 0, 0, 26 * k, [[0, 'rgba(160,255,140,0.35)'], [0.6, 'rgba(160,110,255,0.18)'], [1, 'rgba(160,110,255,0)']]);
  c.beginPath(); c.arc(0, 0, 26 * k, 0, Math.PI * 2); c.fill();
  shape(c, cc => {
    cc.moveTo(-12 * k, 10);
    cc.bezierCurveTo(-16 * k, -4, -6, -10, -4 + Math.sin(ph) * 3, -26 * k);
    cc.bezierCurveTo(2, -16, 8, -22 + Math.cos(ph) * 3, 6 + Math.sin(ph) * 2, -30 * k);
    cc.bezierCurveTo(16 * k, -16, 16 * k, 0, 12 * k, 10);
    cc.quadraticCurveTo(6, 18 + Math.sin(ph + 1) * 3, 2, 12); cc.quadraticCurveTo(-4, 20 + Math.cos(ph) * 3, -6, 12); cc.quadraticCurveTo(-10, 16, -12 * k, 10);
  }, lg(c, 0, -30, 0, 16, [[0, 'rgba(220,255,200,0.95)'], [0.4, 'rgba(150,240,120,0.85)'], [1, 'rgba(130,90,230,0.55)']]), 'rgba(40,20,60,0.8)', 1.4);
  ell(c, -4, -6, 2.6, 3.4, '#1a0e2a', null); ell(c, 5, -6, 2.6, 3.4, '#1a0e2a', null);
  if (atk) { ell(c, 0.5, 3, 4, 2.4, '#1a0e2a', null); }
  c.restore();
}

export const ENEMY_TEX: Record<string, { w: number; h: number; body: number }> = {
  goblin: { w: 58, h: 52, body: 34 }, wolf: { w: 60, h: 44, body: 30 }, orc: { w: 70, h: 66, body: 46 }, bat: { w: 60, h: 46, body: 24 },
  shaman: { w: 62, h: 66, body: 46 }, brute: { w: 96, h: 90, body: 64 }, wraith: { w: 54, h: 58, body: 50 }, warlord: { w: 140, h: 132, body: 98 },
};

const ENEMY_LOOKS: Record<string, Omit<Humanoid, 'w' | 'h'>> = {
  // Bramble Knight
  orc: { s: 1.3, skin: 0x5a6a3a, body: 0x6a4a30, bodyType: 'armor', legs: 0x3a2a1e, head: 'orc', helm: 'horned', helmColor: 0x4a3426, weapon: 'axe', metal: 0x9aa0a8, eyes: 0xffb030, bulk: 1.1 },
  // Blight Witch
  shaman: { s: 1.2, skin: 0x8a9a7a, body: 0x3e2a52, bodyType: 'robe', legs: 0x2a1e30, head: 'mask', helm: 'hood', helmColor: 0x5a2a6a, weapon: 'staff' },
  // Mossback Troll
  brute: { s: 1.7, skin: 0x5a7050, body: 0x6a5a48, bodyType: 'armor', legs: 0x3a3a2e, head: 'troll', helm: 'visor', helmColor: 0x7a7a72, weapon: 'hammer', bulk: 1.3 },
  // The Hollow King
  warlord: { s: 2.45, skin: 0x2a2236, body: 0x1e1828, bodyType: 'armor', legs: 0x14101c, head: 'warlord', helm: 'crown', helmColor: 0x2a2236, weapon: 'bigaxe', cape: 0x4a1a5a, metal: 0xa898c0, eyes: 0x7af0e0, bulk: 1.25 },
};


export function generateUnits(scene: Phaser.Scene): void {
  for (const key of Object.keys(ENEMY_TEX)) {
    const t = ENEMY_TEX[key];
    for (let f = 0; f < FRAMES; f++) {
      tex(scene, `enemy_${key}_${f}`, t.w, t.h, c => {
        if (key === 'wolf') wolf(c, f);
        else if (key === 'bat') moth(c, f);
        else if (key === 'wraith') wisp(c, f);
        else if (key === 'goblin') thornling(c, f);
        else humanoid(c, { ...ENEMY_LOOKS[key], w: t.w, h: t.h }, f);
      });
    }
  }
  void rgba;
}

/** Register walk / attack animations for every unit. */
export function createUnitAnims(scene: Phaser.Scene): void {
  const mk = (prefix: string) => {
    if (!scene.anims.exists(`${prefix}_walk`)) {
      scene.anims.create({ key: `${prefix}_walk`, frames: [0, 1, 2, 3].map(i => ({ key: `${prefix}_${i}` })), frameRate: 8, repeat: -1 });
      scene.anims.create({ key: `${prefix}_attack`, frames: [4, 5, 5, 0].map(i => ({ key: `${prefix}_${i}` })), frameRate: 10, repeat: 0 });
    }
  };
  for (const key of Object.keys(ENEMY_TEX)) mk(`enemy_${key}`);
}
