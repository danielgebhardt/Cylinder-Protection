// Checks the built web app (dist/) the way GitHub Pages serves it, under /Cylinder-Protection/:
// installable (Chrome's own installability check), service worker in control after a reload,
// and the game still boots offline (menu, and a level via ?level=0). Exits 1 on any failure.
// Usage: npm run build && node tools/webapp-check.cjs [shot.png]
// Uses the Playwright that is preinstalled in Claude Code cloud sessions (require('playwright')).
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const DIST = path.join(__dirname, '..', 'dist');
const BASE = '/Cylinder-Protection/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.woff': 'font/woff' };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (!url.pathname.startsWith(BASE)) { res.writeHead(404).end(); return; }
  let file = path.join(DIST, decodeURIComponent(url.pathname.slice(BASE.length)));
  if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

const failures = [];
const check = (ok, what, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures.push(what);
};

// The menu (or a level) is up: Phaser booted, Boot scene finished, fonts and textures made.
const booted = (page, scene) =>
  page.waitForFunction((s) => !!(window.__game && window.__game.scene.isActive(s)), scene, { timeout: 30000 })
    .then(() => true, () => false);

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const root = `http://localhost:${server.address().port}${BASE}`;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(root);
  check(await booted(page, 'Menu'), 'game boots online');

  const cdp = await context.newCDPSession(page);
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  check(installabilityErrors.length === 0, 'installable (Page.getInstallabilityErrors is empty)',
    installabilityErrors.map((e) => e.errorId).join(', '));
  // Chrome 157 headless reports no installability errors even when the manifest 404s, so also
  // check the install criteria directly: Chrome fetched and parsed the manifest, it has the
  // required fields, and every icon loads at its declared size.
  const { errors: manifestErrors, url: manifestUrl, data } = await cdp.send('Page.getAppManifest');
  check(!!manifestUrl && !!data && manifestErrors.length === 0, 'Chrome fetched and parsed the manifest',
    manifestErrors.map((e) => e.message).join('; ') || (data ? '' : 'no manifest data'));
  let m = {};
  try { m = JSON.parse(data || '{}'); } catch { /* reported below */ }
  check(!!(m.name && m.short_name && m.start_url && m.display === 'standalone' && m.orientation === 'landscape'),
    'manifest: name, short_name, start_url, standalone, landscape');
  const icons = [...(m.icons || []), { src: 'apple-touch-icon.png', sizes: '180x180', purpose: 'apple' }];
  for (const want of ['192x192 any', '512x512 any', '512x512 maskable']) {
    check(icons.some((i) => `${i.sizes} ${i.purpose || 'any'}` === want), `manifest icon ${want}`);
  }
  for (const icon of icons) {
    const size = await page.evaluate((src) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(`${img.naturalWidth}x${img.naturalHeight}`);
      img.onerror = () => resolve('failed to load');
      img.src = new URL(src, document.baseURI).href;
    }), icon.src);
    check(size === icon.sizes, `icon ${icon.src} loads at ${icon.sizes}`, size);
  }

  // ready never resolves if the worker fails to install (e.g. a precached file is missing)
  const scope = await page.evaluate(() => Promise.race([
    navigator.serviceWorker.ready.then((r) => r.scope),
    new Promise((r) => setTimeout(() => r('service worker never became ready'), 20000)),
  ]));
  check(scope === root, 'service worker scope is the repo path', scope);
  await page.reload();
  check(await page.evaluate(() => !!navigator.serviceWorker.controller), 'service worker controls the page after a reload');
  check(await booted(page, 'Menu'), 'game boots after reload');

  await context.setOffline(true);
  const nav = (go) => go.then(() => true, () => false); // offline without a worker: navigation throws
  check(await nav(page.reload()) && await booted(page, 'Menu'), 'offline: reload still boots the game');
  check(await page.evaluate(() => document.fonts.check('600 20px Cinzel')).catch(() => false), 'offline: Cinzel font loaded from cache');
  check(await nav(page.goto(`${root}?level=0`)) && await booted(page, 'Game'), 'offline: a level (?level=0) starts');
  await page.waitForTimeout(2500);
  if (process.argv[2]) await page.screenshot({ path: process.argv[2] });
  await context.setOffline(false);

  check(errors.length === 0, 'no page errors', errors.join(' | '));
  await browser.close();
  server.close();
  console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nall web app checks passed');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
