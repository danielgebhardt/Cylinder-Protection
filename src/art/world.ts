import type * as Phaser from 'phaser';
import { tex, lg, rg, ell, circ, rrect, poly, shape, limb, gloss, softShadow, hex, sh, rgba, OUT } from './draw';
import type { Ctx } from './draw';
import { W, H } from '../config';
import { seeded } from '../util';
import type { Pt } from '../util';
import type { Theme } from '../data/levels';

const NIGHT = '#0a0f1a';

/* ------------------------------ decor ------------------------------ */

function glowDot(c: Ctx, x: number, y: number, r: number, col: number): void {
  c.fillStyle = rg(c, x, y, r * 3.2, [[0, rgba(col, 0.7)], [1, rgba(col, 0)]]);
  c.beginPath(); c.arc(x, y, r * 3.2, 0, Math.PI * 2); c.fill();
  circ(c, x, y, r, '#ffffff', null);
}

function canopy(c: Ctx, blobs: [number, number, number][], base: number): void {
  for (const [x, y, r] of blobs) circ(c, x, y, r + 1, null, NIGHT, 3);
  for (const [x, y, r] of blobs) circ(c, x, y, r, rg(c, x, y, r * 1.3, [[0, sh(base, 0.22)], [0.6, hex(base)], [1, sh(base, -0.4)]], x - r * 0.4, y - r * 0.5), null);
  for (const [x, y, r] of blobs) gloss(c, x - r * 0.35, y - r * 0.45, r * 0.3, r * 0.16, 0.12, -0.4);
}

