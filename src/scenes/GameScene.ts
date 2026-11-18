import * as Phaser from 'phaser';
import { W, H, DEPTH, HUD_ZONES, setupCamera } from '../config';
import { paintMap } from '../art/world';
import { LEVELS } from '../data/levels';
import type { LevelDef } from '../data/levels';
import { ENEMIES } from '../data/enemies';
import type { DamageType } from '../data/enemies';
import { TOWERS, BUILD_OPTIONS } from '../data/towers';
import type { TowerSpec } from '../data/towers';
import { PathLine, generateSpots, minPathDist, callButtonPos } from '../game/PathLine';
import { Enemy } from '../game/Enemy';
import { Soldier } from '../game/Soldier';
import { Tower } from '../game/Tower';
import type { Spot } from '../game/Tower';
import { Projectile } from '../game/Projectile';
import { Effects } from '../game/Effects';
import { RadialMenu } from '../ui/RadialMenu';
import type { RadialOption } from '../ui/RadialMenu';
import { button, iconButton, panel } from '../ui/widgets';
import { dist, rand, randInt, rectsContain, seeded, txt } from '../util';
import type { Pt } from '../util';
import { sfx, isMuted, setMuted, unlockAudio } from '../audio';
import { load, save, recordStars } from '../save';

const WAVE_GAP = 22;          // seconds between waves (after the previous wave has fully spawned)
const METEOR_CD = 50;
const REINFORCE_CD = 22;

interface QueuedSpawn { t: number; key: string; path: number }
interface Fire { x: number; y: number; r: number; dps: number; t: number; gfx: Phaser.GameObjects.Image; sparkT: number }
interface CallButton { c: Phaser.GameObjects.Container; ring: Phaser.GameObjects.Graphics; path: number }

const SKILL_TINT: Record<string, number> = {
  poison: 0x8be04e, headshot: 0xff5a5a, chain: 0xd27cff, freeze: 0x8fe8ff,
  cluster: 0xffa22a, napalm: 0xff6a1a, bash: 0x5ab0ff, cleave: 0xe8384a,
};

export class GameScene extends Phaser.Scene {
  levelIndex = 0;
  level!: LevelDef;
  paths: PathLine[] = [];
  spots: Spot[] = [];
  towers: Tower[] = [];
  enemies: Enemy[] = [];
  soldiers: Soldier[] = [];
  projectiles: Projectile[] = [];
  fires: Fire[] = [];
  fx!: Effects;

  gold = 0;
  lives = 0;
  private waveIdx = 0;
  private queue: QueuedSpawn[] = [];
  private clock = 0;
  private nextWaveTimer = -1;
  private speed = 1;
  private paused = false;
  private ended = false;
  private endPt: Pt = { x: 0, y: 0 };

  private menu: RadialMenu | null = null;
  private menuSpot: Spot | null = null;
  private rallyTower: Tower | null = null;
  private abilityMode: 'meteor' | 'reinforce' | null = null;
  private selectedEnemy: Enemy | null = null;
  private meteorCd = 0;
  private reinforceCd = 0;
  private tutorial = 0;

  // HUD
  private rangeGfx!: Phaser.GameObjects.Graphics;
  private livesText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private speedBtn!: Phaser.GameObjects.Container & { icon: Phaser.GameObjects.Image };
  private abilityGfx!: Phaser.GameObjects.Graphics;
  private meteorBtn!: Phaser.GameObjects.Container;
  private reinforceBtn!: Phaser.GameObjects.Container;
  private callButtons: CallButton[] = [];
  private info!: Phaser.GameObjects.Container;
  private infoBg!: Phaser.GameObjects.Graphics;
  private infoTitle!: Phaser.GameObjects.Text;
  private infoBody!: Phaser.GameObjects.Text;
  private overlay: Phaser.GameObjects.Container | null = null;
  private cylinder!: Phaser.GameObjects.Image;
  private hint: Phaser.GameObjects.Container | null = null;
  private shown = { lives: -1, gold: -1, wave: -1 };

  constructor() {
    super('Game');
  }

  init(data: { level?: number }): void {
    this.levelIndex = data.level ?? 0;
  }

  create(): void {
    setupCamera(this);
    this.anims.globalTimeScale = 1;
    this.level = LEVELS[this.levelIndex];
    this.paths = this.level.paths.map(p => new PathLine(p));
    this.towers = []; this.enemies = []; this.soldiers = []; this.projectiles = []; this.fires = [];
    this.queue = []; this.callButtons = [];
    this.gold = this.level.startGold;
    this.lives = this.level.lives;
    this.waveIdx = 0; this.clock = 0; this.nextWaveTimer = -1;
    this.speed = 1; this.paused = false; this.ended = false;
    this.menu = null; this.menuSpot = null; this.rallyTower = null; this.abilityMode = null; this.selectedEnemy = null;
    this.meteorCd = 0; this.reinforceCd = 0; this.overlay = null; this.hint = null;
    this.shown = { lives: -1, gold: -1, wave: -1 };
    this.tweens.timeScale = 1;
    this.time.timeScale = 1;
    this.fx = new Effects(this);

    const last = this.paths[0].pts[this.paths[0].pts.length - 1];
    this.endPt = { x: last.x, y: last.y };

    this.drawMap();
    const entries = this.paths.map(p => callButtonPos(p));
    const spotPts = generateSpots(this.paths, this.level.maxSpots, this.endPt, this.level.seed, entries);
    this.spots = spotPts.map(p => ({ x: p.x, y: p.y, tower: null, image: this.add.image(p.x, p.y, 'spot').setDepth(DEPTH.spots) }));
    this.placeDecor();
    this.placeCylinder();
    this.addAmbience();

    this.rangeGfx = this.add.graphics().setDepth(DEPTH.range);
    this.buildHud();
    this.showCallButtons(true);

    if (new URLSearchParams(location.search).has('debug')) this.gold = 99999;
    (window as unknown as { __scene: GameScene; __TOWERS: typeof TOWERS }).__scene = this;
    (window as unknown as { __TOWERS: typeof TOWERS }).__TOWERS = TOWERS;

    this.input.on('pointerdown', this.onPointerDown, this);
    const onBack = () => this.onBack();
    this.game.events.on('backbutton', onBack);
    this.game.events.on('apppause', this.autoPause, this);
    this.events.once('shutdown', () => {
      this.game.events.off('backbutton', onBack);
      this.game.events.off('apppause', this.autoPause, this);
      this.input.off('pointerdown', this.onPointerDown, this);
    });

    this.cameras.main.fadeIn(350, 0, 0, 0);
    this.toast(this.level.name, 2600, 40);
    if (this.levelIndex === 0 && !(load().stars[0] > 0)) {
      this.tutorial = 1;
      this.time.delayedCall(900, () => this.showHint());
    } else this.tutorial = 0;
  }

  /* ================================================================ */
  /* Map                                                               */
  /* ================================================================ */

