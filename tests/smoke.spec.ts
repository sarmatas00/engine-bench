import {test, expect, type Page} from '@playwright/test';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

type PageSpec = {
  slug: string;
  /**
   * 'matrix' (the default, and what every legacy page is): the page takes a
   * `?dataset=` query, so it runs once per dataset. 'combined': the page loads
   * one bundle and has no synthetic variant, so it runs exactly once, with no
   * dataset query — and therefore never reaches the real-dataset skip, which is
   * why a combined page must not be listed in FIELD_PAGES.
   */
  mode?: 'matrix' | 'combined';
  /** Runs before `page.goto`, for anything that must be installed in the page
   *  before its own scripts do (see countingResizeObserverInit below). */
  init?: (page: Page) => Promise<void>;
  extraChecks?: (page: Page, probe: Record<string, unknown>) => Promise<void>;
};

/** The scientific probe as it crosses the page boundary — `page.evaluate` hands
 *  back plain JSON, so this mirrors ScientificProbe's shape without importing it
 *  (tests/ has no Vite alias resolution for @lib at Playwright runtime). */
type ScientificProbeJson = {
  renderer: string; status: string; canvasCount: number; field: boolean;
  provenance: {smoke: string; heat: string};
  selectedObject?: {marker: number; sourceIndexes: number[]; dtccIds: string[]; traceability: string};
  selectedValue?: {field: string; value: number; unit: string; world: [number, number, number]};
  benchmark?: {cpuFrameTimesMs: number[]; gpuFrameTimesMs: number[] | null; cameraPath: string; forcedFrames: number};
  resources: {buffers: number; textures: number; renderTargets: number; listeners: number; observers: number};
  measurementValid: boolean;
};

const readScientific = (page: Page) =>
  page.evaluate(() => (window as any).__bench.probe.scientific as ScientificProbeJson);

// One entry per page. Later tasks append here.
/**
 * Installed before a combined page's own scripts run: a second witness for
 * resources.observers. The page reports its own integer, and nothing else in
 * this spec could tell a second, leaked ResizeObserver from an honest one.
 */
const countingResizeObserverInit = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    const Real = window.ResizeObserver;
    const stats = {constructed: 0, observed: 0, disconnected: 0};
    (window as any).__roStats = stats;
    class Counting extends Real {
      constructor(callback: ResizeObserverCallback) { super(callback); stats.constructed++; }
      observe(target: Element, options?: ResizeObserverOptions) { stats.observed++; super.observe(target, options); }
      disconnect() { stats.disconnected++; super.disconnect(); }
    }
    window.ResizeObserver = Counting;
  });
};

/**
 * The combined scientific pages' checks, shared verbatim between page 13
 * (vtk.js) and page 14 (Three.js) and parametrised only by the renderer name.
 *
 * Shared rather than copied on purpose. Task 7 compares the two pages' probes
 * and blames the renderer for every difference it finds, which is only sound
 * if both pages were held to the SAME assertions -- two copies of this block
 * could drift apart silently and Task 7 would read the drift as a renderer
 * result. Anything genuinely renderer-specific belongs in the page's own probe
 * panel, not in a branch here.
 */
