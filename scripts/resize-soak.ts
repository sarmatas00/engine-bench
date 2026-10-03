/**
 * Resize soak: drag a docked panel's width back and forth and count live GL
 * objects, to settle whether a renderer leaks per drawing-buffer resize.
 *
 *   bun run dev                       # or any server for pages/
 *   bun scripts/resize-soak.ts <slug> [resizes=600] [intervalMs=16]
 *
 * Environment: ORIGIN (default http://localhost:5173), DPR (pixel ratio,
 * default 1), SETTLE_MS (debounce the page's resize handling until the panel
 * has been still this long; 0 = off), DRAG_STEPS (release the splitter for
 * 400 ms every N steps, so the soak is many drags; 0 = one long drag),
 * QUERY (appended to the page URL).
 *
 * The GL counters are installed by an init script before the page runs, on
 * WebGL2RenderingContext.prototype, so they are a witness independent of the
 * page's own instrumentGlObjects. Prints one JSON line.
 *
 * Everything above main() is pure; tests/unit/resize-soak.test.ts imports it.
 */

/** CSS widths of a drag: a triangle wave 600..1280 px in 17 px steps. */
export function dragWidths(resizes: number, min = 600, max = 1280, step = 17): number[] {
  const span = max - min;
  return Array.from({length: resizes}, (_, k) => {
    const t = ((k + 1) * step) % (2 * span);
    return min + (t < span ? t : 2 * span - t);
  });
}

/**
 * GPU bytes a leaked set of framebuffers holds. vtk.js 36's ForwardPass
 * framebuffer carries an RGBA8 colour texture (4 B/px) and a DEPTH_COMPONENT16
 * renderbuffer (2 B/px), both at drawing-buffer size.
 */
export function leakedBytes(framebuffers: number, meanPixels: number): number {
  return framebuffers * meanPixels * (4 + 2);
}

async function main(): Promise<void> {
  const {chromium} = await import('@playwright/test');
  const [slug, resizesArg, intervalArg] = process.argv.slice(2);
  if (!slug) throw new Error('usage: bun scripts/resize-soak.ts <slug> [resizes] [intervalMs]');
  const resizes = +(resizesArg ?? 600);
  const intervalMs = +(intervalArg ?? 16);
  const origin = process.env.ORIGIN ?? 'http://localhost:5173';
  const dpr = +(process.env.DPR ?? 1);
  const settleMs = +(process.env.SETTLE_MS ?? 0);
  const dragSteps = +(process.env.DRAG_STEPS ?? 0);
  const browser = await chromium.launch({args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist']});
  const page = await (await browser.newContext({viewport: {width: 1400, height: 800}, deviceScaleFactor: dpr})).newPage();
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(String(e)));
  if (settleMs > 0) {
    // Mitigation: the page's ResizeObserver callbacks run only after the panel
    // has been still for settleMs; meanwhile CSS stretches the old buffer.
    await page.addInitScript((ms: number) => {
      const Real = window.ResizeObserver;
      window.ResizeObserver = class extends Real {
        constructor(cb: ResizeObserverCallback) {
          let timer: number | undefined;
          super((entries, obs) => { clearTimeout(timer); timer = window.setTimeout(() => cb(entries, obs), ms); });
        }
      };
    }, settleMs);
  }
  await page.addInitScript(() => {
    const live = {tex: 0, fb: 0, rb: 0, buf: 0};
    const seen = new WeakSet<object>();
    const P = WebGL2RenderingContext.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
    for (const [c, d, k] of [['createTexture', 'deleteTexture', 'tex'], ['createFramebuffer', 'deleteFramebuffer', 'fb'],
                              ['createRenderbuffer', 'deleteRenderbuffer', 'rb'], ['createBuffer', 'deleteBuffer', 'buf']] as const) {
      const oc = P[c], od = P[d];
      P[c] = function (this: unknown, ...a: unknown[]) {
        const o = oc.apply(this, a) as object | null;
        if (o) { seen.add(o); live[k]++; }
        return o;
      };
      P[d] = function (this: unknown, o: unknown) {
        if (o && seen.has(o as object)) { seen.delete(o as object); live[k]--; }
        return od.call(this, o);
      };
    }
    (window as unknown as {__glLive: typeof live}).__glLive = live;
  });
  await page.goto(`${origin}/${slug}/${process.env.QUERY ?? ''}`);
  await page.waitForFunction(() => (window as any).__bench?.ready === true, null, {timeout: 180_000});
  await page.waitForTimeout(800);
  const widths = dragWidths(resizes);
  const result = await page.evaluate(async ({widths, intervalMs, dragSteps}) => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    let panel: HTMLElement = canvas;
    while (panel.parentElement && panel.parentElement !== document.body) panel = panel.parentElement;
    panel.style.right = 'auto';
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const frame = () => new Promise(r => requestAnimationFrame(() => r(null)));
    const live = (window as any).__glLive;
    const rows: unknown[] = [];
    const snap = (i: number) => rows.push({i, ...live, buffer: [canvas.width, canvas.height]});
    snap(0);
    let pixels = 0;
    for (let i = 1; i <= widths.length; i++) {
      panel.style.width = `${widths[i - 1]}px`;
      await frame();
      if (intervalMs > 0) await sleep(intervalMs);
      pixels += canvas.width * canvas.height;
      if (i % 50 === 0) snap(i);
      if (dragSteps > 0 && i % dragSteps === 0) await sleep(400);
    }
    await sleep(500);
    await frame(); await frame();
    snap(widths.length);
    return {rows, meanPixels: pixels / widths.length};
  }, {widths, intervalMs, dragSteps});
  const first = result.rows[0] as Record<string, number>, last = result.rows.at(-1) as Record<string, number>;
  const leakedFramebuffers = last.fb - first.fb;
  console.log(JSON.stringify({slug, resizes, intervalMs, dpr, settleMs, dragSteps, query: process.env.QUERY ?? '', errors,
    leaked: {textures: last.tex - first.tex, framebuffers: leakedFramebuffers, renderbuffers: last.rb - first.rb,
             buffers: last.buf - first.buf},
    leakedMB: +(leakedBytes(leakedFramebuffers, result.meanPixels) / 1e6).toFixed(1), ...result}));
  await browser.close();
}

if (import.meta.main) await main();
