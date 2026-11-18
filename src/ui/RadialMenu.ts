import * as Phaser from 'phaser';
import { DEPTH, W, H } from '../config';
import { clamp, txt } from '../util';
import { sfx, unlockAudio } from '../audio';

export interface RadialOption {
  icon: string;
  iconSize?: number;
  tint?: number;
  angle: number;            // degrees, 0 = right, -90 = up
  price?: number;           // cost; option disabled when unaffordable
  priceLabel?: string;      // overrides the price tag (e.g. sell refund)
  pips?: [number, number];  // [rank, max]
  maxed?: boolean;
  maxedLabel?: string;      // tag shown when maxed (default MAX)
  confirm: boolean;         // needs a second tap
  onSelect?: () => void;    // first tap (info/preview)
  action: () => void;
}

const R = 70;
/** Tap radius around each petal's centre. */
const HIT_R = 32;
/** Petal size: length along the spoke, width across it. */
const PL = 74, PW = 50;

/** Outline of a petal centred on the origin, pointing along `angle`. */
function petalPoints(angle: number, len = PL, wid = PW): Phaser.Math.Vector2[] {
  const pts: Phaser.Math.Vector2[] = [];
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const N = 18;
  const add = (along: number, across: number) => pts.push(new Phaser.Math.Vector2(ca * along - sa * across, sa * along + ca * across));
  for (let i = 0; i <= N; i++) { const t = i / N; add(-len / 2 + len * t, (wid / 2) * Math.pow(Math.sin(Math.PI * t), 0.85) * (t < 0.5 ? 0.85 : 1)); }
  for (let i = N - 1; i > 0; i--) { const t = i / N; add(-len / 2 + len * t, -(wid / 2) * Math.pow(Math.sin(Math.PI * t), 0.85) * (t < 0.5 ? 0.85 : 1)); }
  return pts;
}

interface Slot {
  opt: RadialOption;
  c: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  angle: number;
  icon: Phaser.GameObjects.Image;
  check: Phaser.GameObjects.Image;
  price?: Phaser.GameObjects.Text;
}

export class RadialMenu {
  readonly container: Phaser.GameObjects.Container;
  private slots: Slot[] = [];
  private selected = -1;
  private lastFunds = -1;

