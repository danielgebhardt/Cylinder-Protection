// Screenshot a scripted mid-battle scene: builds blooms near the road, fuses a pair, attunes, starts three nights.
// Usage (dev server running on :5173): node tools/battle-shot.cjs <levelIndex> <out.png> <seconds> [deviceScaleFactor]
// Uses the Playwright that is preinstalled in Claude Code cloud sessions (require('playwright')).
const { chromium } = require('playwright');
(async () => {
  const [,, level, out, secs, dsf] = process.argv;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: Number(dsf || 1) });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + e.stack));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(`http://localhost:5173/?level=${level}&debug`);
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const s = window.__scene;
    const log = [];
    // greedy: grid candidates near the road, powered, best path coverage first
    const cands = [];
    for (let x = 40; x < 1240; x += 18) for (let y = 95; y < 700; y += 18) {
      const cov = s.paths.reduce((a, path) => a + path.pts.filter(q => Math.hypot(q.x - x, q.y - y) < 140).length, 0);
      cands.push({ x, y, cov });
    }
    cands.sort((a, b) => b.cov - a.cov);
    const types = ['fire', 'fire', 'frost', 'storm', 'earth', 'earth', 'storm', 'frost'];
    let ti = 0;
    for (let round = 0; round < 40 && ti < types.length; round++) {
      const ok = cands.find(c => !s.cantPlace(c.x, c.y) && c.cov > 40);
      if (ok) { s.build(ok.x, ok.y, types[ti++]); continue; }
      // extend the field with a pylon towards the most valuable unpowered spot
      const target = cands.find(c => s.cantPlace(c.x, c.y) === 'power');
      const opts = cands.filter(c => !s.cantPlace(c.x, c.y)).sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y));
      if (opts[0]) s.buildPylon(opts[0].x, opts[0].y); else break;
    }
    // fuse the first fusable pair
    const t0 = s.towers.find(t => s.towers.some(o => o !== t && !o.spec.fused && !t.spec.fused && Math.hypot(o.x - t.x, o.y - t.y) <= 105));
    if (t0) { const o = s.towers.find(o => o !== t0 && !o.spec.fused && Math.hypot(o.x - t0.x, o.y - t0.y) <= 105); s.fuse(t0, o); log.push('fused ' + t0.spec.id); }
    s.towers.slice(-2).forEach(t => { s.attune(t); s.attune(t); });
    s.closeMenu(); s.hideInfo(); s.startNextWave(true); s.startNextWave(true); s.startNextWave(true);
    const path = s.paths[0];
    s.spawnEnemy('bat', path, path.length * 0.55); s.spawnEnemy('wraith', path, path.length * 0.6);
    return { towers: s.towers.map(t => t.spec.id + (t.rank ? '+' + t.rank : '')), pylons: s.pylons.length, log };
  });
  console.log(JSON.stringify(r));
  await p.waitForTimeout(Number(secs) * 1000);
  await p.screenshot({ path: out });
  const st = await p.evaluate(() => { const s = window.__scene; return { lives: s.lives, enemies: s.enemies.length, powered: s.towers.filter(t => t.powered).length + '/' + s.towers.length }; });
  console.log(JSON.stringify(st));
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
