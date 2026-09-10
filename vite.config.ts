import {defineConfig} from 'vite';
import {resolve} from 'node:path';
import {readdirSync} from 'node:fs';

// Every directory under pages/ that has an index.html is an entry.
const pagesDir = resolve(import.meta.dirname, 'pages');
const input: Record<string, string> = {};
for (const d of readdirSync(pagesDir, {withFileTypes: true})) {
  if (d.isDirectory()) input[d.name] = resolve(pagesDir, d.name, 'index.html');
}

// GitHub Pages serves this from /engine-bench/; dev, `bun run preview` and the Playwright
// suite all serve it from the root. PAGES_BASE is set only by `bun run build:pages`.
const base = process.env.PAGES_BASE ?? '/';

export default defineConfig({
  base,
  root: pagesDir,
  publicDir: resolve(import.meta.dirname, 'public'),
  build: {outDir: resolve(import.meta.dirname, 'dist'), emptyOutDir: true, rollupOptions: {input}},
  define: {CESIUM_BASE_URL: JSON.stringify(`${base}cesium/`)},
  resolve: {alias: {'@lib': resolve(import.meta.dirname, 'src/lib')}},
  server: {fs: {allow: [resolve(import.meta.dirname)]}}
});
