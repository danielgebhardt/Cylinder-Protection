// Headless balance check: a computer player builds blooms, extends the glow with lanterns, fuses, attunes and uses Surge/Nova on each level, then prints petals left and leaks per night.
// Usage (dev server running on :5173): node tools/sim.cjs 0,1,2,3,4 [balanced|nofuse|spam]
// Uses the Playwright that is preinstalled in Claude Code cloud sessions (require('playwright')).
const { chromium } = require('playwright');
(async () => {
  const levels = process.argv[2].split(',');
  const style = process.argv[3] || 'balanced';
  const b = await chromium.launch();
  for (const level of levels) {
    const p = await b.newPage({ viewport: { width: 640, height: 360 } });
    const errs = [];
    p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + e.stack));
    await p.goto(`http://localhost:5173/?level=${level}`);
    await p.waitForTimeout(1200);
    const r = await p.evaluate((style) => {
      const s = window.__scene;
      const T = window.__TOWERS;
      const cands = [];
      for (let x = 40; x < 1240; x += 16) for (let y = 95; y < 700; y += 16) {
        const cov = s.paths.reduce((a, path) => a + path.pts.filter(q => Math.hypot(q.x - x, q.y - y) < 135).length, 0);
        if (cov > 0) cands.push({ x, y, cov });
      }
      cands.sort((a, b) => b.cov - a.cov);
      const order = style === 'fire' ? ['fire'] : ['fire', 'frost', 'earth', 'storm', 'fire', 'storm', 'earth', 'frost'];
      let built = 0, t = 0, think = 0;
      const log = [];
      const wanted = () => style === 'spam' ? 99 : 3 + s.waveIdx;
      for (let i = 0; i < 200000 && !s.ended; i++) {
        s.update(0, 50);
        t += 0.05; think -= 0.05;
        if (think > 0) continue;
        think = 0.5;
        let acted = true, guard = 0;
        while (acted && guard++ < 10) {
          acted = false;
          if (s.towers.length < wanted()) {
            const id = order[built % order.length];
            const spot = cands.find(c => c.cov > 35 && !s.cantPlace(c.x, c.y));
            if (spot) { if (s.energy >= T[id].cost) { s.build(spot.x, spot.y, id); built++; acted = true; } continue; }
            // extend power towards the best unpowered spot
            const target = cands.find(c => c.cov > 35 && ['power', 'full'].includes(s.cantPlace(c.x, c.y)));
            if (target && s.energy >= 40) {
              const opts = cands.filter(c => !s.cantPlace(c.x, c.y, true) && Math.hypot(c.x - target.x, c.y - target.y) > 30).sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y));
              if (opts[0]) { s.buildPylon(opts[0].x, opts[0].y); acted = true; continue; }
            }
          }
          // fuse a neighbouring pair, else attune the cheapest
          const fusable = [];
          for (const a of s.towers) for (const o of s.towers) if (a !== o && !a.spec.fused && !o.spec.fused && Math.hypot(a.x - o.x, a.y - o.y) <= 105) fusable.push([a, o]);
          if (fusable.length && style !== 'nofuse') { if (s.energy >= 60) { s.fuse(fusable[0][0], fusable[0][1]); acted = true; } continue; }
          const at = s.towers.filter(x => x.rank < 3).sort((a, b) => a.attunePrice - b.attunePrice)[0];
          if (at && s.energy >= at.attunePrice) { s.attune(at); s.closeMenu(); acted = true; }
        }
        if (s.waveIdx === 0) s.startNextWave(true);
        if (s.surgeCd <= 0 && s.enemies.length > 6) s.useSurge();
        if (s.novaCd <= 0 && s.enemies.some(e => Math.hypot(e.x - s.network.root.x, e.y - s.network.root.y) < 200)) s.useNova();
        if (s.lives !== (log.length ? log[log.length - 1][1] : s.level.lives)) log.push([s.waveIdx, s.lives]);
      }
      return { level: s.level.name, lives: s.lives, wave: s.waveIdx + '/' + s.level.waves.length, time: Math.round(t),
        towers: s.towers.map(x => x.spec.id + (x.rank ? '+' + x.rank : '')).join(' '), pylons: s.pylons.length, energy: Math.floor(s.energy), leaks: log.map(l => l.join(':')).join(' ') };
    }, style);
    console.log(JSON.stringify(r));
    if (errs.length) console.log(errs.join('\n'));
    await p.close();
  }
  await b.close();
})();
