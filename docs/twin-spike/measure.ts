// Measures the dtcc-twin 3D spike: orbit smoothness per variant, remount leaks, panel-drag leaks.
// Usage (Atlas running on :3000): bun docs/twin-spike/measure.ts <rounds> [dpr=1]   One JSON line per measurement.
import {chromium} from '@playwright/test';

const rounds = +(process.argv[2] ?? 3);
const dpr = +(process.argv[3] ?? 1);
const VARIANTS = ['map-only', 'three-map', 'vtk-map', 'three-panel', 'vtk-panel'];
const browser = await chromium.launch({args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist']});
const ctx = await browser.newContext({viewport: {width: 1400, height: 850}, deviceScaleFactor: dpr});
await ctx.addInitScript(() => {
  const live = {tex: 0, fb: 0, rb: 0, buf: 0, contexts: 0, lost: 0};
  const seen = new WeakSet<object>();
  const P = WebGL2RenderingContext.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
  for (const [c, d, k] of [['createTexture', 'deleteTexture', 'tex'], ['createFramebuffer', 'deleteFramebuffer', 'fb'],
                            ['createRenderbuffer', 'deleteRenderbuffer', 'rb'], ['createBuffer', 'deleteBuffer', 'buf']] as const) {
    const oc = P[c]!, od = P[d]!;
    P[c] = function (this: unknown, ...a: unknown[]) { const o = oc.apply(this, a) as object | null; if (o) { seen.add(o); live[k]++; } return o; };
    P[d] = function (this: unknown, o: unknown) { if (o && seen.has(o as object)) { seen.delete(o as object); live[k]--; } return od.call(this, o); };
  }
  const contexts = new WeakSet<object>();
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
    const c = (getContext as any).call(this, type, ...rest);
    if (c && type.startsWith('webgl') && !contexts.has(c)) {
      contexts.add(c); live.contexts++;
      this.addEventListener('webglcontextlost', () => live.lost++);
    }
    return c;
  } as typeof getContext;
  (window as any).__gl = live;
});
const page = await ctx.newPage();
const warnings: string[] = [];
page.on('console', m => { if (/too many active webgl|context lost|CONTEXT_LOST/i.test(m.text())) warnings.push(m.text().slice(0, 160)); });
page.on('pageerror', e => warnings.push('pageerror: ' + String(e).slice(0, 160)));
await page.goto('http://localhost:3000/login');
await page.getByLabel(/email/i).fill('admin@example.com');
await page.getByLabel(/password/i).fill('password');
await page.getByRole('button', {name: /log in|sign in/i}).click();
await page.waitForURL('http://localhost:3000/');

// In-app navigation (a Link click), so React unmounts the old variant instead of the browser discarding the page.
async function open(variant: string) {
  await page.getByRole('link', {name: variant, exact: true}).click();
  await page.waitForFunction(v => location.search.includes(`variant=${v}`) && (window as any).__spike3d?.map?.loaded?.(), variant, {timeout: 60000});
  await page.waitForTimeout(1500);
}
await page.goto('http://localhost:3000/dev/3d?variant=map-only');
await page.waitForFunction(() => (window as any).__spike3d?.map?.loaded?.(), null, {timeout: 60000});

async function orbit(variant: string) {
  await open(variant);
  return page.evaluate(async () => {
    const map = (window as any).__spike3d.map;
    map.jumpTo({center: [11.975, 57.689], zoom: 15.6, pitch: 60, bearing: 0});
    await new Promise(r => setTimeout(r, 800));
    const gaps: number[] = [];
    let last = 0, running = true;
    const tick = (t: number) => { if (last) gaps.push(t - last); last = t; if (running) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    await new Promise<void>(r => { map.once('moveend', () => r()); map.easeTo({bearing: 359, duration: 8000, easing: (x: number) => x}); });
    running = false;
    gaps.sort((a, b) => a - b);
    const q = (p: number) => +gaps[Math.min(gaps.length - 1, Math.floor(p * (gaps.length - 1)))]!.toFixed(2);
    const refresh = q(0.1);
    return {frames: gaps.length, p50: q(0.5), p95: q(0.95), max: q(1), late: +(gaps.filter(g => g > refresh * 1.5).length / gaps.length * 100).toFixed(1)};
  });
}

for (let round = 0; round < rounds; round++) {
  const order = round % 2 === 0 ? VARIANTS : [...VARIANTS].reverse();
  for (const v of order) console.log(JSON.stringify({kind: 'orbit', dpr, round, variant: v, ...(await orbit(v))}));
}

// Remount: 10 round trips between each 3D variant and map-only, GL objects and contexts counted across all canvases.
for (const v of VARIANTS.slice(1)) {
  await open('map-only');
  const before = await page.evaluate(() => ({...(window as any).__gl}));
  for (let i = 0; i < 10; i++) { await open(v); await open('map-only'); }
  await page.waitForTimeout(2000);
  const after = await page.evaluate(() => ({...(window as any).__gl}));
  const grew = Object.fromEntries(Object.keys(before).map(k => [k, after[k] - before[k]]));
  console.log(JSON.stringify({kind: 'remount', dpr, variant: v, trips: 10, grew, warnings: warnings.splice(0)}));
}

// Panel drag: 200 splitter moves; only the panel canvas changes size.
for (const v of ['three-panel', 'vtk-panel']) {
  await open(v);
  const handle = page.locator('[data-slot="resizable-handle"], [role="separator"]').first();
  const box = await handle.boundingBox();
  if (!box) { console.log(JSON.stringify({kind: 'drag', variant: v, error: 'no handle'})); continue; }
  const before = await page.evaluate(() => ({...(window as any).__gl}));
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 0; i < 200; i++) {
    const t = (i % 40) / 40, x = box.x + box.width / 2 + (t < 0.5 ? t : 1 - t) * 2 * 300 - 150;
    await page.mouse.move(x, box.y + box.height / 2);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => ({...(window as any).__gl}));
  const grew = Object.fromEntries(Object.keys(before).map(k => [k, after[k] - before[k]]));
  console.log(JSON.stringify({kind: 'drag', dpr, variant: v, moves: 200, grew, warnings: warnings.splice(0)}));
}
await browser.close();
