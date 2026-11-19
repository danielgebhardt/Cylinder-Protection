import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { webApp } from './scripts/lib/webapp';

/**
 * Phaser 4 picks each pixel's texture with an exact float comparison on an interpolated
 * varying (`outTexDatum == float(INDEX)`). On rotated sprites, and on mobile GPUs with
 * reduced precision, the value can arrive as e.g. 2.9999, no branch matches and that part
 * of the sprite renders transparent. Make the comparisons tolerant.
 */
function phaserTextureIndexFix(): Plugin {
  const fixes: [string, string][] = [
    ['outTexDatum == 0.0', 'abs(outTexDatum) < 0.5'],
    ['outTexDatum == float(INDEX)', 'abs(outTexDatum - float(INDEX)) < 0.5'],
    ['texId == float(i)', 'abs(texId - float(i)) < 0.5'],
  ];
  return {
    name: 'phaser-texture-index-fix',
    enforce: 'pre',
    transform(code, id) {
      if (!/phaser[\\/]dist[\\/]phaser\.esm\.js/.test(id)) return null;
      let out = code;
      for (const [from, to] of fixes) {
        if (!out.includes(from)) this.warn(`phaser-texture-index-fix: pattern not found: ${from}`);
        out = out.split(from).join(to);
      }
      return { code: out, map: null };
    },
  };
}

export default defineConfig({
  // Relative, so the same build works in Capacitor and under /Cylinder-Protection/ on GitHub Pages.
  base: './',
  // webApp(): installable web app (manifest, icons, offline service worker), see scripts/lib/webapp.ts
  plugins: [phaserTextureIndexFix(), webApp()],
  // Serve Phaser through the plugin pipeline in dev too (pre-bundling would skip the fix).
  optimizeDeps: { exclude: ['phaser'] },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
  server: { host: true, port: 5173 },
});
