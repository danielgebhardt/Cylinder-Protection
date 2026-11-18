# Cylinder Protection — project notes for Claude

Fantasy tower-defense game for Android (and browser) by the repo owner. **TypeScript + Phaser 4.2 +
Vite 8 + Capacitor 8**, TypeScript 7. The owner tests on an Android phone via the release APK
link and gives design direction; Claude makes the decisions within that direction.

## Current state (Nov 2026)

- Theme: **Moonwell Glade**, a moonlit fey realm. The thing you protect is the **Moonwell** (a stone
  well/cylinder; the game keeps the title "Cylinder Protection"). Enemies are **the Blight**.
- Interface: **option A** from the theme mockups (moon-phase track top-centre, crescent dock
  bottom-centre, lives as petals around the Moonwell, petal-bloom build menu, Cinzel lettering).
- Mockup board (themes + interface variants) the owner chose from:
  https://claude.ai/artifact/XBoZjeztLGTeWMYBACHjPx (design canvas; slug `f4744b38-a7fa-47ed-b987-f6600e8e7feb`).
- The owner explicitly wants the game to **not mirror Kingdom Rush** (mechanics, HUD layout, look).
  Avoid KR conventions: stats bar top-left, round corner buttons, ring of circular build buttons,
  barracks/soldiers/rally flags, meteor + reinforcement spells, skull wave button, gold.
- Owner preference: **don't do two major changes at once** (e.g. mechanics and theme separately).

## Gameplay (code names in parentheses — internal names predate the theme)

- **Glow / energy network** (`game/Network.ts`): the Moonwell (`CylinderNode`, field 150, capacity 5)
  lights the ground; you build anywhere in a powered field except near the road. **Moth Lanterns**
  (`Pylon`, cost 40, field 160, capacity 3) relay light. Each **bloom** (`Tower`) draws power through a
  **moonbeam** (conduit) from a lit source with a free slot; lanterns never use a slot. Enemies with
  `severs` (Shadow Moth/bat, Blight Wisp/wraith, Hollow King/warlord) cut beams they touch for 3 s;
  nodes reroute or go dark. Capacity pips are drawn above sources.
- **Currency**: moonlight (`energy` in code; enemy `gold` field = reward).
- **Blooms** (`data/towers.ts`): 4 base elements fire/frost/storm/earth = Ember Bloom, Frost Lily,
  Storm Orchid, Stone Thistle. Fusing two neighbouring base blooms (`fusionOf`, `FUSE_RANGE` 105,
  fee 90) makes one of 10 fused towers (greater forms + 6 hybrids, e.g. Mist Lotus = steam aura,
  Quakeroot = tremor aura). Any bloom can be **attuned** 3× (+35% dmg, +8 range).
- **Powers**: Surge (2× fire rate 6 s, cd 40) and Nova (blast + knockback around the Moonwell, cd 55).
- **Waves**: `[enemy, count, gap, delay, path]` groups per level in `data/levels.ts`; level `hpMult`
  and `pace` (spawn spacing). Bosses scale half as steeply with `hpMult`. Next wave auto-starts 22 s
  after the previous finishes spawning; tapping the next moon calls it early for bonus moonlight.
- 3 stars = lose ≤2 of 20 lives (petals). Progress in localStorage (`save.ts`).

## Architecture

```
src/main.ts            Phaser config (canvas = 1280x720 * RES), Capacitor back button / pause hooks, Cinzel import
src/config.ts          W/H 1280x720, RES (render scale), DEPTH layers, HUD_ZONES (no-build areas), fonts, setupCamera()
src/art/draw.ts        Canvas2D toolkit; tex() paints at RES and registers logical size (setLogicalSize)
src/art/{fx,towers,units,world}.ts   all procedural art (no image assets); textures.ts = generateAll()
src/data/{enemies,towers,levels}.ts  all tuning and names
src/game/              Enemy, Tower (+ Pylon, CylinderNode), Network, Projectile, Effects, PathLine
src/scenes/            BootScene (waits for fonts, generates textures), MenuScene (world map, briefings), GameScene
src/ui/                RadialMenu (petal bloom menu), widgets (panel, button, iconButton)
tools/                 Playwright playtest scripts (see Testing)
android/               Capacitor project (committed); sideload.keystore committed on purpose
```

