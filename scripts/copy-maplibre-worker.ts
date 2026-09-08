import {cpSync, existsSync, mkdirSync} from 'node:fs';
import {resolve} from 'node:path';

// maplibre-gl resolves its worker at runtime as new URL('./maplibre-gl-worker.mjs', import.meta.url),
// relative to wherever the main bundle ends up. Vite's optimizer/rollup can't see that dynamic
// string, so the worker file never lands next to the built chunk. Vendor it (and the shared chunk
// the worker itself imports the same way) under a fixed public path instead, and point
// maplibregl.setWorkerUrl() at it (see src/lib/synth-tiles.ts).
const srcDir = resolve(import.meta.dir, '../node_modules/maplibre-gl/dist');
const dstDir = resolve(import.meta.dir, '../public/maplibre');
if (!existsSync(srcDir)) {
  console.error('maplibre-gl not installed; run bun install first');
  process.exit(1);
}
mkdirSync(dstDir, {recursive: true});
for (const f of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  cpSync(resolve(srcDir, f), resolve(dstDir, f));
}
console.log('maplibre-gl worker → public/maplibre');