function drawDecor(c: Ctx, key: string): void {
  switch (key) {
    case 'glowtree': {
      softShadow(c, 32, 66, 24, 6, 0.5);
      shape(c, cc => { cc.moveTo(27, 66); cc.quadraticCurveTo(30, 52, 28, 40); cc.lineTo(36, 40); cc.quadraticCurveTo(34, 52, 37, 66); cc.closePath(); }, lg(c, 27, 0, 37, 0, [[0, '#3a2a40'], [1, '#1a1020']]), NIGHT, 2);
      canopy(c, [[20, 36, 13], [44, 36, 13], [32, 27, 17], [26, 19, 11], [39, 19, 10]], 0x1c3a52);
      for (const [x, y, col] of [[22, 30, 0x7af0e0], [40, 24, 0xff8ae0], [33, 40, 0x7af0e0], [46, 34, 0xb08aff], [27, 18, 0xff8ae0]] as const) glowDot(c, x, y, 1.8, col);
      break;
    }
    case 'mushroom': {
      softShadow(c, 32, 62, 22, 5, 0.45);
      for (const [x, y, s, col] of [[22, 62, 1, 0x7af0e0], [38, 63, 1.25, 0xff6ad8], [48, 64, 0.8, 0x7af0e0]] as const) {
        c.fillStyle = rg(c, x, y - 18 * s, 18 * s, [[0, rgba(col, 0.55)], [1, rgba(col, 0)]]);
        c.beginPath(); c.arc(x, y - 18 * s, 18 * s, 0, Math.PI * 2); c.fill();
        rrect(c, x - 2.5 * s, y - 16 * s, 5 * s, 16 * s, 2, '#dce8e0', NIGHT, 1.2);
        shape(c, cc => { cc.moveTo(x - 11 * s, y - 14 * s); cc.quadraticCurveTo(x, y - 32 * s, x + 11 * s, y - 14 * s); cc.closePath(); },
          lg(c, 0, y - 30 * s, 0, y - 14 * s, [[0, '#ffffff'], [0.35, sh(col, 0.2)], [1, sh(col, -0.25)]]), NIGHT, 1.6);
        for (const [dx, dy] of [[-4, -21], [3, -24], [6, -18]]) circ(c, x + dx * s, y + dy * s, 1.3 * s, 'rgba(255,255,255,0.85)', null);
      }
      break;
    }
    case 'fern': {
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.42;
        const x1 = 32 + Math.cos(a) * 26, y1 = 62 + Math.sin(a) * 26;
        c.strokeStyle = '#123824'; c.lineWidth = 4; c.beginPath(); c.moveTo(32, 62); c.quadraticCurveTo(32 + Math.cos(a) * 10, 50, x1, y1); c.stroke();
        c.strokeStyle = '#2f7a4a'; c.lineWidth = 2.4; c.stroke();
        for (let k = 1; k < 5; k++) {
          const t = k / 5, px = 32 + (x1 - 32) * t, py = 62 + (y1 - 62) * t - Math.sin(t * Math.PI) * 6;
          ell(c, px - 3, py, 3.4, 1.6, '#3f9a5a', null); ell(c, px + 3, py, 3.4, 1.6, '#3f9a5a', null);
        }
      }
      glowDot(c, 20, 44, 1.4, 0x9dff7a);
      break;
    }
    case 'runestone': {
      softShadow(c, 32, 62, 18, 5, 0.5);
      poly(c, [20, 62, 22, 26, 30, 16, 40, 20, 44, 62], lg(c, 20, 16, 44, 62, [[0, '#7a8aa0'], [0.5, '#56647a'], [1, '#323c50']]), NIGHT, 2.2);
      c.fillStyle = rg(c, 32, 38, 14, [[0, 'rgba(122,240,224,0.6)'], [1, 'rgba(122,240,224,0)']]);
      c.fillRect(18, 22, 28, 32);
      c.strokeStyle = '#bffaff'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(32, 28); c.lineTo(32, 48); c.moveTo(26, 34); c.lineTo(38, 42); c.moveTo(38, 34); c.lineTo(26, 42); c.stroke();
      ell(c, 26, 56, 6, 2.5, '#2f6a4a', null);
      break;
    }
    case 'reeds': {
      for (let i = 0; i < 7; i++) {
        const x = 16 + i * 5.4, top = 18 + (i * 13) % 20, lean = (i - 3) * 1.6;
        c.strokeStyle = NIGHT; c.lineWidth = 3.4; c.beginPath(); c.moveTo(x, 64); c.quadraticCurveTo(x + lean, 40, x + lean * 1.6, top); c.stroke();
        c.strokeStyle = '#4a7a3a'; c.lineWidth = 1.8; c.stroke();
        if (i % 2 === 0) rrect(c, x + lean * 1.6 - 2.5, top - 2, 5, 11, 2.5, '#5a3a22', NIGHT, 1);
      }
      glowDot(c, 46, 22, 1.5, 0xd8ff6a); glowDot(c, 14, 34, 1.3, 0xd8ff6a);
      break;
    }
    case 'frostpine': {
      softShadow(c, 32, 68, 20, 5, 0.45);
      rrect(c, 29, 54, 6, 14, 1, '#3a2a30', NIGHT, 1.5);
      const base = 0x1f4a52;
      for (let i = 0; i < 3; i++) {
        const y = 12 + i * 14, w = 13 + i * 6;
        poly(c, [32 - w, y + 22, 32 + w, y + 22, 32, y - 6], lg(c, 32 - w, 0, 32 + w, 0, [[0, sh(base, 0.2)], [0.5, hex(base)], [1, sh(base, -0.45)]]), NIGHT, 2);
        shape(c, cc => { cc.moveTo(32 - w * 0.6, y + 9); cc.lineTo(32, y - 6); cc.lineTo(32 + w * 0.6, y + 9); cc.quadraticCurveTo(32, y + 4, 32 - w * 0.6, y + 9); }, '#dceaf6', 'rgba(10,15,26,0.4)', 1);
      }
      glowDot(c, 40, 30, 1.2, 0xbff4ff);
      break;
    }
    case 'blighttree': {
      softShadow(c, 32, 66, 20, 5, 0.5);
      const bark = '#2a1a2e';
      limb(c, 32, 66, 30, 26, 6, bark, NIGHT);
      limb(c, 31, 44, 16, 28, 3.5, bark, NIGHT); limb(c, 31, 36, 46, 20, 3.5, bark, NIGHT);
      limb(c, 16, 28, 11, 14, 2.2, bark, NIGHT); limb(c, 46, 20, 52, 11, 2.2, bark, NIGHT); limb(c, 30, 26, 25, 11, 2.4, bark, NIGHT);
      for (const [x, y] of [[20, 34], [40, 26], [34, 46], [12, 18]]) poly(c, [x, y, x + 5, y - 2, x + 1, y + 3], '#4a2a4e', null);
      glowDot(c, 25, 30, 2, 0xc08cff); glowDot(c, 44, 18, 1.6, 0xff5ab0);
      break;
    }
    case 'thornbush': {
      softShadow(c, 32, 60, 22, 5, 0.45);
      canopy(c, [[20, 50, 10], [42, 50, 10], [31, 43, 12]], 0x3a1e3a);
      c.strokeStyle = '#1a0a1e'; c.lineWidth = 2;
      for (let i = 0; i < 9; i++) { const a = i * 0.7; c.beginPath(); c.moveTo(31 + Math.cos(a) * 12, 46 + Math.sin(a) * 8); c.lineTo(31 + Math.cos(a) * 20, 46 + Math.sin(a) * 13); c.stroke(); }
      for (const [x, y] of [[24, 44], [38, 47], [31, 38]]) glowDot(c, x, y, 1.8, 0xff3a8a);
      break;
    }
    case 'crystal': {
      softShadow(c, 32, 60, 18, 5, 0.4);
      c.fillStyle = rg(c, 30, 46, 22, [[0, 'rgba(120,220,255,0.4)'], [1, 'rgba(120,220,255,0)']]);
      c.fillRect(8, 24, 44, 40);
      for (const [x0, x1, tip, tx] of [[18, 28, 38, 20], [24, 36, 22, 29], [32, 42, 32, 39]] as const) {
        poly(c, [x0, 60, x1, 60, tx + 2, tip, tx - 1, tip + 3], lg(c, x0, tip, x1, 60, [[0, '#e6fbff'], [0.5, '#6ad0ff'], [1, '#2a5ab0']]), '#10244a', 1.6);
      }
      break;
    }
  }
}