  constructor(private scene: Phaser.Scene, x: number, y: number, options: RadialOption[], private getFunds: () => number) {
    const reach = R + PL / 2 + 2;
    const cx = clamp(x, reach, W - reach);
    const cy = clamp(y, reach + 4, H - reach);
    this.container = scene.add.container(cx, cy).setDepth(DEPTH.menu);
    // the glowing seed the bloom opens from
    const seedGlow = scene.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xff6ad8).setScale(0.9).setAlpha(0.8);
    const seed = scene.add.circle(0, 0, 7, 0xfff0fb).setStrokeStyle(2, 0x0a0f1a);
    this.container.add([seedGlow, seed]);
    scene.tweens.add({ targets: seedGlow, scale: 1.15, alpha: 0.5, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // offset of menu center relative to the actual target (when clamped at screen edges)
    if (cx !== x || cy !== y) {
      const dot = scene.add.circle(x - cx, y - cy, 6, 0xff9ae6);
      this.container.add(dot);
    }
    options.forEach((opt, i) => this.addSlot(opt, i));
    this.container.setScale(0.4).setAlpha(0);
    scene.tweens.add({ targets: this.container, scale: 1, alpha: 1, duration: 160, ease: 'Back.easeOut' });
    this.refresh(true);
  }

  private addSlot(opt: RadialOption, index: number): void {
    const s = this.scene;
    const a = Phaser.Math.DegToRad(opt.angle);
    const c = s.add.container(Math.cos(a) * R, Math.sin(a) * R);
    const bg = s.add.graphics();
    const size = opt.iconSize ?? 36;
    // icon sits toward the petal's outer end, the price toward the seed
    const icon = s.add.image(Math.cos(a) * 9, Math.sin(a) * 9 - 2, opt.icon);
    icon.setScale(size / Math.max(icon.width, icon.height));
    if (opt.tint !== undefined) icon.setTint(opt.tint);
    const check = s.add.image(0, 0, 'icon_check').setVisible(false);
    const hit = s.add.circle(0, 0, HIT_R, 0x000000, 0).setInteractive({ useHandCursor: true });
    c.add([bg, icon, check, hit]);

    check.setPosition(icon.x, icon.y);
    const slot: Slot = { opt, c, bg, angle: a, icon, check };
    if (opt.price !== undefined || opt.priceLabel) {
      const p = txt(s, -Math.cos(a) * 22, -Math.sin(a) * 22, opt.priceLabel ?? String(opt.price), { size: 14, color: '#bffaff', strokeThickness: 3 });
      c.add(p);
      slot.price = p;
    }
    if (opt.pips) {
      for (let k = 0; k < opt.pips[1]; k++) {
        const px = Math.cos(a) * (PL / 2 + 6) - Math.sin(a) * (k - (opt.pips[1] - 1) / 2) * 11;
        const py = Math.sin(a) * (PL / 2 + 6) + Math.cos(a) * (k - (opt.pips[1] - 1) / 2) * 11;
        const pip = s.add.circle(px, py, 4.2, k < opt.pips[0] ? 0xff9ae6 : 0x2a2440).setStrokeStyle(1.5, 0x0a0f1a);
        c.add(pip);
      }
    }
    hit.on('pointerdown', () => unlockAudio());
    hit.on('pointerup', () => this.tap(index));
    this.container.add(c);
    this.slots.push(slot);
  }

  private affordable(opt: RadialOption): boolean {
    if (opt.maxed) return false;
    return opt.price === undefined || this.getFunds() >= opt.price;
  }

  private tap(i: number): void {
    const slot = this.slots[i];
    const opt = slot.opt;
    if (opt.maxed) { sfx.error(); opt.onSelect?.(); return; }
    if (!opt.confirm) { sfx.click(); opt.action(); return; }
    if (this.selected === i) {
      if (!this.affordable(opt)) { sfx.error(); this.shake(slot); return; }
      opt.action();
      return;
    }
    sfx.click();
    this.selected = i;
    opt.onSelect?.();
    this.refresh(true);
  }

  private shake(slot: Slot): void {
    this.scene.tweens.add({ targets: slot.c, x: slot.c.x + 5, duration: 50, yoyo: true, repeat: 2 });
  }

  /** Redraw affordability state (call every frame; only redraws on change). */
  refresh(force = false): void {
    const funds = this.getFunds();
    if (!force && funds === this.lastFunds) return;
    this.lastFunds = funds;
    this.slots.forEach((slot, i) => {
      const ok = this.affordable(slot.opt);
      const sel = i === this.selected;
      const g = slot.bg;
      g.clear();
      const pts = petalPoints(slot.angle);
      g.fillStyle(0x000000, 0.35); g.fillPoints(pts.map(p => new Phaser.Math.Vector2(p.x + 2, p.y + 4)), true);
      g.fillStyle(sel ? 0x4a2f7a : 0x241a40, 0.96); g.fillPoints(pts, true);
      if (sel) { g.lineStyle(7, 0xff9ae6, 0.25); g.strokePoints(pts, true); }
      g.lineStyle(sel ? 3 : 2, sel ? 0xff9ae6 : ok ? 0x8a6aff : 0x4a4a5a); g.strokePoints(pts, true);
      // central vein
      g.lineStyle(1, 0xcfe6f0, 0.25);
      g.lineBetween(-Math.cos(slot.angle) * PL * 0.42, -Math.sin(slot.angle) * PL * 0.42, Math.cos(slot.angle) * PL * 0.42, Math.sin(slot.angle) * PL * 0.42);
      slot.icon.setAlpha(ok ? 1 : 0.45);
      slot.check.setVisible(sel && ok);
      slot.icon.setVisible(!(sel && ok));
      if (slot.price && slot.opt.price !== undefined) slot.price.setColor(ok ? '#bffaff' : '#ff7a8a');
      if (slot.opt.maxed && slot.price) slot.price.setText(slot.opt.maxedLabel ?? 'MAX').setColor('#aaaaaa');
    });
  }

  destroy(): void {
    this.container.destroy();
  }
}
