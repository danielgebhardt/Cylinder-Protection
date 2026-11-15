import * as Phaser from 'phaser';

type G = Phaser.GameObjects.Graphics;

function make(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: G) => void): void {
  const g = new Phaser.GameObjects.Graphics(scene);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

export function shade(c: number, amt: number): number {
  const r = (c >> 16) & 255, gg = (c >> 8) & 255, b = c & 255;
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  return (f(r) << 16) | (f(gg) << 8) | f(b);
}

/* ------------------------------------------------------------------ */
/* Towers: 104 x 124 canvas, ground anchor at (52, 100)               */
/* ------------------------------------------------------------------ */
export const TOWER_TEX = { w: 104, h: 124, ox: 0.5, oy: 100 / 124 };

function platform(g: G): void {
  g.fillStyle(0x000000, 0.25); g.fillEllipse(52, 104, 88, 26);
  g.fillStyle(0x7d7466); g.fillEllipse(52, 100, 80, 24);
  g.fillStyle(0x9d9483); g.fillEllipse(52, 97, 72, 18);
}

function flag(g: G, x: number, y: number, color: number): void {
  g.lineStyle(2, 0x3b2a1a); g.lineBetween(x, y, x, y - 22);
  g.fillStyle(color); g.fillTriangle(x, y - 22, x + 16, y - 17, x, y - 12);
}

function drawArcher(g: G, tier: number, variant: string): void {
  platform(g);
  const h = [0, 36, 44, 52, 58][tier];
  const top = 96 - h;
  const wood = variant === 'marksman' ? 0x6b5a4a : 0x7a5232;
  g.fillStyle(shade(wood, -0.25)); g.fillRect(32, top, 40, h);
  g.fillStyle(wood); g.fillRect(34, top, 34, h);
  g.fillStyle(shade(wood, 0.18)); g.fillRect(36, top, 10, h);
  g.lineStyle(2, shade(wood, -0.4));
  for (let y = top + 9; y < 96; y += 9) g.lineBetween(33, y, 71, y);
  g.lineBetween(34, top + 4, 70, 94); g.lineBetween(70, top + 4, 34, 94);
  // lookout deck
  g.fillStyle(shade(wood, -0.15)); g.fillRect(24, top - 8, 56, 10);
  g.fillStyle(shade(wood, 0.1));
  for (let x = 25; x < 79; x += 9) g.fillRect(x, top - 14, 6, 8);
  // archer
  g.fillStyle(0x2e5e2e); g.fillCircle(52, top - 18, 7);
  g.fillStyle(0xf0c9a0); g.fillCircle(52, top - 22, 4);
  // roof
  const roof = variant === 'ranger' ? 0x2f7d32 : variant === 'marksman' ? 0x2f5aa8 : [0, 0x8a4b2a, 0x9c3b2a, 0xb03a2e][Math.min(3, tier)];
  if (tier >= 2) {
    g.lineStyle(3, 0x3b2a1a); g.lineBetween(28, top - 8, 28, top - 30); g.lineBetween(76, top - 8, 76, top - 30);
    g.fillStyle(shade(roof, -0.25)); g.fillTriangle(20, top - 28, 84, top - 28, 52, top - 56);
    g.fillStyle(roof); g.fillTriangle(24, top - 30, 80, top - 30, 52, top - 54);
    g.fillStyle(shade(roof, 0.2)); g.fillTriangle(30, top - 31, 52, top - 31, 52, top - 52);
  }
  if (tier >= 3) flag(g, 52, tier === 4 ? top - 54 : top - 54, variant === 'marksman' ? 0x5ab0ff : variant === 'ranger' ? 0x8be04e : 0xf2c14e);
  if (variant === 'ranger') {
    g.fillStyle(0x3e8f3a, 0.9); g.fillCircle(30, 92, 9); g.fillCircle(76, 90, 8);
  }
  if (variant === 'marksman') {
    g.lineStyle(3, 0xc9b27a); g.lineBetween(58, top - 20, 74, top - 26);
  }
}

function drawMage(g: G, tier: number, variant: string): void {
  platform(g);
  const h = [0, 40, 48, 54, 58][tier];
  const top = 96 - h;
  const stone = variant === 'frost' ? 0xa9c4d6 : variant === 'arcane' ? 0x6d5f86 : 0x9a8f86;
  g.fillStyle(shade(stone, -0.3)); g.fillRoundedRect(30, top, 44, h + 2, 6);
  g.fillStyle(stone); g.fillRoundedRect(32, top, 38, h, 6);
  g.fillStyle(shade(stone, 0.2)); g.fillRect(35, top + 2, 9, h - 4);
  g.lineStyle(1.5, shade(stone, -0.35));
  for (let y = top + 8; y < 96; y += 8) {
    g.lineBetween(32, y, 70, y);
    const off = ((y / 8) | 0) % 2 ? 0 : 6;
    for (let x = 38 + off; x < 70; x += 12) g.lineBetween(x, y, x, y + 8);
  }
  // window
  g.fillStyle(0x2a1f3a); g.fillRoundedRect(46, top + 10, 12, 16, 5);
  const glow = variant === 'frost' ? 0x9fe8ff : variant === 'arcane' ? 0xe39bff : 0xffd36e;
  g.fillStyle(glow, 0.8); g.fillRoundedRect(48, top + 13, 8, 11, 3);
  // roof
  const roof = variant === 'frost' ? 0x3f8fd0 : variant === 'arcane' ? 0x6a2fb0 : [0, 0x5c3c9e, 0x5a35a8, 0x6331b8][Math.min(3, tier)];
  g.fillStyle(shade(roof, -0.3)); g.fillTriangle(24, top + 2, 80, top + 2, 52, top - 44);
  g.fillStyle(roof); g.fillTriangle(27, top, 77, top, 52, top - 42);
  g.fillStyle(shade(roof, 0.25)); g.fillTriangle(33, top - 1, 52, top - 1, 52, top - 38);
  g.fillStyle(0xf2c14e); g.fillRect(26, top - 2, 52, 4);
  // orb / crystal
  if (variant === 'arcane') {
    g.fillStyle(0xe39bff, 0.35); g.fillCircle(52, top - 56, 13);
    g.fillStyle(0xd27cff); g.fillTriangle(52, top - 70, 44, top - 56, 60, top - 56);
    g.fillStyle(0xb055f0); g.fillTriangle(52, top - 42, 44, top - 56, 60, top - 56);
  } else if (variant === 'frost') {
    g.fillStyle(0xbff4ff, 0.35); g.fillCircle(52, top - 54, 12);
    g.fillStyle(0xdffaff);
    g.fillTriangle(52, top - 68, 47, top - 54, 57, top - 54);
    g.fillTriangle(52, top - 42, 47, top - 54, 57, top - 54);
    g.fillStyle(0x8fdcff); g.fillTriangle(40, top - 54, 52, top - 50, 52, top - 58); g.fillTriangle(64, top - 54, 52, top - 50, 52, top - 58);
  } else {
    g.fillStyle(glow, 0.35); g.fillCircle(52, top - 48, 8 + tier);
    g.fillStyle(glow); g.fillCircle(52, top - 48, 4 + tier);
  }
}

function drawCannon(g: G, tier: number, variant: string): void {
  platform(g);
  const h = [0, 26, 30, 34, 36][tier];
  const top = 96 - h;
  const stone = variant === 'rocket' ? 0x8a6e5a : 0x8f8a80;
  g.fillStyle(shade(stone, -0.3)); g.fillRoundedRect(20, top, 64, h + 2, 8);
  g.fillStyle(stone); g.fillRoundedRect(22, top, 60, h, 8);
  g.fillStyle(shade(stone, 0.18)); g.fillRect(26, top + 3, 14, h - 6);
  g.lineStyle(1.5, shade(stone, -0.35));
  for (let y = top + 9; y < 96; y += 9) g.lineBetween(22, y, 82, y);
  // crenellations
  g.fillStyle(shade(stone, 0.05));
  for (let x = 22; x < 82; x += 13) g.fillRect(x, top - 7, 8, 8);
  if (variant === 'mortar') {
    g.fillStyle(0x6b4a2a); g.fillRect(36, top - 10, 32, 8);
    g.fillStyle(0xb5803a); g.fillEllipse(52, top - 18, 40, 26);
    g.fillStyle(0xd59a4a); g.fillEllipse(48, top - 22, 22, 12);
    g.fillStyle(0x2a2a2a); g.fillEllipse(52, top - 26, 26, 9);
    g.fillStyle(0x111111); g.fillEllipse(52, top - 26, 18, 5);
  } else if (variant === 'rocket') {
    g.fillStyle(0x4a4a4a); g.fillRect(34, top - 10, 36, 10);
    for (let i = 0; i < 3; i++) {
      const x = 36 + i * 11;
      g.fillStyle(0x6b6b6b); g.fillRect(x, top - 34, 9, 26);
      g.fillStyle(0xd23a2a); g.fillTriangle(x, top - 34, x + 9, top - 34, x + 4.5, top - 44);
      g.fillStyle(0xffffff, 0.3); g.fillRect(x + 1, top - 32, 2, 22);
    }
    g.fillStyle(0xf2c14e); g.fillRect(34, top - 12, 36, 3);
  } else {
    const len = 22 + tier * 4, thick = 11 + tier * 2;
    g.fillStyle(0x3b2a1a); g.fillRect(38, top - 10, 28, 9);
    g.fillStyle(0x222428);
    g.beginPath();
    const ang = -0.6, cx = 50, cy = top - 10;
    const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
    g.moveTo(cx + nx * thick / 2, cy + ny * thick / 2);
    g.lineTo(cx + dx * len + nx * thick / 2.4, cy + dy * len + ny * thick / 2.4);
    g.lineTo(cx + dx * len - nx * thick / 2.4, cy + dy * len - ny * thick / 2.4);
    g.lineTo(cx - nx * thick / 2, cy - ny * thick / 2);
    g.closePath(); g.fillPath();
    g.fillStyle(0x4a4d55); g.fillCircle(cx, cy, thick / 2 + 2);
    g.fillStyle(0x111111); g.fillCircle(cx + dx * len, cy + dy * len, thick / 2.6);
    g.fillStyle(0x6a3d1e); g.fillCircle(44, top - 4, 6); g.fillCircle(58, top - 4, 6);
  }
  if (tier >= 3) flag(g, 26, top - 6, variant === 'rocket' ? 0xd23a2a : 0xf2c14e);
}

function drawBarracks(g: G, tier: number, variant: string): void {
  platform(g);
  const wall = variant === 'knights' ? 0xb7b3ab : variant === 'berserkers' ? 0x6b4b36 : [0, 0xd9c19a, 0xd1b98f, 0xc8ae84][Math.min(3, tier)];
  const roof = variant === 'knights' ? 0x2f5aa8 : variant === 'berserkers' ? 0x8f1f1f : [0, 0x9a5a2a, 0xa1422a, 0x8f3b2b][Math.min(3, tier)];
  const h = 28 + Math.min(tier, 3) * 3;
  const top = 96 - h;
  g.fillStyle(shade(wall, -0.3)); g.fillRect(22, top, 60, h);
  g.fillStyle(wall); g.fillRect(24, top, 56, h - 1);
  g.fillStyle(shade(wall, 0.15)); g.fillRect(26, top + 2, 12, h - 5);
  if (variant !== 'knights') {
    g.lineStyle(3, 0x5a3a22);
    g.lineBetween(24, top + 1, 24, 96); g.lineBetween(80, top + 1, 80, 96); g.lineBetween(24, top + 12, 80, top + 12);
  } else {
    g.lineStyle(1.5, shade(wall, -0.35));
    for (let y = top + 8; y < 96; y += 8) g.lineBetween(24, y, 80, y);
  }
  // door
  g.fillStyle(0x4a2e18); g.fillRoundedRect(45, 96 - 20, 14, 20, { tl: 7, tr: 7, bl: 0, br: 0 });
  g.fillStyle(0x2a1a0c); g.fillCircle(56, 96 - 9, 1.5);
  // roof
  g.fillStyle(shade(roof, -0.3)); g.fillTriangle(14, top + 2, 90, top + 2, 52, top - 30);
  g.fillStyle(roof); g.fillTriangle(18, top, 86, top, 52, top - 28);
  g.fillStyle(shade(roof, 0.22)); g.fillTriangle(26, top - 1, 52, top - 1, 52, top - 24);
  // banner
  const bc = variant === 'knights' ? 0x5ab0ff : variant === 'berserkers' ? 0x111111 : 0xc0392b;
  g.lineStyle(2, 0x3b2a1a); g.lineBetween(70, top + 6, 70, top - 30);
  g.fillStyle(bc); g.fillRect(70, top - 30, 14, 18);
  g.fillTriangle(70, top - 12, 84, top - 12, 77, top - 6);
  if (variant === 'berserkers') { g.fillStyle(0xe6e6e6); g.fillCircle(77, top - 22, 4); }
  if (variant === 'knights') { g.fillStyle(0xf2c14e); g.fillRect(75, top - 27, 4, 10); g.fillRect(73, top - 24, 8, 3); }
  if (tier >= 2) { g.fillStyle(0x8a8a8a); g.fillRect(28, 96 - 14, 8, 6); g.fillStyle(0x3b2a1a); g.fillRect(31, 96 - 20, 2, 18); }
}

/* ------------------------------------------------------------------ */
/* Enemies: drawn on a canvas with ground anchor at bottom-centre     */
/* ------------------------------------------------------------------ */
export const ENEMY_TEX: Record<string, { w: number; h: number; scale?: number }> = {
  goblin: { w: 40, h: 40 }, wolf: { w: 52, h: 40 }, orc: { w: 46, h: 50 }, bat: { w: 56, h: 36 },
  shaman: { w: 44, h: 50 }, brute: { w: 60, h: 62 }, wraith: { w: 46, h: 54 }, warlord: { w: 90, h: 92 },
};

function eyes(g: G, x: number, y: number, sep: number, r: number, color = 0xffffff, pupil = 0x111111): void {
  g.fillStyle(color); g.fillCircle(x - sep, y, r); g.fillCircle(x + sep, y, r);
  g.fillStyle(pupil); g.fillCircle(x - sep + r * 0.3, y, r * 0.5); g.fillCircle(x + sep + r * 0.3, y, r * 0.5);
}

function drawEnemy(g: G, key: string): void {
  switch (key) {
    case 'goblin': {
      g.fillStyle(0x6b4a2a); g.fillRect(14, 30, 4, 8); g.fillRect(23, 30, 4, 8);
      g.fillStyle(0x7d5a3a); g.fillEllipse(20, 27, 20, 16);
      g.fillStyle(0x6cbf3c); g.fillCircle(20, 15, 10);
      g.fillTriangle(10, 14, 1, 8, 11, 19); g.fillTriangle(30, 14, 39, 8, 29, 19);
      eyes(g, 20, 14, 4, 3, 0xfff38a);
      g.fillStyle(0xcfcfcf); g.fillRect(30, 20, 3, 12); g.fillStyle(0x5a3a22); g.fillRect(29, 30, 5, 3);
      break;
    }
    case 'wolf': {
      g.fillStyle(0x4f4f5a); g.fillRect(12, 28, 5, 10); g.fillRect(34, 28, 5, 10);
      g.fillStyle(0x6e6e7c); g.fillEllipse(24, 24, 36, 18);
      g.fillStyle(0x8a8a98); g.fillEllipse(22, 20, 24, 8);
      g.fillStyle(0x6e6e7c); g.fillTriangle(6, 22, 0, 12, 10, 20);
      g.fillCircle(40, 18, 9);
      g.fillTriangle(36, 12, 38, 2, 42, 11); g.fillTriangle(42, 11, 46, 3, 47, 13);
      g.fillStyle(0x55555f); g.fillEllipse(47, 22, 10, 7);
      g.fillStyle(0xff4a3a); g.fillCircle(42, 16, 2);
      g.fillStyle(0xffffff); g.fillTriangle(45, 24, 47, 24, 46, 27);
      break;
    }
    case 'orc': {
      g.fillStyle(0x4a3424); g.fillRect(15, 38, 6, 10); g.fillRect(26, 38, 6, 10);
      g.fillStyle(0x6b6b6b); g.fillEllipse(23, 33, 30, 22);
      g.fillStyle(0x8a8a8a); g.fillRect(12, 28, 22, 4);
      g.fillStyle(0x4e8a32); g.fillCircle(23, 17, 12);
      g.fillStyle(0x7a7a80); g.fillEllipse(23, 10, 26, 12); g.fillRect(11, 9, 24, 4);
      eyes(g, 23, 17, 5, 2.6, 0xffe04a);
      g.fillStyle(0xffffff); g.fillTriangle(17, 23, 19, 23, 18, 19); g.fillTriangle(27, 23, 29, 23, 28, 19);
      g.fillStyle(0x5a3a22); g.fillRect(37, 14, 4, 26);
      g.fillStyle(0xbdbdbd); g.fillTriangle(35, 14, 46, 10, 46, 24);
      break;
    }
    case 'bat': {
      g.fillStyle(0x4a2a6a);
      g.fillTriangle(28, 16, 2, 6, 10, 26); g.fillTriangle(28, 16, 54, 6, 46, 26);
      g.fillStyle(0x3a1e56);
      g.fillTriangle(10, 26, 6, 14, 16, 22); g.fillTriangle(46, 26, 50, 14, 40, 22);
      g.fillStyle(0x6a3a8f); g.fillEllipse(28, 20, 16, 18);
      g.fillTriangle(22, 12, 24, 3, 27, 12); g.fillTriangle(29, 12, 32, 3, 34, 12);
      eyes(g, 28, 18, 4, 2.4, 0xff5a5a, 0x330000);
      g.fillStyle(0xffffff); g.fillTriangle(25, 24, 27, 24, 26, 27); g.fillTriangle(29, 24, 31, 24, 30, 27);
      break;
    }
    case 'shaman': {
      g.fillStyle(0x5a6b3a); g.fillTriangle(8, 48, 36, 48, 22, 20);
      g.fillStyle(0x6e7f46); g.fillTriangle(12, 48, 22, 48, 22, 24);
      g.fillStyle(0x7fae4c); g.fillCircle(22, 18, 9);
      g.fillStyle(0xd8c8a0); g.fillRoundedRect(14, 10, 16, 16, 4);
      g.fillStyle(0x111111); g.fillCircle(19, 17, 2); g.fillCircle(25, 17, 2); g.fillRect(19, 22, 6, 1.5);
      g.fillStyle(0xd23a2a); g.fillTriangle(14, 10, 22, 2, 30, 10);
      g.fillStyle(0x5a3a22); g.fillRect(36, 8, 3, 40);
      g.fillStyle(0x7dff8a, 0.4); g.fillCircle(37.5, 8, 7);
      g.fillStyle(0x7dff8a); g.fillCircle(37.5, 8, 4);
      break;
    }
    case 'brute': {
      g.fillStyle(0x3e4e5a); g.fillRect(17, 48, 9, 13); g.fillRect(34, 48, 9, 13);
      g.fillStyle(0x6a7f8c); g.fillEllipse(30, 38, 46, 34);
      g.fillStyle(0x9aa6ad); g.fillRoundedRect(14, 28, 32, 22, 6);
      g.lineStyle(2, 0x5a646a); g.lineBetween(14, 36, 46, 36); g.lineBetween(14, 43, 46, 43);
      g.fillStyle(0xb0b8bd); g.fillCircle(17, 24, 7); g.fillCircle(43, 24, 7);
      g.fillStyle(0x6a7f8c); g.fillCircle(30, 18, 11);
      g.fillStyle(0x9aa6ad); g.fillRoundedRect(19, 7, 22, 12, 4);
      g.fillStyle(0x111111); g.fillRect(22, 14, 16, 3);
      g.fillStyle(0xffb347); g.fillCircle(25, 15.5, 1.5); g.fillCircle(35, 15.5, 1.5);
      g.fillStyle(0x5a3a22); g.fillRect(48, 18, 6, 34);
      g.fillStyle(0x777777); g.fillRoundedRect(44, 10, 14, 14, 3);
      break;
    }
    case 'wraith': {
      g.fillStyle(0x9fd8e8, 0.25); g.fillEllipse(23, 30, 40, 46);
      g.fillStyle(0x2a3a4a, 0.9);
      g.beginPath(); g.moveTo(8, 50); g.lineTo(12, 22); g.lineTo(23, 6); g.lineTo(34, 22); g.lineTo(38, 50);
      g.lineTo(32, 44); g.lineTo(27, 52); g.lineTo(23, 44); g.lineTo(18, 52); g.lineTo(14, 44); g.closePath(); g.fillPath();
      g.fillStyle(0x111820); g.fillEllipse(23, 22, 14, 16);
      g.fillStyle(0x9ff7ff); g.fillCircle(19, 21, 2.4); g.fillCircle(27, 21, 2.4);
      g.lineStyle(1.5, 0x9ff7ff, 0.5); g.lineBetween(12, 34, 34, 34);
      break;
    }
    case 'warlord': {
      g.fillStyle(0x3a2a20); g.fillRect(28, 72, 12, 18); g.fillRect(50, 72, 12, 18);
      g.fillStyle(0x8f1f1f); g.fillTriangle(14, 84, 76, 84, 45, 30);
      g.fillStyle(0x4a3a3a); g.fillEllipse(45, 60, 56, 40);
      g.fillStyle(0x2a2a30); g.fillRoundedRect(25, 46, 40, 28, 8);
      g.fillStyle(0xd4a017); g.fillCircle(45, 58, 6);
      g.fillStyle(0x3a3a44); g.fillCircle(22, 44, 11); g.fillCircle(68, 44, 11);
      g.fillStyle(0xd0d0d0); g.fillTriangle(16, 38, 10, 26, 22, 36); g.fillTriangle(74, 38, 80, 26, 68, 36);
      g.fillStyle(0x3e7a2a); g.fillCircle(45, 30, 16);
      g.fillStyle(0x2a2a30); g.fillRoundedRect(29, 12, 32, 16, 5);
      g.fillStyle(0xe8e0c8); g.fillTriangle(30, 16, 18, 0, 34, 12); g.fillTriangle(60, 16, 72, 0, 56, 12);
      g.fillStyle(0xd4a017); g.fillTriangle(37, 12, 41, 2, 45, 12); g.fillTriangle(45, 12, 49, 2, 53, 12);
      eyes(g, 45, 30, 6, 3.4, 0xff3a2a, 0x220000);
      g.fillStyle(0xffffff); g.fillTriangle(37, 38, 40, 38, 38.5, 33); g.fillTriangle(50, 38, 53, 38, 51.5, 33);
      g.fillStyle(0x5a3a22); g.fillRect(78, 20, 6, 60);
      g.fillStyle(0x9a9a9a); g.fillTriangle(70, 18, 90, 18, 80, 40); g.fillTriangle(70, 18, 90, 18, 80, 4);
      break;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Soldiers: 34 x 40, anchor bottom-centre                            */
/* ------------------------------------------------------------------ */
const SOLDIER_LOOKS: Record<string, { body: number; helm: number; shield: number; weapon: 'sword' | 'axe' | 'spear' }> = {
  militia: { body: 0x8a6a3a, helm: 0x7a5a32, shield: 0x9a6a3a, weapon: 'spear' },
  footman: { body: 0x5a6a8a, helm: 0x9aa0aa, shield: 0xc0392b, weapon: 'sword' },
  guard: { body: 0x3a5a9a, helm: 0xb0b8c0, shield: 0x2f5aa8, weapon: 'sword' },
  knight: { body: 0x8a96a8, helm: 0xd0d8e0, shield: 0x2f5aa8, weapon: 'sword' },
  berserker: { body: 0x8f1f1f, helm: 0x6b4b36, shield: 0x000000, weapon: 'axe' },
  hero: { body: 0xd4a017, helm: 0xe8e0c8, shield: 0xd4a017, weapon: 'sword' },
};

function drawSoldier(g: G, look: string): void {
  const L = SOLDIER_LOOKS[look];
  g.fillStyle(0x3a2a1a); g.fillRect(11, 32, 4, 7); g.fillRect(19, 32, 4, 7);
  g.fillStyle(L.body); g.fillRoundedRect(9, 18, 16, 16, 4);
  g.fillStyle(shade(L.body, 0.2)); g.fillRect(11, 20, 4, 12);
  g.fillStyle(0xf0c9a0); g.fillCircle(17, 13, 6);
  g.fillStyle(L.helm); g.fillRoundedRect(10, 4, 14, 8, { tl: 7, tr: 7, bl: 0, br: 0 });
  if (look === 'knight') { g.fillStyle(0xc0392b); g.fillTriangle(17, 4, 22, -2, 26, 6); g.fillStyle(0x333333); g.fillRect(13, 11, 8, 2); }
  if (look === 'berserker') { g.fillStyle(0xe8e0c8); g.fillTriangle(10, 6, 6, 0, 12, 4); g.fillTriangle(24, 6, 28, 0, 22, 4); }
  if (L.weapon === 'spear') {
    g.lineStyle(2, 0x5a3a22); g.lineBetween(28, 36, 28, 4);
    g.fillStyle(0xcfcfcf); g.fillTriangle(26, 6, 30, 6, 28, 0);
  } else if (L.weapon === 'sword') {
    g.fillStyle(0xdadada); g.fillRect(27, 10, 3, 18); g.fillStyle(0x8a6a2a); g.fillRect(25, 26, 7, 3);
  } else {
    g.lineStyle(2.5, 0x5a3a22); g.lineBetween(28, 36, 28, 8);
    g.fillStyle(0xcfcfcf); g.fillTriangle(28, 8, 34, 4, 34, 18); g.fillTriangle(28, 8, 22, 4, 22, 18);
  }
  if (look !== 'berserker') {
    g.fillStyle(shade(L.shield, -0.3)); g.fillRoundedRect(3, 18, 10, 13, 4);
    g.fillStyle(L.shield); g.fillRoundedRect(4, 19, 8, 11, 3);
  }
}

/* ------------------------------------------------------------------ */
/* Decor                                                              */
/* ------------------------------------------------------------------ */
function drawDecor(g: G, key: string): void {
  switch (key) {
    case 'tree': case 'autumn': {
      const c = key === 'autumn' ? 0xd9822b : 0x3f8f3a;
      g.fillStyle(0x000000, 0.2); g.fillEllipse(30, 62, 40, 12);
      g.fillStyle(0x6b4a2a); g.fillRect(26, 38, 8, 24);
      g.fillStyle(shade(c, -0.3)); g.fillCircle(30, 28, 20); g.fillCircle(18, 36, 13); g.fillCircle(42, 36, 13);
      g.fillStyle(c); g.fillCircle(30, 25, 17); g.fillCircle(19, 33, 10); g.fillCircle(41, 33, 10);
      g.fillStyle(shade(c, 0.25)); g.fillCircle(24, 19, 7);
      if (key === 'autumn') { g.fillStyle(0xc0392b); g.fillCircle(36, 22, 4); g.fillCircle(22, 34, 3); }
      break;
    }
    case 'pine': case 'snowpine': {
      const c = 0x2f6e3a;
      g.fillStyle(0x000000, 0.2); g.fillEllipse(30, 64, 34, 10);
      g.fillStyle(0x5a3a22); g.fillRect(27, 52, 6, 12);
      for (let i = 0; i < 3; i++) {
        const y = 14 + i * 13, w = 14 + i * 7;
        g.fillStyle(shade(c, -0.25)); g.fillTriangle(30 - w, y + 20, 30 + w, y + 20, 30, y - 4);
        g.fillStyle(c); g.fillTriangle(30 - w + 3, y + 18, 30 + w - 6, y + 18, 30, y - 2);
        if (key === 'snowpine') { g.fillStyle(0xffffff); g.fillTriangle(30 - w * 0.45, y + 6, 30 + w * 0.45, y + 6, 30, y - 3); }
      }
      break;
    }
    case 'deadtree': {
      g.fillStyle(0x000000, 0.2); g.fillEllipse(30, 62, 30, 9);
      g.lineStyle(6, 0x4a3a30); g.lineBetween(30, 62, 30, 26);
      g.lineStyle(4, 0x4a3a30); g.lineBetween(30, 40, 16, 26); g.lineBetween(30, 34, 44, 18);
      g.lineStyle(3, 0x4a3a30); g.lineBetween(16, 26, 12, 14); g.lineBetween(44, 18, 50, 12); g.lineBetween(30, 26, 26, 12);
      break;
    }
    case 'rock': {
      g.fillStyle(0x000000, 0.2); g.fillEllipse(30, 56, 40, 10);
      g.fillStyle(0x6f6a64); g.fillEllipse(28, 46, 38, 24);
      g.fillStyle(0x8a857e); g.fillEllipse(24, 42, 26, 14);
      g.fillStyle(0x5a5650); g.fillEllipse(42, 50, 16, 10);
      break;
    }
    case 'bush': {
      g.fillStyle(0x000000, 0.2); g.fillEllipse(30, 56, 38, 10);
      g.fillStyle(0x2f7a32); g.fillCircle(20, 46, 11); g.fillCircle(38, 46, 11); g.fillCircle(29, 40, 13);
      g.fillStyle(0x4aa04a); g.fillCircle(25, 37, 6);
      g.fillStyle(0xd23a5a); g.fillCircle(36, 42, 2.5); g.fillCircle(20, 44, 2.5);
      break;
    }
    case 'flower': {
      const cols = [0xffd84a, 0xff7ab0, 0xffffff, 0xb08aff];
      for (let i = 0; i < 5; i++) {
        const x = 14 + (i * 37) % 32, y = 42 + (i * 23) % 14;
        g.lineStyle(1.5, 0x2f7a32); g.lineBetween(x, y, x, y + 8);
        g.fillStyle(cols[i % 4]); g.fillCircle(x, y, 3.5);
        g.fillStyle(0xffa500); g.fillCircle(x, y, 1.2);
      }
      break;
    }
    case 'crystal': {
      g.fillStyle(0x000000, 0.2); g.fillEllipse(30, 58, 30, 8);
      g.fillStyle(0x6ad0ff, 0.9); g.fillTriangle(22, 58, 32, 58, 26, 26);
      g.fillStyle(0x9fe8ff, 0.9); g.fillTriangle(28, 58, 40, 58, 36, 34);
      g.fillStyle(0x4aa0e0, 0.9); g.fillTriangle(16, 58, 24, 58, 18, 42);
      break;
    }
    case 'lava': {
      g.fillStyle(0x2a1a14); g.fillEllipse(30, 48, 46, 22);
      g.fillStyle(0xd2421a); g.fillEllipse(30, 47, 36, 15);
      g.fillStyle(0xffa22a); g.fillEllipse(27, 45, 18, 7);
      g.fillStyle(0xffe08a); g.fillCircle(34, 47, 2.5);
      break;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Icons & misc                                                       */
/* ------------------------------------------------------------------ */
function star(g: G, cx: number, cy: number, r: number, color: number, outline: number): void {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr));
  }
  g.fillStyle(outline); g.fillPoints(pts.map(p => new Phaser.Math.Vector2(cx + (p.x - cx) * 1.15, cy + (p.y - cy) * 1.15)), true);
  g.fillStyle(color); g.fillPoints(pts, true);
}

export function generateAll(scene: Phaser.Scene): void {
  // Towers
  const towerDraw: Record<string, (g: G, tier: number, variant: string) => void> = {
    archer: drawArcher, mage: drawMage, cannon: drawCannon, barracks: drawBarracks,
  };
  const towerIds: [string, string, number, string][] = [
    ['archer1', 'archer', 1, ''], ['archer2', 'archer', 2, ''], ['archer3', 'archer', 3, ''], ['ranger', 'archer', 4, 'ranger'], ['marksman', 'archer', 4, 'marksman'],
    ['mage1', 'mage', 1, ''], ['mage2', 'mage', 2, ''], ['mage3', 'mage', 3, ''], ['arcane', 'mage', 4, 'arcane'], ['frost', 'mage', 4, 'frost'],
    ['cannon1', 'cannon', 1, ''], ['cannon2', 'cannon', 2, ''], ['cannon3', 'cannon', 3, ''], ['mortar', 'cannon', 4, 'mortar'], ['rocket', 'cannon', 4, 'rocket'],
    ['barracks1', 'barracks', 1, ''], ['barracks2', 'barracks', 2, ''], ['barracks3', 'barracks', 3, ''], ['knights', 'barracks', 4, 'knights'], ['berserkers', 'barracks', 4, 'berserkers'],
  ];
  for (const [id, kind, tier, variant] of towerIds) {
    make(scene, `tower_${id}`, TOWER_TEX.w, TOWER_TEX.h, g => towerDraw[kind](g, tier, variant));
  }

  for (const key of Object.keys(ENEMY_TEX)) {
    const t = ENEMY_TEX[key];
    make(scene, `enemy_${key}`, t.w, t.h, g => drawEnemy(g, key));
  }
  for (const look of Object.keys(SOLDIER_LOOKS)) make(scene, `soldier_${look}`, 36, 40, g => drawSoldier(g, look));
  for (const d of ['tree', 'autumn', 'pine', 'snowpine', 'deadtree', 'rock', 'bush', 'flower', 'crystal', 'lava']) {
    make(scene, `decor_${d}`, 60, 68, g => drawDecor(g, d));
  }

  // Build plot
  make(scene, 'spot', 96, 60, g => {
    g.fillStyle(0x000000, 0.18); g.fillEllipse(48, 33, 90, 46);
    g.fillStyle(0x8a6a44); g.fillEllipse(48, 30, 84, 40);
    g.fillStyle(0xa3825a); g.fillEllipse(48, 28, 72, 30);
    g.fillStyle(0x7d7466);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      g.fillEllipse(48 + Math.cos(a) * 38, 30 + Math.sin(a) * 17, 11, 7);
    }
    g.fillStyle(0x6b4a2a); g.fillRect(46, 12, 4, 18);
    g.fillStyle(0xd9c19a); g.fillRect(38, 10, 20, 9);
    g.lineStyle(1.5, 0x6b4a2a); g.strokeRect(38, 10, 20, 9);
  });

  // The Cylinder
  make(scene, 'cylinder', 90, 130, g => {
    g.fillStyle(0x000000, 0.3); g.fillEllipse(45, 120, 86, 22);
    g.fillStyle(0x6d665c); g.fillRect(12, 98, 66, 20); g.fillEllipse(45, 118, 66, 16);
    g.fillStyle(0x8f877a); g.fillEllipse(45, 98, 66, 18);
    g.fillStyle(0x3aa0d8, 0.25); g.fillRect(20, 14, 50, 84);
    g.fillStyle(0x5ad0ff, 0.85); g.fillRect(24, 16, 42, 82);
    g.fillStyle(0x9feaff, 0.9); g.fillRect(28, 16, 10, 82);
    g.fillStyle(0xe6fbff, 0.9); g.fillRect(30, 18, 4, 76);
    g.fillStyle(0x2f86c0); g.fillRect(58, 16, 8, 82);
    g.fillStyle(0x9feaff); g.fillEllipse(45, 16, 42, 12);
    g.fillStyle(0xe6fbff); g.fillEllipse(45, 16, 30, 7);
    g.fillStyle(0x5ad0ff); g.fillEllipse(45, 98, 42, 12);
    g.lineStyle(3, 0xd4a017);
    g.strokeEllipse(45, 40, 46, 12); g.strokeEllipse(45, 74, 46, 12);
    g.fillStyle(0xd4a017); g.fillCircle(45, 57, 5);
  });

  // Projectiles & fx
  make(scene, 'arrow', 24, 6, g => {
    g.fillStyle(0x6b4a2a); g.fillRect(2, 2, 18, 2);
    g.fillStyle(0xdadada); g.fillTriangle(18, 0, 24, 3, 18, 6);
    g.fillStyle(0xffffff); g.fillTriangle(0, 0, 5, 3, 0, 6);
  });
  make(scene, 'bolt', 24, 24, g => {
    g.fillStyle(0xffffff, 0.25); g.fillCircle(12, 12, 12);
    g.fillStyle(0xffffff, 0.5); g.fillCircle(12, 12, 8);
    g.fillStyle(0xffffff); g.fillCircle(12, 12, 4.5);
  });
  make(scene, 'shell', 16, 16, g => {
    g.fillStyle(0x111111); g.fillCircle(8, 8, 7);
    g.fillStyle(0x555555); g.fillCircle(6, 6, 2.5);
  });
  make(scene, 'rocketp', 22, 8, g => {
    g.fillStyle(0x777777); g.fillRect(2, 1, 14, 6);
    g.fillStyle(0xd23a2a); g.fillTriangle(16, 0, 22, 4, 16, 8);
    g.fillStyle(0xffa22a); g.fillTriangle(0, 1, 3, 4, 0, 7);
  });
  make(scene, 'meteor', 40, 40, g => {
    g.fillStyle(0xff6a1a, 0.3); g.fillCircle(20, 20, 20);
    g.fillStyle(0xff8a2a, 0.6); g.fillCircle(20, 20, 14);
    g.fillStyle(0x5a2a1a); g.fillCircle(20, 20, 9);
    g.fillStyle(0xffd24a); g.fillCircle(17, 17, 4);
  });
  make(scene, 'spark', 12, 12, g => {
    g.fillStyle(0xffffff, 0.5); g.fillCircle(6, 6, 6);
    g.fillStyle(0xffffff); g.fillCircle(6, 6, 3);
  });
  make(scene, 'puff', 32, 32, g => {
    g.fillStyle(0xffffff, 0.6); g.fillCircle(16, 16, 16);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(13, 13, 9);
  });
  make(scene, 'rally', 26, 34, g => {
    g.fillStyle(0x000000, 0.25); g.fillEllipse(7, 31, 12, 5);
    g.lineStyle(2.5, 0x3b2a1a); g.lineBetween(6, 32, 6, 2);
    g.fillStyle(0xf2c14e); g.fillTriangle(7, 2, 25, 8, 7, 15);
  });

  // Icons (48 x 48)
  make(scene, 'icon_heart', 48, 48, g => {
    g.fillStyle(0x5a0a0a); g.fillCircle(16, 18, 12); g.fillCircle(32, 18, 12); g.fillTriangle(5, 22, 43, 22, 24, 44);
    g.fillStyle(0xe8384a); g.fillCircle(16, 18, 10); g.fillCircle(32, 18, 10); g.fillTriangle(7, 21, 41, 21, 24, 41);
    g.fillStyle(0xff8a9a); g.fillCircle(14, 15, 4);
  });
  make(scene, 'icon_coin', 48, 48, g => {
    g.fillStyle(0x8a5a0a); g.fillCircle(24, 25, 19);
    g.fillStyle(0xf2c14e); g.fillCircle(24, 23, 18);
    g.fillStyle(0xd4a017); g.fillCircle(24, 23, 12);
    g.fillStyle(0xffe58a); g.fillRect(21, 15, 6, 16);
  });
  make(scene, 'icon_skull', 48, 48, g => {
    g.fillStyle(0x222222); g.fillCircle(24, 21, 17); g.fillRect(13, 28, 22, 14);
    g.fillStyle(0xeeeeee); g.fillCircle(24, 21, 15); g.fillRect(15, 28, 18, 12);
    g.fillStyle(0x222222); g.fillCircle(18, 22, 5); g.fillCircle(30, 22, 5); g.fillTriangle(24, 26, 21, 32, 27, 32);
    g.fillRect(19, 35, 2, 5); g.fillRect(23, 35, 2, 5); g.fillRect(27, 35, 2, 5);
  });
  make(scene, 'icon_star', 48, 48, g => star(g, 24, 25, 20, 0xffd23a, 0x8a5a0a));
  make(scene, 'icon_star_empty', 48, 48, g => star(g, 24, 25, 20, 0x4a4a4a, 0x222222));
  make(scene, 'icon_lock', 48, 48, g => {
    g.lineStyle(5, 0x9a9a9a); g.strokeCircle(24, 18, 10);
    g.fillStyle(0x6a6a6a); g.fillRoundedRect(10, 20, 28, 22, 5);
    g.fillStyle(0x222222); g.fillCircle(24, 29, 4); g.fillRect(22, 30, 4, 7);
  });
  make(scene, 'icon_meteor', 64, 64, g => {
    g.fillStyle(0xff6a1a, 0.4); g.fillTriangle(10, 8, 46, 34, 30, 50);
    g.fillStyle(0xffa22a, 0.7); g.fillTriangle(18, 16, 44, 36, 34, 46);
    g.fillStyle(0x5a2a1a); g.fillCircle(42, 42, 13);
    g.fillStyle(0xffd24a); g.fillCircle(38, 38, 5);
  });
  make(scene, 'icon_swords', 64, 64, g => {
    g.lineStyle(6, 0xdadada); g.lineBetween(14, 14, 48, 48); g.lineBetween(50, 14, 16, 48);
    g.lineStyle(6, 0x8a6a2a); g.lineBetween(38, 46, 46, 38); g.lineBetween(18, 38, 26, 46);
    g.fillStyle(0xd4a017); g.fillCircle(50, 50, 5); g.fillCircle(14, 50, 5);
  });
  make(scene, 'icon_up', 40, 40, g => {
    g.fillStyle(0x1f5a1f); g.fillTriangle(20, 4, 38, 22, 2, 22); g.fillRect(12, 20, 16, 16);
    g.fillStyle(0x6ae04a); g.fillTriangle(20, 7, 34, 21, 6, 21); g.fillRect(14, 20, 12, 14);
  });
  make(scene, 'icon_sell', 40, 40, g => {
    g.fillStyle(0x8a5a0a); g.fillCircle(20, 21, 15);
    g.fillStyle(0xf2c14e); g.fillCircle(20, 19, 14);
    g.fillStyle(0x8a5a0a); g.fillRect(18, 9, 4, 20); g.fillRect(13, 12, 14, 3); g.fillRect(13, 18, 14, 3); g.fillRect(13, 24, 14, 3);
  });
  make(scene, 'icon_flag', 40, 40, g => {
    g.lineStyle(3, 0x3b2a1a); g.lineBetween(12, 36, 12, 4);
    g.fillStyle(0xf2c14e); g.fillTriangle(13, 4, 34, 11, 13, 19);
  });
  make(scene, 'icon_pause', 48, 48, g => {
    g.fillStyle(0xffffff); g.fillRoundedRect(13, 10, 8, 28, 2); g.fillRoundedRect(27, 10, 8, 28, 2);
  });
  make(scene, 'icon_play', 48, 48, g => { g.fillStyle(0xffffff); g.fillTriangle(15, 10, 37, 24, 15, 38); });
  make(scene, 'icon_ff', 48, 48, g => {
    g.fillStyle(0xffffff); g.fillTriangle(6, 12, 24, 24, 6, 36); g.fillTriangle(24, 12, 42, 24, 24, 36);
  });
  make(scene, 'icon_check', 40, 40, g => {
    g.lineStyle(7, 0x1f5a1f); g.lineBetween(8, 21, 17, 30); g.lineBetween(17, 30, 33, 11);
    g.lineStyle(4, 0x6ae04a); g.lineBetween(8, 21, 17, 30); g.lineBetween(17, 30, 33, 11);
  });
  make(scene, 'icon_sound', 48, 48, g => {
    g.fillStyle(0xffffff); g.fillRect(8, 18, 9, 12); g.fillTriangle(17, 18, 28, 8, 28, 40); g.fillTriangle(17, 30, 28, 40, 17, 18);
    g.lineStyle(3, 0xffffff); g.beginPath(); g.arc(28, 24, 9, -0.9, 0.9); g.strokePath();
    g.beginPath(); g.arc(28, 24, 15, -0.9, 0.9); g.strokePath();
  });
  make(scene, 'icon_mute', 48, 48, g => {
    g.fillStyle(0xffffff); g.fillRect(8, 18, 9, 12); g.fillTriangle(17, 18, 28, 8, 28, 40); g.fillTriangle(17, 30, 28, 40, 17, 18);
    g.lineStyle(4, 0xe8384a); g.lineBetween(32, 16, 44, 32); g.lineBetween(44, 16, 32, 32);
  });
  make(scene, 'icon_skill', 48, 48, g => {
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      const r = i % 2 ? 9 : 21;
      pts.push(new Phaser.Math.Vector2(24 + Math.cos(a) * r, 24 + Math.sin(a) * r));
    }
    g.fillStyle(0xffffff); g.fillPoints(pts, true);
    g.fillStyle(0x000000, 0.25); g.fillCircle(24, 24, 7);
    g.fillStyle(0xffffff); g.fillCircle(24, 24, 4);
  });
  make(scene, 'ring', 64, 64, g => { g.lineStyle(4, 0xffffff); g.strokeCircle(32, 32, 28); });
}
