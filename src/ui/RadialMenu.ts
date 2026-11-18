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
  confirm: boolean;         // needs a second tap
  onSelect?: () => void;    // first tap (info/preview)
  action: () => void;
}

const R = 72;
const BR = 28;

interface Slot {
  opt: RadialOption;
  c: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Image;
  check: Phaser.GameObjects.Image;
  price?: Phaser.GameObjects.Text;
}

export class RadialMenu {
  readonly container: Phaser.GameObjects.Container;
  private slots: Slot[] = [];
  private selected = -1;
  private lastGold = -1;

  constructor(private scene: Phaser.Scene, x: number, y: number, options: RadialOption[], private getGold: () => number) {
    const cx = clamp(x, R + BR + 6, W - R - BR - 6);
    const cy = clamp(y, R + BR + 16, H - R - BR - 14);
    this.container = scene.add.container(cx, cy).setDepth(DEPTH.menu);
    const ring = scene.add.graphics();
    ring.lineStyle(14, 0x1a1208, 0.45); ring.strokeCircle(0, 0, R);
    ring.lineStyle(3, 0xd4a017, 0.7); ring.strokeCircle(0, 0, R);
    this.container.add(ring);
    // offset of menu center relative to the actual target (when clamped at screen edges)
    if (cx !== x || cy !== y) {
      const dot = scene.add.circle(x - cx, y - cy, 6, 0xd4a017);
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
    const icon = s.add.image(0, 0, opt.icon);
    if (opt.icon.startsWith('tower_')) {
      // tower art has headroom for tall roofs: anchor near the base so the building fills the button
      icon.setOrigin(0.5, 0.8).setPosition(0, 21).setScale(0.52);
    } else icon.setScale(size / Math.max(icon.width, icon.height));
    if (opt.tint !== undefined) icon.setTint(opt.tint);
    const check = s.add.image(0, 0, 'icon_check').setVisible(false);
    const hit = s.add.circle(0, 0, BR + 4, 0x000000, 0).setInteractive({ useHandCursor: true });
    c.add([bg, icon, check, hit]);

    const slot: Slot = { opt, c, bg, icon, check };
    if (opt.price !== undefined || opt.priceLabel) {
      const tag = s.add.graphics();
      tag.fillStyle(0x1a1208, 0.9); tag.fillRoundedRect(-26, BR - 6, 52, 20, 8);
      const p = txt(s, 0, BR + 4, opt.priceLabel ?? String(opt.price), { size: 15, color: '#ffd23a', strokeThickness: 3 });
      c.add([tag, p]);
      slot.price = p;
    }
    if (opt.pips) {
      for (let k = 0; k < opt.pips[1]; k++) {
        const pip = s.add.circle(-12 + k * 12, -BR - 4, 4.5, k < opt.pips[0] ? 0xffd23a : 0x3a3a3a).setStrokeStyle(1.5, 0x1a1208);
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
    return opt.price === undefined || this.getGold() >= opt.price;
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
    const gold = this.getGold();
    if (!force && gold === this.lastGold) return;
    this.lastGold = gold;
    this.slots.forEach((slot, i) => {
      const ok = this.affordable(slot.opt);
      const sel = i === this.selected;
      const g = slot.bg;
      g.clear();
      g.fillStyle(0x000000, 0.35); g.fillCircle(2, 4, BR);
      g.fillStyle(sel ? 0x5a4a1a : 0x2a1e12); g.fillCircle(0, 0, BR);
      g.lineStyle(sel ? 4 : 3, sel ? 0xffe26a : ok ? 0xd4a017 : 0x6a6a6a); g.strokeCircle(0, 0, BR);
      slot.icon.setAlpha(ok ? 1 : 0.45);
      slot.check.setVisible(sel && ok);
      slot.icon.setVisible(!(sel && ok));
      if (slot.price && slot.opt.price !== undefined) slot.price.setColor(ok ? '#ffd23a' : '#c05050');
      if (slot.opt.maxed && slot.price) slot.price.setText('MAX').setColor('#aaaaaa');
    });
  }

  destroy(): void {
    this.container.destroy();
  }
}
