# Cylinder Protection — project notes for Claude

Fantasy tower-defense game for Android, iOS and the browser by the repo owner. **TypeScript + Phaser 4.2 +
Vite 8 + Capacitor 8**, TypeScript 7. The owner tests on an Android phone via the release APK
link and gives design direction; Claude makes the decisions within that direction. The owner's
family mainly plays the **installable web app** on iPhone/iPad (GitHub Pages), so it must keep
working offline and from the home-screen icon.

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
ios/                   Capacitor iOS project (committed, Swift Package Manager, no CocoaPods)
scripts/lib/iconart.ts dependency-free PNG decode/resample/encode; iOS + web icons from assets/*.png
scripts/lib/webapp.ts  Vite plugin: manifest.webmanifest, icons, apple-touch-icon, sw.js (+ dev serving)
scripts/icon.ts        writes the iOS AppIcon-1024.png + launch logo (gitignored), run by `npm run ios`
```

main.ts also registers `sw.js` (only `import.meta.env.PROD` and not `Capacitor.isNativePlatform()`),
calls `navigator.storage.persist()`, and emits `apppause` when a phone turns to portrait (index.html
then covers the game with a "turn your device sideways" hint; browsers can't lock orientation).

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
- **Web app**: Vite `base` must stay `'./'` (Pages serves under `/Cylinder-Protection/`, Capacitor
  from its own root). Files emitted in `generateBundle` aren't in the bundle keys, so webapp.ts adds
  them to the precache list explicitly; the plugin is `enforce: 'post'` so index.html is included.
  The SW cache version hashes every file's name + content. index.html keeps `#game` inside
  `env(safe-area-inset-*)`. Saves are plain `localStorage` (no Capacitor Preferences); on iOS the
  home-screen app and a Safari tab have separate storage. Audio resumes whenever
  `ctx.state !== 'running'` (iOS uses `'interrupted'`). The game has no haptics.
- **Icons**: Android resources are committed and untouched (capacitor-assets output). The iOS icon
  (opaque RGB, no alpha) and launch logo and the web icons are rasterised from `assets/icon-*.png`
  at build time; never commit them (ios/.gitignore). iOS launch background `#14240F` matches the
  Android splash; the launch logo is 200 pt in `LaunchScreen.storyboard`.
- iOS Info.plist: landscape only (like Android's sensorLandscape), UIRequiresFullScreen, status bar
  hidden, arm64, ITSAppUsesNonExemptEncryption=false. `capacitor.config.json` and `ios/App/App/public`
  are generated (gitignored).
- Chromium 157's CDP `Page.getInstallabilityErrors` returns `[]` even when the manifest 404s, so
  tools/webapp-check.cjs also checks the fetched manifest and every icon itself.

## Testing (cloud sessions have Chromium + Playwright preinstalled)

```bash
npm run dev -- --port 5173            # leave running in the background
npx tsc --noEmit                      # typecheck (also part of npm run build)
node tools/shot.cjs 'http://localhost:5173/?level=0&debug' /tmp/x.png 3000
node tools/battle-shot.cjs 3 /tmp/battle.png 6        # scripted battle; 4th arg 2 = phone density
node tools/texture-sheet.cjs /tmp/sheet.png '^enemy_' 1.3
node tools/sim.cjs 0,1,2,3,4 balanced                  # balance check (~1.5 min per level)
npm run build && node tools/webapp-check.cjs [shot.png] # web app: installable, SW control, offline boot
```

webapp-check serves `dist/` under `/Cylinder-Protection/` like Pages, checks CDP installability +
manifest + icons, that the service worker controls the page after a reload, and that with
`context.setOffline(true)` a reload still boots the menu and `?level=0` starts. Exit code 1 on failure.

URL params: `?level=N` (0-based) jumps into a level, `?debug` gives 99999 moonlight, `?res=2`.
`window.__scene` exposes the GameScene for scripting. Swiftshader prints harmless "GPU stall due to
ReadPixels" warnings; headless boot is slow (wait 3–5 s before screenshots).

**Balance reference** (`tools/sim.cjs ... balanced`, lives left of 20): Glimmerwood 20, Lantern Fen 20,
Mirrormere 20, Frosted Hollow 20, Hollow King's Court 17. The AI is deterministic and all-or-nothing
(a wave either collapses the moonbeam network or not), so small tuning changes can swing results;
`nofuse` must do worse than `balanced` (fusion has to be worth it). Real players are likely weaker
than this AI on first play.

## Release / Android, iOS, web app

`.github/workflows/android.yml` ("Android, iOS and web app") runs on **every push to any branch**
(and PRs). Jobs:

- `apk` (every push): builds the web bundle, `cap sync`, `assembleDebug` signed with
  `android/app/sideload.keystore` (so updates install over old versions and keep saves). On main it
  also uploads `dist/` as the Pages artifact.
- `publish` (main): moves the `latest` tag and replaces the APK on the rolling `latest` pre-release:
  **https://github.com/danielgebhardt/Cylinder-Protection/releases/download/latest/cylinder-protection.apk**
  (same pattern as the owner's `the-wardens-flame` repo).
- `pages` (main, needs apk): deploys the web app to
  **https://danielgebhardt.github.io/Cylinder-Protection/**. Repo Settings → Pages → Source must be
  "GitHub Actions" (GITHUB_TOKEN can't enable it). The container can't reach *.github.io: ask the
  owner to check the live site.
- `ios` (every push, macos-26, needs apk + publish so the release exists on main): `npm run ios`,
  unsigned `xcodebuild` Release for `generic/platform=iOS`, zips `Payload/App.app` into
  `cylinder-protection.ipa` (artifact `cylinder-protection-ipa`); on main
  `gh release upload latest cylinder-protection.ipa --clobber`:
  **https://github.com/danielgebhardt/Cylinder-Protection/releases/download/latest/cylinder-protection.ipa**
  Sideloaded with a free Apple ID (AltStore, or Xcode with a Personal Team): 7-day expiry, 3 apps.
- Workflow: work on a branch, push it and watch the `ios` job pass, then push `main`. No PRs.
- Verify the .ipa: `gh run download <id> -n cylinder-protection-ipa`, `unzip -l` must list
  `Payload/App.app/Frameworks/Capacitor.framework`, `public/index.html` and `public/assets/index-*.js`.
- If the build fails with Maven Central HTTP 429 it's transient: `gh run rerun <id> --failed`.
- The Android SDK can't be downloaded in the cloud container (dl.google.com blocked); rely on CI.
- Verify a release: download the link, `unzip -p app.apk 'assets/public/assets/index-*.js' | grep -c "<new string>"`.
- Commits end with the Co-Authored-By / Claude-Session lines from the session's system reminder.

## Ideas not yet done (owner hasn't prioritised)

- Low-detail toggle (weather/particles) if late waves stutter on the phone.
- Between-level upgrades bought with stars; more levels; music.
- Gradle caching in CI to avoid Maven rate limits.
- An in-game hint on iOS Safari (not standalone) pointing to Share → Add to Home Screen.

## Lab sessions (the home lab's dev VM)

<!-- From home-lab config/forgejo/lab-sessions-claude-md.md (runbook 07 §16; decision 43). Keep this section in sync with it. -->

You may be a **lab session**: Claude Code on the home lab's dev VM, started from the Claude app ("dev: …").
Check with `whoami`: `fjagent` means you are. Then these rules come first, over anything else in this file:

- **Where the code lives:** `origin` is the lab's Forgejo (`https://git.lab.dgebhardt.com/daniel/cylinder-protection`), the
  source of truth. A GitHub copy, if there is one, is read-only and filled from Forgejo: never push or open PRs there.
- **No branches on Forgejo:** you have read access only, so Forgejo refuses any push to a branch (`main` included).
  Work on any local branch and hand your work in as a pull request pushed with AGit (below). Never merge, and don't
  ask how to get around this: the owner reviews and merges.
- **No tags or releases:** only the owner creates them (Forgejo refuses yours).
- **A pull request is a push** (Forgejo's AGit flow). Pick one short topic per task (lower case, dashes), then:
  ```bash
  git push origin HEAD:refs/for/main/<topic> -o title="WIP: <title>" -o description="<what, why, checks run>"
  ```
  Push options can't contain line breaks: keep the description on one line (add detail later in a comment).
  The first push opens the pull request and prints its link, worded "Visit the existing pull request" even when
  it's new (the API lists its head as `refs/pull/<number>/head`). Every later push to the same
  `refs/for/main/<topic>` updates it; after a rebase or an amend add `-o force-push=true`. Title and description
  are read on the first push only.
- **Save often:** your worktree is on a disk that isn't backed up. Commit and push to your pull request at every
  checkpoint, so nothing is lost if the lab restarts. Keep "WIP:" at the start of the title until you're done.
- **Checks:** no CI runs on lab pull requests. Run them yourself before you finish, and put the results in the pull
  request's description or a comment:
  - `npm ci`
  - `npx tsc --noEmit`
  - `npm run build`
- **Forgejo's API**, with your own token (no dollar signs in these blocks on purpose: Forgejo's repo templates would
  expand them). Your open pull requests, with their numbers:
  ```bash
  curl -sS -H @/home/fjagent/.config/forgejo/auth-header 'https://git.lab.dgebhardt.com/api/v1/repos/daniel/cylinder-protection/pulls?state=open' | python3 -c 'import json,sys; [print(p["number"], p["head"]["ref"], p["title"]) for p in json.load(sys.stdin)]'
  ```
  When you're done, take "WIP:" out of the title (PATCH `pulls/<number>`), or add a comment (POST `issues/<number>/comments`):
  ```bash
  python3 - <<'PY' > /tmp/fj.json
  import json; print(json.dumps({"title": "<title without WIP>"}))   # or {"body": "<comment>"}
  PY
  curl -sS -X PATCH -H @/home/fjagent/.config/forgejo/auth-header -H 'Content-Type: application/json' \
    --data @/tmp/fj.json https://git.lab.dgebhardt.com/api/v1/repos/daniel/cylinder-protection/pulls/<number> | python3 -c 'import json,sys; print(json.load(sys.stdin).get("html_url"))'
  ```
  Then give the owner the link.
- **Don't** change CI workflow files unless the task is about CI (say so in the pull request), add secrets or
  credentials to the repo, or install anything system-wide (you can't; use the project's own tooling).
- **Memory and CPU are shared** with other lab sessions and the MTP runner: one heavy build or test run at a time.
