// Page 21 orbit frame times, per view and buildings choice, field off. Needs `bun run build` (not build:pages) and
// `bun run preview` on :4173. Headed Chromium on the real GPU (ANGLE Metal), 1400x850, alternating order per round.
// Usage: bun scripts/twin-demo/measure_orbits.ts <rounds> <dpr> [views, comma-separated]   One JSON line per orbit,
// with the 1-minute load average taken just before it: frame pacing on a busy machine is not a measurement.
import {chromium} from '@playwright/test';
import {loadavg} from 'node:os';

const rounds = +(process.argv[2] ?? 3);
const dpr = +(process.argv[3] ?? 1);
const VIEWS = (process.argv[4] ?? 'three-map,vtk-map,three-panel,vtk-panel').split(',');
const CASES: {variant: string; buildings: string; basemap: string}[] = [{variant: 'map-only', buildings: 'boxes', basemap: 'bright'}];
for (const variant of VIEWS) {
  for (const buildings of ['boxes', 'core-mesh', 'both', 'vs-osm']) CASES.push({variant, buildings, basemap: 'bright'});
  CASES.push({variant, buildings: 'vs-osm', basemap: 'liberty'});
}

const browser = await chromium.launch({headless: false, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist']});
const ctx = await browser.newContext({viewport: {width: 1400, height: 850}, deviceScaleFactor: dpr});
const page = await ctx.newPage();
const errors: string[] = [];
page.on('pageerror', e => errors.push(String(e).slice(0, 160)));

async function orbit(c: (typeof CASES)[number]) {
  await page.goto(`http://localhost:4173/21-twin-map-vs-panel/?variant=${c.variant}&buildings=${c.buildings}&basemap=${c.basemap}&field=none`);
  await page.waitForFunction(() => (window as any).__bench?.ready, null, {timeout: 60000});
  await page.waitForTimeout(1500);
  await page.getByRole('button', {name: /Orbit test/}).click();
  await page.waitForFunction(() => /p50 [\d.]+ ms/.test(document.body.innerText), null, {timeout: 30000});
  const line = await page.evaluate(() => document.body.innerText.match(/p50 ([\d.]+) ms, p95 ([\d.]+) ms, ([\d.]+)% late/)!.slice(1).map(Number));
  return {p50: line[0], p95: line[1], late: line[2]};
}

const gpu = await (async () => {
  await page.goto('http://localhost:4173/21-twin-map-vs-panel/?variant=map-only&field=none');
  return page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2')!;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
})();
console.log(JSON.stringify({kind: 'env', dpr, gpu}));
for (let round = 0; round < rounds; round++) {
  const order = round % 2 === 0 ? CASES : [...CASES].reverse();
  for (const c of order) { const load = +loadavg()[0].toFixed(1); console.log(JSON.stringify({kind: 'orbit', dpr, round, load, ...c, ...(await orbit(c))})); }
}
if (errors.length) console.log(JSON.stringify({kind: 'errors', errors}));
await browser.close();
