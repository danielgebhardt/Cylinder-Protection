// Screenshot a page after a wait, optionally running a JS expression first; prints console errors.
// Usage (dev server running on :5173): node tools/shot.cjs 'http://localhost:5173/?level=0' <out.png> [waitMs] [jsExpression]
// Uses the Playwright that is preinstalled in Claude Code cloud sessions (require('playwright')).
const { chromium } = require('playwright');
(async () => {
  const [,, url, out, waitMs, script] = process.argv;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + e.stack));
  await p.goto(url);
  await p.waitForTimeout(Number(waitMs || 1500));
  if (script) { const r = await p.evaluate(script); if (r !== undefined) console.log('RESULT', JSON.stringify(r)); await p.waitForTimeout(800); }
  await p.screenshot({ path: out });
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
