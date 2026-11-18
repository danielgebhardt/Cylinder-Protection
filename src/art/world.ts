import type * as Phaser from 'phaser';
import { tex, lg, rg, ell, circ, rrect, poly, shape, limb, gloss, softShadow, hex, sh, rgba, OUT } from './draw';
import type { Ctx } from './draw';
import { W, H } from '../config';
import { seeded } from '../util';
import type { Pt } from '../util';
import type { Theme } from '../data/levels';

/* ------------------------------ decor ------------------------------ */

function canopy(c: Ctx, blobs: [number, number, number][], base: number): void {
  for (const [x, y, r] of blobs) circ(c, x, y, r + 1, null, OUT, 3);
  for (const [x, y, r] of blobs) circ(c, x, y, r, rg(c, x, y, r * 1.3, [[0, sh(base, 0.25)], [0.6, hex(base)], [1, sh(base, -0.35)]], x - r * 0.4, y - r * 0.5), null);
  for (const [x, y, r] of blobs) gloss(c, x - r * 0.35, y - r * 0.45, r * 0.35, r * 0.2, 0.25, -0.4);
}

function drawDecor(c: Ctx, key: string): void {
  switch (key) {
    case 'tree': case 'autumn': {
      const base = key === 'autumn' ? 0xe08a2b : 0x3f9a3a;
      softShadow(c, 32, 66, 24, 6, 0.4);
      shape(c, cc => { cc.moveTo(27, 66); cc.lineTo(29, 40); cc.lineTo(35, 40); cc.lineTo(37, 66); cc.closePath(); }, lg(c, 27, 0, 37, 0, [[0, '#8a5a32'], [1, '#4a2e18']]), OUT, 2);
      canopy(c, [[20, 38, 13], [44, 38, 13], [32, 30, 17], [26, 22, 11], [39, 22, 10]], base);
      if (key === 'autumn') for (const [x, y] of [[22, 30], [40, 26], [33, 40], [46, 36]]) circ(c, x, y, 2.2, '#c0392b', OUT, 0.8);
      else for (const [x, y] of [[24, 33], [41, 30]]) circ(c, x, y, 1.8, '#d23a5a', OUT, 0.6);
      break;
    }
    case 'pine': case 'snowpine': {
      softShadow(c, 32, 68, 20, 5, 0.4);
      rrect(c, 29, 54, 6, 14, 1, '#5a3a22', OUT, 1.5);
      const base = 0x2f7a3e;
      for (let i = 0; i < 3; i++) {
        const y = 12 + i * 14, w = 13 + i * 6;
        poly(c, [32 - w, y + 22, 32 + w, y + 22, 32, y - 6], lg(c, 32 - w, 0, 32 + w, 0, [[0, sh(base, 0.2)], [0.5, hex(base)], [1, sh(base, -0.4)]]), OUT, 2);
        if (key === 'snowpine') shape(c, cc => { cc.moveTo(32 - w * 0.55, y + 9); cc.lineTo(32, y - 6); cc.lineTo(32 + w * 0.55, y + 9); cc.quadraticCurveTo(32, y + 4, 32 - w * 0.55, y + 9); }, '#ffffff', 'rgba(42,27,18,0.4)', 1);
      }
      break;
    }
    case 'deadtree': {
      softShadow(c, 32, 66, 18, 5, 0.4);
      const bark = '#4a3a30';
      limb(c, 32, 66, 32, 26, 6, bark);
      limb(c, 32, 44, 18, 28, 3.5, bark); limb(c, 32, 36, 46, 20, 3.5, bark);
      limb(c, 18, 28, 13, 15, 2.2, bark); limb(c, 46, 20, 52, 12, 2.2, bark); limb(c, 32, 26, 27, 12, 2.4, bark);
      break;
    }
    case 'rock': {
      softShadow(c, 32, 58, 24, 6, 0.4);
      poly(c, [10, 56, 14, 40, 26, 32, 42, 34, 52, 44, 54, 56], lg(c, 10, 32, 50, 58, [[0, '#a8a29a'], [0.5, '#7d776f'], [1, '#4f4a44']]), OUT, 2.2);
      poly(c, [14, 41, 26, 33, 30, 44, 18, 48], 'rgba(255,255,255,0.18)', null);
      limb(c, 30, 44, 36, 52, 0.8, 'rgba(42,27,18,0.5)', 'rgba(0,0,0,0)');
      break;
    }
    case 'bush': {
      softShadow(c, 32, 58, 22, 5, 0.35);
      canopy(c, [[20, 48, 10], [44, 48, 10], [32, 42, 13]], 0x3a8f3a);
      for (const [x, y] of [[24, 44], [38, 46], [31, 38]]) circ(c, x, y, 2.2, '#e0405a', OUT, 0.8);
      break;
    }
    case 'flower': {
      const cols = ['#ffd84a', '#ff7ab0', '#ffffff', '#b08aff', '#ff8a4a'];
      for (let i = 0; i < 6; i++) {
        const x = 12 + (i * 37) % 40, y = 40 + (i * 23) % 18;
        limb(c, x, y, x, y + 9, 0.6, '#2f7a32', '#1f5a22');
        for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; circ(c, x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 2.1, cols[i % cols.length], 'rgba(42,27,18,0.5)', 0.6); }
        circ(c, x, y, 1.5, '#ffa500', null);
      }
      break;
    }
    case 'crystal': {
      softShadow(c, 32, 60, 18, 5, 0.35);
      c.fillStyle = rg(c, 30, 46, 22, [[0, 'rgba(120,220,255,0.35)'], [1, 'rgba(120,220,255,0)']]);
      c.fillRect(8, 24, 44, 40);
      for (const [x0, x1, tip, tx] of [[18, 28, 38, 20], [24, 36, 22, 29], [32, 42, 32, 39]] as const) {
        poly(c, [x0, 60, x1, 60, tx + 2, tip, tx - 1, tip + 3], lg(c, x0, tip, x1, 60, [[0, '#e6fbff'], [0.5, '#6ad0ff'], [1, '#2a7ab0']]), '#1a4a70', 1.6);
      }
      break;
    }
    case 'lava': {
      ell(c, 32, 50, 26, 12, '#2a1a14', OUT, 2);
      ell(c, 32, 49, 21, 9, rg(c, 32, 49, 21, [[0, '#ffe08a'], [0.4, '#ff8a2a'], [1, '#b8300a']]), null);
      circ(c, 26, 47, 2.4, '#fff2b0', null); circ(c, 38, 51, 1.6, '#fff2b0', null);
      break;
    }
  }
}