/* ------------------------------ the Moonwell ----------------------- */

export const MOONWELL_TEX = { w: 140, h: 110, oy: 96 / 110 };

function drawMoonwell(c: Ctx): void {
  const x = 70, y = 96;
  softShadow(c, x, y + 4, 64, 15, 0.55);
  // base drum
  shape(c, cc => { cc.moveTo(x - 54, y - 30); cc.lineTo(x - 54, y - 2); cc.ellipse(x, y - 2, 54, 16, 0, Math.PI, 0, true); cc.lineTo(x + 54, y - 30); cc.closePath(); },
    lg(c, x - 54, 0, x + 54, 0, [[0, '#4a5868'], [0.3, '#8a9aae'], [0.7, '#6a7a8e'], [1, '#3a4656']]), NIGHT, 2.4);
  c.strokeStyle = 'rgba(10,15,26,0.5)'; c.lineWidth = 1.4;
  for (let i = 1; i < 7; i++) { const bx = x - 54 + i * 15.4; c.beginPath(); c.moveTo(bx, y - 30 + (i % 2) * 2); c.lineTo(bx, y + 8 - Math.abs(i - 3.5) * 2.5); c.stroke(); }
  c.beginPath(); c.moveTo(x - 54, y - 16); c.quadraticCurveTo(x, y - 4, x + 54, y - 16); c.stroke();
  // silver runes on the drum
  c.strokeStyle = '#bffaff'; c.lineWidth = 1.6;
  for (const rx of [x - 30, x, x + 30]) { c.beginPath(); c.arc(rx, y - 12, 4, Math.PI * 0.2, Math.PI * 1.8); c.stroke(); }
  // rim
  ell(c, x, y - 30, 56, 18, lg(c, 0, y - 48, 0, y - 12, [[0, '#c4d0de'], [1, '#7a8a9e']]), NIGHT, 2.4);
  // moonwater
  c.fillStyle = rg(c, x, y - 32, 46, [[0, '#ffffff'], [0.4, '#dff4ff'], [0.8, '#8fd8f0'], [1, '#4a9ac0']]);
  c.beginPath(); c.ellipse(x, y - 31, 44, 13, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.2;
  c.beginPath(); c.ellipse(x - 6, y - 32, 22, 5, 0, 0.2, Math.PI - 0.2); c.stroke();
  // moss and tiny flowers on the rim
  for (const [mx, my] of [[x - 44, y - 24], [x + 38, y - 22], [x - 10, y - 15]]) { ell(c, mx, my, 8, 3, '#2f7a4a', null); circ(c, mx + 2, my - 1, 1.6, '#ff9ae6', null); }
}

/* ------------------------------ registration ----------------------- */

export function generateWorld(scene: Phaser.Scene): void {
  for (const d of ['glowtree', 'mushroom', 'fern', 'runestone', 'reeds', 'frostpine', 'blighttree', 'thornbush', 'crystal']) {
    tex(scene, `decor_${d}`, 64, 72, c => drawDecor(c, d));
  }
  tex(scene, 'moonwell', MOONWELL_TEX.w, MOONWELL_TEX.h, c => drawMoonwell(c));
  // a single life petal (tinted at runtime)
  tex(scene, 'petal', 12, 20, c => {
    shape(c, cc => { cc.moveTo(6, 1); cc.bezierCurveTo(12, 6, 12, 14, 6, 19); cc.bezierCurveTo(0, 14, 0, 6, 6, 1); }, lg(c, 0, 0, 0, 20, [[0, '#ffffff'], [1, '#d8d8e8']]), NIGHT, 1.2);
  });
}

/* ------------------------------ level map -------------------------- */

/** Paint a level's moonlit ground and roads to a hi-res texture. */
export function paintMap(scene: Phaser.Scene, key: string, theme: Theme, paths: Pt[][], seed: number): void {
  tex(scene, key, W, H, c => {
    const rng = seeded(seed);
    c.fillStyle = lg(c, 0, 0, W * 0.4, H, [[0, sh(theme.ground, 0.06)], [1, sh(theme.ground, -0.12)]]);
    c.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) {
      const x = rng() * W, y = rng() * H, r = 50 + rng() * 140;
      const col = rng() < 0.5 ? theme.groundDark : theme.groundLight;
      c.fillStyle = rg(c, x, y, r, [[0, rgba(col, 0.6)], [1, rgba(col, 0)]]);
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // moonlight pooling from the upper right
    c.fillStyle = rg(c, W * 0.85, -40, W * 0.7, [[0, 'rgba(200,230,255,0.16)'], [1, 'rgba(200,230,255,0)']]);
    c.fillRect(0, 0, W, H);
    // grass / texture strokes
    for (let i = 0; i < 1500; i++) {
      const x = rng() * W, y = rng() * H;
      c.strokeStyle = rng() < 0.5 ? sh(theme.groundDark, -0.15) : sh(theme.groundLight, 0.12);
      c.lineWidth = 1.1; c.globalAlpha = 0.5;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - 1, y - 3, x - 2 + rng() * 4, y - 5 - rng() * 3); c.stroke();
    }
    c.globalAlpha = 1;
    // theme details
    const amb = theme.ambient;
    if (amb === 'fireflies' || amb === 'mist') {
      for (let i = 0; i < (amb === 'mist' ? 9 : 14); i++) {
        const x = rng() * W, y = 100 + rng() * (H - 160), rx = 26 + rng() * 46;
        ell(c, x, y, rx, rx * 0.42, lg(c, 0, y - rx * 0.4, 0, y + rx * 0.4, [[0, '#0e1e2e'], [1, '#1a3446']]), 'rgba(10,15,26,0.6)', 1.5);
        ell(c, x - rx * 0.3, y - rx * 0.1, rx * 0.35, rx * 0.06, 'rgba(220,240,255,0.35)', null);
        if (amb === 'fireflies') for (let k = 0; k < 2; k++) { const lx = x + (rng() - 0.5) * rx, ly = y + (rng() - 0.5) * rx * 0.3; ell(c, lx, ly, 6, 3, '#2f7a4a', null); circ(c, lx, ly - 1, 1.4, '#ff9ae6', null); }
      }
    }
    if (amb === 'snow') for (let i = 0; i < 300; i++) { c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(rng() * W, rng() * H, 1.4, 1.4); }
    if (amb === 'blight') {
      c.strokeStyle = 'rgba(192,140,255,0.45)'; c.lineWidth = 1.6;
      for (let i = 0; i < 26; i++) {
        let x = rng() * W, y = rng() * H;
        c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 5; k++) { x += (rng() - 0.5) * 40; y += (rng() - 0.5) * 30; c.lineTo(x, y); }
        c.stroke();
      }
    }

    // moon-roads: soft shadow, mossy edge, cobbled surface, luminous stones
    const stroke = (w: number, style: string | CanvasGradient, blur = 0) => {
      c.save();
      c.lineJoin = 'round'; c.lineCap = 'round';
      c.strokeStyle = style; c.lineWidth = w;
      if (blur) { c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = blur; c.shadowOffsetY = 3; }
      for (const pts of paths) {
        c.beginPath();
        c.moveTo(pts[0].x, pts[0].y);
        for (let i = 3; i < pts.length; i += 3) c.lineTo(pts[i].x, pts[i].y);
        c.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        c.stroke();
      }
      c.restore();
    };
    stroke(62, rgba(0x000000, 0.35), 14);
    stroke(56, hex(theme.pathEdge));
    stroke(47, hex(theme.path));
    stroke(26, rgba(0xffffff, 0.05));
    for (const pts of paths) {
      for (let i = 0; i < pts.length; i += 4) {
        const p = pts[i];
        for (let k = 0; k < 2; k++) {
          const x = p.x + (rng() - 0.5) * 38, y = p.y + (rng() - 0.5) * 38, r = 3 + rng() * 3.5;
          ell(c, x, y, r * 1.2, r * 0.8, rng() < 0.5 ? sh(theme.path, 0.12) : sh(theme.path, -0.12), rgba(0x0a0f1a, 0.35), 0.8);
        }
      }
      for (let i = 0; i < pts.length; i += 14) {
        const p = pts[i];
        const x = p.x + (rng() - 0.5) * 34, y = p.y + (rng() - 0.5) * 34;
        c.fillStyle = rg(c, x, y, 9, [[0, rgba(theme.glow, 0.7)], [1, rgba(theme.glow, 0)]]);
        c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.fill();
        ell(c, x, y, 2.6, 2, sh(theme.glow, 0.3), null);
      }
      // moss along the edges
      for (let i = 0; i < pts.length; i += 6) {
        const p = pts[i];
        const a = rng() * Math.PI * 2;
        ell(c, p.x + Math.cos(a) * 27, p.y + Math.sin(a) * 27, 5 + rng() * 6, 2.5 + rng() * 2, rgba(0x2f6a4a, 0.65), null);
      }
    }
  });
}

