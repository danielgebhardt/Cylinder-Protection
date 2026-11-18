import type * as Phaser from 'phaser';
import { tex, rg, lg, ell, circ, rrect, poly, shape, star, gloss, sh, OUT } from './draw';
import type { Ctx } from './draw';
import { W, H } from '../config';

/** Soft radial blob (for additive glows, smoke, shadows). */
function blob(scene: Phaser.Scene, key: string, size: number, stops: [number, string][]): void {
  tex(scene, key, size, size, c => {
    c.fillStyle = rg(c, size / 2, size / 2, size / 2, stops);
    c.fillRect(0, 0, size, size);
  });
}

export function generateFx(scene: Phaser.Scene): void {
  // --- soft particles (white so they can be tinted) ---
  blob(scene, 'glow', 64, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.6)'], [0.6, 'rgba(255,255,255,0.15)'], [1, 'rgba(255,255,255,0)']]);
  blob(scene, 'spark', 16, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]);
  blob(scene, 'smoke', 48, [[0, 'rgba(255,255,255,0.85)'], [0.55, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]);
  blob(scene, 'puff', 32, [[0, 'rgba(255,255,255,0.9)'], [0.6, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]);
  blob(scene, 'shadow', 64, [[0, 'rgba(0,0,0,0.55)'], [0.55, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0)']]);
  tex(scene, 'flare', 64, 64, c => {
    c.fillStyle = rg(c, 32, 32, 32, [[0, 'rgba(255,255,255,1)'], [0.15, 'rgba(255,255,255,0.7)'], [0.4, 'rgba(255,255,255,0.12)'], [1, 'rgba(255,255,255,0)']]);
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.beginPath(); c.ellipse(32, 32, 30, 2, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(32, 32, 2, 30, 0, 0, Math.PI * 2); c.fill();
  });
  tex(scene, 'ring', 64, 64, c => {
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 8; c.beginPath(); c.arc(32, 32, 26, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,1)'; c.lineWidth = 3; c.beginPath(); c.arc(32, 32, 26, 0, Math.PI * 2); c.stroke();
  });
  tex(scene, 'shard', 12, 20, c => {
    poly(c, [6, 0, 11, 9, 6, 20, 1, 9], lg(c, 0, 0, 12, 20, [[0, '#ffffff'], [1, '#9fe8ff']]), '#3f8fd0', 1);
  });
  tex(scene, 'debris', 10, 10, c => poly(c, [1, 4, 5, 0, 9, 3, 8, 8, 3, 9], '#6f6a64', OUT, 1.2));
  tex(scene, 'leaf', 14, 10, c => {
    shape(c, c => { c.moveTo(1, 5); c.quadraticCurveTo(7, -2, 13, 5); c.quadraticCurveTo(7, 12, 1, 5); }, lg(c, 0, 0, 14, 10, [[0, '#ffb347'], [1, '#c0392b']]), '#6b3a1a', 1);
    c.strokeStyle = '#6b3a1a'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(1, 5); c.lineTo(12, 5); c.stroke();
  });
  tex(scene, 'snowflake', 10, 10, c => {
    c.fillStyle = rg(c, 5, 5, 5, [[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]);
    c.fillRect(0, 0, 10, 10);
  });
  tex(scene, 'bubble', 12, 12, c => {
    circ(c, 6, 6, 4.5, 'rgba(140,230,90,0.5)', '#3f8a2a', 1.2);
    circ(c, 4.5, 4.5, 1.3, 'rgba(255,255,255,0.9)', null);
  });
  tex(scene, 'coinfx', 16, 16, c => {
    circ(c, 8, 8, 6.5, lg(c, 2, 2, 14, 14, [[0, '#fff2a0'], [0.5, '#f2c14e'], [1, '#b07a10']]), '#6b4a0a', 1.5);
    c.fillStyle = '#fff6c0'; c.fillRect(7, 4, 2, 8);
  });
  // smooth gradient, so paint it small and let the GPU scale it up (saves ~15 MB at 2x)
  const vw = W / 8, vh = H / 8;
  tex(scene, 'vignette', vw, vh, c => {
    c.save();
    c.translate(vw / 2, vh / 2);
    c.scale(1, vh / vw);
    c.fillStyle = rg(c, 0, 0, vw * 0.72, [[0, 'rgba(0,0,0,0)'], [0.62, 'rgba(0,0,0,0)'], [0.85, 'rgba(10,6,20,0.22)'], [1, 'rgba(10,6,20,0.5)']]);
    c.fillRect(-vw, -vw, vw * 2, vw * 2);
    c.restore();
  });
  tex(scene, 'cloudshadow', 360, 220, c => {
    c.fillStyle = 'rgba(0,0,0,0.5)';
    for (const [x, y, r] of [[120, 120, 80], [190, 100, 95], [260, 125, 70], [170, 145, 70]] as const) {
      c.fillStyle = rg(c, x, y, r, [[0, 'rgba(0,0,0,0.5)'], [0.7, 'rgba(0,0,0,0.3)'], [1, 'rgba(0,0,0,0)']]);
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
  });

  // --- projectiles ---
  tex(scene, 'bolt', 28, 28, c => {
    c.fillStyle = rg(c, 14, 14, 14, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.85)'], [0.6, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]);
    c.fillRect(0, 0, 28, 28);
  });
  // --- icons ---
  tex(scene, 'icon_heart', 48, 48, c => {
    shape(c, c => {
      c.moveTo(24, 42);
      c.bezierCurveTo(4, 28, 2, 12, 14, 8);
      c.bezierCurveTo(20, 6, 24, 11, 24, 14);
      c.bezierCurveTo(24, 11, 28, 6, 34, 8);
      c.bezierCurveTo(46, 12, 44, 28, 24, 42);
    }, lg(c, 0, 6, 0, 42, [[0, '#ff7a8a'], [0.5, '#e8384a'], [1, '#9a1424']]), OUT, 2.5);
    gloss(c, 15, 15, 5, 3, 0.6);
  });
  tex(scene, 'icon_coin', 48, 48, c => {
    ell(c, 24, 27, 18, 17, '#8a5a0a', OUT, 2.5);
    circ(c, 24, 23, 17, lg(c, 8, 6, 40, 40, [[0, '#fff2a0'], [0.45, '#f2c14e'], [1, '#c08a10']]), OUT, 2.5);
    circ(c, 24, 23, 11, null, '#b07a10', 2);
    rrect(c, 21, 14, 6, 18, 2, '#fff6c0', '#b07a10', 1.2);
  });
  for (const [key, fill, dark] of [['icon_star', '#ffd23a', '#c08a10'], ['icon_star_empty', '#5a5a62', '#36363c']] as const) {
    tex(scene, key, 48, 48, c => {
      star(c, 24, 26, 21, 9.5, 5, lg(c, 0, 4, 0, 46, [[0, key === 'icon_star' ? '#fff3a0' : '#7a7a82'], [0.5, fill], [1, dark]]), OUT, 2.5);
      if (key === 'icon_star') gloss(c, 18, 18, 5, 2.5, 0.55);
    });
  }
  tex(scene, 'icon_lock', 48, 48, c => {
    shape(c, c => { c.arc(24, 20, 10, Math.PI, 0); }, null, OUT, 7);
    shape(c, c => { c.arc(24, 20, 10, Math.PI, 0); }, null, '#b8b8c0', 4);
    rrect(c, 10, 20, 28, 22, 5, lg(c, 0, 20, 0, 42, [[0, '#9a9aa2'], [1, '#55555c']]), OUT, 2.5);
    circ(c, 24, 29, 3.5, '#222', null); c.fillStyle = '#222'; c.fillRect(22.5, 30, 3, 7);
  });
  tex(scene, 'icon_up', 40, 40, c => {
    poly(c, [20, 3, 37, 21, 27, 21, 27, 36, 13, 36, 13, 21, 3, 21], lg(c, 0, 3, 0, 36, [[0, '#b4ff8a'], [0.5, '#5ad13a'], [1, '#2a8a1a']]), OUT, 2.5);
    gloss(c, 15, 15, 5, 2, 0.5);
  });
  tex(scene, 'icon_sell', 40, 40, c => {
    circ(c, 20, 22, 15, '#8a5a0a', OUT, 2);
    circ(c, 20, 19, 15, lg(c, 6, 4, 34, 34, [[0, '#fff2a0'], [0.5, '#f2c14e'], [1, '#c08a10']]), OUT, 2.2);
    c.fillStyle = '#7a4a0a'; c.font = 'bold 18px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('$', 20, 20);
  });
  tex(scene, 'icon_energy', 48, 48, c => {
    circ(c, 24, 25, 18, '#0e3a52', OUT, 2.5);
    circ(c, 24, 23, 17, rg(c, 24, 20, 18, [[0, '#9feaff'], [0.6, '#3aa8e0'], [1, '#1a5a88']], 18, 14), OUT, 2.5);
    poly(c, [27, 8, 15, 26, 23, 26, 20, 39, 33, 19, 25, 19], lg(c, 0, 8, 0, 39, [[0, '#ffffff'], [1, '#fff2a0']]), OUT, 2);
  });
  tex(scene, 'icon_rift', 48, 48, c => {
    c.fillStyle = rg(c, 24, 24, 22, [[0, '#1a0a2a'], [0.5, '#5a1a8a'], [0.85, '#c06aff'], [1, 'rgba(192,106,255,0)']]);
    c.beginPath(); c.ellipse(24, 24, 22, 22, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#f0d0ff'; c.lineWidth = 2;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(24, 24, 6 + i * 5, i * 2.1, i * 2.1 + 3.6); c.stroke(); }
    circ(c, 24, 24, 3, '#ffffff', null);
  });
  tex(scene, 'icon_surge', 64, 64, c => {
    c.fillStyle = rg(c, 32, 32, 30, [[0, 'rgba(160,240,255,0.7)'], [1, 'rgba(90,208,255,0)']]); c.fillRect(0, 0, 64, 64);
    poly(c, [36, 6, 16, 34, 29, 34, 24, 58, 48, 26, 35, 26], lg(c, 0, 6, 0, 58, [[0, '#ffffff'], [0.5, '#9feaff'], [1, '#3aa8e0']]), OUT, 2.5);
  });
  tex(scene, 'icon_nova', 64, 64, c => {
    for (const [r, a] of [[28, 0.35], [21, 0.6]] as const) { c.strokeStyle = `rgba(160,240,255,${a})`; c.lineWidth = 4; c.beginPath(); c.arc(32, 32, r, 0, Math.PI * 2); c.stroke(); }
    star(c, 32, 32, 16, 6, 8, rg(c, 32, 32, 16, [[0, '#ffffff'], [1, '#5ad0ff']]), OUT, 2);
  });
  tex(scene, 'icon_fuse', 40, 40, c => {
    circ(c, 14, 20, 9, rg(c, 12, 18, 10, [[0, '#ffd36e'], [1, '#e0501a']]), OUT, 2);
    circ(c, 26, 20, 9, rg(c, 24, 18, 10, [[0, '#ffffff'], [1, '#3aa8e0']]), OUT, 2);
    star(c, 20, 20, 7, 3, 4, '#ffffff', OUT, 1.2);
  });
  tex(scene, 'icon_pause', 48, 48, c => { rrect(c, 13, 10, 8, 28, 2.5, '#ffffff', OUT, 2); rrect(c, 27, 10, 8, 28, 2.5, '#ffffff', OUT, 2); });
  tex(scene, 'icon_play', 48, 48, c => poly(c, [15, 10, 38, 24, 15, 38], '#ffffff', OUT, 2.2));
  tex(scene, 'icon_ff', 48, 48, c => { poly(c, [6, 12, 24, 24, 6, 36], '#ffe26a', OUT, 2); poly(c, [24, 12, 42, 24, 24, 36], '#ffe26a', OUT, 2); });
  tex(scene, 'icon_check', 40, 40, c => {
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = OUT; c.lineWidth = 9; c.beginPath(); c.moveTo(8, 21); c.lineTo(17, 30); c.lineTo(33, 11); c.stroke();
    c.strokeStyle = '#6ae04a'; c.lineWidth = 5; c.stroke();
  });
  const speaker = (c: Ctx) => { poly(c, [7, 18, 16, 18, 27, 8, 27, 40, 16, 30, 7, 30], '#ffffff', OUT, 2); };
  tex(scene, 'icon_sound', 48, 48, c => {
    speaker(c);
    for (const r of [8, 14]) { c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.arc(28, 24, r, -0.85, 0.85); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.stroke(); }
  });
  tex(scene, 'icon_mute', 48, 48, c => {
    speaker(c);
    c.strokeStyle = OUT; c.lineWidth = 6; c.beginPath(); c.moveTo(32, 17); c.lineTo(43, 31); c.moveTo(43, 17); c.lineTo(32, 31); c.stroke();
    c.strokeStyle = '#e8384a'; c.lineWidth = 3.5; c.stroke();
  });
  void sh;
}