/* ------------------------------ cylinder --------------------------- */

function drawCylinder(c: Ctx): void {
  softShadow(c, 50, 132, 48, 12, 0.5);
  // pedestal
  shape(c, cc => { cc.moveTo(14, 110); cc.lineTo(14, 124); cc.ellipse(50, 124, 36, 10, 0, Math.PI, 0, true); cc.lineTo(86, 110); cc.closePath(); }, cyl2(c, 0x7d7466, 14, 72), OUT, 2.2);
  ell(c, 50, 110, 36, 10, lg(c, 0, 100, 0, 120, [[0, '#c4bba8'], [1, '#8f877a']]), OUT, 2.2);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; circ(c, 50 + Math.cos(a) * 30, 110 + Math.sin(a) * 7.5, 1.5, '#5ad0ff', null); }
  // crystal cylinder body
  const body = lg(c, 26, 0, 74, 0, [[0, '#1f6a9c'], [0.18, '#5ad0ff'], [0.32, '#e6fbff'], [0.45, '#9feaff'], [0.75, '#3aa8e0'], [1, '#165a88']]);
  shape(c, cc => { cc.moveTo(26, 22); cc.lineTo(26, 108); cc.ellipse(50, 108, 24, 7, 0, Math.PI, 0, true); cc.lineTo(74, 22); cc.closePath(); }, body, OUT, 2.4);
  c.save(); c.globalAlpha = 0.5;
  c.strokeStyle = '#ffffff'; c.lineWidth = 1;
  for (const y of [40, 58, 76, 94]) { c.beginPath(); c.ellipse(50, y, 24, 6, 0, 0.1, Math.PI - 0.1); c.stroke(); }
  c.restore();
  // gold bands with runes
  for (const y of [44, 84]) {
    c.lineWidth = 7; c.strokeStyle = OUT; c.beginPath(); c.ellipse(50, y, 25, 7, 0, 0, Math.PI); c.stroke();
    c.lineWidth = 4.5; c.strokeStyle = '#e8b830'; c.stroke();
    c.lineWidth = 1.2; c.strokeStyle = '#fff2a0'; c.beginPath(); c.ellipse(50, y - 1, 25, 7, 0, 0.3, Math.PI - 0.3); c.stroke();
  }
  circ(c, 50, 64, 6, rg(c, 50, 64, 7, [[0, '#fff6c0'], [0.6, '#ffd23a'], [1, '#b07a10']], 48, 62), OUT, 1.8);
  // top cap
  ell(c, 50, 22, 24, 7, lg(c, 0, 15, 0, 29, [[0, '#ffffff'], [1, '#9feaff']]), OUT, 2.4);
  ell(c, 50, 22, 15, 3.8, rgba(0xffffff, 0.9), null);
}
function cyl2(c: Ctx, base: number, x: number, w: number): CanvasGradient {
  return lg(c, x, 0, x + w, 0, [[0, sh(base, -0.2)], [0.3, sh(base, 0.3)], [1, sh(base, -0.45)]]);
}

