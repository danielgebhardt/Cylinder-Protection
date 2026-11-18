import type * as Phaser from 'phaser';
import { tex, rg, lg, ell, circ, rrect, poly, shape, limb, star, gloss, softShadow, sh, OUT } from './draw';
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
  tex(scene, 'arrow', 28, 8, c => {
    limb(c, 3, 4, 21, 4, 1.6, '#8a5a2a');
    poly(c, [20, 1, 28, 4, 20, 7], '#d8dde3', OUT, 1.2);
    poly(c, [0, 1, 6, 4, 0, 7], '#e8e0c8', OUT, 1);
    poly(c, [3, 1, 8, 4, 3, 7], '#c0392b', OUT, 1);
  });
  tex(scene, 'bolt', 28, 28, c => {
    c.fillStyle = rg(c, 14, 14, 14, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.85)'], [0.6, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]);
    c.fillRect(0, 0, 28, 28);
  });
  tex(scene, 'shell', 18, 18, c => {
    circ(c, 9, 9, 7, rg(c, 9, 9, 8, [[0, '#7a7f88'], [0.6, '#3a3d44'], [1, '#15161a']], 6, 6), OUT, 1.5);
    gloss(c, 6.5, 6, 2.5, 1.5, 0.6);
    limb(c, 12, 4, 15, 1, 1.4, '#a0703a');
  });
  tex(scene, 'rocketp', 26, 10, c => {
    poly(c, [2, 1, 7, 5, 2, 9], '#555', OUT, 1);
    rrect(c, 4, 2.5, 15, 5, 2, lg(c, 0, 2, 0, 8, [[0, '#eeeeee'], [1, '#8a8a8a']]), OUT, 1.2);
    poly(c, [18, 2, 26, 5, 18, 8], '#d23a2a', OUT, 1.2);
    c.fillStyle = '#d23a2a'; c.fillRect(9, 3, 2, 4);
  });
  tex(scene, 'meteor', 44, 44, c => {
    c.fillStyle = rg(c, 22, 22, 22, [[0, 'rgba(255,220,120,1)'], [0.35, 'rgba(255,140,40,0.85)'], [0.7, 'rgba(220,60,20,0.3)'], [1, 'rgba(200,40,10,0)']]);
    c.fillRect(0, 0, 44, 44);
    poly(c, [14, 18, 20, 12, 29, 14, 31, 23, 25, 30, 16, 28], rg(c, 22, 21, 11, [[0, '#ffcf5a'], [0.5, '#a0401a'], [1, '#3a1a0a']], 19, 17), '#2a0a00', 1.5);
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
  tex(scene, 'icon_skull', 48, 48, c => {
    shape(c, c => { c.arc(24, 21, 16, Math.PI * 0.8, Math.PI * 2.2); c.lineTo(33, 41); c.lineTo(15, 41); c.closePath(); },
      lg(c, 0, 5, 0, 41, [[0, '#ffffff'], [1, '#c8c0b0']]), OUT, 2.5);
    ell(c, 17.5, 23, 5, 5.5, '#2a1b12', null); ell(c, 30.5, 23, 5, 5.5, '#2a1b12', null);
    poly(c, [24, 27, 21, 33, 27, 33], '#2a1b12', null);
    c.strokeStyle = '#2a1b12'; c.lineWidth = 2;
    for (const x of [19, 24, 29]) { c.beginPath(); c.moveTo(x, 36); c.lineTo(x, 41); c.stroke(); }
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
  tex(scene, 'icon_meteor', 64, 64, c => {
    c.fillStyle = lg(c, 8, 6, 44, 42, [[0, 'rgba(255,200,80,0)'], [0.6, 'rgba(255,140,40,0.7)'], [1, 'rgba(255,90,20,0.95)']]);
    c.beginPath(); c.moveTo(6, 4); c.lineTo(48, 34); c.lineTo(34, 48); c.closePath(); c.fill();
    c.fillStyle = rg(c, 42, 42, 18, [[0, 'rgba(255,220,120,0.9)'], [1, 'rgba(255,120,30,0)']]);
    c.beginPath(); c.arc(42, 42, 18, 0, Math.PI * 2); c.fill();
    poly(c, [33, 38, 39, 31, 49, 33, 52, 43, 45, 51, 35, 48], rg(c, 42, 41, 12, [[0, '#ffcf5a'], [0.5, '#a0401a'], [1, '#3a1a0a']], 39, 37), OUT, 2);
  });
  tex(scene, 'icon_swords', 64, 64, c => {
    const sword = (flip: number) => {
      c.save(); c.translate(32, 32); c.scale(flip, 1); c.rotate(-Math.PI / 4);
      poly(c, [-3, -26, 0, -30, 3, -26, 3, 8, -3, 8], lg(c, -3, 0, 3, 0, [[0, '#ffffff'], [1, '#9aa4b0']]), OUT, 2);
      rrect(c, -9, 8, 18, 4, 2, '#d4a017', OUT, 1.8);
      rrect(c, -2.5, 12, 5, 10, 2, '#7a4a20', OUT, 1.8);
      circ(c, 0, 24, 3, '#d4a017', OUT, 1.5);
      c.restore();
    };
    sword(1); sword(-1);
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
  tex(scene, 'icon_flag', 40, 40, c => {
    limb(c, 11, 37, 11, 4, 2.5, '#7a4a20');
    shape(c, c => { c.moveTo(12, 5); c.quadraticCurveTo(22, 1, 34, 8); c.quadraticCurveTo(24, 13, 34, 20); c.quadraticCurveTo(22, 17, 12, 20); c.closePath(); },
      lg(c, 12, 0, 34, 20, [[0, '#ffe26a'], [1, '#d4a017']]), OUT, 2);
    ell(c, 11, 38, 6, 2, 'rgba(0,0,0,0.3)', null);
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
  tex(scene, 'icon_skill', 48, 48, c => {
    star(c, 24, 24, 21, 9, 8, '#ffffff', OUT, 2);
    circ(c, 24, 24, 6, 'rgba(0,0,0,0.25)', null);
    circ(c, 24, 24, 3.5, '#ffffff', null);
  });

  // rally flag & target marker
  tex(scene, 'rally', 28, 36, c => {
    softShadow(c, 8, 33, 7, 2.5, 0.4);
    limb(c, 7, 33, 7, 3, 2, '#7a4a20');
    shape(c, c => { c.moveTo(8, 3); c.quadraticCurveTo(17, 0, 26, 6); c.quadraticCurveTo(18, 10, 26, 15); c.quadraticCurveTo(17, 13, 8, 16); c.closePath(); },
      lg(c, 8, 0, 26, 16, [[0, '#ffe26a'], [1, '#d4a017']]), OUT, 1.6);
  });
  void sh;
}
