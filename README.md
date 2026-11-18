# Cylinder Protection

A fantasy tower-defense game for Android (and the browser). The Warlord's horde is marching on the ancient
**Cylinder** — build towers along the road, upgrade them, pick specializations, and hold the line.

Built with **TypeScript + Phaser 4 + Vite**, packaged for Android with **Capacitor 8**.
All art and sound are generated in code — there are no image or audio asset files. Sprites are painted
with Canvas2D (gradients, outlines, highlights) at the device's real pixel density, so they stay sharp on
high-resolution phone screens, and every unit has walk and attack animations.

## How it plays

**The energy network.** The Cylinder projects an energy field, and you can build anywhere inside it
except on the road. **Conduit Pylons** relay power outward and extend the field. Every structure is
linked back to the Cylinder by a glowing conduit, and each source can power a limited number of crystals
(the Cylinder 5, each Pylon 3; the pips above a source show its load). **Bats, wraiths and the Warlord
sever conduits they pass through**, and crystals that lose power go dark until the link recovers or
reroutes through another source. Kills give **energy**, the only currency.

**Elemental crystals and fusion.** Four crystals:

| Crystal | Attack |
|---|---|
| Fire | arcing fireballs, splash + burn |
| Frost | ice shards that slow |
| Storm | rapid lightning that chains, great vs flyers |
| Earth | heavy boulders, splash, ground only |

Tap a crystal next to another to **fuse** them into one stronger tower. Fusing also frees a power slot.

| | Fire | Frost | Storm | Earth |
|---|---|---|---|---|
| **Fire** | Inferno | Steam Vent | Plasma Spire | Magma Forge |
| **Frost** | | Permafrost | Blizzard Eye | Glacier Spire |
| **Storm** | | | Tempest | Tremor Core |
| **Earth** | | | | Monolith |

Any crystal (fused or not) can be **attuned** three times for more damage and range.

**Cylinder powers.** *Surge* makes powered crystals fire twice as fast for a few seconds; *Nova* blasts
enemies near the Cylinder and knocks them back.

**Also:** 5 levels (meadow, autumn forest, swamp, snow pass, volcanic gate) with one- and two-road
maps and a boss, 8 enemy types, call waves early through the rift for bonus energy, 1×/2× speed,
3-star ratings, saved progress and a first-level tutorial. On Android it's landscape-locked and
fullscreen, the back button pauses, and it auto-pauses in the background.

## Controls

1. Tap glowing ground to open the build ring: four crystals and a Pylon. Tap once for details, again to build.
2. Tap the **rift** at a road entrance to start the first wave.
3. Tap a crystal to attune, fuse with a neighbour, or dismantle it.
4. Tap an enemy to see its armor, magic resistance and how to beat it.

Don't let enemies reach the Cylinder: lose 2 or fewer lives for 3 stars.

## Development

```bash
npm install
npm run dev          # http://localhost:5173 (also reachable from your phone on the same network)
npm run build        # typecheck + production bundle in dist/
```

Handy URL parameters while developing:

- `?level=2` — jump straight into a level (0-based)
- `?debug` — start with lots of energy
- `?res=2` — force the render scale (normally picked from the screen's pixel density)

## Android

```bash
npm run cap:sync     # build web bundle and copy it into the Android project
npm run cap:open     # open in Android Studio (then Run ▶)
npm run android      # build, sync and run on a connected device/emulator
```

**Install on a phone:** open this link on Android, then open the downloaded file and allow installs from
your browser when asked — no GitHub sign-in needed:
<https://github.com/danielgebhardt/Cylinder-Protection/releases/download/latest/cylinder-protection.apk>

The **Android app** workflow rebuilds that APK on every push to `main` (and keeps it as the
`cylinder-protection-apk` artifact). Every build is signed with the committed sideload key
(`android/app/sideload.keystore`), so a new APK installs over the old one and keeps your progress.
That key is only for sideloading, never for a Play Store release.

App icon and splash sources live in `assets/`; regenerate the Android resources with
`npx capacitor-assets generate --android`.

## Project layout

```
src/
  main.ts              Phaser game config + Capacitor back-button / lifecycle hooks
  config.ts            screen size, depth layers, HUD zones
  audio.ts             synthesized WebAudio sound effects
  save.ts              localStorage progress (stars, seen enemies, mute)
  art/                 every sprite, painted procedurally at boot
    draw.ts            Canvas2D toolkit + hi-res texture registration
    towers.ts units.ts world.ts fx.ts
  data/
    enemies.ts         enemy stats & tips
    towers.ts          crystals, fusion table, attunement, network constants
    levels.ts          maps (road control points), waves, themes, economy
  game/
    Network.ts         energy field, conduits, capacity, severing
    Tower.ts           crystal towers, pylons, the Cylinder node
    PathLine.ts Enemy.ts Projectile.ts Effects.ts
  scenes/
    BootScene.ts       generates textures
    MenuScene.ts       world map + level briefings
    GameScene.ts       gameplay, waves, economy, HUD, abilities, win/lose
  ui/                  radial build menu, buttons, panels
```

### Tuning

All balance lives in `src/data/`. Each level has `startEnergy`, `hpMult` (enemy HP scale) and `pace`
(spawn spacing). Waves are lists of `[enemy, count, gap, delay, path]` groups.
