import {defineConfig} from 'vite';
import {resolve} from 'node:path';
import {readdirSync, rmSync} from 'node:fs';

// Every directory under pages/ that has an index.html is an entry.
const pagesDir = resolve(import.meta.dirname, 'pages');
const input: Record<string, string> = {};
for (const d of readdirSync(pagesDir, {withFileTypes: true})) {
  if (d.isDirectory()) input[d.name] = resolve(pagesDir, d.name, 'index.html');
}

// GitHub Pages serves this from /engine-bench/; dev, `bun run preview` and the Playwright
// suite all serve it from the root. PAGES_BASE is set only by `bun run build:pages`.
const base = process.env.PAGES_BASE ?? '/';

const outDir = resolve(import.meta.dirname, 'dist');

// The size-test series (public/data/fields-large, fields-xl; 0.5-2 GB each) are
// generated locally, gitignored and served only by `bun run dev` (?fields=large|xl).
// Vite copies all of public/ into dist/, so without this every build carries them
// and a gh-pages deploy grows to gigabytes (2.4 GB, rejected with HTTP 500).
const LOCAL_ONLY = ['data/fields-large', 'data/fields-xl'];
const dropLocalOnly = {
  name: 'drop-local-only-series',
  apply: 'build' as const,
  closeBundle() {
    for (const dir of LOCAL_ONLY) rmSync(resolve(outDir, dir), {recursive: true, force: true});
  },
};

export default defineConfig({
  base,
  root: pagesDir,
  publicDir: resolve(import.meta.dirname, 'public'),
  build: {outDir, emptyOutDir: true, rollupOptions: {input}},
  plugins: [dropLocalOnly],
  define: {CESIUM_BASE_URL: JSON.stringify(`${base}cesium/`)},
  resolve: {alias: {'@lib': resolve(import.meta.dirname, 'src/lib')}},
  server: {fs: {allow: [resolve(import.meta.dirname)]}}
});