function scientificPageChecks(renderer: 'vtkjs' | 'threejs') {
  return async (page: Page, probe: Record<string, unknown>): Promise<void> => {
    // The four obligations Task 4 deferred to these pages, plus the Contract
    // Amendments' identity facts. Every one is asserted, never inspected.
    const sci = probe.scientific as ScientificProbeJson | undefined;
    expect(sci, `the ${renderer} page must publish window.__bench.probe.scientific via setScientificProbe`).toBeTruthy();
    expect(sci!.renderer).toBe(renderer);
    expect(sci!.status).toBe('ready');
    expect(sci!.field).toBe(true);
    // Both categories, both spellings: the smoke products are synthetic DTCC
    // data and the heat field is a dtcc-sim solve. A page that carried only one
    // of them would still type-check against the probe contract.
    expect(sci!.provenance).toEqual({smoke: 'synthetic', heat: 'simulation'});
    expect(sci!.measurementValid, 'measurementValid must be true before any forced loss').toBe(true);

    // One canvas, counted twice: the probe's own number is never the only witness.
    expect(sci!.canvasCount).toBe(1);
    await expect(page.locator('#host canvas')).toHaveCount(1);
    // One ResizeObserver, on two independent witnesses: the page's own count,
    // and a counting subclass installed before the page's scripts ran.
    expect(sci!.resources.observers).toBe(1);
    expect(await page.evaluate(() => (window as any).__roStats))
      .toEqual({constructed: 1, observed: 1, disconnected: 0});

    // The rendered slice is the plane the page claims, at the exact requested
    // height — not the nearest node layer. Checked at the manifest's own slice
    // position and then at a deliberately off-node height.
    type SliceGeometry = {requestedZ: number; renderedZ: number; dims: number[]; originZ: number; nodeSpacingZ: number};
    const sliceGeometry = () => page.evaluate(() => (window as any).__bench.sliceGeometry() as SliceGeometry);
    const atDefault = await sliceGeometry();
    expect(atDefault.renderedZ).toBe(atDefault.requestedZ);
    expect(atDefault.dims[2], 'the slice image is a single layer').toBe(1);
    await page.locator('#slice-z').evaluate(el => {
      const input = el as HTMLInputElement;
      input.value = '24';
      input.dispatchEvent(new Event('input'));
    });
    const moved = await sliceGeometry();
    expect(moved.requestedZ).not.toBe(atDefault.requestedZ);
    // The probe height has to sit off the node lattice, or snapping back to the
    // nearest layer would satisfy the next assertion by accident.
    const lattice = (moved.requestedZ - moved.originZ) / moved.nodeSpacingZ;
    expect(Math.abs(lattice - Math.round(lattice)),
      `z=${moved.requestedZ} is ${lattice} node layers up — too close to a layer to detect snapping`)
      .toBeGreaterThan(0.1);
    expect(moved.renderedZ, 'the drawn plane must follow the requested height exactly').toBe(moved.requestedZ);

    // The fixed startup pick's sampled value.
    expect(sci!.selectedValue, 'the fixed startup probe must publish a selectedValue').toBeTruthy();
    expect(sci!.selectedValue!.unit).toBe('m/s');
    expect(Number.isFinite(sci!.selectedValue!.value)).toBe(true);

    // The marker census the page measured off the shipped tile. NOTE: 206 = 103
    // attributed + 103 split-added, and regionMarkerCount and
    // conditionedRegionCount are *also* both 103 — so these counts alone can
    // never prove which of those two fields anything read. The discriminating
    // assertions are the per-marker ones below (fan-out preserved, empty entry
    // rendered in words), not this census.
    const markers = await page.evaluate(() => (window as any).__bench.markers as {
      total: number; attributed: number; unattributed: number; multiSource: number;
      attributedCell: number; unattributedCell: number; multiSourceCell: number;
    });
    expect(markers.total).toBe(206);
    expect(markers.attributed).toBe(103);
    expect(markers.unattributed).toBe(103);
    expect(markers.multiSource, 'the tile has regions standing for more than one source building').toBeGreaterThan(0);

    const selectCell = async (cell: number) => {
      await page.evaluate(c => (window as any).__bench.selectCell(c), cell);
      const sel = (await readScientific(page)).selectedObject;
      expect(sel, `selecting cell ${cell} must publish a selectedObject`).toBeTruthy();
      return sel!;
    };

    // Attributed marker: identity resolved through the real cell -> marker ->
    // objectRefForCell path, and reported run-local because the tile measured
    // unstable_observed. Canonical traceability is a failure, stated as one.
    const attributed = await selectCell(markers.attributedCell);
    expect(typeof attributed.marker).toBe('number');
    expect(Array.isArray(attributed.sourceIndexes)).toBe(true);
    expect(Array.isArray(attributed.dtccIds)).toBe(true);
    expect(attributed.sourceIndexes.length).toBeGreaterThan(0);
    expect(attributed.dtccIds.length).toBe(attributed.sourceIndexes.length);
    expect(attributed.traceability).toBe('run-local');

    // A multi-source region must fan out, never flatten to sourceIndexes[0].
    const multi = await selectCell(markers.multiSourceCell);
    expect(multi.sourceIndexes.length).toBeGreaterThan(1);
    expect(multi.dtccIds.length).toBe(multi.sourceIndexes.length);

    // Split-added marker: empty arrays are valid data, and the readout must say
    // so in words rather than rendering a blank row.
    const unattributed = await selectCell(markers.unattributedCell);
    expect(unattributed.sourceIndexes).toEqual([]);
    expect(unattributed.dtccIds).toEqual([]);
    expect(unattributed.traceability).toBe('none');
    for (const label of ['Source buildings', 'DTCC ids', 'Traceability']) {
      const row = page.locator(`.readouts [data-label="${label}"]`);
      await expect(row).toHaveCount(1);
      const text = ((await row.textContent()) ?? '').trim();
      expect(text, `readout row "${label}" is blank for a split-added marker`).not.toMatch(/:\s*$/);
    }
    await expect(page.locator('.readouts [data-label="Traceability"]'))
      .toContainText('no source building (added by the mesh splitter; not a conditioned region)');

    // setReadout writes textContent, not innerHTML: markup arrives literally.
    await page.evaluate(() => (window as any).__bench.setReadout('Escaping check', 'literal <b>markup</b> & entity'));
    const escaped = page.locator('.readouts [data-label="Escaping check"]');
    await expect(escaped).toHaveText('Escaping check: literal <b>markup</b> & entity');
    expect(await escaped.locator('b').count(), 'a readout value must never be parsed as markup').toBe(0);

    // One callback per button click, no double-fire.
    const calls = () => page.evaluate(() => ((window as any).__bench.controlCalls['camera-reset'] ?? 0) as number);
    const before = await calls();
    await page.click('#camera-reset');
    expect(await calls() - before).toBe(1);

    // The forced-render benchmark. The length check proves orbit-v1 ran whole;
    // the CPU-vs-GPU check is the actual guard, and is what would have caught
    // this page's first benchmark reporting a 0.45 ms CPU frame while the GPU
    // timer reported 95 ms on the very same frames. Deleting the one-pixel
    // readback that forces frame completion would fail here and nowhere else.
    const resourcesBefore = (await readScientific(page)).resources;
    const bench = await page.evaluate(async () => {
      const result = await (window as any).__bench.runBenchmark();
      const mean = (a: number[]) => a.reduce((x: number, y: number) => x + y, 0) / a.length;
      return {
        frames: result.cpuFrameTimesMs.length,
        cameraPath: result.cameraPath,
        forcedFrames: result.forcedFrames,
        cpuMean: mean(result.cpuFrameTimesMs),
        gpuCount: result.gpuFrameTimesMs ? result.gpuFrameTimesMs.length : null,
        gpuMean: result.gpuFrameTimesMs && result.gpuFrameTimesMs.length ? mean(result.gpuFrameTimesMs) : null,
      };
    });
    expect(bench.frames).toBe(180);
    expect(bench.cameraPath).toBe('orbit-v1');
    expect(bench.forcedFrames).toBe(180);
    expect(bench.cpuMean).toBeGreaterThan(0);
    if (bench.gpuMean !== null) {
      expect(bench.cpuMean,
        `cpu mean ${bench.cpuMean.toFixed(2)} ms vs gpu mean ${bench.gpuMean.toFixed(2)} ms — a CPU frame time far `
        + 'below the GPU time for the same frame means the render was submitted but never waited on')
        .toBeGreaterThan(0.5 * bench.gpuMean);
    }
    expect((await readScientific(page)).benchmark, 'runBenchmark must publish into the probe').toMatchObject(
      {cameraPath: 'orbit-v1', forcedFrames: 180});
    // The resource counts are live GL object counts on both pages, so this is a
    // real gate rather than a comparison of two constants. On page 13 what it
    // finds is a vtk.js 36.12.1 defect, bounded here rather than hidden:
    // vtkOpenGLRenderWindow leaks up to one texture and one framebuffer per
    // drawing-buffer resize and never deletes them, and a benchmark run resizes
    // twice (pin the surface, restore it). Page 14 is measured against the same
    // bound so Task 7 can say whether Three.js does the same — deliberately not
    // pinned to an exact delta, which would encode vtk.js's defect as the
    // contract. The bound is what matters: growth must scale with resizes, not
    // with the 210 forced frames. A per-frame leak would land here two orders of
    // magnitude out.
    const RESIZES_PER_RUN = 2;
    const resourcesAfter = (await readScientific(page)).resources;
    for (const key of ['textures', 'renderTargets'] as const) {
      const delta = resourcesAfter[key] - resourcesBefore[key];
      expect(delta, `${key} grew by ${delta} across 210 forced frames`).toBeGreaterThanOrEqual(0);
      expect(delta, `${key} grew by ${delta}, more than one per drawing-buffer resize`)
        .toBeLessThanOrEqual(RESIZES_PER_RUN);
    }
    // Everything the page itself owns must be exactly flat.
    for (const key of ['buffers', 'listeners', 'observers'] as const) {
      expect(resourcesAfter[key], `page-owned ${key} moved across the benchmark`).toBe(resourcesBefore[key]);
    }

    // Forced context loss on the drawing canvas the renderer draws into.
    const forced = await page.evaluate(() => {
      const canvas = document.querySelector('#host canvas') as HTMLCanvasElement | null;
      if (!canvas) return 'no-canvas';
      const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null;
      const ext = gl?.getExtension('WEBGL_lose_context') as {loseContext(): void} | null | undefined;
      if (!ext) return 'no-extension';
      ext.loseContext();
      return 'lost';
    });
    expect(forced, 'WEBGL_lose_context is required to prove the context-loss path').toBe('lost');
    await page.waitForFunction(
      () => (window as any).__bench.probe.scientific?.status === 'context-lost', null, {timeout: 10_000});
    expect((await readScientific(page)).measurementValid).toBe(false);

    const failure = page.locator('#host > .failure');
    await expect(failure).toHaveCount(1);
    await expect(failure).toBeVisible();
    const reload = failure.locator('button');
    await expect(reload).toBeVisible();
    await expect(reload).toBeEnabled();
    // Clickable, not merely present: the reload control must be the topmost
    // element at its own centre. Not actually clicked — that would reload.
    const topmost = await page.evaluate(() => {
      const b = document.querySelector('#host > .failure button')!;
      const r = b.getBoundingClientRect();
      return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === b;
    });
    expect(topmost, 'the reload control is covered by another element').toBe(true);
  };
}