  private drawMap(): void {
    const key = `map_${this.levelIndex}`;
    // keep only the current level's full-screen map in GPU memory
    for (const k of this.textures.getTextureKeys()) if (k.startsWith('map_') && k !== key) this.textures.remove(k);
    if (!this.textures.exists(key)) paintMap(this, key, this.level.theme, this.paths.map(p => p.pts), this.level.seed * 7 + 3);
    this.add.image(0, 0, key).setOrigin(0).setDepth(DEPTH.ground);
  }

  private placeDecor(): void {
    const rng = seeded(this.level.seed * 13 + 1);
    const placed: Pt[] = [];
    const kinds = this.level.theme.decor;
    for (let i = 0; i < 420 && placed.length < 70; i++) {
      const x = 20 + rng() * (W - 40), y = 30 + rng() * (H - 40);
      const kind = kinds[Math.floor(rng() * kinds.length)];
      const pad = kind === 'flower' ? 34 : 48;
      if (minPathDist(this.paths, x, y) < pad) continue;
      if (this.spots.some(s => dist(s.x, s.y, x, y) < 58)) continue;
      if (dist(x, y, this.endPt.x, this.endPt.y) < 80) continue;
      if (rectsContain(HUD_ZONES, x, y, 6)) continue;
      if (placed.some(p => dist(p.x, p.y, x, y) < 34)) continue;
      placed.push({ x, y });
      const img = this.add.image(x, y, `decor_${kind}`).setOrigin(0.5, 66 / 72).setScale(0.8 + rng() * 0.4);
      if (rng() < 0.5) img.setFlipX(true);
      img.setDepth(kind === 'flower' || kind === 'lava' ? DEPTH.spots - 1 : DEPTH.world + y);
      // gentle wind sway for plants
      if (kind === 'tree' || kind === 'autumn' || kind === 'pine' || kind === 'snowpine' || kind === 'bush') {
        this.tweens.add({ targets: img, angle: { from: -1.4, to: 1.4 }, duration: 1600 + rng() * 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: rng() * 1500 });
      }
      if (kind === 'crystal' || kind === 'lava') {
        const g = this.add.image(x, y - 14, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(kind === 'lava' ? 0xff7a2a : 0x6ad0ff).setScale(0.9).setAlpha(0.35).setDepth(img.depth + 1);
        this.tweens.add({ targets: g, alpha: 0.12, scale: 1.1, duration: 1200 + rng() * 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
  }

  private placeCylinder(): void {
    const { x, y } = this.endPt;
    const ADD = Phaser.BlendModes.ADD;
    const d = DEPTH.world + y + 12;
    const glow = this.add.image(x, y - 60, 'glow').setBlendMode(ADD).setTint(0x5ad0ff).setScale(3.2).setAlpha(0.45).setDepth(d - 1);
    this.tweens.add({ targets: glow, scale: 3.8, alpha: 0.25, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const beam = this.add.image(x, y - 150, 'glow').setBlendMode(ADD).setTint(0x9feaff).setScale(0.7, 5).setAlpha(0.22).setDepth(d + 1);
    this.tweens.add({ targets: beam, alpha: 0.1, scaleX: 0.55, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.cylinder = this.add.image(x, y + 12, 'cylinder').setOrigin(0.5, 132 / 140).setDepth(d);
    this.tweens.add({ targets: this.cylinder, y: y + 8, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.particles(x, y - 60, 'spark', {
      x: { min: -28, max: 28 }, y: { min: -40, max: 50 }, speedY: { min: -30, max: -12 }, speedX: { min: -6, max: 6 },
      lifespan: 1600, scale: { start: 0.9, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0x9feaff, 0xffffff, 0x5ad0ff],
      blendMode: 'ADD', frequency: 120,
    }).setDepth(d + 2);
  }

  /** Weather, drifting cloud shadows and a soft vignette. */
  private addAmbience(): void {
    const amb = this.level.theme.ambient;
    const top = DEPTH.effects + 40;
    const common = { blendMode: 'ADD' as const };
    if (amb === 'pollen') {
      this.add.particles(0, 0, 'spark', { ...common, x: { min: 0, max: W }, y: { min: 0, max: H }, lifespan: 6000, speedX: { min: 6, max: 18 }, speedY: { min: -8, max: 4 },
        scale: { start: 0.5, end: 0.2 }, alpha: { start: 0, end: 0.8, ease: 'Sine.easeInOut' }, tint: [0xfff6b0, 0xffffff], frequency: 160 }).setDepth(top);
    } else if (amb === 'leaves') {
      this.add.particles(0, 0, 'leaf', { x: { min: -50, max: W }, y: -20, lifespan: 9000, speedX: { min: 15, max: 45 }, speedY: { min: 35, max: 60 },
        rotate: { min: 0, max: 360 }, scale: { min: 0.7, max: 1.2 }, alpha: { start: 1, end: 0.6 }, frequency: 380 }).setDepth(top);
    } else if (amb === 'fireflies') {
      this.add.particles(0, 0, 'glow', { ...common, x: { min: 0, max: W }, y: { min: 60, max: H }, lifespan: 4000, speedX: { min: -10, max: 10 }, speedY: { min: -12, max: 6 },
        scale: { start: 0.14, end: 0.06 }, alpha: { start: 0, end: 1, ease: 'Sine.easeInOut' }, tint: [0xd8ff6a, 0xfff07a], frequency: 220 }).setDepth(top);
      for (let i = 0; i < 4; i++) {
        const fog = this.add.image(Math.random() * W, 120 + Math.random() * (H - 200), 'smoke').setScale(10, 4).setAlpha(0.09).setTint(0xdfffe8).setDepth(top - 1);
        this.tweens.add({ targets: fog, x: fog.x + 200, duration: 20000 + i * 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    } else if (amb === 'snow') {
      this.add.particles(0, 0, 'snowflake', { x: { min: -100, max: W }, y: -10, lifespan: 9000, speedX: { min: 5, max: 30 }, speedY: { min: 40, max: 75 },
        scale: { min: 0.4, max: 1.1 }, alpha: { min: 0.6, max: 1 }, frequency: 45 }).setDepth(top);
    } else if (amb === 'embers') {
      this.add.particles(0, 0, 'spark', { ...common, x: { min: 0, max: W }, y: H + 10, lifespan: 7000, speedX: { min: -12, max: 12 }, speedY: { min: -70, max: -35 },
        scale: { start: 0.7, end: 0.1 }, alpha: { start: 1, end: 0 }, tint: [0xffa22a, 0xff5a1a, 0xffd36e], frequency: 90 }).setDepth(top);
    }
    if (amb !== 'fireflies') {
      for (let i = 0; i < 3; i++) {
        const cs = this.add.image(-400 + i * 600, 150 + i * 190, 'cloudshadow').setScale(1.6).setAlpha(amb === 'embers' ? 0.16 : 0.1).setDepth(DEPTH.world - 1);
        if (amb === 'embers') cs.setTint(0x3a1a10);
        const drift = () => {
          const dur = (W + 500 - cs.x) / (W + 900) * (70000 + i * 15000);
          this.tweens.add({ targets: cs, x: W + 500, duration: dur, onComplete: () => { cs.x = -400; drift(); } });
        };
        drift();
      }
    }
    this.add.image(0, 0, 'vignette').setOrigin(0).setDisplaySize(W, H).setDepth(top + 5);
  }

  /* ================================================================ */
  /* World API used by entities                                        */
  /* ================================================================ */

  addSoldier(s: Soldier): Soldier { this.soldiers.push(s); return s; }
  addProjectile(p: Projectile): void { this.projectiles.push(p); }

  spawnEnemy(key: string, path: PathLine, d = 0): Enemy {
    const e = new Enemy(this, key, path, d, this.level.hpMult);
    this.enemies.push(e);
    const seen = load().seenEnemies;
    if (!seen.includes(key)) {
      seen.push(key); save();
      this.introduceEnemy(key);
    }
    return e;
  }

  /** Front-most enemy in range; skips enemies that in-flight shots will already kill. */
  pickTarget(x: number, y: number, range: number, air: boolean, exclude?: Enemy): Enemy | null {
    let best: Enemy | null = null, br = Infinity;
    let fallback: Enemy | null = null, fr = Infinity;
    for (const e of this.enemies) {
      if (!e.alive || e === exclude || (e.flying && !air)) continue;
      if (dist(x, y, e.x, e.y) > range + e.def.radius * 0.5) continue;
      if (e.doomed) { if (e.remaining < fr) { fr = e.remaining; fallback = e; } continue; }
      if (e.remaining < br) { br = e.remaining; best = e; }
    }
    return best ?? fallback;
  }

  findSoldierTarget(hx: number, hy: number, r: number, soldier: Soldier): Enemy | null {
    let best: Enemy | null = null, bd = Infinity;
    let assist: Enemy | null = null, ad = Infinity;
    for (const e of this.enemies) {
      if (!e.alive || e.flying) continue;
      if (dist(e.x, e.y, hx, hy) > r) continue;
      const d = dist(e.x, e.y, soldier.x, soldier.y);
      if (!e.blocker || e.blocker === soldier) { if (d < bd) { bd = d; best = e; } }
      else if (d < ad) { ad = d; assist = e; }
    }
    return best ?? soldier.target ?? assist;
  }

  defaultRally(x: number, y: number, range: number): Pt {
    let best: Pt = { x, y }, bd = Infinity;
    for (const p of this.paths) {
      const c = p.closest(x, y);
      if (c.d < bd) { bd = c.d; best = p.at(c.along); }
    }
    if (bd > range) return { x, y };
    return { x: best.x, y: best.y };
  }

  damageEnemy(e: Enemy, amount: number, type: DamageType, silent = false): void {
    if (!e.alive) return;
    let a = amount;
    if (type === 'physical') a *= 1 - e.def.armor;
    else if (type === 'explosive') a *= 1 - e.def.armor * 0.5;
    else if (type === 'magic') a *= 1 - e.def.mr;
    e.hp -= a;
    e.onHit(!silent);
    if (e.hp <= 0) this.killEnemy(e);
  }

  private killEnemy(e: Enemy): void {
    if (!e.alive) return;
    if (e.blocker) e.blocker.release();
    const gold = e.def.gold;
    this.gold += gold;
    this.fx.floatText(e.x, e.y - e.hitHeight - 20, `+${gold}`, '#ffd23a', e.def.boss ? 26 : 15);
    this.fx.death(e.body, e.x, e.y, e.def.key === 'wraith');
    this.fx.coin(e.x, e.y - e.hitHeight, e.def.boss ? 4 : 1);
    if (e.def.boss) { this.cameras.main.shake(400, 0.01); this.fx.explosion(e.x, e.y, 90); }
    sfx.coin();
    sfx.die();
    if (e === this.selectedEnemy) { this.selectedEnemy = null; this.hideInfo(); }
    e.destroy();
  }

  enemyLeaked(e: Enemy): void {
    if (!e.alive) return;
    if (e.blocker) e.blocker.release();
    this.lives = Math.max(0, this.lives - e.def.lives);
    if (e === this.selectedEnemy) { this.selectedEnemy = null; this.hideInfo(); }
    e.destroy();
    sfx.leak();
    this.cameras.main.shake(180, 0.006);
    this.cylinder.setTint(0xff6a6a);
    this.time.delayedCall(180, () => this.cylinder.clearTint());
    this.fx.floatText(this.endPt.x, this.endPt.y - 110, `-${e.def.lives}`, '#ff5a5a', 22);
    if (this.lives <= 0) this.endGame(false);
  }

  healArea(src: Enemy, r: number, amount: number): void {
    let any = false;
    for (const e of this.enemies) {
      if (!e.alive || e.hp >= e.maxHp || dist(e.x, e.y, src.x, src.y) > r) continue;
      e.hp = Math.min(e.maxHp, e.hp + amount);
      e.onHit(false);
      this.fx.heal(e.x, e.y);
      any = true;
    }
    if (any) this.fx.ring(src.x, src.y, r, 0x7dff8a, 600);
  }

  explode(x: number, y: number, r: number, dmg: number, air: boolean, small = false): void {
    this.fx.explosion(x, y, small ? r * 0.8 : r);
    sfx.boom();
    for (const e of this.enemies) {
      if (!e.alive || (e.flying && !air)) continue;
      if (dist(e.x, e.y, x, y) <= r + e.def.radius * 0.5) this.damageEnemy(e, dmg, 'explosive');
    }
  }

  addFire(x: number, y: number, r: number, dps: number, t: number): void {
    const gfx = this.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xff6a1a).setScale(r / 22, r / 40).setDepth(DEPTH.spots + 2);
    this.fires.push({ x, y, r, dps, t, gfx, sparkT: 0 });
  }

  sfxSword(): void { sfx.sword(); }
  sfxHit(): void { sfx.hit(); }

  /* ================================================================ */
  /* Waves                                                             */
  /* ================================================================ */

  private get totalWaves(): number { return this.level.waves.length; }

  private startNextWave(early: boolean): void {
    if (this.waveIdx >= this.totalWaves || this.ended) return;
    if (early && this.nextWaveTimer > 0 && this.waveIdx > 0) {
      const bonus = Math.ceil(this.nextWaveTimer);
      this.gold += bonus;
      const b = this.callButtons[0];
      if (b) this.fx.floatText(b.c.x, b.c.y - 40, `+${bonus} early bonus`, '#ffd23a', 16);
      sfx.coin();
      // calling early also shaves time off ability cooldowns
      this.meteorCd = Math.max(0, this.meteorCd - bonus * 0.25);
      this.reinforceCd = Math.max(0, this.reinforceCd - bonus * 0.25);
    }
    const wave = this.level.waves[this.waveIdx];
    this.waveIdx++;
    for (const [key, count, gap, delay = 0, path = 0] of wave) {
      const pace = this.level.pace ?? 1;
      for (let i = 0; i < count; i++) this.queue.push({ t: this.clock + 0.3 + (delay + i * gap) * pace, key, path });
    }
    this.queue.sort((a, b) => a.t - b.t);
    this.nextWaveTimer = -1;
    this.hideCallButtons();
    sfx.wave();
    const boss = wave.some(g => ENEMIES[g[0]].boss);
    this.toast(boss ? 'The Warlord approaches!' : this.waveIdx === this.totalWaves ? 'Final wave!' : `Wave ${this.waveIdx}`, 1600);
    if (this.tutorial === 2) { this.tutorial = 3; this.clearHint(); }
  }

  private waveSummary(waveIndex: number, path: number): string {
    const wave = this.level.waves[waveIndex];
    if (!wave) return '';
    const counts = new Map<string, number>();
    for (const [key, count, , , p = 0] of wave) if (p === path) counts.set(key, (counts.get(key) ?? 0) + count);
    return [...counts.entries()].map(([k, n]) => `${n} ${ENEMIES[k].short}`).join('\n');
  }

  private showCallButtons(first: boolean): void {
    this.hideCallButtons();
    const wave = this.level.waves[this.waveIdx];
    if (!wave) return;
    const usedPaths = [...new Set(wave.map(g => g[4] ?? 0))];
    for (const pi of usedPaths) {
      const { x, y } = callButtonPos(this.paths[pi]);
      const c = this.add.container(x, y).setDepth(DEPTH.hud);
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.4); g.fillCircle(2, 4, 30);
      g.fillStyle(0x5a1a1a); g.fillCircle(0, 0, 30);
      g.fillStyle(0x8f2a2a); g.fillCircle(0, -1, 26);
      const icon = this.add.image(0, -1, 'icon_skull').setScale(0.8);
      const ring = this.add.graphics();
      const hit = this.add.circle(0, 0, 34, 0x000000, 0).setInteractive({ useHandCursor: true });
      // near the bottom edge the labels go above the button so they don't cover the ability buttons
      const up = y > H - 170;
      const label = txt(this, 0, up ? -44 : 44, first && this.waveIdx === 0 ? 'START!' : 'CALL', { size: 15, color: '#ffe26a', strokeThickness: 3 });
      const sum = this.waveSummary(this.waveIdx, pi);
      const sumText = txt(this, 0, up ? -58 : 58, sum, { size: 12, color: '#ffffff', strokeThickness: 3 }).setOrigin(0.5, up ? 1 : 0);
      c.add([g, ring, icon, hit, label, sumText]);
      hit.on('pointerdown', () => unlockAudio());
      hit.on('pointerup', () => this.startNextWave(true));
      this.tweens.add({ targets: icon, scale: 0.92, duration: 500, yoyo: true, repeat: -1 });
      c.setScale(0);
      this.tweens.add({ targets: c, scale: 1, duration: 300, ease: 'Back.easeOut' });
      this.callButtons.push({ c, ring, path: pi });
    }
  }

  private hideCallButtons(): void {
    this.callButtons.forEach(b => b.c.destroy());
    this.callButtons = [];
  }

  /* ================================================================ */
  /* Update loop                                                       */
  /* ================================================================ */

  update(_t: number, deltaMs: number): void {
    if (this.paused || this.ended) return;
    const dt = Math.min(deltaMs, 50) / 1000 * this.speed;
    this.clock += dt;

    while (this.queue.length && this.queue[0].t <= this.clock) {
      const q = this.queue.shift()!;
      this.spawnEnemy(q.key, this.paths[q.path % this.paths.length]);
    }

    if (this.waveIdx > 0 && this.queue.length === 0 && this.waveIdx < this.totalWaves && this.nextWaveTimer < 0) {
      this.nextWaveTimer = WAVE_GAP;
      this.showCallButtons(false);
    }
    if (this.nextWaveTimer >= 0) {
      this.nextWaveTimer -= dt;
      for (const b of this.callButtons) {
        b.ring.clear();
        b.ring.lineStyle(5, 0xffe26a, 1);
        b.ring.beginPath();
        b.ring.arc(0, 0, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, this.nextWaveTimer / WAVE_GAP), false);
        b.ring.strokePath();
      }
      if (this.nextWaveTimer <= 0) this.startNextWave(false);
    }

    for (const t of this.towers) t.update(dt);
    for (const e of this.enemies) e.update(dt);
    for (const s of this.soldiers) s.update(dt);
    for (const p of this.projectiles) p.update(dt);
    this.updateFires(dt);

    this.enemies = this.enemies.filter(e => e.alive);
    this.projectiles = this.projectiles.filter(p => !p.done);
    if (this.soldiers.some(s => s.removed)) {
      this.soldiers = this.soldiers.filter(s => { if (s.removed) s.view.destroy(); return !s.removed; });
    }

    this.meteorCd = Math.max(0, this.meteorCd - dt);
    this.reinforceCd = Math.max(0, this.reinforceCd - dt);

    if (this.waveIdx >= this.totalWaves && this.queue.length === 0 && this.enemies.length === 0 && !this.ended) {
      this.endGame(true);
    }
    this.refreshHud();
  }

  private updateFires(dt: number): void {
    for (const f of this.fires) {
      f.t -= dt;
      f.gfx.setAlpha(Math.min(1, f.t) * (0.55 + Math.random() * 0.25));
      f.sparkT -= dt;
      if (f.sparkT <= 0) {
        f.sparkT = 0.07;
        const p = this.add.image(f.x + rand(-f.r, f.r) * 0.8, f.y + rand(-f.r, f.r) * 0.35, 'glow').setBlendMode(Phaser.BlendModes.ADD)
          .setTint(Math.random() < 0.5 ? 0xffa22a : 0xff4a1a).setScale(rand(0.25, 0.4)).setDepth(DEPTH.world + f.y + 20);
        this.tweens.add({ targets: p, y: p.y - rand(20, 34), alpha: 0, scaleX: 0.1, duration: rand(380, 560), onComplete: () => p.destroy() });
      }
      for (const e of this.enemies) {
        if (e.alive && !e.flying && dist(e.x, e.y, f.x, f.y) < f.r) this.damageEnemy(e, f.dps * dt, 'true', true);
      }
      if (f.t <= 0) f.gfx.destroy();
    }
    this.fires = this.fires.filter(f => f.t > 0);
  }

  /* ================================================================ */
  /* Input                                                             */
  /* ================================================================ */

  private onPointerDown(p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    unlockAudio();
    if (this.paused || this.ended || over.length > 0) return;
    const x = p.worldX, y = p.worldY;

    if (this.abilityMode) { this.castAbility(x, y); return; }
    if (this.rallyTower) { this.placeRally(x, y); return; }

    const spot = this.spots.find(s => Math.abs(s.x - x) < 44 && y > s.y - (s.tower ? 80 : 30) && y < s.y + 30);
    if (spot) {
      if (this.menuSpot === spot) { this.closeMenu(); return; }
      this.openMenu(spot);
      return;
    }

    let pick: Enemy | null = null, pd = Infinity;
    for (const e of this.enemies) {
      const d = dist(x, y, e.x, e.y - e.hitHeight * 0.7);
      if (d < e.def.radius + 16 && d < pd) { pd = d; pick = e; }
    }
    this.closeMenu();
    if (pick) { this.selectedEnemy = pick; this.showEnemyInfo(pick); sfx.click(); return; }
    this.selectedEnemy = null;
    this.hideInfo();
  }

  private onBack(): void {
    if (this.ended) { this.goToMap(); return; }
    if (this.overlay) { this.resume(); return; }
    if (this.menu || this.rallyTower || this.abilityMode) { this.cancelModes(); return; }
    this.pause();
  }

  private autoPause(): void {
    if (!this.paused && !this.ended) this.pause();
  }

  private cancelModes(): void {
    this.closeMenu();
    this.rallyTower = null;
    this.abilityMode = null;
    this.rangeGfx.clear();
    this.hideInfo();
  }

  /* ================================================================ */
  /* Build / upgrade menu                                              */
  /* ================================================================ */

  private openMenu(spot: Spot): void {
    this.closeMenu();
    this.selectedEnemy = null;
    this.menuSpot = spot;
    const opts: RadialOption[] = [];
    const t = spot.tower;
    if (!t) {
      const angles = [-135, -45, 135, 45];
      BUILD_OPTIONS.forEach((id, i) => {
        const spec = TOWERS[id];
        opts.push({
          icon: `tower_${id}`, iconSize: 58, angle: angles[i], price: spec.cost, confirm: true,
          onSelect: () => { this.showSpecInfo(spec, spec.cost); this.drawRange(spot.x, spot.y, spec.range); },
          action: () => this.build(spot, id),
        });
      });
      this.showInfo('Build a tower', 'Tap a tower to see details, tap again to build.');
      this.rangeGfx.clear();
    } else {
      const spec = t.spec;
      const nexts = spec.next;
      const upAngles = nexts.length === 2 ? [-128, -52] : [-90];
      nexts.forEach((id, i) => {
        const ns = TOWERS[id];
        opts.push({
          icon: nexts.length === 2 ? `tower_${id}` : 'icon_up', iconSize: nexts.length === 2 ? 58 : 34,
          angle: upAngles[i], price: ns.cost, confirm: true,
          onSelect: () => { this.showSpecInfo(ns, ns.cost, nexts.length === 2 ? 'Specialize: ' : 'Upgrade: '); this.drawRange(spot.x, spot.y, ns.range); },
          action: () => this.upgrade(t, id),
        });
      });
      if (spec.skill) {
        const sk = spec.skill;
        const maxed = t.skillRank >= 3;
        opts.push({
          icon: 'icon_skill', iconSize: 36, tint: SKILL_TINT[sk.id], angle: -90,
          price: maxed ? undefined : sk.costs[t.skillRank], priceLabel: maxed ? 'MAX' : undefined,
          pips: [t.skillRank, 3], maxed, confirm: true,
          onSelect: () => this.showInfo(`${sk.name}  (rank ${Math.min(3, t.skillRank + (maxed ? 0 : 1))}/3)`, sk.describe(Math.min(3, t.skillRank + (maxed ? 0 : 1))) + (maxed ? '\nFully upgraded!' : '')),
          action: () => this.buySkill(t),
        });
      }
      opts.push({
        icon: 'icon_sell', iconSize: 34, angle: 90, priceLabel: `+${t.sellValue}`, confirm: true,
        onSelect: () => this.showInfo('Sell tower', `Refund ${t.sellValue} gold. Tap again to confirm.`),
        action: () => this.sell(t),
      });
      if (spec.kind === 'barracks') {
        opts.push({
          icon: 'icon_flag', iconSize: 34, angle: 180, confirm: false,
          action: () => this.beginRally(t),
        });
      }
      this.showTowerInfo(t);
      this.drawRange(spot.x, spot.y, spec.range, spec.kind === 'barracks');
    }
    this.menu = new RadialMenu(this, spot.x, spot.y - (t ? 30 : 0), opts, () => this.gold);
    if (this.tutorial === 1) this.clearHint();
  }

  private closeMenu(): void {
    if (this.menu) { this.menu.destroy(); this.menu = null; }
    this.menuSpot = null;
    if (!this.rallyTower) this.rangeGfx.clear();
  }

  private drawRange(x: number, y: number, r: number, rally = false): void {
    const g = this.rangeGfx;
    g.clear();
    const col = rally ? 0xffe26a : 0xffffff;
    g.fillStyle(col, 0.08); g.fillEllipse(x, y, r * 2, r * 2 * 0.92);
    g.fillStyle(col, 0.06); g.fillEllipse(x, y, r * 1.6, r * 1.6 * 0.92);
    g.lineStyle(5, col, 0.18); g.strokeEllipse(x, y, r * 2, r * 2 * 0.92);
    g.lineStyle(2, col, 0.75); g.strokeEllipse(x, y, r * 2, r * 2 * 0.92);
  }

  private spend(cost: number): boolean {
    if (this.gold < cost) { sfx.error(); this.goldText.setColor('#ff5a5a'); this.time.delayedCall(300, () => this.goldText.setColor('#ffd23a')); return false; }
    this.gold -= cost;
    return true;
  }

  private build(spot: Spot, id: string): void {
    if (!this.spend(TOWERS[id].cost)) return;
    const t = new Tower(this, spot, id);
    spot.tower = t;
    this.towers.push(t);
    sfx.build();
    this.closeMenu();
    this.hideInfo();
    if (this.tutorial === 1) { this.tutorial = 2; this.time.delayedCall(400, () => this.showHint()); }
  }

  private upgrade(t: Tower, id: string): void {
    if (!this.spend(TOWERS[id].cost)) return;
    t.upgradeTo(id);
    sfx.upgrade();
    this.closeMenu();
    this.hideInfo();
  }

  private buySkill(t: Tower): void {
    const sk = t.spec.skill;
    if (!sk || t.skillRank >= 3) return;
    if (!this.spend(sk.costs[t.skillRank])) return;
    t.upgradeSkill();
    sfx.upgrade();
    const spot = t.spot;
    this.closeMenu();
    this.openMenu(spot);
  }

  private sell(t: Tower): void {
    this.gold += t.sellValue;
    this.fx.floatText(t.x, t.y - 60, `+${t.sellValue}`, '#ffd23a', 18);
    this.fx.puff(t.x, t.y, 0xd9c19a, 1.6);
    t.destroy();
    t.spot.tower = null;
    this.towers = this.towers.filter(o => o !== t);
    this.soldiers = this.soldiers.filter(s => !s.removed);
    sfx.sell();
    this.closeMenu();
    this.hideInfo();
  }

  private beginRally(t: Tower): void {
    this.closeMenu();
    this.rallyTower = t;
    this.drawRange(t.x, t.y, t.spec.range, true);
    this.showInfo('Move soldiers', 'Tap a point on the road inside the circle.');
  }

  private placeRally(x: number, y: number): void {
    const t = this.rallyTower!;
    this.rallyTower = null;
    this.rangeGfx.clear();
    if (dist(x, y, t.x, t.y) > t.spec.range) { sfx.error(); this.showInfo('Too far', 'The rally point must be inside the circle.'); return; }
    if (minPathDist(this.paths, x, y) > 60) { sfx.error(); this.showInfo('Not on the road', 'Soldiers must stand near the road.'); return; }
    t.setRally(x, y);
    sfx.horn();
    const flag = this.add.image(x, y, 'rally').setOrigin(0.25, 0.9).setDepth(DEPTH.range + 1);
    this.tweens.add({ targets: flag, alpha: 0, delay: 900, duration: 500, onComplete: () => flag.destroy() });
    this.fx.ring(x, y, 30, 0xffe26a);
    this.hideInfo();
  }

  /* ================================================================ */
  /* Abilities                                                         */
  /* ================================================================ */

  private toggleAbility(kind: 'meteor' | 'reinforce'): void {
    if (this.paused || this.ended) return;
    const cd = kind === 'meteor' ? this.meteorCd : this.reinforceCd;
    if (cd > 0) { sfx.error(); return; }
    this.closeMenu();
    this.rallyTower = null;
    if (this.abilityMode === kind) { this.abilityMode = null; this.hideInfo(); return; }
    this.abilityMode = kind;
    if (kind === 'meteor') this.showInfo('Rain of Fire', 'Tap the battlefield to call down a meteor shower.');
    else this.showInfo('Reinforcements', 'Tap the road to summon two knights for 20 seconds.');
  }

  private castAbility(x: number, y: number): void {
    const kind = this.abilityMode;
    this.abilityMode = null;
    this.hideInfo();
    if (kind === 'meteor') {
      this.meteorCd = METEOR_CD;
      sfx.meteor();
      for (let i = 0; i < 6; i++) {
        const tx = x + rand(-55, 55), ty = y + rand(-35, 35);
        this.addProjectile(new Projectile(this, {
          kind: 'meteor', x: tx + 220 + rand(-40, 40), y: -60 - i * 50, tx, ty, speed: 900, arc: 0, scale: 1.1,
          onArrive: (mx, my) => {
            this.explode(mx, my, 55, randInt(38, 55), false);
            this.cameras.main.shake(120, 0.004);
          },
        }));
      }
    } else if (kind === 'reinforce') {
      if (minPathDist(this.paths, x, y) > 70) { sfx.error(); this.showInfo('Not on the road', 'Reinforcements must be placed near the road.'); this.abilityMode = 'reinforce'; return; }
      this.reinforceCd = REINFORCE_CD;
      sfx.horn();
      const stats = { hp: 90, dmg: [4, 8] as [number, number], armor: 0.25, rate: 1, look: 'hero', respawn: 0 };
      for (const ox of [-14, 14]) {
        const s = new Soldier(this, stats, x + ox, y - 30, x + ox, y, null, 95, 20);
        this.addSoldier(s);
        this.fx.puff(x + ox, y, 0xfff2b0, 0.8);
      }
    }
  }

  /* ================================================================ */
  /* HUD                                                               */
  /* ================================================================ */

  private buildHud(): void {
    const d = DEPTH.hud;
    panel(this, 10, 10, 420, 56).setDepth(d);
    this.add.image(42, 38, 'icon_heart').setScale(0.7).setDepth(d);
    this.livesText = txt(this, 66, 38, '', { size: 24 }).setOrigin(0, 0.5).setDepth(d);
    this.add.image(152, 38, 'icon_coin').setScale(0.7).setDepth(d);
    this.goldText = txt(this, 176, 38, '', { size: 24, color: '#ffd23a' }).setOrigin(0, 0.5).setDepth(d);
    this.add.image(290, 38, 'icon_skull').setScale(0.62).setDepth(d);
    this.waveText = txt(this, 312, 38, '', { size: 22 }).setOrigin(0, 0.5).setDepth(d);

    this.speedBtn = iconButton(this, W - 100, 40, 28, 'icon_play', () => {
      this.speed = this.speed === 1 ? 2 : 1;
      this.speedBtn.icon.setTexture(this.speed === 1 ? 'icon_play' : 'icon_ff');
      this.tweens.timeScale = this.speed;
      this.time.timeScale = this.speed;
      this.anims.globalTimeScale = this.speed;
    });
    this.speedBtn.setDepth(d);
    iconButton(this, W - 38, 40, 28, 'icon_pause', () => this.pause()).setDepth(d);

    this.meteorBtn = this.abilityButton(56, H - 56, 'icon_meteor', 'meteor');
    this.reinforceBtn = this.abilityButton(146, H - 56, 'icon_swords', 'reinforce');
    this.abilityGfx = this.add.graphics().setDepth(d + 2);

    // info bar
    this.info = this.add.container(W / 2, H - 52).setDepth(d + 5).setVisible(false);
    this.infoBg = this.add.graphics();
    this.infoTitle = txt(this, 0, -22, '', { size: 19, color: '#ffe26a' });
    this.infoBody = txt(this, 0, -6, '', { size: 15, wrap: 600, strokeThickness: 3 }).setOrigin(0.5, 0);
    this.info.add([this.infoBg, this.infoTitle, this.infoBody]);
  }

  private abilityButton(x: number, y: number, icon: string, kind: 'meteor' | 'reinforce'): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(DEPTH.hud);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.4); g.fillCircle(2, 5, 38);
    g.fillStyle(0x2a1e12); g.fillCircle(0, 0, 38);
    g.fillStyle(0x4a3420); g.fillCircle(0, -1, 34);
    g.lineStyle(3, 0xd4a017); g.strokeCircle(0, -1, 34);
    const img = this.add.image(0, -1, icon).setScale(0.85);
    const hit = this.add.circle(0, 0, 40, 0x000000, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => unlockAudio());
    hit.on('pointerup', () => this.toggleAbility(kind));
    c.add([g, img, hit]);
    return c;
  }

  private refreshHud(): void {
    if (this.shown.lives !== this.lives) { this.shown.lives = this.lives; this.livesText.setText(String(this.lives)); }
    const gold = Math.floor(this.gold);
    if (this.shown.gold !== gold) { this.shown.gold = gold; this.goldText.setText(String(gold)); }
    if (this.shown.wave !== this.waveIdx) { this.shown.wave = this.waveIdx; this.waveText.setText(`Wave ${this.waveIdx}/${this.totalWaves}`); }
    this.menu?.refresh();

    const g = this.abilityGfx;
    g.clear();
    const items: [Phaser.GameObjects.Container, number, number, 'meteor' | 'reinforce'][] = [
      [this.meteorBtn, this.meteorCd, METEOR_CD, 'meteor'], [this.reinforceBtn, this.reinforceCd, REINFORCE_CD, 'reinforce'],
    ];
    for (const [btn, cd, max, kind] of items) {
      if (cd > 0) {
        g.fillStyle(0x000000, 0.6);
        g.slice(btn.x, btn.y - 1, 34, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (cd / max), false);
        g.fillPath();
      }
      if (this.abilityMode === kind) {
        g.lineStyle(5, 0xffe26a, 0.6 + Math.sin(this.time.now / 120) * 0.4);
        g.strokeCircle(btn.x, btn.y - 1, 40);
      }
    }
    if (this.selectedEnemy && this.selectedEnemy.alive && Math.floor(this.time.now / 200) !== Math.floor((this.time.now - 17) / 200)) {
      this.showEnemyInfo(this.selectedEnemy);
    }
  }

  showInfo(title: string, body: string): void {
    this.infoTitle.setText(title);
    this.infoBody.setText(body);
    const w = Math.max(this.infoTitle.width, this.infoBody.width) + 48;
    const top = -44;
    const h = -top - 6 + this.infoBody.height + 12;
    this.infoBg.clear();
    this.infoBg.fillStyle(0x000000, 0.35); this.infoBg.fillRoundedRect(-w / 2 + 3, top + 4, w, h, 12);
    this.infoBg.fillStyle(0x1f150c, 0.92); this.infoBg.fillRoundedRect(-w / 2, top, w, h, 12);
    this.infoBg.lineStyle(2, 0xd4a017, 0.8); this.infoBg.strokeRoundedRect(-w / 2, top, w, h, 12);
    // keep the info bar away from the open menu / selected enemy
    const focusY = this.menuSpot?.y ?? this.selectedEnemy?.y ?? this.rallyTower?.y ?? 0;
    const atTop = focusY > H - 230;
    this.info.setPosition(W / 2, atTop ? 92 - top : H - 10 - (h + top));
    this.info.setVisible(true);
  }

  hideInfo(): void {
    this.info.setVisible(false);
  }

  private showSpecInfo(spec: TowerSpec, cost: number, prefix = ''): void {
    this.showInfo(`${prefix}${spec.name}  ·  ${cost}g`, `${spec.blurb}\n${this.specStats(spec)}`);
  }

  private showTowerInfo(t: Tower): void {
    const sk = t.spec.skill;
    const skill = sk ? `\n${sk.name}: ${t.skillRank > 0 ? `rank ${t.skillRank}/3` : 'not learned'}` : '';
    const hint = t.spec.next.length === 2 ? '\nChoose a specialization!' : '';
    this.showInfo(t.spec.name, `${this.specStats(t.spec)}${skill}${hint}`);
  }

  private specStats(spec: TowerSpec): string {
    if (spec.soldiers) {
      const s = spec.soldiers;
      return `${s.count} soldiers · HP ${s.hp} · Dmg ${s.dmg[0]}-${s.dmg[1]} · Armor ${Math.round(s.armor * 100)}%`;
    }
    const speed = spec.rate < 0.5 ? 'Very fast' : spec.rate < 1 ? 'Fast' : spec.rate < 2 ? 'Average' : 'Slow';
    const type = spec.dmgType === 'physical' ? 'physical' : spec.dmgType === 'magic' ? 'magic' : 'explosive';
    const extras = [
      spec.splash ? 'area damage' : '',
      spec.slow ? 'slows' : '',
      spec.volley ? `${spec.volley} targets` : '',
      spec.hitsAir ? '' : 'ground only',
    ].filter(Boolean).join(', ');
    return `Dmg ${spec.dmg[0]}-${spec.dmg[1]} ${type} · Range ${spec.range} · ${speed}${extras ? ` · ${extras}` : ''}`;
  }

  private showEnemyInfo(e: Enemy): void {
    const lvl = (v: number) => (v <= 0 ? 'None' : v < 0.35 ? 'Low' : v < 0.6 ? 'Medium' : v < 0.8 ? 'High' : 'Very high');
    const spd = e.def.speed > 80 ? 'Very fast' : e.def.speed > 55 ? 'Fast' : e.def.speed > 35 ? 'Normal' : 'Slow';
    this.showInfo(e.def.name,
      `HP ${Math.ceil(e.hp)}/${e.maxHp} · Armor ${lvl(e.def.armor)} · Magic res. ${lvl(e.def.mr)} · ${spd} · Lives ${e.def.lives}\n${e.def.tip}`);
  }

  toast(msg: string, ms = 1500, y = 120): void {
    const t = txt(this, W / 2, y, msg, { size: 40, color: '#ffe26a', strokeThickness: 6 }).setDepth(DEPTH.hud + 10).setAlpha(0).setScale(0.6);
    this.tweens.add({ targets: t, alpha: 1, scale: 1, duration: 250, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, y: y - 20, delay: ms, duration: 400, onComplete: () => t.destroy() });
  }

  private introCard: Phaser.GameObjects.Container | null = null;

  private introduceEnemy(key: string): void {
    const def = ENEMIES[key];
    if (this.introCard?.active) this.introCard.destroy();
    const c = this.add.container(W / 2, 175).setDepth(DEPTH.hud + 8);
    this.introCard = c;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35); g.fillRoundedRect(-283, -42, 570, 92, 14);
    g.fillStyle(0x1f150c, 0.95); g.fillRoundedRect(-285, -46, 570, 92, 14);
    g.lineStyle(3, 0xe8384a); g.strokeRoundedRect(-285, -46, 570, 92, 14);
    const img = this.add.image(-238, 6, `enemy_${key}_0`);
    img.setScale(Math.min(1.5, 80 / Math.max(img.width, img.height)));
    const title = txt(this, -190, -22, `NEW ENEMY: ${def.name}`, { size: 20, color: '#ff8a7a' }).setOrigin(0, 0.5);
    const body = txt(this, -190, 2, def.tip, { size: 15, wrap: 460, strokeThickness: 3, align: 'left' }).setOrigin(0, 0);
    const hit = this.add.rectangle(0, 0, 570, 92, 0x000000, 0).setInteractive();
    c.add([g, img, title, body, hit]);
    c.setScale(0.5).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 300, ease: 'Back.easeOut' });
    const close = () => { if (c.active) this.tweens.add({ targets: c, alpha: 0, y: 150, duration: 300, onComplete: () => c.destroy() }); };
    hit.on('pointerup', close);
    this.time.delayedCall(7000, close);
  }

  private showHint(): void {
    this.clearHint();
    let x = 0, y = 0, msg = '';
    if (this.tutorial === 1) {
      const s = [...this.spots].sort((a, b) => this.paths[0].closest(a.x, a.y).along - this.paths[0].closest(b.x, b.y).along)[1] ?? this.spots[0];
      x = s.x; y = s.y; msg = 'Tap a build plot';
    } else if (this.tutorial === 2) {
      const b = this.callButtons[0];
      if (!b) return;
      x = b.c.x; y = b.c.y; msg = 'Tap to start the first wave';
    } else return;
    const c = this.add.container(x, y).setDepth(DEPTH.hud + 3);
    // arrow drawn pointing down at the origin, then rotated to face the target
    const arrow = this.add.triangle(0, 0, -14, -16, 14, -16, 0, 6, 0xffe26a).setStrokeStyle(3, 0x1a1208);
    let label: Phaser.GameObjects.Text;
    if (this.tutorial === 2) {
      const side = x < W / 2 ? 1 : -1;      // point sideways at the call button
      arrow.setPosition(side * 52, 0).setAngle(side * 90);
      label = txt(this, side * 70, 0, msg, { size: 20, color: '#ffe26a' }).setOrigin(side > 0 ? 0 : 1, 0.5);
      this.tweens.add({ targets: arrow, x: side * 44, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else {
      const below = y < 230;
      arrow.setPosition(0, below ? 60 : -60).setAngle(below ? 180 : 0);
      label = txt(this, 0, below ? 100 : -96, msg, { size: 20, color: '#ffe26a' });
      if (x > W - 150) label.setX(-80);
      if (x < 150) label.setX(80);
      this.tweens.add({ targets: arrow, y: below ? 48 : -48, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    c.add([arrow, label]);
    this.hint = c;
  }

  private clearHint(): void {
    this.hint?.destroy();
    this.hint = null;
  }

  /* ================================================================ */
  /* Pause & end screens                                               */
  /* ================================================================ */

  private pause(): void {
    if (this.overlay || this.ended) return;
    this.paused = true;
    this.tweens.pauseAll();
    this.time.paused = true;
    this.anims.pauseAll();
    const c = this.add.container(0, 0).setDepth(DEPTH.modal);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setInteractive();
    c.add(dim);
    c.add(panel(this, W / 2 - 200, H / 2 - 210, 400, 420));
    c.add(txt(this, W / 2, H / 2 - 165, 'Paused', { size: 40, color: '#ffe26a' }));
    const soundBtn = button(this, W / 2, H / 2 + 80, 280, 60, isMuted() ? 'Sound: Off' : 'Sound: On', () => {
      setMuted(!isMuted());
      soundBtn.label.setText(isMuted() ? 'Sound: Off' : 'Sound: On');
    }, 0x5a5a8a);
    c.add([
      button(this, W / 2, H / 2 - 80, 280, 60, 'Resume', () => this.resume()),
      button(this, W / 2, H / 2, 280, 60, 'Restart', () => this.restart(), 0x8a6a2a),
      soundBtn,
      button(this, W / 2, H / 2 + 160, 280, 60, 'Quit to Map', () => this.goToMap(), 0x8a2a2a),
    ]);
    this.overlay = c;
  }

  private resume(): void {
    this.overlay?.destroy();
    this.overlay = null;
    this.paused = false;
    this.tweens.resumeAll();
    this.time.paused = false;
    this.anims.resumeAll();
  }

  private restart(): void {
    this.tweens.resumeAll();
    this.anims.resumeAll();
    this.anims.globalTimeScale = 1;
    this.time.paused = false;
    this.scene.restart({ level: this.levelIndex });
  }

  private goToMap(): void {
    this.tweens.resumeAll();
    this.anims.resumeAll();
    this.anims.globalTimeScale = 1;
    this.time.paused = false;
    this.scene.start('Menu', { focus: this.levelIndex });
  }

  private endGame(victory: boolean): void {
    if (this.ended) return;
    this.ended = true;
    this.cancelModes();
    this.hideCallButtons();
    this.clearHint();
    this.tweens.timeScale = 1;
    this.time.timeScale = 1;
    this.anims.globalTimeScale = 1;
    const stars = victory ? (this.lives >= 18 ? 3 : this.lives >= 10 ? 2 : 1) : 0;
    if (victory) recordStars(this.levelIndex, stars);
    this.time.delayedCall(victory ? 900 : 600, () => this.showEndScreen(victory, stars));
    if (victory) sfx.victory(); else sfx.defeat();
    if (!victory) {
      this.cylinder.setTint(0x555555);
      this.fx.explosion(this.endPt.x, this.endPt.y - 40, 80, 0x5ad0ff);
    }
  }

  private showEndScreen(victory: boolean, stars: number): void {
    const c = this.add.container(0, 0).setDepth(DEPTH.modal);
    c.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setInteractive());
    c.add(panel(this, W / 2 - 260, H / 2 - 220, 520, 440, victory ? 0x2f4a1f : 0x4a1f1f));
    c.add(txt(this, W / 2, H / 2 - 165, victory ? 'Victory!' : 'The Cylinder has fallen!', { size: victory ? 52 : 36, color: victory ? '#ffe26a' : '#ff8a7a', strokeThickness: 6 }));
    if (victory) {
      for (let i = 0; i < 3; i++) {
        const sx = W / 2 + (i - 1) * 100, sy = H / 2 - 70 - (i === 1 ? 14 : 0);
        c.add(this.add.image(sx, sy, 'icon_star_empty').setScale(1.6));
        if (i < stars) {
          const s = this.add.image(sx, sy, 'icon_star').setScale(0);
          c.add(s);
          this.tweens.add({ targets: s, scale: 1.6, duration: 350, delay: 300 + i * 300, ease: 'Back.easeOut', onStart: () => sfx.coin() });
        }
      }
      c.add(txt(this, W / 2, H / 2 + 20, `Cylinder integrity: ${this.lives}/${this.level.lives}`, { size: 22 }));
      c.add(txt(this, W / 2, H / 2 + 52, stars < 3 ? 'Lose 2 or fewer lives for 3 stars.' : this.lives === this.level.lives ? 'Flawless defense!' : 'Superb defense!', { size: 16, color: '#cccccc', strokeThickness: 3 }));
    } else {
      c.add(txt(this, W / 2, H / 2 - 60, `You held out until wave ${this.waveIdx} of ${this.totalWaves}.`, { size: 22 }));
      c.add(txt(this, W / 2, H / 2 - 10, 'Tip: mix tower types — armor shrugs off arrows,\nshamans resist magic, and bats fly over soldiers.', { size: 16, color: '#dddddd', strokeThickness: 3 }));
    }
    const hasNext = victory && this.levelIndex < LEVELS.length - 1;
    const by = H / 2 + 140;
    if (hasNext) {
      c.add(button(this, W / 2 - 165, by, 150, 60, 'Map', () => this.goToMap(), 0x5a5a8a, 22));
      c.add(button(this, W / 2, by, 150, 60, 'Retry', () => this.restart(), 0x8a6a2a, 22));
      c.add(button(this, W / 2 + 165, by, 150, 60, 'Next', () => this.scene.restart({ level: this.levelIndex + 1 }), 0x4a8a2a, 22));
    } else {
      c.add(button(this, W / 2 - 95, by, 170, 60, 'Map', () => this.goToMap(), 0x5a5a8a, 22));
      c.add(button(this, W / 2 + 95, by, 170, 60, 'Retry', () => this.restart(), victory ? 0x8a6a2a : 0x4a8a2a, 22));
    }
    if (victory && this.levelIndex === LEVELS.length - 1) {
      c.add(txt(this, W / 2, H / 2 + 88, 'You defeated the Warlord! The realm is safe.', { size: 18, color: '#ffe26a', strokeThickness: 3 }));
    }
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 300 });
  }
}
