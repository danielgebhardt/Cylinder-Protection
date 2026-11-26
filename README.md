# Cylinder Protection

> Source of truth: the home lab's Forgejo. This GitHub repo is a read-only copy, updated within minutes; don't push or open PRs here.

A fantasy tower-defense game for Android, iPhone/iPad and the browser, set in **Moonwell Glade**: a moonlit fey
realm where the Blight creeps along the old moon-roads to snuff out the **Moonwell**, the shining
stone cylinder at the end of every road. Plant elemental blooms, spread the Moonwell's glow, and
hold the line until dawn.

Built with **TypeScript + Phaser 4 + Vite**, packaged for Android and iOS with **Capacitor 8**, and
installable as an offline web app.
All art and sound are generated in code — there are no image or audio asset files. Sprites are painted
with Canvas2D (gradients, outlines, highlights) at the device's real pixel density, so they stay sharp on
high-resolution phone screens, and every creature has walk and attack animations. The display font
(Cinzel, OFL) is bundled so the app works offline.

## Play it

**iPhone / iPad (recommended) and any browser: the web app.**
<https://danielgebhardt.github.io/Cylinder-Protection/>

- **iPhone/iPad:** open the link in **Safari**, tap **Share → Add to Home Screen**, then always start the
  game from that **home-screen icon**. It runs full screen and works offline after the first launch.
  Don't play in a Safari tab: Safari keeps the tab's progress separate from the icon's.
- **Android (Chrome):** open the link and choose **Install app** (or ⋮ → Add to Home screen).
- New versions arrive by themselves: start the game while online and the update shows on the next launch.
- Turn a phone sideways; the game is landscape only.

**Android app:** open this link on the phone, then open the downloaded file and allow installs from
your browser when asked. No GitHub sign-in needed:
<https://github.com/danielgebhardt/Cylinder-Protection/releases/download/latest/cylinder-protection.apk>
A newer APK installs over the old one and keeps your progress.

**iOS app (sideload, for tinkerers):** an unsigned build, re-signed with your own free Apple ID when you
install it: <https://github.com/danielgebhardt/Cylinder-Protection/releases/download/latest/cylinder-protection.ipa>

- **AltStore** (or SideStore): install AltStore with AltServer on a Mac/PC (<https://altstore.io>), download
  the .ipa on the iPhone, open it in AltStore (My Apps → +) and sign in with your Apple ID.
- **Xcode** (Mac): build it yourself instead of using the .ipa. `npm ci && npm run ios && npm run ios:open`,
  then in Xcode select the **App** target → Signing & Capabilities → Team = your **Personal Team**
  (change the bundle identifier if Xcode says it's taken), plug in the iPhone and press Run. On the
  phone, turn on **Settings → Privacy & Security → Developer Mode** (it restarts) and trust your
  developer profile under Settings → General → VPN & Device Management.
- Limits of a free Apple ID: the app **expires after 7 days** (AltStore refreshes it while AltServer is
  running on the same Wi-Fi; with Xcode, press Run again), and **only 3 sideloaded apps** can be
  active at once. Reinstalling over an expired copy keeps your progress. The web app has none of these
  limits, which is why it's the recommended way on iPhone/iPad.

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
button pauses, and it auto-pauses in the background. The iOS app is landscape-only and full screen
too; in the web app a phone held upright shows "turn your device sideways" and pauses the game.

## Development

```bash
npm install
npm run dev          # http://localhost:5173 (also reachable from your phone on the same network)
npm run build        # typecheck + production bundle in dist/ (also the installable web app)
node tools/webapp-check.cjs   # after a build: installable, service worker, boots offline (needs Playwright)
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

The **Android, iOS and web app** workflow (`.github/workflows/android.yml`) rebuilds the APK on every
push to `main` (and keeps it as the `cylinder-protection-apk` artifact). Every build is signed with the committed sideload key
(`android/app/sideload.keystore`), so a new APK installs over the old one and keeps your progress.
That key is only for sideloading, never for a Play Store release.

App icon and splash sources live in `assets/`; regenerate the Android resources with
`npx capacitor-assets generate --android`. The iOS app icon and launch logo (`scripts/icon.ts`) and the
web app icons (Vite build) are rasterised from the same `assets/` PNGs at build time and not committed.

## iOS

```bash
npm run ios          # web build + iOS icons + sync into ios/ (works on Linux too)
npm run ios:open     # open in Xcode (Mac), then Run
```

The same workflow builds an unsigned `.ipa` on a macOS runner on **every push** (artifact
`cylinder-protection-ipa`), and on `main` attaches it to the `latest` release next to the APK.
The Xcode project in `ios/` is committed (Swift Package Manager, no CocoaPods); the copied web
bundle (`ios/App/App/public`), `capacitor.config.json` and the icon PNGs are generated.

## Web app (GitHub Pages)

On `main` the workflow also deploys `dist/` to GitHub Pages. `scripts/lib/webapp.ts` (a Vite plugin)
adds `manifest.webmanifest`, the icons and `sw.js`, a service worker that precaches the whole game:
page loads try the network first (4 s timeout, then the cached copy) so updates show on the next
launch, and the content-hashed files come from the cache. Progress lives in the browser's
`localStorage`; the game asks the browser to keep it (`navigator.storage.persist()`).
Pages must be set to **Settings → Pages → Source: GitHub Actions** (one-time).

## Project layout

```
scripts/
  icon.ts              iOS app icon + launch logo (from assets/)
  lib/iconart.ts       PNG decode/resample/encode for the iOS and web icons
  lib/webapp.ts        Vite plugin: web app manifest, icons, service worker
tools/                 Playwright playtest scripts (screenshots, battles, balance sim, web app check)
android/  ios/         Capacitor native projects
src/
  main.ts              Phaser game config + Capacitor back-button / lifecycle hooks, service worker
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