export function generateWorld(scene: Phaser.Scene): void {
  for (const d of ['tree', 'autumn', 'pine', 'snowpine', 'deadtree', 'rock', 'bush', 'flower', 'crystal', 'lava']) {
    tex(scene, `decor_${d}`, 64, 72, c => drawDecor(c, d));
  }
  tex(scene, 'cylinder', 100, 140, c => drawCylinder(c));
}

/* ------------------------------ level map -------------------------- */

/** Paint a level's ground and roads to a hi-res texture. */
export function paintMap(scene: Phaser.Scene, key: string, theme: Theme, paths: Pt[][], seed: number): void {
  tex(scene, key, W, H, c => {
    const rng = seeded(seed);
    // ground with broad light variation
    c.fillStyle = lg(c, 0, 0, W * 0.4, H, [[0, sh(theme.ground, 0.08)], [1, sh(theme.ground, -0.08)]]);
    c.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) {
      const x = rng() * W, y = rng() * H, r = 50 + rng() * 140;
      const col = rng() < 0.5 ? theme.groundDark : theme.groundLight;
      c.fillStyle = rg(c, x, y, r, [[0, rgba(col, 0.55)], [1, rgba(col, 0)]]);
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // grass blades / texture
    for (let i = 0; i < 1600; i++) {
      const x = rng() * W, y = rng() * H;
      const col = rng() < 0.5 ? sh(theme.groundDark, -0.1) : sh(theme.groundLight, 0.1);
      c.strokeStyle = col; c.lineWidth = 1.1; c.globalAlpha = 0.55;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - 1, y - 3, x - 2 + rng() * 4, y - 5 - rng() * 3); c.stroke();
    }
    c.globalAlpha = 1;
    // theme details
    if (theme.decor.includes('snowpine')) {
      for (let i = 0; i < 300; i++) { c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(rng() * W, rng() * H, 1.4, 1.4); }
    }
    if (theme.decor.includes('lava')) {
      c.strokeStyle = 'rgba(255,120,30,0.5)'; c.lineWidth = 1.6;
      for (let i = 0; i < 26; i++) {
        let x = rng() * W, y = rng() * H;
        c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 5; k++) { x += (rng() - 0.5) * 40; y += (rng() - 0.5) * 30; c.lineTo(x, y); }
        c.stroke();
      }
    }
    if (theme.decor.includes('deadtree') && !theme.decor.includes('lava')) {
      for (let i = 0; i < 14; i++) {
        const x = rng() * W, y = rng() * H, rx = 30 + rng() * 40;
        ell(c, x, y, rx, rx * 0.4, lg(c, 0, y - rx * 0.4, 0, y + rx * 0.4, [[0, 'rgba(40,70,70,0.55)'], [1, 'rgba(70,110,100,0.55)']]), 'rgba(30,50,40,0.4)', 1.5);
        ell(c, x - rx * 0.3, y - rx * 0.12, rx * 0.3, rx * 0.06, 'rgba(255,255,255,0.18)', null);
      }
    }

    // roads
    const stroke = (w: number, style: string | CanvasGradient, blur = 0, alpha = 1) => {
      c.save();
      c.globalAlpha = alpha;
      c.lineJoin = 'round'; c.lineCap = 'round';
      c.strokeStyle = style; c.lineWidth = w;
      if (blur) { c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = blur; c.shadowOffsetY = 3; }
      for (const pts of paths) {
        c.beginPath();
        c.moveTo(pts[0].x, pts[0].y);
        for (let i = 3; i < pts.length; i += 3) c.lineTo(pts[i].x, pts[i].y);
        c.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        c.stroke();
      }
      c.restore();
    };
    stroke(62, rgba(theme.pathEdge, 0.35), 14);
    stroke(56, hex(theme.pathEdge));
    stroke(47, hex(theme.path));
    stroke(30, rgba(0xffffff, 0.08));
    stroke(12, rgba(0xffffff, 0.06));
    // wheel ruts + pebbles
    for (const pts of paths) {
      for (const off of [-9, 9]) {
        c.strokeStyle = rgba(theme.pathEdge, 0.35); c.lineWidth = 2.2;
        c.beginPath();
        for (let i = 0; i < pts.length - 4; i += 4) {
          const a = pts[i], b = pts[i + 4];
          const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
          const x = a.x - (dy / l) * off, y = a.y + (dx / l) * off;
          if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.stroke();
      }
      for (let i = 0; i < pts.length; i += 7) {
        const p = pts[i];
        const x = p.x + (rng() - 0.5) * 40, y = p.y + (rng() - 0.5) * 40;
        const r = 1.2 + rng() * 2.4;
        ell(c, x, y, r * 1.3, r, rng() < 0.5 ? sh(theme.pathEdge, 0.1) : sh(theme.path, 0.2), rgba(0x2a1b12, 0.4), 0.8);
      }
    }
  });
}

