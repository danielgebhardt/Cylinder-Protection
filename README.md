# Cylinder Protection

A fantasy tower-defense game for Android (and the browser), set in **Moonwell Glade**: a moonlit fey
realm where the Blight creeps along the old moon-roads to snuff out the **Moonwell**, the shining
stone cylinder at the end of every road. Plant elemental blooms, spread the Moonwell's glow, and
hold the line until dawn.

Built with **TypeScript + Phaser 4 + Vite**, packaged for Android with **Capacitor 8**.
All art and sound are generated in code — there are no image or audio asset files. Sprites are painted
with Canvas2D (gradients, outlines, highlights) at the device's real pixel density, so they stay sharp on
high-resolution phone screens, and every creature has walk and attack animations. The display font
(Cinzel, OFL) is bundled so the app works offline.

## How it plays

**The Moonwell's glow.** The Moonwell lights the ground around it, and you can plant anywhere in that
glow except on the road. **Moth Lanterns** relay the light outward and extend the glow. Every bloom
is linked back to the Moonwell by a shining **moonbeam**, and each light can only feed so many blooms
(the Moonwell 5, each Lantern 3; the pips above it show its load). **Shadow Moths, Blight Wisps and
the Hollow King snip moonbeams** they pass through, and blooms that lose their light droop and go
dark until the beam recovers or reroutes. Defeated Blight leaves **moonlight**, the only currency.

**Elemental blooms and fusion.** Four blooms:

| Bloom | Attack |
|---|---|
| Ember Bloom | arcing fireballs, splash + burn |
| Frost Lily | ice shards that slow |
| Storm Orchid | rapid lightning that chains, great vs flyers |
| Stone Thistle | heavy stones, splash, ground only |

Tap a bloom next to another to **fuse** them into one stronger flower. Fusing also frees a slot.

| | Ember | Frost | Storm | Stone |
|---|---|---|---|---|
| **Ember** | Wildfire Rose | Mist Lotus | Starfire Orchid | Cinder Thorn |
| **Frost** | | Winter Lily | Sleet Orchid | Frostroot |
| **Storm** | | | Thunder Orchid | Quakeroot |
| **Stone** | | | | Ironthistle |

Any bloom (fused or not) can be **attuned** three times for more damage and range.

**The Blight:** Thornlings, Shade Hounds, Bramble Knights, Shadow Moths, Blight Witches (heal their
kin), Mossback Trolls, Blight Wisps, and the **Hollow King**, who summons Thornlings as he marches.

**Moonwell powers.** *Surge* makes lit blooms strike twice as fast for a few seconds; *Nova* blasts
the Blight near the Moonwell and knocks it back.

**Levels:** Glimmerwood, Lantern Fen, Mirrormere (two roads), Frosted Hollow and the Hollow King's
Court, each with its own night weather.

## Screen layout

- **Top centre:** the moon-phase track, one moon per night, waxing toward the full moon. The ringed
  moon is tonight; the next moon carries the countdown. **Tap the next moon** to call it early for
  bonus moonlight. Below it, which Blight is coming next.
- **Around the Moonwell:** one glowing petal per life. Petals fall when the Blight gets through.
- **Bottom centre:** the crescent dock with moonlight, Surge, Nova, speed (the moth) and pause.
- **Planting:** tap glowing ground and a petal bloom opens with the four blooms and a Moth Lantern.
  Tap a petal once for details, again to plant. Tap a bloom to attune, fuse or uproot it.
- Tap any creature to see its armor, magic resistance and how to beat it.

Lose 2 or fewer petals for 3 stars. On Android it's landscape-locked and fullscreen, the back
button pauses, and it auto-pauses in the background.

## Development

```bash
npm install
npm run dev          # http://localhost:5173 (also reachable from your phone on the same network)
npm run build        # typecheck + production bundle in dist/
```

Handy URL parameters while developing:

- `?level=2` — jump straight into a level (0-based)
- `?debug` — start with lots of moonlight
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
    enemies.ts         Blight creature stats & tips
    towers.ts          blooms, fusion table, attunement, network constants
    levels.ts          maps (road control points), waves, themes, economy
  game/
    Network.ts         the glow, moonbeams, capacity, snipping
    Tower.ts           bloom towers, Moth Lanterns, the Moonwell node
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
