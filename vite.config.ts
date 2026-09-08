import {defineConfig} from 'vite';
import {resolve} from 'node:path';
import {readdirSync} from 'node:fs';

// Every directory under pages/ that has an index.html is an entry.
const pagesDir = resolve(__dirname, 'pages');
const input: Record<string, string> = {};
for (const d of readdirSync(pagesDir, {withFileTypes: true})) {
  if (d.isDirectory()) input[d.name] = resolve(pagesDir, d.name, 'index.html');
}

export default defineConfig({
  root: pagesDir,
  publicDir: resolve(__dirname, 'public'),
  build: {outDir: resolve(__dirname, 'dist'), emptyOutDir: true, rollupOptions: {input}},
  define: {CESIUM_BASE_URL: JSON.stringify('/cesium/')},
  resolve: {alias: {'@lib': resolve(__dirname, 'src/lib')}},
  server: {fs: {allow: [resolve(__dirname)]}}
});