/* ------------------------------ world map -------------------------- */

export function paintWorldMap(scene: Phaser.Scene, nodes: [number, number][]): void {
  tex(scene, 'worldmap', W, H, c => {
    const rng = seeded(99);
    c.fillStyle = lg(c, 0, 0, 0, H, [[0, '#2f7fa0'], [1, '#1f5a7a']]);
    c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 2;
    for (let i = 0; i < 70; i++) {
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
    c.save(); c.shadowColor = 'rgba(0,0,0,0.4)'; c.shadowBlur = 30; c.shadowOffsetY = 10;
    island(c); c.fillStyle = '#e8d6a0'; c.fill(); c.restore();
    c.save(); c.translate(640, 420); c.scale(0.965, 0.93); c.translate(-640, -420);
    island(c); c.fillStyle = lg(c, 0, 160, 0, 680, [[0, '#8cc05a'], [1, '#5f9a3e']]); c.fill();
    c.restore();
    const regions: [number, number, number][] = [[210, 470, 0x7fb84a], [430, 330, 0xc0a24a], [660, 470, 0x4f7a4a], [870, 300, 0xe6eef4], [1070, 460, 0x6e5a52]];
    for (const [x, y, col] of regions) {
      c.fillStyle = rg(c, x, y, 150, [[0, rgba(col, 0.95)], [0.65, rgba(col, 0.8)], [1, rgba(col, 0)]]);
      c.beginPath(); c.ellipse(x, y, 160, 120, 0, 0, Math.PI * 2); c.fill();
    }
    // mountains
    for (let i = 0; i < 9; i++) {
      const x = 790 + rng() * 170, y = 230 + rng() * 90, s = 18 + rng() * 14;
      poly(c, [x - s, y + s * 0.8, x + s, y + s * 0.8, x, y - s], lg(c, x - s, 0, x + s, 0, [[0, '#b8bcc8'], [1, '#6a6e7a']]), OUT, 1.6);
      poly(c, [x - s * 0.38, y - s * 0.24, x + s * 0.38, y - s * 0.24, x, y - s], '#ffffff', null);
    }
    // trail
    c.setLineDash([2, 9]); c.lineCap = 'round';
    c.strokeStyle = 'rgba(70,40,20,0.85)'; c.lineWidth = 5;
    c.beginPath();
    nodes.forEach(([x, y], i) => {
      if (i === 0) { c.moveTo(x, y); return; }
      const [px, py] = nodes[i - 1];
      c.quadraticCurveTo((px + x) / 2, Math.min(py, y) - 50, x, y);
    });
    c.stroke();
    c.setLineDash([]);
  });
}