export const PAGES: PageSpec[] = [
  {slug: '00-index'},
  {slug: '01-maplibre-baseline'},
  {slug: '02-deckgl-floats'},
  {slug: '04-values-lost', extraChecks: async (_page, probe) => {
    const sg = probe.scenegraph as any, sm = probe.simpleMesh as any;
    // ScenegraphLayer: value survives to the GPU buffer, fails only at the shader.
    expect(sg).toMatchObject({loaded: true, inBufferLayout: true, inShaderLayout: false, inVsSource: false});
    // SimpleMeshLayer: stripped by normalizeGeometryAttributes before any buffer exists.
    expect(sm).toMatchObject({loaded: true, inBufferLayout: false, inShaderLayout: false, inVsSource: false});
  }},
  {slug: '06-fix-a2-predraped'},
  {slug: '07-fix-b1-shader', extraChecks: async (page, probe) => {
    // The subclass declares _TEMPERATURE in its own shader, so it now binds and colours.
    expect(probe.scenegraph).toMatchObject({loaded: true, inBufferLayout: true, inShaderLayout: true, inVsSource: true});

    // Colour-pixel assertion: the rendered surface must actually be coloured, not grey/white/black.
    // Try live gl.readPixels first, then a toDataURL/getImageData fallback, then the page's own
    // centerPixel probe (captured inside deck.gl's onAfterRender, while the WebGL context is live —
    // see pages/07-fix-b1-shader/main.ts) if the drawing buffer wasn't preserved for either read.
    const sampled = await page.evaluate(async () => {
      const canvas = document.querySelector('#host canvas.maplibregl-canvas') as HTMLCanvasElement | null;
      if (!canvas) return {route: 'no-canvas', rgb: [0, 0, 0]};
      const cx = Math.floor(canvas.width / 2);
      const cy = Math.floor(canvas.height / 2);

      const gl = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
      if (gl) {
        const px = new Uint8Array(4);
        gl.readPixels(cx, gl.drawingBufferHeight - cy, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        if (Math.max(px[0], px[1], px[2]) - Math.min(px[0], px[1], px[2]) > 40) {
          return {route: 'gl.readPixels', rgb: [px[0], px[1], px[2]]};
        }
      }

      try {
        const dataUrl = canvas.toDataURL();
        const img = new Image();
        const loaded = new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; });
        img.src = dataUrl;
        await loaded;
        const c2 = document.createElement('canvas');
        c2.width = canvas.width; c2.height = canvas.height;
        const ctx = c2.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(cx, cy, 1, 1).data;
        if (Math.max(data[0], data[1], data[2]) - Math.min(data[0], data[1], data[2]) > 40) {
          return {route: 'toDataURL', rgb: [data[0], data[1], data[2]]};
        }
      } catch { /* fall through to the page-provided sample */ }

      return {route: 'zero', rgb: [0, 0, 0]};
    });

    let route = sampled.route, rgb = sampled.rgb;
    if (route === 'zero' || route === 'no-canvas') {
      const centerPixel = await page.evaluate(() => (window as any).__bench.probe.centerPixel as number[] | undefined);
      if (centerPixel) { route = 'page.centerPixel'; rgb = centerPixel; }
    }

    console.log(`page 07 colour-pixel route: ${route}, rgb=${JSON.stringify(rgb)}`);
    expect(Math.max(rgb[0], rgb[1], rgb[2]) - Math.min(rgb[0], rgb[1], rgb[2]), `route=${route} rgb=${JSON.stringify(rgb)}`).toBeGreaterThan(40);
  }},
  {slug: '08-fix-b2-baked', extraChecks: async (_page, probe) => {
    expect((probe.simpleMesh as any).inBufferLayout).toBe(true);   // colors reach the GPU on the mesh path
  }},
  {slug: '05-fix-a1-deck-terrain'},
  {slug: '03-threejs-floats'},
  {slug: '09-cesium-terrain'},
  {slug: '10-cesium-voxels'},
  {slug: '11-vtkjs-grid'},
  {slug: '12-playcanvas'},
  {slug: '13-vtkjs-scientific', mode: 'combined', init: countingResizeObserverInit,
    extraChecks: scientificPageChecks('vtkjs')},
  {slug: '14-threejs-scientific', mode: 'combined', init: countingResizeObserverInit,
    extraChecks: scientificPageChecks('threejs')},
];

