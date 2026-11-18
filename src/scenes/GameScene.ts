import * as Phaser from 'phaser';
import { W, H, DEPTH, HUD_ZONES, setupCamera } from '../config';
import { paintMap, MOONWELL_TEX } from '../art/world';
import { LEVELS } from '../data/levels';
import type { LevelDef } from '../data/levels';
import { ENEMIES } from '../data/enemies';
import type { DamageType } from '../data/enemies';
import { TOWERS, BASE_CRYSTALS, ELEMENT_COLOR, ELEMENT_NAME, CYLINDER_FIELD, CYLINDER_CAPACITY, PYLON, FUSE_RANGE, ATTUNE_MAX, ATTUNE_DMG, fusionOf } from '../data/towers';
import type { TowerSpec, Element } from '../data/towers';
import { PathLine, generateSpots, minPathDist, callButtonPos } from '../game/PathLine';
import { Enemy } from '../game/Enemy';
import { Tower, Pylon, CylinderNode } from '../game/Tower';
import { Network } from '../game/Network';
import type { Projectile } from '../game/Projectile';
import { Effects } from '../game/Effects';
import { RadialMenu } from '../ui/RadialMenu';
import type { RadialOption } from '../ui/RadialMenu';
import { button, panel } from '../ui/widgets';
import { dist, rand, rectsContain, seeded, txt } from '../util';
import type { Pt } from '../util';
import { sfx, isMuted, setMuted, unlockAudio } from '../audio';
import { load, save, recordStars } from '../save';

const ORDINAL = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth'];
const NUMBER_WORD = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen'];

/** Leaf outline centred on the origin; rot is the leaf's tilt in degrees (0 = upright). */
function leafPoints(rot: number, len: number, wid: number): Phaser.Math.Vector2[] {
  const r = Phaser.Math.DegToRad(rot - 90), ca = Math.cos(r), sa = Math.sin(r);
  const pts: Phaser.Math.Vector2[] = [];
  const add = (along: number, across: number) => pts.push(new Phaser.Math.Vector2(ca * along - sa * across, sa * along + ca * across));
  for (let i = 0; i <= 16; i++) { const t = i / 16; add(-len / 2 + len * t, (wid / 2) * Math.pow(Math.sin(Math.PI * t), 0.8)); }
  for (let i = 15; i > 0; i--) { const t = i / 16; add(-len / 2 + len * t, -(wid / 2) * Math.pow(Math.sin(Math.PI * t), 0.8)); }
  return pts;
}

const WAVE_GAP = 22;          // seconds between waves (after the previous wave has fully spawned)
const SURGE_CD = 40;
const SURGE_TIME = 6;
const NOVA_CD = 55;
const NOVA_RADIUS = 240;
const MIN_GAP = 54;           // minimum distance between structures
const ROAD_CLEAR = 46;        // minimum distance from a structure to the road centre

interface QueuedSpawn { t: number; key: string; path: number }
interface Fire { x: number; y: number; r: number; dps: number; t: number; gfx: Phaser.GameObjects.Image; sparkT: number }
interface CallButton { c: Phaser.GameObjects.Container; ring: Phaser.GameObjects.Graphics; path: number }
type Structure = Tower | Pylon;

export class GameScene extends Phaser.Scene {
  levelIndex = 0;
  level!: LevelDef;
  paths: PathLine[] = [];
  towers: Tower[] = [];
  pylons: Pylon[] = [];
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  fires: Fire[] = [];
  network!: Network;
  fx!: Effects;

  energy = 0;
  lives = 0;
  private waveIdx = 0;
  private queue: QueuedSpawn[] = [];
  private clock = 0;
  private nextWaveTimer = -1;
  private speed = 1;
  private paused = false;
  private ended = false;
  private endPt: Pt = { x: 0, y: 0 };
  private decor: Phaser.GameObjects.Image[] = [];

  private menu: RadialMenu | null = null;
  private menuAt: Pt | null = null;
  private selectedEnemy: Enemy | null = null;
  private surgeCd = 0;
  private surgeT = 0;
  private novaCd = 0;
  private tutorial = 0;
  private tips = new Set<string>();

  // HUD
  private rangeGfx!: Phaser.GameObjects.Graphics;
  private ghost!: Phaser.GameObjects.Container;
  private energyText!: Phaser.GameObjects.Text;
  private abilityGfx!: Phaser.GameObjects.Graphics;
  private surgeBtn!: Phaser.GameObjects.Container;
  private novaBtn!: Phaser.GameObjects.Container;
  private callButtons: CallButton[] = [];
  private info!: Phaser.GameObjects.Container;
  private infoBg!: Phaser.GameObjects.Graphics;
  private infoTitle!: Phaser.GameObjects.Text;
  private infoBody!: Phaser.GameObjects.Text;
  private overlay: Phaser.GameObjects.Container | null = null;
  private cylinder!: Phaser.GameObjects.Image;
  private hint: Phaser.GameObjects.Container | null = null;
  private shown = { lives: -1, energy: -1, wave: -1 };

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
    this.towers = []; this.pylons = []; this.enemies = []; this.projectiles = []; this.fires = []; this.decor = [];
    this.queue = []; this.callButtons = [];
    this.energy = this.level.startEnergy;
    this.lives = this.level.lives;
    this.waveIdx = 0; this.clock = 0; this.nextWaveTimer = -1;
    this.speed = 1; this.paused = false; this.ended = false;
    this.menu = null; this.menuAt = null; this.selectedEnemy = null;
    this.surgeCd = 0; this.surgeT = 0; this.novaCd = 0; this.overlay = null; this.hint = null;
    this.tips = new Set();
    this.shown = { lives: -1, energy: -1, wave: -1 };
    this.tweens.timeScale = 1;
    this.time.timeScale = 1;
    this.fx = new Effects(this);

    const last = this.paths[0].pts[this.paths[0].pts.length - 1];
    this.endPt = { x: last.x, y: last.y };

    this.drawMap();
    this.placeDecor();
    this.placeCylinder();
    this.addAmbience();
    this.network = new Network(this, new CylinderNode(this.endPt.x, this.endPt.y, CYLINDER_FIELD, CYLINDER_CAPACITY));
    this.network.onCut = (at) => {
      this.fx.linkCut(at.x, at.y);
      sfx.zap();
      this.tip('cut', 'Moonbeam snipped!', 'Shadow Moths, Blight Wisps and the Hollow King cut moonbeams they pass. Keep beams away from the road, or add a second Moth Lantern as backup.');
    };

    this.rangeGfx = this.add.graphics().setDepth(DEPTH.range);
    this.ghost = this.add.container(0, 0).setDepth(DEPTH.range + 1).setVisible(false);
    const gg = this.add.graphics();
    gg.fillStyle(0x9feaff, 0.18); gg.fillEllipse(0, 0, 70, 26);
    gg.lineStyle(2, 0xe6fbff, 0.9); gg.strokeEllipse(0, 0, 70, 26);
    this.ghost.add(gg);
    this.buildHud();
    this.showCallButtons(true);

