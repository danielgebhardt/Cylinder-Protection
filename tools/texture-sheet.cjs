// Render every generated texture matching a regex onto one contact sheet (renders at ?res=2).
// Usage (dev server running on :5173): node tools/texture-sheet.cjs <out.png> '<regex e.g. ^enemy_>' [scale]
// Uses the Playwright that is preinstalled in Claude Code cloud sessions (require('playwright')).
const { chromium } = require('playwright');
(async () => {
  const [,, out, filter, scale] = process.argv;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.goto('http://localhost:5173/?res=2');
  await p.waitForTimeout(2500);
  const ok = await p.evaluate(({ filter, scale }) => {
    const g = window.__game;
    const keys = g.textures.getTextureKeys().filter(k => new RegExp(filter).test(k)).sort();
    const S = Number(scale || 1);
    const cv = document.createElement('canvas'); cv.width = 1400; cv.height = 1000;
    const c = cv.getContext('2d'); c.fillStyle = '#5a8a4a'; c.fillRect(0, 0, 1400, 1000);
    let x = 10, y = 10, rowH = 0;
    for (const k of keys) {
      const src = g.textures.get(k).getSourceImage();
      const res = g.textures.get(k).source[0].resolution || 1;
      const w = src.width / res * S, h = src.height / res * S;
      if (x + w > 1390) { x = 10; y += rowH + 16; rowH = 0; }
      c.drawImage(src, x, y, w, h);
      c.fillStyle = '#fff'; c.font = '10px sans-serif'; c.fillText(k.replace(/^(enemy|soldier|tower)_/, ''), x, y + h + 10);
      x += Math.max(w, 60) + 8; rowH = Math.max(rowH, h);
    }
    document.body.innerHTML = ''; document.body.appendChild(cv); document.body.style.margin = 0;
    return keys.length;
  }, { filter, scale });
  console.log('textures', ok);
  await p.screenshot({ path: out });
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
