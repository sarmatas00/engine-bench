import {cpSync, existsSync, mkdirSync} from 'node:fs';
import {resolve} from 'node:path';

const src = resolve(import.meta.dir, '../node_modules/cesium/Build/Cesium');
const dst = resolve(import.meta.dir, '../public/cesium');
if (!existsSync(src)) {
  console.error('cesium not installed; run bun install first');
  process.exit(1);
}
mkdirSync(dst, {recursive: true});
for (const d of ['Workers', 'ThirdParty', 'Assets', 'Widgets']) {
  cpSync(resolve(src, d), resolve(dst, d), {recursive: true});
}
console.log('cesium assets → public/cesium');