/* ------------------------------ world map -------------------------- */

export function paintWorldMap(scene: Phaser.Scene, nodes: [number, number][], colors: number[]): void {
  tex(scene, 'worldmap', W, H, c => {
    const rng = seeded(99);
    c.fillStyle = lg(c, 0, 0, 0, H, [[0, '#0d1838'], [1, '#081028']]);
    c.fillRect(0, 0, W, H);
    for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(255,255,255,${0.2 + rng() * 0.6})`; c.fillRect(rng() * W, rng() * H, 1.3, 1.3); }
    c.strokeStyle = 'rgba(160,200,255,0.12)'; c.lineWidth = 2;
    for (let i = 0; i < 60; i++) {
      const x = rng() * W, y = rng() * H;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 10, y - 5, x + 20, y); c.quadraticCurveTo(x + 30, y + 5, x + 40, y); c.stroke();
    }
    const island = (cc: Ctx) => {
      cc.beginPath();
      const pts: [number, number][] = [];
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const r = 1 + Math.sin(a * 3 + 1) * 0.06 + Math.sin(a * 7) * 0.035;
        pts.push([640 + Math.cos(a) * 590 * r, 420 + Math.sin(a) * 260 * r]);
      }
      cc.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i <= pts.length; i++) {
        const p = pts[i % pts.length], q = pts[(i + 1) % pts.length];
        cc.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
      }
      cc.closePath();
    };
    c.save(); c.shadowColor = 'rgba(122,240,224,0.25)'; c.shadowBlur = 40;
    island(c); c.fillStyle = '#2a3a4a'; c.fill(); c.restore();
    c.save(); c.translate(640, 420); c.scale(0.965, 0.93); c.translate(-640, -420);
    island(c); c.fillStyle = lg(c, 0, 160, 0, 680, [[0, '#24504a'], [1, '#183830']]); c.fill();
    c.restore();
    nodes.forEach(([x, y], i) => {
      const col = colors[i] ?? 0x2b5550;
      c.fillStyle = rg(c, x, y, 150, [[0, rgba(col, 0.95)], [0.65, rgba(col, 0.75)], [1, rgba(col, 0)]]);
      c.beginPath(); c.ellipse(x, y, 160, 120, 0, 0, Math.PI * 2); c.fill();
    });
    // moonlight from above
    c.fillStyle = rg(c, 1100, 0, 900, [[0, 'rgba(220,240,255,0.18)'], [1, 'rgba(220,240,255,0)']]);
    c.fillRect(0, 0, W, H);
    // silver trail between levels
    c.setLineDash([2, 9]); c.lineCap = 'round';
    c.strokeStyle = 'rgba(207,230,240,0.85)'; c.lineWidth = 4;
    c.beginPath();
    nodes.forEach(([x, y], i) => {
      if (i === 0) { c.moveTo(x, y); return; }
      const [px, py] = nodes[i - 1];
      c.quadraticCurveTo((px + x) / 2, Math.min(py, y) - 50, x, y);
    });
    c.stroke();
    c.setLineDash([]);
    void OUT;
  });
}
