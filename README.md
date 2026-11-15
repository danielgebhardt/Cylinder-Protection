# Cylinder Protection

A fantasy tower-defense game for Android (and the browser). The Warlord's horde is marching on the ancient
**Cylinder** — build towers along the road, upgrade them, pick specializations, and hold the line.

Built with **TypeScript + Phaser 4 + Vite**, packaged for Android with **Capacitor 8**.
All art and sound are generated in code — there are no image or audio asset files.

## Features

- **5 levels** with different themes (meadow, autumn forest, swamp, snow pass, volcanic gate), one- and two-road maps,
  and a final boss: **Grukk the Warlord**, who summons goblins as he marches.
- **4 tower lines**, each with 3 tiers and then a **choice of 2 specializations**, and each specialization has a
  **signature skill with 3 ranks**:

  | Line | Tiers 1–3 | Specialization A | Specialization B |
  |---|---|---|---|
  | Archer (physical, hits flyers) | Post → Tower → Fort | **Ranger's Lodge** — rapid fire, *Venom Arrows* | **Marksman Spire** — huge range, *Headshot* |
  | Mage (magic, ignores armor) | Mage → Adept → Wizard | **Arcane Spire** — raw power, *Chain Lightning* | **Frost Sanctum** — slows, *Deep Freeze* |
  | Bombard (explosive splash, ground only) | Bombard → Heavy → Siege Works | **Doom Mortar** — giant blasts, *Cluster Bomb* | **Rocket Battery** — 2 homing rockets, hits flyers, *Napalm* |
  | Barracks (soldiers block the road) | Militia → Footmen → Guards | **Knight Hall** — tanky, *Shield Bash* | **Berserker Den** — huge damage, *Cleave* |

- **8 enemy types** that reward mixing towers: armored trolls, magic-resistant healing shamans, physical-immune wraiths,
  bats that fly over soldiers, fast wolves, and more. New enemies get an intro card the first time you meet them.
- **Hero abilities**: *Rain of Fire* (meteor strike) and *Reinforcements* (summon two knights anywhere on the road).
- Move barracks soldiers with a **rally flag**, **call waves early** for bonus gold, 1×/2× speed, pause menu.
- **3-star rating** per level, progress saved on the device, first-level tutorial hints.
- Android: landscape-locked, immersive fullscreen, hardware back button pauses / navigates, auto-pause when backgrounded.

## How to play

1. Tap an empty **build plot** → tap a tower once to see its stats, tap again (✔) to build.
2. Tap the **skull** at the road entrance to start the first wave. Later waves start on a timer — tap the skull early for bonus gold.
3. Tap a tower to **upgrade**, **specialize**, buy **skills**, **sell**, or (barracks) move the **rally flag**.
4. Tap the meteor / swords buttons (bottom-left), then tap the map to use abilities.
5. Tap an enemy to see its armor, magic resistance and a tip on how to beat it.

Don't let enemies reach the Cylinder — lose 2 or fewer lives for 3 stars.

## Development

```bash
npm install
npm run dev          # http://localhost:5173 (also reachable from your phone on the same network)
npm run build        # typecheck + production bundle in dist/
```

Handy URL parameters while developing:

- `?level=2` — jump straight into a level (0-based)
- `?debug` — start with lots of gold

## Android

```bash
npm run cap:sync     # build web bundle and copy it into the Android project
npm run cap:open     # open in Android Studio (then Run ▶)
npm run android      # build, sync and run on a connected device/emulator
```

Every push to `main` also builds a **debug APK** in GitHub Actions
(*Actions → Android APK → latest run → Artifacts*), which you can install directly on a phone.

App icon and splash sources live in `assets/`; regenerate the Android resources with
`npx capacitor-assets generate --android`.

## Project layout

```
src/
  main.ts              Phaser game config + Capacitor back-button / lifecycle hooks
  config.ts            screen size, depth layers, HUD zones
  audio.ts             synthesized WebAudio sound effects
  save.ts              localStorage progress (stars, seen enemies, mute)
  art/textures.ts      every sprite, drawn procedurally at boot
  data/
    enemies.ts         enemy stats & tips
    towers.ts          tower tree, specializations and skills
    levels.ts          maps (road control points), waves, themes, economy
  game/
    PathLine.ts        smooth roads, build-plot generation
    Enemy.ts Tower.ts Soldier.ts Projectile.ts Effects.ts
  scenes/
    BootScene.ts       generates textures
    MenuScene.ts       world map + level briefings
    GameScene.ts       gameplay, waves, economy, HUD, abilities, win/lose
  ui/                  radial build menu, buttons, panels
```

### Tuning

All balance lives in `src/data/`. Each level has `startGold`, `hpMult` (enemy HP scale) and `pace`
(spawn spacing). Waves are lists of `[enemy, count, gap, delay, path]` groups.