GameScene owns the world API used by entities (`damageEnemy`, `damageArea`, `pickTarget`,
`spawnEnemy`, `addFire`, `healArea`, `enemyLeaked`, `fx`), the HUD (moon track, dock, info bar,
tips, tutorial), menus (`openBuildMenu`, `openStructureMenu`, `build`, `buildPylon`, `fuse`,
`attune`, `sell`, `cantPlace`) and pause/end screens.

## Gotchas (each cost real debugging time)

- **Hi-res rendering**: canvas is `W*RES x H*RES`, every scene calls `setupCamera(this)` (zoom RES).
  Textures must be made with `tex()` from `art/draw.ts` so Phaser treats them at logical size;
  texts get `resolution: RES` via `txt()`. `?res=2` forces the scale.
- **Phaser 4 shader bug** (patched in `vite.config.ts`): texture selection used exact float equality
  on an interpolated varying, making parts of rotated sprites transparent (and risky on mobile GPUs).
  The Vite plugin rewrites it to a tolerant compare; `optimizeDeps.exclude: ['phaser']` is required
  so the patch also applies in dev. Keep it when upgrading Phaser (it warns if patterns vanish).
- Fonts: Cinzel is bundled via `@fontsource/cinzel`; BootScene waits for it before creating text.
  `txt()` uses Cinzel by default and the plain body font for wrapped text (`wrap` / `body: true`).
- Tower pop-in must use stored base scale (repeated upgrades used to compound to invisible).
- `HUD_ZONES` must match the HUD; level roads/Moonwell must not sit under the moon track (top
  centre, y < 100) or the dock (bottom centre, y > 625, x 390–890).
- Severing enemy test, AI sim and placement all use `cantPlace(x, y, pylon?)`; reasons:
  hud | edge | road | crowded | power | full.

## Testing (cloud sessions have Chromium + Playwright preinstalled)

```bash
npm run dev -- --port 5173            # leave running in the background
npx tsc --noEmit                      # typecheck (also part of npm run build)
node tools/shot.cjs 'http://localhost:5173/?level=0&debug' /tmp/x.png 3000
node tools/battle-shot.cjs 3 /tmp/battle.png 6        # scripted battle; 4th arg 2 = phone density
node tools/texture-sheet.cjs /tmp/sheet.png '^enemy_' 1.3
node tools/sim.cjs 0,1,2,3,4 balanced                  # balance check (~1.5 min per level)
```

URL params: `?level=N` (0-based) jumps into a level, `?debug` gives 99999 moonlight, `?res=2`.
`window.__scene` exposes the GameScene for scripting. Swiftshader prints harmless "GPU stall due to
ReadPixels" warnings; headless boot is slow (wait 3–5 s before screenshots).

**Balance reference** (`tools/sim.cjs ... balanced`, lives left of 20): Glimmerwood 20, Lantern Fen 20,
Mirrormere 20, Frosted Hollow 20, Hollow King's Court 17. The AI is deterministic and all-or-nothing
(a wave either collapses the moonbeam network or not), so small tuning changes can swing results;
`nofuse` must do worse than `balanced` (fusion has to be worth it). Real players are likely weaker
than this AI on first play.

## Release / Android

- Every push to `main` runs `.github/workflows/android.yml`: builds the web bundle, `cap sync`,
  `assembleDebug` signed with `android/app/sideload.keystore` (so updates install over old versions
  and keep saves), then replaces the APK on the rolling `latest` pre-release:
  **https://github.com/danielgebhardt/Cylinder-Protection/releases/download/latest/cylinder-protection.apk**
  (same pattern as the owner's `the-wardens-flame` repo).
- If the build fails with Maven Central HTTP 429 it's transient: `gh run rerun <id> --failed`.
- The Android SDK can't be downloaded in the cloud container (dl.google.com blocked); rely on CI.
- Verify a release: download the link, `unzip -p app.apk 'assets/public/assets/index-*.js' | grep -c "<new string>"`.
- Commits end with the Co-Authored-By / Claude-Session lines from the session's system reminder.

## Ideas not yet done (owner hasn't prioritised)

- Low-detail toggle (weather/particles) if late waves stutter on the phone.
- Between-level upgrades bought with stars; more levels; music.
- Gradle caching in CI to avoid Maven rate limits.