export const FIELD_PAGES = new Set(['04-values-lost', '07-fix-b1-shader', '08-fix-b2-baked', '10-cesium-voxels', '11-vtkjs-grid', '12-playcanvas']);

const REAL_DIR = resolve(import.meta.dirname, '../public/data/real');

function realState(): {available: boolean; hasField: boolean; reason: string} {
  const metaPath = resolve(REAL_DIR, 'dataset.json');
  if (!existsSync(metaPath)) {
    return {available: false, hasField: false,
      reason: 'public/data/real/dataset.json is absent — run .venv/bin/python scripts/real/stage1_build.py'};
  }
  if (!existsSync(resolve(REAL_DIR, 'blocks.glb'))) {
    return {available: false, hasField: false,
      reason: 'public/data/real/blocks.glb is absent — run bun run generate:real'};
  }
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  const hasField = meta?.stages?.stage2 != null;
  return {available: true, hasField,
    reason: hasField ? '' : 'stage 2 has not run — no field for this dataset (scripts/real/stage2_sim.sh)'};
}

const REAL = realState();

/**
 * One page run. `dataset` is null for a combined page: no `?dataset=` query,
 * and the screenshot lands under screens/combined/ instead of a dataset folder.
 */
async function runPage(page: Page, spec: PageSpec, dataset: 'synthetic' | 'real' | null): Promise<void> {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

  if (spec.init) await spec.init(page);
  const query = dataset === 'real' ? '?dataset=real' : '';
  await page.goto(`/${spec.slug}/${query}`);
  await page.waitForFunction(() => (window as any).__bench?.ready === true, null, {timeout: 30_000});

  const probe = await page.evaluate(() => (window as any).__bench.probe);
  expect(probe.webgl, 'page reported no WebGL2').not.toBe(false);
  expect(errors, errors.join('\n')).toEqual([]);
  if (FIELD_PAGES.has(spec.slug)) {
    expect(probe.field, 'a field page must report probe.field').toBe(true);
  }

  await page.screenshot({path: `screens/${dataset ?? 'combined'}/${spec.slug}.png`, fullPage: true});
  if (spec.extraChecks) await spec.extraChecks(page, probe);
}

for (const dataset of ['synthetic', 'real'] as const) {
  test.describe(dataset, () => {
    for (const spec of PAGES) {
      if ((spec.mode ?? 'matrix') !== 'matrix') continue;
      test(spec.slug, async ({page}) => {
        if (dataset === 'real' && !REAL.available) test.skip(true, REAL.reason);
        if (dataset === 'real' && FIELD_PAGES.has(spec.slug) && !REAL.hasField) test.skip(true, REAL.reason);
        await runPage(page, spec, dataset);
      });
    }
  });
}

test.describe('combined', () => {
  for (const spec of PAGES) {
    if (spec.mode !== 'combined') continue;
    test(spec.slug, async ({page}) => {
      // These pages run orbit-v1's full 210 forced frames in-test; on a
      // software rasterizer that alone is well over half the default budget.
      test.slow();
      await runPage(page, spec, null);
    });
  }
});