    if (new URLSearchParams(location.search).has('debug')) this.energy = 99999;
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
    this.toast(this.level.name, 2600, 170);
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
      const pad = kind === 'fern' ? 38 : 48;
      if (minPathDist(this.paths, x, y) < pad) continue;
      if (dist(x, y, this.endPt.x, this.endPt.y) < 80) continue;
      if (rectsContain(HUD_ZONES, x, y, 6)) continue;
      if (placed.some(p => dist(p.x, p.y, x, y) < 34)) continue;
      placed.push({ x, y });
      const img = this.add.image(x, y, `decor_${kind}`).setOrigin(0.5, 66 / 72).setScale(0.8 + rng() * 0.4);
      this.decor.push(img);
      if (rng() < 0.5) img.setFlipX(true);
      img.setDepth(DEPTH.world + y);
      // gentle wind sway for plants
      if (kind === 'glowtree' || kind === 'frostpine' || kind === 'fern' || kind === 'reeds' || kind === 'thornbush') {
        this.tweens.add({ targets: img, angle: { from: -1.4, to: 1.4 }, duration: 1600 + rng() * 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: rng() * 1500 });
      }
      if (kind === 'crystal' || kind === 'mushroom' || kind === 'runestone') {
        const g = this.add.image(x, y - 14, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(kind === 'mushroom' ? 0xff6ad8 : 0x6ad0ff).setScale(0.9).setAlpha(0.35).setDepth(img.depth + 1);
        this.tweens.add({ targets: g, alpha: 0.12, scale: 1.1, duration: 1200 + rng() * 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        g.setData('decorY', y);
        this.decor.push(g);
      }
    }
  }

  private lifePetals: Phaser.GameObjects.Image[] = [];
  private livesLabel!: Phaser.GameObjects.Text;

  /** The Moonwell: the thing the Blight wants to snuff out. Lives are petals ringed around it. */
  private placeCylinder(): void {
    const { x, y } = this.endPt;
    const ADD = Phaser.BlendModes.ADD;
    const d = DEPTH.world + y + 12;
    const glow = this.add.image(x, y - 30, 'glow').setBlendMode(ADD).setTint(0xbfe8ff).setScale(3.4, 2.2).setAlpha(0.5).setDepth(d - 1);
    this.tweens.add({ targets: glow, alpha: 0.3, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // a pillar of moonlight rising from the water
    const beam = this.add.image(x, y - 150, 'glow').setBlendMode(ADD).setTint(0xe8f4ff).setScale(0.9, 6).setAlpha(0.32).setDepth(d + 1);
    this.tweens.add({ targets: beam, alpha: 0.18, scaleX: 0.75, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.cylinder = this.add.image(x, y + 10, 'moonwell').setOrigin(0.5, MOONWELL_TEX.oy).setDepth(d);
    this.add.particles(x, y - 20, 'spark', {
      x: { min: -32, max: 32 }, y: { min: -6, max: 6 }, speedY: { min: -46, max: -20 }, speedX: { min: -5, max: 5 },
      lifespan: 2400, scale: { start: 0.9, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xffffff, 0xbfe8ff, 0xff9ae6],
      blendMode: 'ADD', frequency: 110,
    }).setDepth(d + 2);
    // lives: one petal per life, ringed around the well
    this.lifePetals = [];
    const n = this.level.lives;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / n;
      const px = x + Math.cos(a) * 76, py = y - 12 + Math.sin(a) * 30;
      const petal = this.add.image(px, py, 'petal').setRotation(a + Math.PI / 2).setTint(0xff9ae6)
        .setDepth(Math.sin(a) < 0 ? d - 0.5 : d + 0.5);
      this.lifePetals.push(petal);
    }
    this.livesLabel = txt(this, x, y + 44, '', { size: 15, color: '#ffd0f4', strokeThickness: 3 }).setDepth(d + 3);
  }

  private refreshLives(): void {
    this.lifePetals.forEach((p, i) => {
      const on = i < this.lives;
      if (p.getData('on') === on) return;
      p.setData('on', on);
      if (on) { p.setTint(0xff9ae6).setAlpha(1); return; }
      // a petal falls and withers
      const ghost = this.add.image(p.x, p.y, 'petal').setRotation(p.rotation).setTint(0xff9ae6).setDepth(p.depth + 1);
      this.tweens.add({ targets: ghost, y: p.y + 30, angle: ghost.angle + 120, alpha: 0, duration: 900, ease: 'Quad.easeIn', onComplete: () => ghost.destroy() });
      p.setTint(0x2a2440).setAlpha(0.7);
    });
    this.livesLabel.setText(`${this.lives} / ${this.level.lives}`);
  }

  /** Night ambience: moonlight, drifting motes or weather, and a soft vignette. */
  private addAmbience(): void {
    const th = this.level.theme;
    const top = DEPTH.effects + 40;
    const ADD = 'ADD' as const;
    // moonlight from the upper right
    this.add.image(W * 0.9, -40, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xbfd8ff).setScale(14, 9).setAlpha(0.14).setDepth(top - 2);
    // drifting moon motes everywhere
    this.add.particles(0, 0, 'spark', { blendMode: ADD, x: { min: 0, max: W }, y: { min: 60, max: H }, lifespan: 6000, speedX: { min: -6, max: 6 }, speedY: { min: -14, max: -4 },
      scale: { start: 0.5, end: 0.15 }, alpha: { start: 0, end: 0.9, ease: 'Sine.easeInOut' }, tint: [th.glow, 0xffffff], frequency: th.ambient === 'motes' ? 120 : 260 }).setDepth(top);
    if (th.ambient === 'fireflies') {
      this.add.particles(0, 0, 'glow', { blendMode: ADD, x: { min: 0, max: W }, y: { min: 60, max: H }, lifespan: 4000, speedX: { min: -10, max: 10 }, speedY: { min: -12, max: 6 },
        scale: { start: 0.14, end: 0.06 }, alpha: { start: 0, end: 1, ease: 'Sine.easeInOut' }, tint: [0xd8ff6a, 0xfff07a], frequency: 200 }).setDepth(top);
    }
    if (th.ambient === 'mist' || th.ambient === 'fireflies' || th.ambient === 'motes') {
      const n = th.ambient === 'mist' ? 6 : 3;
      for (let i = 0; i < n; i++) {
        const fog = this.add.image(Math.random() * W, 120 + Math.random() * (H - 200), 'smoke').setScale(11, 4).setAlpha(th.ambient === 'mist' ? 0.11 : 0.06).setTint(0xcfe6ff).setDepth(top - 1);
        this.tweens.add({ targets: fog, x: fog.x + 220, duration: 22000 + i * 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
    if (th.ambient === 'snow') {
      this.add.particles(0, 0, 'snowflake', { x: { min: -100, max: W }, y: -10, lifespan: 9000, speedX: { min: 5, max: 30 }, speedY: { min: 40, max: 75 },
        scale: { min: 0.4, max: 1.1 }, alpha: { min: 0.6, max: 1 }, frequency: 45 }).setDepth(top);
    }
    if (th.ambient === 'blight') {
      this.add.particles(0, 0, 'spark', { blendMode: ADD, x: { min: 0, max: W }, y: H + 10, lifespan: 7000, speedX: { min: -12, max: 12 }, speedY: { min: -60, max: -30 },
        scale: { start: 0.7, end: 0.1 }, alpha: { start: 1, end: 0 }, tint: [0xc08cff, 0xff5ab0, 0x7a3aff], frequency: 90 }).setDepth(top);
    }
    this.add.image(0, 0, 'vignette').setOrigin(0).setDisplaySize(W, H).setDepth(top + 5);
  }

  /* ================================================================ */
  /* World API used by entities                                        */
  /* ================================================================ */

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

  /** Splash damage. `color` draws an explosion; `onHit` applies extra effects to each survivor. */
  damageArea(x: number, y: number, r: number, dmg: number, type: DamageType, air: boolean, color?: number, onHit?: (e: Enemy) => void): void {
    if (color !== undefined) { this.fx.explosion(x, y, r, color); sfx.boom(); }
    for (const e of this.enemies) {
      if (!e.alive || (e.flying && !air)) continue;
      if (dist(e.x, e.y, x, y) > r + e.def.radius * 0.5) continue;
      this.damageEnemy(e, dmg, type);
      if (e.alive && onHit) onHit(e);
    }
  }

  private killEnemy(e: Enemy): void {
    if (!e.alive) return;
    const gain = e.def.gold;
    this.energy += gain;
    this.fx.floatText(e.x, e.y - e.hitHeight - 20, `+${gain}`, '#bffaff', e.def.boss ? 26 : 15);
    this.fx.death(e.body, e.x, e.y, e.def.key === 'wraith');
    this.fx.sparks(e.x, e.y - e.hitHeight, 0x9feaff, e.def.boss ? 16 : 4, 20);
    if (e.def.boss) { this.cameras.main.shake(400, 0.01); this.fx.explosion(e.x, e.y, 90); }
    sfx.die();
    if (e === this.selectedEnemy) { this.selectedEnemy = null; this.hideInfo(); }
    e.destroy();
  }

  enemyLeaked(e: Enemy): void {
    if (!e.alive) return;
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

  addFire(x: number, y: number, r: number, dps: number, t: number): void {
    const gfx = this.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xff6a1a).setScale(r / 22, r / 40).setDepth(DEPTH.spots + 2);
    this.fires.push({ x, y, r, dps, t, gfx, sparkT: 0 });
  }

  /* ================================================================ */
  /* Waves                                                             */
  /* ================================================================ */

  private get totalWaves(): number { return this.level.waves.length; }

  private startNextWave(early: boolean): void {
    if (this.waveIdx >= this.totalWaves || this.ended) return;
    if (early && this.nextWaveTimer > 0 && this.waveIdx > 0) {
      const bonus = Math.ceil(this.nextWaveTimer);
      this.energy += bonus;
      const b = this.callButtons[0];
      if (b) this.fx.floatText(b.c.x, b.c.y - 40, `+${bonus} early bonus`, '#9feaff', 16);
      sfx.coin();
      // calling early also shaves time off the Cylinder's cooldowns
      this.surgeCd = Math.max(0, this.surgeCd - bonus * 0.25);
      this.novaCd = Math.max(0, this.novaCd - bonus * 0.25);
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
    this.toast(boss ? 'The Hollow King approaches!' : this.waveIdx === this.totalWaves ? 'The final night!' : `${ORDINAL[this.waveIdx - 1]} Night`, 1600);
    if (this.tutorial === 2) { this.tutorial = 3; this.clearHint(); }
  }



  /** Blight portals mark where the next wave will come from (waves are called from the moon track). */
  private showCallButtons(_first: boolean): void {
    this.hideCallButtons();
    const wave = this.level.waves[this.waveIdx];
    if (!wave) return;
    const usedPaths = [...new Set(wave.map(g => g[4] ?? 0))];
    for (const pi of usedPaths) {
      const { x, y } = callButtonPos(this.paths[pi]);
      const c = this.add.container(x, y).setDepth(DEPTH.hud - 1);
      const halo = this.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xa040ff).setScale(1.3).setAlpha(0.7);
      const swirl = this.add.image(0, 0, 'icon_rift').setScale(0.95);
      const ring = this.add.graphics();
      c.add([halo, swirl, ring]);
      this.tweens.add({ targets: swirl, angle: -360, duration: 5000, repeat: -1 });
      this.tweens.add({ targets: halo, scale: 1.6, alpha: 0.4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
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
      if (this.nextWaveTimer <= 0) this.startNextWave(false);
    }

    this.network.update(dt, this.enemies);
    const rate = this.surgeT > 0 ? 2 : 1;
    for (const t of this.towers) t.update(dt, rate);
    for (const e of this.enemies) e.update(dt);
    for (const p of this.projectiles) p.update(dt);
    this.updateFires(dt);

    this.enemies = this.enemies.filter(e => e.alive);
    this.projectiles = this.projectiles.filter(p => !p.done);

    this.surgeCd = Math.max(0, this.surgeCd - dt);
    this.novaCd = Math.max(0, this.novaCd - dt);
    if (this.surgeT > 0) {
      this.surgeT -= dt;
      if (Math.random() < dt * 20) {
        const t = this.towers[Math.floor(Math.random() * this.towers.length)];
        if (t?.powered) this.fx.sparks(t.x, t.y - 60, 0x9feaff, 2, 16);
      }
    }

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

  private structureAt(x: number, y: number): Structure | null {
    let best: Structure | null = null, bd = Infinity;
    for (const s of [...this.towers, ...this.pylons]) {
      const top = s instanceof Pylon ? 100 : 80;
      if (Math.abs(s.x - x) > 30 || y < s.y - top || y > s.y + 18) continue;
      const d = Math.abs(s.x - x) + Math.abs(s.y - 20 - y) * 0.5;
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  private onPointerDown(p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    unlockAudio();
    if (this.paused || this.ended || over.length > 0) return;
    const x = p.worldX, y = p.worldY;

    // a tap anywhere else just closes an open menu
    if (this.menu) { this.closeMenu(); this.hideInfo(); return; }

    const s = this.structureAt(x, y);
    if (s) { this.openStructureMenu(s); return; }

    let pick: Enemy | null = null, pd = Infinity;
    for (const e of this.enemies) {
      const d = dist(x, y, e.x, e.y - e.hitHeight * 0.7);
      if (d < e.def.radius + 16 && d < pd) { pd = d; pick = e; }
    }
    if (pick) { this.selectedEnemy = pick; this.showEnemyInfo(pick); sfx.click(); return; }
    this.selectedEnemy = null;

    const why = this.cantPlace(x, y, true);
    if (why) {
      if (why !== 'hud') { sfx.error(); this.showInfo(why === 'power' ? 'No moonlight here' : why === 'full' ? 'Not enough moonlight' : 'Can\'t plant here', this.placeReason(why)); this.flashField(); }
      else this.hideInfo();
      return;
    }
    this.openBuildMenu(x, y);
  }

  /** Why a structure can't go at (x, y), or null if it can. */
  cantPlace(x: number, y: number, pylon = false): 'hud' | 'edge' | 'road' | 'crowded' | 'power' | 'full' | null {
    if (rectsContain(HUD_ZONES, x, y, 18)) return 'hud';
    if (x < 34 || x > W - 34 || y < 90 || y > H - 22) return 'edge';
    if (minPathDist(this.paths, x, y) < ROAD_CLEAR) return 'road';
    if (dist(x, y, this.endPt.x, this.endPt.y) < 70) return 'crowded';
    if ([...this.towers, ...this.pylons].some(s => dist(s.x, s.y, x, y) < MIN_GAP)) return 'crowded';
    if (!this.network.inField(x, y)) return 'power';
    if (!pylon && !this.network.hasCapacity(x, y)) return 'full';
    return null;
  }

  private placeReason(why: string): string {
    switch (why) {
      case 'road': return 'Too close to the road.';
      case 'crowded': return 'Too close to another structure.';
      case 'edge': return 'Too close to the edge of the map.';
      case 'full': return `Every light here is at full load (see the pips above it). The Moonwell feeds ${CYLINDER_CAPACITY} blooms and each Moth Lantern ${PYLON.capacity}. Hang a Lantern, or fuse two blooms to free a slot.`;
      default: return 'Plant inside the Moonwell\'s glow. Hang a Moth Lantern at its edge to spread the light.';
    }
  }

  private flashField(): void {
    this.network.showField(true);
    this.time.delayedCall(1200, () => { if (!this.menu) this.network.showField(false); });
  }

  private onBack(): void {
    if (this.ended) { this.goToMap(); return; }
    if (this.overlay) { this.resume(); return; }
    if (this.menu) { this.closeMenu(); this.hideInfo(); return; }
    this.pause();
  }

  private autoPause(): void {
    if (!this.paused && !this.ended) this.pause();
  }

  /* ================================================================ */
  /* Build / fuse / attune menus                                       */
  /* ================================================================ */

  private openBuildMenu(x: number, y: number): void {
    this.closeMenu();
    this.menuAt = { x, y };
    this.ghost.setPosition(x, y).setVisible(true);
    this.network.showField(true);
    const angles: Record<Element, number> = { fire: -135, frost: -45, storm: 135, earth: 45 };
    const full = this.cantPlace(x, y) === 'full';
    const opts: RadialOption[] = BASE_CRYSTALS.map(el => {
      const spec = TOWERS[el];
      return {
        icon: `crystal_${el}`, iconSize: 46, angle: angles[el], price: spec.cost, confirm: true, maxed: full, maxedLabel: 'FULL',
        onSelect: () => {
          if (full) { this.showInfo('Not enough capacity', this.placeReason('full')); return; }
          this.showSpecInfo(spec, spec.cost); this.drawRange(x, y, spec.range, ELEMENT_COLOR[el]);
        },
        action: () => this.build(x, y, el),
      };
    });
    opts.push({
      icon: 'pylon', iconSize: 56, angle: 90, price: PYLON.cost, confirm: true,
      onSelect: () => { this.showInfo(`${PYLON.name}  ·  ${PYLON.cost}`, PYLON.blurb); this.drawRange(x, y, PYLON.field, 0x5ad0ff); },
      action: () => this.buildPylon(x, y),
    });
    this.showInfo('Plant', full ? 'Every light here is at full load: hang a Moth Lantern to feed more blooms.'
      : 'Blooms fight the Blight. Moth Lanterns spread the glow.\nTap a petal to see details, tap again to plant.');
    this.menu = new RadialMenu(this, x, y, opts, () => this.energy);
    if (this.tutorial === 1) this.clearHint();
  }

  private openStructureMenu(s: Structure): void {
    this.closeMenu();
    this.selectedEnemy = null;
    this.menuAt = { x: s.x, y: s.y };
    const opts: RadialOption[] = [];
    opts.push({
      icon: 'icon_sell', iconSize: 34, angle: 90, priceLabel: `+${s.sellValue}`, confirm: true,
      onSelect: () => this.showInfo('Uproot', `Returns ${s.sellValue} moonlight. Tap again to confirm.`),
      action: () => this.sell(s),
    });
    if (s instanceof Pylon) {
      this.showInfo(PYLON.name, `${PYLON.blurb}\n${s.powered ? 'Lit.' : 'DARK: it is outside the glow, or its moonbeam is snipped.'}`);
      this.drawRange(s.x, s.y, PYLON.field, 0x5ad0ff);
      this.network.showField(true);
    } else {
      const t = s;
      const maxed = t.rank >= ATTUNE_MAX;
      opts.push({
        icon: 'icon_up', iconSize: 34, angle: -90, price: maxed ? undefined : t.attunePrice, priceLabel: maxed ? 'MAX' : undefined,
        pips: [t.rank, ATTUNE_MAX], maxed, confirm: true,
        onSelect: () => this.showInfo(`Attune ${t.spec.name}  (rank ${Math.min(ATTUNE_MAX, t.rank + 1)}/${ATTUNE_MAX})`,
          maxed ? 'Fully attuned!' : `+${Math.round(ATTUNE_DMG * 100)}% damage and more range.`),
        action: () => this.attune(t),
      });
      // fusion with neighbouring base crystals
      if (!t.spec.fused) {
        const partners = this.towers.filter(o => o !== t && !o.spec.fused && dist(o.x, o.y, t.x, t.y) <= FUSE_RANGE).slice(0, 4);
        const fuseAngles = [180, 0, -150, -30];
        partners.forEach((o, i) => {
          const result = TOWERS[fusionOf(t.spec.elements[0], o.spec.elements[0])];
          opts.push({
            icon: `crystal_${result.id}`, iconSize: 50, angle: fuseAngles[i], price: result.cost, confirm: true,
            onSelect: () => {
              this.showSpecInfo(result, result.cost, `Fuse with ${ELEMENT_NAME[o.spec.elements[0]]} → `);
              this.drawRange(t.x, t.y, result.range, ELEMENT_COLOR[result.elements[0]]);
              this.rangeGfx.lineStyle(3, 0xffffff, 0.9); this.rangeGfx.strokeEllipse(o.x, o.y, 64, 26);
            },
            action: () => this.fuse(t, o),
          });
        });
      }
      this.showTowerInfo(t);
      this.drawRange(t.x, t.y, t.range, ELEMENT_COLOR[t.spec.elements[0]]);
    }
    this.menu = new RadialMenu(this, s.x, s.y - 34, opts, () => this.energy);
  }

  private closeMenu(): void {
    if (this.menu) { this.menu.destroy(); this.menu = null; }
    this.menuAt = null;
    this.ghost.setVisible(false);
    this.rangeGfx.clear();
    this.network?.showField(false);
  }

  private drawRange(x: number, y: number, r: number, col = 0xffffff): void {
    const g = this.rangeGfx;
    g.clear();
    g.fillStyle(col, 0.08); g.fillEllipse(x, y, r * 2, r * 2 * 0.92);
    g.fillStyle(col, 0.06); g.fillEllipse(x, y, r * 1.6, r * 1.6 * 0.92);
    g.lineStyle(5, col, 0.18); g.strokeEllipse(x, y, r * 2, r * 2 * 0.92);
    g.lineStyle(2, col, 0.75); g.strokeEllipse(x, y, r * 2, r * 2 * 0.92);
  }

  private spend(cost: number): boolean {
    if (this.energy < cost) { sfx.error(); this.energyText.setColor('#ff5a5a'); this.time.delayedCall(300, () => this.energyText.setColor('#bffaff')); return false; }
    this.energy -= cost;
    return true;
  }

  /** Clear decorations from under a new structure. */
  private clearDecor(x: number, y: number): void {
    this.decor = this.decor.filter(d => {
      if (dist(d.x, d.y, x, y) > 40) return true;
      this.tweens.killTweensOf(d);
      this.tweens.add({ targets: d, alpha: 0, scale: d.scale * 0.6, duration: 250, onComplete: () => d.destroy() });
      return false;
    });
  }

  build(x: number, y: number, id: string): void {
    if (this.cantPlace(x, y) || !this.spend(TOWERS[id].cost)) return;
    this.clearDecor(x, y);
    const t = new Tower(this, x, y, id);
    this.towers.push(t);
    this.network.add(t);
    sfx.build();
    this.closeMenu();
    this.hideInfo();
    if (this.tutorial === 1) { this.tutorial = 2; this.time.delayedCall(400, () => this.showHint()); }
    if (!t.spec.fused && this.towers.some(o => o !== t && !o.spec.fused && dist(o.x, o.y, t.x, t.y) <= FUSE_RANGE)) {
      this.tip('fuse', 'Fusion available!', 'Two blooms are side by side. Tap one to FUSE them into a more powerful elemental flower.');
    }
  }

  buildPylon(x: number, y: number): void {
    if (this.cantPlace(x, y, true) || !this.spend(PYLON.cost)) return;
    this.clearDecor(x, y);
    const p = new Pylon(this, x, y);
    this.pylons.push(p);
    this.network.add(p);
    sfx.build();
    this.closeMenu();
    this.hideInfo();
    this.flashField();
  }

  attune(t: Tower): void {
    if (t.rank >= ATTUNE_MAX) return;
    const cost = t.attunePrice;
    if (!this.spend(cost)) return;
    t.spent += cost;
    t.attune();
    sfx.upgrade();
    this.closeMenu();
    this.openStructureMenu(t);
  }

  fuse(a: Tower, b: Tower): void {
    const id = fusionOf(a.spec.elements[0], b.spec.elements[0]);
    if (!this.spend(TOWERS[id].cost)) return;
    // the partner flows into the first crystal
    for (let i = 0; i < 6; i++) {
      const sp = this.add.image(b.x, b.y - 60, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(b.color).setScale(0.4).setDepth(DEPTH.effects);
      this.tweens.add({ targets: sp, x: a.x, y: a.y - 60, scale: 0.15, delay: i * 40, duration: 320, ease: 'Cubic.easeIn', onComplete: () => sp.destroy() });
    }
    a.spent += b.spent + TOWERS[id].cost;
    a.rank = Math.max(a.rank, b.rank);
    this.removeStructure(b, false);
    a.transform(id);
    sfx.upgrade();
    this.closeMenu();
    this.hideInfo();
    this.toast(TOWERS[id].name + '!', 1200, 170);
  }

  private removeStructure(s: Structure, puff = true): void {
    if (puff) this.fx.puff(s.x, s.y, 0xd9c19a, 1.4);
    s.destroy();
    if (s instanceof Pylon) this.pylons = this.pylons.filter(o => o !== s);
    else this.towers = this.towers.filter(o => o !== s);
    this.network.remove(s);
  }

  sell(s: Structure): void {
    this.energy += s.sellValue;
    this.fx.floatText(s.x, s.y - 60, `+${s.sellValue}`, '#9feaff', 18);
    this.removeStructure(s);
    sfx.sell();
    this.closeMenu();
    this.hideInfo();
  }

  /* ================================================================ */
  /* Cylinder powers                                                   */
  /* ================================================================ */

  private useSurge(): void {
    if (this.paused || this.ended) return;
    if (this.surgeCd > 0) { sfx.error(); return; }
    this.surgeCd = SURGE_CD;
    this.surgeT = SURGE_TIME;
    sfx.upgrade();
    this.fx.ring(this.endPt.x, this.endPt.y - 40, 160, 0x9feaff, 600);
    for (const t of this.towers) if (t.powered) this.fx.ring(t.x, t.y, 50, 0x9feaff, 500);
    this.showInfo('Surge!', `Lit blooms strike twice as fast for ${SURGE_TIME} seconds.`);
    this.time.delayedCall(1800, () => { if (!this.menu) this.hideInfo(); });
  }

  private useNova(): void {
    if (this.paused || this.ended) return;
    if (this.novaCd > 0) { sfx.error(); return; }
    this.novaCd = NOVA_CD;
    const { x, y } = this.endPt;
    sfx.meteor();
    this.cameras.main.shake(300, 0.008);
    const flash = this.add.image(x, y - 60, 'flare').setBlendMode(Phaser.BlendModes.ADD).setTint(0x9feaff).setScale(2).setDepth(DEPTH.effects + 3);
    this.tweens.add({ targets: flash, scale: 7, alpha: 0, duration: 450, onComplete: () => flash.destroy() });
    for (let i = 0; i < 3; i++) this.time.delayedCall(i * 90, () => this.fx.ring(x, y, NOVA_RADIUS, 0x9feaff, 550));
    const dmg = 70 * this.level.hpMult;
    for (const e of this.enemies) {
      if (!e.alive || dist(e.x, e.y, x, y) > NOVA_RADIUS) continue;
      this.damageEnemy(e, dmg, 'true');
      if (e.alive) { e.knockback(90); e.applySlow(0.5, 2); }
    }
  }

  /* ================================================================ */
  /* HUD                                                               */
  /* ================================================================ */

  private moons: { img: Phaser.GameObjects.Image; x: number; y: number; base: number }[] = [];
  private moonGfx!: Phaser.GameObjects.Graphics;
  private moonHit!: Phaser.GameObjects.Arc;
  private nightText!: Phaser.GameObjects.Text;
  private nextText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;

  /** Interface A: moon-phase wave track (top centre) and a crescent dock (bottom centre). */
  private buildHud(): void {
    const d = DEPTH.hud;
    // ---- moon-phase wave track
    const n = this.totalWaves;
    const x0 = 432, x1 = 848;
    const track = this.add.graphics().setDepth(d);
    this.moons = [];
    const pts: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      pts.push({ x: x0 + (x1 - x0) * t, y: 30 + 12 * Math.sin(Math.PI * t) });
    }
    track.lineStyle(1.5, 0xcfe6f0, 0.4);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      for (let k = 0; k < 5; k++) { const t0 = k / 5 + 0.05, t1 = t0 + 0.08; track.lineBetween(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0, a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1); }
    }
    const base = n > 10 ? 0.66 : 0.78;
    pts.forEach((p, i) => {
      const k = Math.max(1, Math.round(((i + 1) / n) * 10));
      this.moons.push({ img: this.add.image(p.x, p.y, `moon_${k}`).setScale(base).setDepth(d + 1), x: p.x, y: p.y, base });
    });
    this.moonGfx = this.add.graphics().setDepth(d + 2);
    this.moonHit = this.add.circle(0, 0, 24, 0x000000, 0).setDepth(d + 3).setInteractive({ useHandCursor: true });
    this.moonHit.on('pointerdown', () => unlockAudio());
    this.moonHit.on('pointerup', () => { if (!this.paused && !this.ended) this.startNextWave(true); });
    this.nightText = txt(this, W / 2, 80, '', { size: 16, color: '#e6f6ff', strokeThickness: 4 }).setDepth(d);
    this.nextText = txt(this, W / 2, 100, '', { size: 12, color: '#ff9ae6', strokeThickness: 3, body: true }).setDepth(d);

    // ---- crescent dock
    const dock = this.add.graphics().setDepth(d);
    const curve = new Phaser.Curves.CubicBezier(new Phaser.Math.Vector2(392, 724), new Phaser.Math.Vector2(432, 618), new Phaser.Math.Vector2(848, 618), new Phaser.Math.Vector2(888, 724));
    const arc = curve.getPoints(40);
    dock.fillStyle(0x0e1630, 0.9); dock.fillPoints(arc, true);
    dock.lineStyle(2.5, 0x7af0e0, 0.9); dock.strokePoints(arc, false);
    const inner = new Phaser.Curves.CubicBezier(new Phaser.Math.Vector2(412, 724), new Phaser.Math.Vector2(452, 636), new Phaser.Math.Vector2(828, 636), new Phaser.Math.Vector2(868, 724)).getPoints(60);
    dock.lineStyle(1, 0xcfe6f0, 0.35);
    for (let i = 0; i < inner.length - 1; i += 2) dock.lineBetween(inner[i].x, inner[i].y, inner[i + 1].x, inner[i + 1].y);
    // moonlight (energy)
    this.add.image(W / 2, 666, 'icon_drop').setScale(1.05).setDepth(d + 1);
    this.energyText = txt(this, W / 2, 703, '', { size: 22, color: '#bffaff', strokeThickness: 4 }).setDepth(d + 1);
    // Surge and Nova as leaves
    this.surgeBtn = this.leafButton(548, 676, -35, 0x1f5a6a, 0x7af0e0, 'glyph_bolt', 'SURGE', () => this.useSurge());
    this.novaBtn = this.leafButton(732, 676, 35, 0x3a2a6a, 0xb08aff, 'glyph_nova', 'NOVA', () => this.useNova());
    this.abilityGfx = this.add.graphics().setDepth(d + 2);
    // speed (moth) and pause at the tips
    this.add.image(468, 704, 'glyph_moth').setDepth(d + 1);
    this.speedText = txt(this, 468, 686, '×1', { size: 12, color: '#cfe6f0', strokeThickness: 3 }).setDepth(d + 1);
    const sp = this.add.circle(468, 698, 24, 0x000000, 0).setDepth(d + 3).setInteractive({ useHandCursor: true });
    sp.on('pointerdown', () => unlockAudio());
    sp.on('pointerup', () => {
      sfx.click();
      this.speed = this.speed === 1 ? 2 : 1;
      this.speedText.setText(`×${this.speed}`);
      this.tweens.timeScale = this.speed;
      this.time.timeScale = this.speed;
      this.anims.globalTimeScale = this.speed;
    });
    const pg = this.add.graphics().setDepth(d + 1);
    pg.fillStyle(0xcfe6f0); pg.fillRoundedRect(804, 690, 5, 18, 2); pg.fillRoundedRect(815, 690, 5, 18, 2);
    const ph = this.add.circle(812, 699, 24, 0x000000, 0).setDepth(d + 3).setInteractive({ useHandCursor: true });
    ph.on('pointerdown', () => unlockAudio());
    ph.on('pointerup', () => { sfx.click(); this.pause(); });

    // info bar
    this.info = this.add.container(W / 2, H - 52).setDepth(d + 5).setVisible(false);
    this.infoBg = this.add.graphics();
    this.infoTitle = txt(this, 0, -22, '', { size: 18, color: '#ffd0f4' });
    this.infoBody = txt(this, 0, -6, '', { size: 15, wrap: 600, strokeThickness: 3 }).setOrigin(0.5, 0);
    this.info.add([this.infoBg, this.infoTitle, this.infoBody]);
  }

  /** A leaf-shaped power button for the crescent dock. */
  private leafButton(x: number, y: number, rot: number, fill: number, edge: number, glyph: string, label: string, onUse: () => void): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(DEPTH.hud + 1);
    const glow = this.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(edge).setScale(1.25).setAlpha(0.5);
    const g = this.add.graphics();
    const pts = leafPoints(rot, 76, 50);
    g.fillStyle(fill, 1); g.fillPoints(pts, true);
    g.lineStyle(2.5, edge, 1); g.strokePoints(pts, true);
    g.lineStyle(1, 0xffffff, 0.25);
    const r = Phaser.Math.DegToRad(rot - 90);
    g.lineBetween(Math.cos(r) * -30, Math.sin(r) * -30, Math.cos(r) * 30, Math.sin(r) * 30);
    const img = this.add.image(0, -2, glyph).setScale(0.9);
    const t = txt(this, 0, 40, label, { size: 10, color: Phaser.Display.Color.IntegerToColor(edge).rgba, strokeThickness: 3 });
    const hit = this.add.circle(0, 0, 34, 0x000000, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => unlockAudio());
    hit.on('pointerup', onUse);
    c.add([glow, g, img, t, hit]);
    c.setData('glow', glow);
    return c;
  }

  private refreshHud(): void {
    if (this.shown.lives !== this.lives) { this.shown.lives = this.lives; this.refreshLives(); }
    const en = Math.floor(this.energy);
    if (this.shown.energy !== en) { this.shown.energy = en; this.energyText.setText(String(en)); }
    if (this.shown.wave !== this.waveIdx) { this.shown.wave = this.waveIdx; this.refreshMoons(); }
    this.menu?.refresh();

    // moon track: glow on the current night, countdown on the next
    const g = this.moonGfx;
    g.clear();
    const cur = this.moons[this.waveIdx - 1];
    if (cur) { g.lineStyle(2, 0x7af0e0, 0.9); g.strokeCircle(cur.x, cur.y, 15); }
    const next = this.moons[this.waveIdx];
    if (next && !this.ended) {
      g.lineStyle(2, 0x3a4a6a, 1); g.strokeCircle(next.x, next.y, 15);
      if (this.waveIdx === 0 || this.nextWaveTimer >= 0) {
        const f = this.waveIdx === 0 ? 1 : Math.max(0, this.nextWaveTimer / WAVE_GAP);
        g.lineStyle(3, 0xff6ad8, this.waveIdx === 0 ? 0.6 + Math.sin(this.time.now / 200) * 0.4 : 1);
        g.beginPath(); g.arc(next.x, next.y, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f, false); g.strokePath();
      }
    }

    // power cooldowns
    const a = this.abilityGfx;
    a.clear();
    const items: [Phaser.GameObjects.Container, number, number][] = [[this.surgeBtn, this.surgeCd, SURGE_CD], [this.novaBtn, this.novaCd, NOVA_CD]];
    for (const [btn, cd, max] of items) {
      const glow = btn.getData('glow') as Phaser.GameObjects.Image;
      if (cd > 0) {
        glow.setVisible(false);
        a.fillStyle(0x000000, 0.55);
        a.slice(btn.x, btn.y - 2, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (cd / max), false);
        a.fillPath();
      } else {
        glow.setVisible(true).setAlpha(0.35 + Math.sin(this.time.now / 300) * 0.2);
      }
    }
    if (this.surgeT > 0) { a.lineStyle(4, 0xffffff, 0.9); a.strokeCircle(this.surgeBtn.x, this.surgeBtn.y - 2, 38); }
    if (this.selectedEnemy && this.selectedEnemy.alive && Math.floor(this.time.now / 200) !== Math.floor((this.time.now - 17) / 200)) {
      this.showEnemyInfo(this.selectedEnemy);
    }
  }

  private refreshMoons(): void {
    const n = this.totalWaves;
    this.moons.forEach((m, i) => {
      const done = i < this.waveIdx - 1, cur = i === this.waveIdx - 1;
      m.img.clearTint().setAlpha(1).setScale(m.base * (cur ? 1.25 : 1));
      if (!done && !cur) m.img.setTint(0x6a7a9a).setAlpha(0.8);
    });
    const next = this.moons[this.waveIdx];
    if (next) this.moonHit.setPosition(next.x, next.y).setVisible(true);
    else this.moonHit.setVisible(false).setPosition(-100, -100);
    this.nightText.setText(this.waveIdx === 0 ? 'Tap the moon to begin the first night'
      : `${ORDINAL[this.waveIdx - 1]} Night of ${NUMBER_WORD[n - 1]}`);
    const sum = this.waveIdx < n ? this.level.waves[this.waveIdx].reduce((m, [k, c]) => m.set(k, (m.get(k) ?? 0) + c), new Map<string, number>()) : null;
    this.nextText.setText(sum ? `Next: ${[...sum.entries()].map(([k, c]) => `${c} ${ENEMIES[k].short}`).join(' · ')}` : '');
  }

  private showSpecInfo(spec: TowerSpec, cost: number, prefix = ''): void {
    this.showInfo(`${prefix}${spec.name}  ·  ${cost}`, `${spec.blurb}\n${this.specStats(spec, 0)}`);
  }

  private showTowerInfo(t: Tower): void {
    const power = t.powered ? '' : '\nDARK: this bloom is outside the glow, or its moonbeam is snipped.';
    const fuse = !t.spec.fused && this.towers.some(o => o !== t && !o.spec.fused && dist(o.x, o.y, t.x, t.y) <= FUSE_RANGE)
      ? '\nTap a fusion option to merge with a neighbour.' : '';
    const rank = t.rank ? `  (attuned ${t.rank}/${ATTUNE_MAX})` : '';
    this.showInfo(`${t.spec.name}${rank}`, `${this.specStats(t.spec, t.rank)}${fuse}${power}`);
  }

  private specStats(spec: TowerSpec, rank: number): string {
    const m = 1 + rank * ATTUNE_DMG;
    const d0 = Math.round(spec.dmg[0] * m), d1 = Math.round(spec.dmg[1] * m);
    const speed = spec.rate < 0.5 ? 'Very fast' : spec.rate < 1 ? 'Fast' : spec.rate < 2 ? 'Average' : 'Slow';
    const type = spec.dmgType === 'physical' ? 'physical' : spec.dmgType === 'magic' ? 'magic' : 'fire';
    const extras = [
      spec.attack === 'aura' ? 'hits all around it' : '',
      spec.splash ? 'area' : '',
      spec.chain ? `chains ×${spec.chain}` : '',
      spec.burn ? 'burns' : '',
      spec.slow ? 'slows' : '',
      spec.freeze ? 'freezes' : '',
      spec.stun ? 'stuns' : '',
      spec.pool ? 'lava pools' : '',
      spec.hitsAir ? '' : 'ground only',
    ].filter(Boolean).join(', ');
    return `Dmg ${d0}-${d1} ${type} · Range ${spec.range + rank * 8} · ${speed}${extras ? ` · ${extras}` : ''}`;
  }

  /** One-time contextual tip shown in the info bar. */
  private tip(id: string, title: string, body: string): void {
    if (this.tips.has(id)) return;
    this.tips.add(id);
    const seen = load().seenEnemies;
    if (seen.includes(`tip:${id}`)) return;
    seen.push(`tip:${id}`); save();
    this.time.delayedCall(250, () => {
      if (this.menu || this.ended) return;
      this.showInfo(title, body);
      this.time.delayedCall(6000, () => { if (!this.menu && this.infoTitle.text === title) this.hideInfo(); });
    });
  }

  /** A good first build spot near the road, inside the Cylinder's field. */
  private suggestedSpot(): Pt | null {
    const cands = generateSpots(this.paths, 30, this.endPt, this.level.seed, []);
    const ok = cands.filter(p => !this.cantPlace(p.x, p.y));
    ok.sort((a, b) => this.paths[0].closest(a.x, a.y).along - this.paths[0].closest(b.x, b.y).along);
    return ok[0] ?? null;
  }

  private showHint(): void {
    this.clearHint();
    let x = 0, y = 0, msg = '';
    if (this.tutorial === 1) {
      const s = this.suggestedSpot();
      if (!s) return;
      x = s.x; y = s.y; msg = 'Tap inside the glowing field to build';
      this.network.showField(true);
    } else if (this.tutorial === 2) {
      const m = this.moons[0];
      if (!m) return;
      x = m.x; y = m.y; msg = 'Tap the moon to begin the first night';
    } else return;
    const c = this.add.container(x, y).setDepth(DEPTH.hud + 3);
    // arrow drawn pointing down at the origin, then rotated to face the target
    const arrow = this.add.triangle(0, 0, -14, -16, 14, -16, 0, 6, 0xff9ae6).setStrokeStyle(3, 0x0a0f1a);
    let label: Phaser.GameObjects.Text;
    if (this.tutorial === 2) {
      // point up at the first moon, below the track's own labels
      arrow.setPosition(0, 104).setAngle(180);
      label = txt(this, 0, 140, msg, { size: 20, color: '#ffd0f4' });
      this.tweens.add({ targets: arrow, y: 94, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else {
      const below = y < 230;
      arrow.setPosition(0, below ? 30 : -30).setAngle(below ? 180 : 0);
      label = txt(this, 0, below ? 70 : -66, msg, { size: 20, color: '#ffd0f4' });
      if (x > W - 220) label.setOrigin(1, 0.5).setX(30);
      if (x < 220) label.setOrigin(0, 0.5).setX(-30);
      this.tweens.add({ targets: arrow, y: below ? 18 : -18, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const ring = this.add.ellipse(0, 0, 70, 26).setStrokeStyle(3, 0xff9ae6);
      c.add(ring);
      this.tweens.add({ targets: ring, scale: 1.3, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
    }
    c.add([arrow, label]);
    this.hint = c;
  }

  private clearHint(): void {
    this.hint?.destroy();
    this.hint = null;
  }

  showInfo(title: string, body: string): void {
    this.infoTitle.setText(title);
    this.infoBody.setText(body);
    const w = Math.max(this.infoTitle.width, this.infoBody.width) + 48;
    const top = -44;
    const h = -top - 6 + this.infoBody.height + 12;
    this.infoBg.clear();
    this.infoBg.fillStyle(0x000000, 0.35); this.infoBg.fillRoundedRect(-w / 2 + 3, top + 4, w, h, 12);
    this.infoBg.fillStyle(0x141c34, 0.94); this.infoBg.fillRoundedRect(-w / 2, top, w, h, 12);
    this.infoBg.lineStyle(2, 0xff9ae6, 0.8); this.infoBg.strokeRoundedRect(-w / 2, top, w, h, 12);
    // keep the info bar away from the open menu / selected enemy
    const focusY = this.menuAt?.y ?? this.selectedEnemy?.y ?? 0;
    // keep clear of the Moonwell too when it sits low and central
    const wellLow = this.endPt.y > H - 260 && Math.abs(this.endPt.x - W / 2) < 380;
    const atTop = focusY > H - 260 || (focusY === 0 && wellLow);
    this.info.setPosition(W / 2, atTop ? (this.introCard?.active ? 252 : 122) - top : H - 112 - (h + top));
    this.info.setVisible(true);
  }

  hideInfo(): void {
    this.info.setVisible(false);
  }

  private showEnemyInfo(e: Enemy): void {
    const lvl = (v: number) => (v <= 0 ? 'None' : v < 0.35 ? 'Low' : v < 0.6 ? 'Medium' : v < 0.8 ? 'High' : 'Very high');
    const spd = e.def.speed > 80 ? 'Very fast' : e.def.speed > 55 ? 'Fast' : e.def.speed > 35 ? 'Normal' : 'Slow';
    this.showInfo(e.def.name,
      `HP ${Math.ceil(e.hp)}/${e.maxHp} · Armor ${lvl(e.def.armor)} · Magic res. ${lvl(e.def.mr)} · ${spd} · Lives ${e.def.lives}\n${e.def.tip}`);
  }

  toast(msg: string, ms = 1500, y = 120): void {
    const t = txt(this, W / 2, y, msg, { size: 38, color: '#e6f6ff', strokeThickness: 6 }).setDepth(DEPTH.hud + 10).setAlpha(0).setScale(0.6);
    this.tweens.add({ targets: t, alpha: 1, scale: 1, duration: 250, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, y: y - 20, delay: ms, duration: 400, onComplete: () => t.destroy() });
  }

  private introCard: Phaser.GameObjects.Container | null = null;

  private introduceEnemy(key: string): void {
    const def = ENEMIES[key];
    if (this.introCard?.active) this.introCard.destroy();
    const c = this.add.container(W / 2, 182).setDepth(DEPTH.hud + 8);
    this.introCard = c;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35); g.fillRoundedRect(-283, -42, 570, 92, 14);
    g.fillStyle(0x141c34, 0.96); g.fillRoundedRect(-285, -46, 570, 92, 14);
    g.lineStyle(3, 0xb08aff); g.strokeRoundedRect(-285, -46, 570, 92, 14);
    const img = this.add.image(-238, 6, `enemy_${key}_0`);
    img.setScale(Math.min(1.5, 80 / Math.max(img.width, img.height)));
    const title = txt(this, -190, -22, `THE BLIGHT: ${def.name}`, { size: 19, color: '#d8c0ff' }).setOrigin(0, 0.5);
    const body = txt(this, -190, 2, def.tip, { size: 15, wrap: 460, strokeThickness: 3, align: 'left' }).setOrigin(0, 0);
    const hit = this.add.rectangle(0, 0, 570, 92, 0x000000, 0).setInteractive();
    c.add([g, img, title, body, hit]);
    c.setScale(0.5).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 300, ease: 'Back.easeOut' });
    const close = () => { if (c.active) this.tweens.add({ targets: c, alpha: 0, y: 150, duration: 300, onComplete: () => c.destroy() }); };
    hit.on('pointerup', close);
    this.time.delayedCall(7000, close);
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
    c.add(txt(this, W / 2, H / 2 - 165, 'Paused', { size: 40, color: '#e6f6ff' }));
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
    this.closeMenu();
    this.hideInfo();
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
    c.add(panel(this, W / 2 - 260, H / 2 - 220, 520, 440, victory ? 0x1a2a4a : 0x2a1a3a));
    c.add(txt(this, W / 2, H / 2 - 165, victory ? 'Dawn breaks!' : 'The Moonwell has gone dark', { size: victory ? 48 : 34, color: victory ? '#ffe9a8' : '#ff9ae6', strokeThickness: 6 }));
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
      c.add(txt(this, W / 2, H / 2 + 20, `Petals remaining: ${this.lives}/${this.level.lives}`, { size: 22 }));
      c.add(txt(this, W / 2, H / 2 + 52, stars < 3 ? 'Lose 2 or fewer petals for 3 stars.' : this.lives === this.level.lives ? 'Flawless defense!' : 'Superb defense!', { size: 16, color: '#cccccc', strokeThickness: 3 }));
    } else {
      c.add(txt(this, W / 2, H / 2 - 60, `You held out until night ${this.waveIdx} of ${this.totalWaves}.`, { size: 22 }));
      c.add(txt(this, W / 2, H / 2 - 10, 'Tip: mix elements (bark armor shrugs off stones, witches resist magic)\nand keep moonbeams away from moths and wisps.', { size: 16, color: '#dddddd', strokeThickness: 3 }));
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
      c.add(txt(this, W / 2, H / 2 + 88, 'The Hollow King is no more. The glade is safe.', { size: 18, color: '#ffe26a', strokeThickness: 3 }));
    }
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 300 });
  }
}
